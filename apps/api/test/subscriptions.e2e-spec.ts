import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { parseApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import request from "supertest";
import type { App } from "supertest/types";
import { AuthModule } from "../src/auth/auth.module";
import { AuthorizationModule } from "../src/authorization/authorization.module";
import { BusinessRolesGuard } from "../src/authorization/business-roles.guard";
import { PlatformRolesGuard } from "../src/authorization/platform-roles.guard";
import { RequestContextInterceptor } from "../src/authorization/request-context.interceptor";
import { TenantContextGuard } from "../src/authorization/tenant-context.guard";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { PaymentsModule } from "../src/payments/payments.module";
import { StaffModule } from "../src/staff/staff.module";
import { SubscriptionsModule } from "../src/subscriptions/subscriptions.module";

describe("Subscription system (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const email = `subscription-${suffix}@example.test`;
  let token = "";
  let businessId = "";
  let limitPlanId = "";
  let starterMonthlyId = "";
  let professionalMonthlyId = "";

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

    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        firstName: "Sub",
        lastName: "Owner",
        businessName: "Subscription Salon",
      })
      .expect(201);
    token = registered.body.accessToken as string;
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    businessId = me.body.memberships[0].businessId as string;

    const limitPlan = await prisma.plan.create({
      data: {
        name: `Limit ${suffix}`,
        billingPeriod: "MONTHLY",
        price: "10.00",
        currency: "TRY",
        isActive: true,
        limits: { maxStaff: 1, maxCustomers: 1, advancedFeatures: false },
      },
    });
    limitPlanId = limitPlan.id;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.auditLog.deleteMany({ where: { businessId } });
    await prisma.payment.deleteMany({ where: { businessId } });
    await prisma.subscription.deleteMany({ where: { businessId } });
    await prisma.staff.deleteMany({ where: { businessId } });
    if (limitPlanId) {
      await prisma.plan.deleteMany({ where: { id: limitPlanId } });
    }
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.businessUser.deleteMany({ where: { userId: user.id } });
      await prisma.business.deleteMany({ where: { id: businessId } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
    await app.close();
  });

  it("lists database-driven plans and starts a 14-day trial on register", async () => {
    const plans = await request(app.getHttpServer())
      .get("/api/v1/plans")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(plans.body.length).toBeGreaterThanOrEqual(6);
    const starter = plans.body.find(
      (plan: { name: string; billingPeriod: string }) =>
        plan.name === "Starter" && plan.billingPeriod === "MONTHLY",
    );
    const starterSemi = plans.body.find(
      (plan: { name: string; billingPeriod: string }) =>
        plan.name === "Starter" && plan.billingPeriod === "SEMIANNUAL",
    );
    const professional = plans.body.find(
      (plan: { name: string; billingPeriod: string }) =>
        plan.name === "Professional" && plan.billingPeriod === "MONTHLY",
    );
    expect(starter).toMatchObject({
      currency: "TRY",
      isActive: true,
      limits: { maxStaff: 3, maxCustomers: 50, advancedFeatures: false },
    });
    expect(starter.price).toMatch(/^\d+\.\d{2}$/);
    expect(starterSemi).toMatchObject({
      currency: "TRY",
      isActive: true,
      billingPeriod: "SEMIANNUAL",
    });
    expect(professional.limits.advancedFeatures).toBe(true);
    starterMonthlyId = starter.id as string;
    professionalMonthlyId = professional.id as string;

    const current = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(current.body.status).toBe("TRIALING");
    expect(current.body.plan.name).toBe("Starter");

    const access = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/access")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(access.body).toMatchObject({
      hasAccess: true,
      status: "TRIALING",
    });
    expect(access.body.plan.name).toBe("Starter");
  });

  it("selects a plan, exposes feature access, and blocks STAFF mutations", async () => {
    const created = await activatePlan(starterMonthlyId);
    expect(created.subscription.status).toBe("TRIALING");
    const current = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(current.body.status).toBe("ACTIVE");
    expect(current.body.plan.id).toBe(starterMonthlyId);

    const access = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/access")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(access.body.hasAccess).toBe(true);
    expect(access.body.status).toBe("ACTIVE");
    expect(access.body.limits.advancedFeatures).toBe(false);

    await activatePlan(professionalMonthlyId);
    const upgradedAccess = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/access")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(upgradedAccess.body.limits.advancedFeatures).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.businessUser.update({
      where: {
        businessId_userId: { businessId, userId: user.id },
      },
      data: { role: "STAFF" },
    });
    try {
      await request(app.getHttpServer())
        .get("/api/v1/subscriptions/current")
        .set("Authorization", `Bearer ${token}`)
        .set(TENANT_HEADER, businessId)
        .expect(200);
      const denied = await request(app.getHttpServer())
        .post("/api/v1/payments/checkout")
        .set("Authorization", `Bearer ${token}`)
        .set(TENANT_HEADER, businessId)
        .send(checkoutPayload(starterMonthlyId))
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: {
          businessId_userId: { businessId, userId: user.id },
        },
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  it("cancels access at period end and expires afterwards", async () => {
    const cancelled = await request(app.getHttpServer())
      .post("/api/v1/subscriptions/cancel")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(cancelled.body.cancelAtPeriodEnd).toBe(true);
    expect(cancelled.body.cancelledAt).toBeTruthy();

    const access = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/access")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(access.body.hasAccess).toBe(true);
    expect(access.body.status).toBe("CANCELLED");

    await prisma.subscription.update({
      where: { id: cancelled.body.id as string },
      data: {
        currentPeriodStart: new Date("2019-12-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2020-01-01T00:00:00.000Z"),
      },
    });
    const expired = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(expired.body.status).toBe("EXPIRED");
    const expiredAccess = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/access")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(expiredAccess.body.hasAccess).toBe(false);
    expect(expiredAccess.body.status).toBe("EXPIRED");

    const blocked = await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ firstName: "No", lastName: "Access" })
      .expect(403);
    expect(blocked.body.code).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("enforces plan staff limits from the backend", async () => {
    await activatePlan(limitPlanId);

    await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ firstName: "Only", lastName: "One" })
      .expect(201);

    const limited = await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ firstName: "Too", lastName: "Many" })
      .expect(403);
    expect(limited.body.code).toBe("PLAN_LIMIT_REACHED");
    expect(limited.body.details).toMatchObject({
      kind: "staff",
      max: 1,
      used: 1,
    });
  });

  function checkoutPayload(planId: string) {
    return {
      planId,
      identityNumber: "11111111110",
      gsmNumber: "+905551112233",
      billingAddress: {
        address: "Test Street 1",
        city: "Istanbul",
        country: "Turkey",
      },
    };
  }

  async function activatePlan(planId: string) {
    const started = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send(checkoutPayload(planId))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/payments/${started.body.payment.id}/sync`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    return started.body as { subscription: { status: string } };
  }
});
