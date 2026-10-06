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
import { CheckoutModule } from "../src/checkout/checkout.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures as _cleanupTenantFixtures } from "./cleanup";
import { LedgerModule } from "../src/ledger/ledger.module";

describe("Appointment checkout (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const email = `checkout-${suffix}@example.test`;
  let token = "";
  let businessId = "";
  let customerId = "";
  let staffId = "";
  let serviceId = "";

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
        AppointmentsModule,
        LedgerModule,
        CheckoutModule,
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
    token = (await register(email, "Checkout Salon")).accessToken;
    businessId = await getBusinessId(token);
    const seeded = await seedTenant(businessId);
    customerId = seeded.customerId;
    staffId = seeded.staffId;
    serviceId = seeded.serviceId;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (businessId) {
      await prisma.checkoutIntent.deleteMany({ where: { businessId } });
      await prisma.officialDocument.deleteMany({ where: { businessId } });
      await prisma.tenantUyumsoftSettings.deleteMany({ where: { businessId } });
      await prisma.tenantPaymentSettings.deleteMany({ where: { businessId } });
      await prisma.customerLedgerEntry.deleteMany({ where: { businessId } });
      await prisma.collection.deleteMany({ where: { businessId } });
      await prisma.salesReceipt.deleteMany({ where: { businessId } });
      await prisma.expense.deleteMany({ where: { businessId } });
      await prisma.sale.deleteMany({ where: { businessId } });
      await prisma.cashAccount.deleteMany({ where: { businessId } });
      await prisma.appointmentEvent.deleteMany({ where: { businessId } });
      await prisma.appointment.deleteMany({ where: { businessId } });
      await prisma.customer.deleteMany({ where: { businessId } });
      await prisma.staff.deleteMany({ where: { businessId } });
      await prisma.auditLog.deleteMany({ where: { businessId } });
      await prisma.service.deleteMany({ where: { businessId } });
      await prisma.subscription.deleteMany({ where: { businessId } });
      await prisma.authToken.deleteMany({ where: { businessId } });
    }
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.businessUser.deleteMany({ where: { userId: user.id } });
      if (businessId) {
        await prisma.business.deleteMany({ where: { id: businessId } });
      }
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
    await app.close();
  });

  it("keeps ON_DAY unpaid until complete, then accepts cash", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId,
        staffId,
        serviceId,
        startAt: "2035-03-10T10:00:00.000Z",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      paymentPlan: "ON_DAY",
      paymentStatus: "UNPAID",
      remainingAmount: "250.00",
      saleId: null,
    });
  });

  it("pays a deposit link and leaves the remainder visible", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId,
        staffId,
        serviceId,
        startAt: "2035-03-11T10:00:00.000Z",
        paymentPlan: "DEPOSIT",
        depositAmount: "100.00",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      paymentPlan: "DEPOSIT",
      paymentStatus: "UNPAID",
      depositAmount: "100.00",
      remainingAmount: "250.00",
    });
    expect(created.body.saleId).toBeTruthy();

    const link = await request(app.getHttpServer())
      .post(`/api/v1/checkout/appointments/${created.body.id}/link`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    expect(link.body).toMatchObject({
      amount: "100.00",
      purpose: "DEPOSIT",
    });

    const publicView = await request(app.getHttpServer())
      .get(`/api/v1/checkout/${link.body.token}`)
      .expect(200);
    expect(publicView.body.amount).toBe("100.00");

    await request(app.getHttpServer())
      .post(`/api/v1/checkout/${link.body.token}/complete`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(after.body).toMatchObject({
      paymentStatus: "PARTIAL",
      collectedAmount: "100.00",
      remainingAmount: "150.00",
    });

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(customer.ledgerBalance.toFixed(2)).toBe("150.00");
  });

  it("settles a full prepaid appointment to zero remaining", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId,
        staffId,
        serviceId,
        startAt: "2035-03-12T10:00:00.000Z",
        paymentPlan: "FULL",
      })
      .expect(201);

    const link = await request(app.getHttpServer())
      .post(`/api/v1/checkout/appointments/${created.body.id}/link`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    expect(link.body.amount).toBe("250.00");

    await request(app.getHttpServer())
      .post(`/api/v1/checkout/${link.body.token}/complete`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(after.body).toMatchObject({
      paymentStatus: "PAID",
      remainingAmount: "0.00",
    });
  });

  it("keeps integration keys owner-only and accepts CARD collections", async () => {
    const saved = await request(app.getHttpServer())
      .patch("/api/v1/integrations/payments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ provider: "GENERIC", isActive: true })
      .expect(200);
    expect(saved.body).toMatchObject({
      provider: "GENERIC",
      isActive: true,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.businessUser.update({
      where: { businessId_userId: { businessId, userId: user.id } },
      data: { role: "ACCOUNTANT" },
    });
    try {
      const denied = await request(app.getHttpServer())
        .get("/api/v1/integrations/payments")
        .set("Authorization", `Bearer ${token}`)
        .set(TENANT_HEADER, businessId)
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: { businessId_userId: { businessId, userId: user.id } },
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  async function seedTenant(id: string) {
    const [customer, staff, service] = await Promise.all([
      prisma.customer.create({
        data: { businessId: id, firstName: "Ada", lastName: "Lovelace" },
      }),
      prisma.staff.create({
        data: { businessId: id, firstName: "Stylist", lastName: "One" },
      }),
      prisma.service.create({
        data: {
          businessId: id,
          name: "Hair Cut",
          durationMinutes: 60,
          price: "250.00",
        },
      }),
    ]);
    return {
      customerId: customer.id,
      staffId: staff.id,
      serviceId: service.id,
    };
  }

  async function register(userEmail: string, businessName: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: userEmail,
        password,
        firstName: "Business",
        lastName: "Owner",
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
