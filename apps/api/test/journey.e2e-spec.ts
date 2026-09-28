import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { parseApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import request from "supertest";
import type { App } from "supertest/types";
import { AppointmentsModule } from "../src/appointments/appointments.module";
import { AuthModule } from "../src/auth/auth.module";
import { AuthorizationModule } from "../src/authorization/authorization.module";
import { BusinessRolesGuard } from "../src/authorization/business-roles.guard";
import { PlatformRolesGuard } from "../src/authorization/platform-roles.guard";
import { RequestContextInterceptor } from "../src/authorization/request-context.interceptor";
import { TenantContextGuard } from "../src/authorization/tenant-context.guard";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { CustomersModule } from "../src/customers/customers.module";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures } from "./cleanup";
import { PaymentsModule } from "../src/payments/payments.module";
import { ServicesModule } from "../src/services/services.module";
import { StaffModule } from "../src/staff/staff.module";
import { SubscriptionsModule } from "../src/subscriptions/subscriptions.module";

jest.setTimeout(60_000);

describe("Critical business journey (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const email = `journey-${suffix}@example.test`;
  const password = "StrongPassword!123";
  let accessToken = "";
  let businessId = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config) => parseApiEnv(config),
        }),
        PrismaModule,
        AuthModule,
        AuthorizationModule,
        StaffModule,
        ServicesModule,
        CustomersModule,
        AppointmentsModule,
        SubscriptionsModule,
        PaymentsModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: TenantContextGuard },
        { provide: APP_GUARD, useClass: BusinessRolesGuard },
        { provide: APP_GUARD, useClass: PlatformRolesGuard },
        { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (!prisma) return;
    const user = await prisma.user.findUnique({ where: { email } });
    await cleanupTenantFixtures(
      prisma,
      businessId ? [businessId] : [],
      user ? [user.id] : [],
    );
    await app.close();
  });

  it("covers register through payment sandbox activation", async () => {
    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        firstName: "Journey",
        lastName: "Owner",
        businessName: "Journey Salon",
      })
      .expect(201);
    expect(registered.body.accessToken).toBeTruthy();

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);
    accessToken = login.body.accessToken as string;

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    businessId = me.body.memberships[0].businessId as string;

    const staff = await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({ loginRole: "STAFF", firstName: "Stylist", lastName: "One" })
      .expect(201);
    const service = await request(app.getHttpServer())
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({ name: "Hair Cut", durationMinutes: 45, price: "180.00" })
      .expect(201);
    const customer = await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({ firstName: "Ada", lastName: "Lovelace", phone: "+905551112233" })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId: customer.body.id,
        staffId: staff.body.id,
        serviceId: service.body.id,
        startAt: "2033-07-01T09:00:00.000Z",
      })
      .expect(201);
    expect(created.body.status).toBe("CONFIRMED");

    const rescheduled = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/reschedule`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({ startAt: "2033-07-01T11:00:00.000Z" })
      .expect(201);
    expect(rescheduled.body.startAt).toBe("2033-07-01T11:00:00.000Z");

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    expect(completed.body.status).toBe("COMPLETED");

    const beforePay = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(beforePay.body.status).toBe("TRIALING");

    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: "Starter", billingPeriod: "MONTHLY", isActive: true },
    });
    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .send({
        planId: plan.id,
        identityNumber: "11111111110",
        gsmNumber: "+905551112233",
        billingAddress: {
          address: "Street 1",
          city: "Istanbul",
          country: "Turkey",
        },
      })
      .expect(201);
    expect(checkout.body.checkout.token).toMatch(/^mock_/);
    expect(checkout.body.subscription.status).toBe("TRIALING");

    await request(app.getHttpServer())
      .post(`/api/v1/payments/${checkout.body.payment.id}/sync`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);

    const current = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(current.body.status).toBe("ACTIVE");
    expect(current.body.plan.name).toBe("Starter");
  });
});
