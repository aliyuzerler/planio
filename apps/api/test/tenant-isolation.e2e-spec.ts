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
import { NotificationsModule } from "../src/notifications/notifications.module";
import { PaymentsModule } from "../src/payments/payments.module";
import { ServicesModule } from "../src/services/services.module";
import { StaffModule } from "../src/staff/staff.module";
import { SubscriptionsModule } from "../src/subscriptions/subscriptions.module";

jest.setTimeout(60_000);

describe("Cross-tenant isolation (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `iso-a-${suffix}@example.test`,
    b: `iso-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let customerAId = "";
  let staffAId = "";
  let serviceAId = "";
  let appointmentAId = "";
  let notificationAId = "";
  let paymentAId = "";

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
        NotificationsModule,
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

    const accountA = await register(emails.a, "Isolation Salon A");
    const accountB = await register(emails.b, "Isolation Salon B");
    tokenA = accountA.accessToken;
    tokenB = accountB.accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);

    staffAId = (
      await request(app.getHttpServer())
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ firstName: "Stylist", lastName: "A" })
        .expect(201)
    ).body.id as string;
    serviceAId = (
      await request(app.getHttpServer())
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ name: "Cut", durationMinutes: 30, price: "100.00" })
        .expect(201)
    ).body.id as string;
    customerAId = (
      await request(app.getHttpServer())
        .post("/api/v1/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ firstName: "Ada", lastName: "Lovelace", phone: "+905551112233" })
        .expect(201)
    ).body.id as string;
    appointmentAId = (
      await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          customerId: customerAId,
          staffId: staffAId,
          serviceId: serviceAId,
          startAt: "2033-06-01T10:00:00.000Z",
        })
        .expect(201)
    ).body.id as string;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const items = await prisma.notification.findMany({
        where: { businessId: businessAId, appointmentId: appointmentAId },
      });
      if (items[0]) {
        notificationAId = items[0].id;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: "Starter", billingPeriod: "MONTHLY", isActive: true },
    });
    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
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
    paymentAId = checkout.body.payment.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentAId}/sync`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
  });

  afterAll(async () => {
    if (!prisma) return;
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const businessIds = [businessAId, businessBId].filter(Boolean);
    await prisma.notification.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.notificationSettings.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.pushDevice.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.appointmentEvent.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.appointment.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.payment.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.customer.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.staff.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.auditLog.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.service.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("denies foreign tenant headers and hides foreign resource IDs", async () => {
    const forbiddenHeader = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessAId)
      .expect(403);
    expect(forbiddenHeader.body.code).toBe("TENANT_ACCESS_DENIED");

    const paths = [
      `/api/v1/customers/${customerAId}`,
      `/api/v1/staff/${staffAId}`,
      `/api/v1/services/${serviceAId}`,
      `/api/v1/appointments/${appointmentAId}`,
      `/api/v1/payments/${paymentAId}`,
    ];
    for (const path of paths) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set("Authorization", `Bearer ${tokenB}`)
        .set(TENANT_HEADER, businessBId)
        .expect(404);
      expect(response.body.code).toBe("RESOURCE_NOT_FOUND");
    }
  });

  it("keeps subscriptions and notifications scoped to the selected business", async () => {
    const own = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(own.body.status).toBe("ACTIVE");

    const other = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(200);
    expect(other.body).toBeNull();

    await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessAId)
      .expect(403);

    expect(notificationAId).toBeTruthy();
    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/notifications/${notificationAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(404);
    expect(hidden.body.code).toBe("RESOURCE_NOT_FOUND");

    const listed = await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(200);
    expect(listed.body.items).toEqual([]);
  });

  async function register(email: string, businessName: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        firstName: "Owner",
        lastName: "User",
        businessName,
      })
      .expect(201);
    return { accessToken: response.body.accessToken as string };
  }

  async function getBusinessId(accessToken: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    return response.body.memberships[0].businessId as string;
  }
});
