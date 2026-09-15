import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { parseApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import * as argon2 from "argon2";
import request from "supertest";
import type { App } from "supertest/types";
import { AdminModule } from "../src/admin/admin.module";
import { AuthModule } from "../src/auth/auth.module";
import { BusinessModule } from "../src/business/business.module";
import { AuthorizationModule } from "../src/authorization/authorization.module";
import { BusinessRolesGuard } from "../src/authorization/business-roles.guard";
import { PlatformRolesGuard } from "../src/authorization/platform-roles.guard";
import { RequestContextInterceptor } from "../src/authorization/request-context.interceptor";
import { TenantContextGuard } from "../src/authorization/tenant-context.guard";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

jest.setTimeout(60_000);

describe("Platform admin (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    ownerA: `admin-owner-a-${suffix}@example.test`,
    ownerB: `admin-owner-b-${suffix}@example.test`,
    superAdmin: `admin-super-${suffix}@example.test`,
  };
  let ownerAToken = "";
  let ownerBToken = "";
  let superAdminToken = "";
  let businessAId = "";
  let businessBId = "";
  let ownerAUserId = "";
  let planId = "";
  let subscriptionAId = "";

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
        BusinessModule,
        AdminModule,
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

    const accountA = await register(emails.ownerA, "Admin Salon A");
    const accountB = await register(emails.ownerB, "Admin Salon B");
    ownerAToken = accountA.accessToken;
    ownerBToken = accountB.accessToken;
    ownerAUserId = accountA.userId;
    businessAId = await getBusinessId(ownerAToken);
    businessBId = await getBusinessId(ownerBToken);

    await prisma.user.create({
      data: {
        email: emails.superAdmin,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        firstName: "Super",
        lastName: "Admin",
        platformRole: "SUPER_ADMIN",
      },
    });
    superAdminToken = (
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: emails.superAdmin, password })
        .expect(200)
    ).body.accessToken as string;

    const plan = await prisma.plan.create({
      data: {
        name: `Admin Plan ${suffix}`,
        billingPeriod: "MONTHLY",
        price: "99.00",
        currency: "TRY",
        isActive: true,
        limits: { maxStaff: 5, maxCustomers: 100, advancedFeatures: false },
      },
    });
    planId = plan.id;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const existing = await prisma.subscription.findFirst({
      where: { businessId: businessAId },
      orderBy: { createdAt: "desc" },
    });
    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId,
            status: "ACTIVE",
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
            cancelAtPeriodEnd: false,
          },
        })
      : await prisma.subscription.create({
          data: {
            businessId: businessAId,
            planId,
            status: "ACTIVE",
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
    subscriptionAId = subscription.id;
    await prisma.payment.create({
      data: {
        businessId: businessAId,
        subscriptionId: subscriptionAId,
        amount: "99.00",
        currency: "TRY",
        status: "SUCCEEDED",
        provider: "IYZICO",
        paidAt: now,
      },
    });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.payment.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    if (planId) {
      await prisma.plan.deleteMany({ where: { id: planId } });
    }
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({
      where: { id: { in: [businessAId, businessBId].filter(Boolean) } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("rejects unauthenticated access to admin endpoints", async () => {
    await request(app.getHttpServer()).get("/api/v1/admin/dashboard").expect(401);
    await request(app.getHttpServer())
      .get("/api/v1/admin/businesses")
      .expect(401);
  });

  it("rejects business users from every admin endpoint", async () => {
    const paths = [
      "/api/v1/admin/dashboard",
      "/api/v1/admin/businesses",
      `/api/v1/admin/businesses/${businessAId}`,
      "/api/v1/admin/subscriptions",
      "/api/v1/admin/audit-logs",
    ];
    for (const path of paths) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set("Authorization", `Bearer ${ownerAToken}`)
        .expect(403);
      expect(response.body.code).toBe("INSUFFICIENT_PLATFORM_ROLE");
    }

    const status = await request(app.getHttpServer())
      .patch(`/api/v1/admin/businesses/${businessAId}/status`)
      .set("Authorization", `Bearer ${ownerAToken}`)
      .send({ status: "SUSPENDED" })
      .expect(403);
    expect(status.body.code).toBe("INSUFFICIENT_PLATFORM_ROLE");
  });

  it("does not allow role escalation through admin payloads or missing routes", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/businesses/${businessAId}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ status: "ACTIVE", role: "SUPER_ADMIN", platformRole: "SUPER_ADMIN" })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${ownerAUserId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ platformRole: "SUPER_ADMIN", role: "BUSINESS_OWNER" })
      .expect(404);
  });

  it("lets SUPER_ADMIN read platform metrics from real rows", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .expect(200);

    expect(response.body.businesses.total).toBeGreaterThanOrEqual(2);
    expect(response.body.businesses.ACTIVE).toBeGreaterThanOrEqual(2);
    expect(response.body.subscriptions.ACTIVE).toBeGreaterThanOrEqual(1);
    expect(response.body.users.total).toBeGreaterThanOrEqual(3);
    expect(response.body.payments.SUCCEEDED).toBeGreaterThanOrEqual(1);
  });

  it("lists both businesses without leaking tenant isolation on business APIs", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/admin/businesses")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .query({ q: `Admin Salon` })
      .expect(200);

    const ids = list.body.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual(expect.arrayContaining([businessAId, businessBId]));
    const salonA = list.body.items.find(
      (item: { id: string }) => item.id === businessAId,
    );
    expect(salonA.subscription).toMatchObject({
      id: subscriptionAId,
      status: "ACTIVE",
      billingPeriod: "MONTHLY",
      lastPayment: { status: "SUCCEEDED", amount: "99.00" },
    });

    await request(app.getHttpServer())
      .get("/api/v1/business")
      .set("Authorization", `Bearer ${ownerAToken}`)
      .set(TENANT_HEADER, businessBId)
      .expect(403);
  });

  it("shows business users and roles without offering a role mutation", async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/businesses/${businessAId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .expect(200);

    expect(detail.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: ownerAUserId,
          email: emails.ownerA,
          role: "BUSINESS_OWNER",
          platformRole: "USER",
        }),
      ]),
    );
    expect(detail.body.subscription.plan.name).toContain("Admin Plan");
  });

  it("updates one business status, isolates the other, and writes an audit log", async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/businesses/${businessAId}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ status: "SUSPENDED" })
      .expect(200);
    expect(updated.body.status).toBe("SUSPENDED");

    const other = await request(app.getHttpServer())
      .get(`/api/v1/admin/businesses/${businessBId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .expect(200);
    expect(other.body.status).toBe("ACTIVE");

    const audit = await prisma.auditLog.findFirst({
      where: {
        businessId: businessAId,
        action: "BUSINESS_STATUS_UPDATED",
        entityId: businessAId,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit?.metadata).toMatchObject({
      from: "ACTIVE",
      to: "SUSPENDED",
    });

    const filtered = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .query({
        businessId: businessAId,
        action: "BUSINESS_STATUS",
        entityType: "Business",
      })
      .expect(200);
    expect(filtered.body.items.length).toBeGreaterThanOrEqual(1);
    expect(
      filtered.body.items.every(
        (item: { businessId: string; action: string }) =>
          item.businessId === businessAId &&
          item.action === "BUSINESS_STATUS_UPDATED",
      ),
    ).toBe(true);

    const otherLogs = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .query({ businessId: businessBId, action: "BUSINESS_STATUS" })
      .expect(200);
    expect(otherLogs.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/businesses/${businessAId}/status`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);
  });

  it("lists subscriptions with plan, period, and payment status", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/subscriptions")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .query({ businessId: businessAId, status: "ACTIVE" })
      .expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: subscriptionAId,
          businessId: businessAId,
          status: "ACTIVE",
          billingPeriod: "MONTHLY",
          lastPayment: expect.objectContaining({ status: "SUCCEEDED" }),
        }),
      ]),
    );
    expect(
      response.body.items.every(
        (item: { businessId: string }) => item.businessId === businessAId,
      ),
    ).toBe(true);
  });

  it("creates and updates a six-month plan with iyzico mapping", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/admin/plans")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: `License ${suffix}`,
        billingPeriod: "SEMIANNUAL",
        price: "2495.00",
        limits: { maxStaff: 4, maxCustomers: 80, advancedFeatures: false },
        externalPricingPlanCode: "iyz-semi-1",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: `License ${suffix}`,
      billingPeriod: "SEMIANNUAL",
      price: "2495.00",
      currency: "TRY",
      isActive: true,
      externalPricingPlanCode: "iyz-semi-1",
      limits: { maxStaff: 4, maxCustomers: 80, advancedFeatures: false },
    });

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/plans/${created.body.id}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        price: "2595.00",
        externalPricingPlanCode: "iyz-semi-2",
        isActive: true,
      })
      .expect(200);
    expect(updated.body.price).toBe("2595.00");
    expect(updated.body.externalPricingPlanCode).toBe("iyz-semi-2");

    await prisma.plan.delete({ where: { id: created.body.id as string } });
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
    return {
      accessToken: response.body.accessToken as string,
      userId: response.body.user.id as string,
    };
  }

  async function getBusinessId(token: string): Promise<string> {
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    return me.body.memberships[0].businessId as string;
  }
});
