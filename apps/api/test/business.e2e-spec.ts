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
import { BusinessModule } from "../src/business/business.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures } from "./cleanup";

describe("Business management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    businessA: `business-a-${suffix}@example.test`,
    businessB: `business-b-${suffix}@example.test`,
    accountant: `accountant-${suffix}@example.test`,
  };
  let tokenA = "";
  let businessAId = "";
  let businessBId = "";

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

    const accountA = await register(emails.businessA, "Business A");
    const accountB = await register(emails.businessB, "Business B");
    tokenA = accountA.accessToken;
    businessAId = await getBusinessId(accountA.accessToken);
    businessBId = await getBusinessId(accountB.accessToken);
  });

  afterAll(async () => {
    if (!businessAId || !businessBId) {
      if (app) await app.close();
      return;
    }
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    await cleanupTenantFixtures(
      prisma,
      [businessAId, businessBId],
      users.map((user) => user.id),
    );
    await app.close();
  });

  it("returns the profile selected by verified tenant context", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/business")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);

    expect(response.body).toMatchObject({
      id: businessAId,
      name: "Business A",
      timezone: "Europe/Istanbul",
      currency: "TRY",
      status: "ACTIVE",
    });
  });

  it("allows an owner to update mutable fields and records an audit log", async () => {
    const response = await request(app.getHttpServer())
      .patch("/api/v1/business")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        name: "Business A Updated",
        phone: "+905551112233",
        email: "INFO@BUSINESS-A.TEST",
        address: "Istanbul",
        timezone: "Europe/London",
        currency: "GBP",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: businessAId,
      name: "Business A Updated",
      phone: "+905551112233",
      email: "info@business-a.test",
      address: "Istanbul",
      timezone: "Europe/London",
      currency: "GBP",
    });
    const audit = await prisma.auditLog.findFirst({
      where: {
        businessId: businessAId,
        action: "BUSINESS_PROFILE_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.metadata).toMatchObject({
      fields: expect.arrayContaining(["name", "timezone", "currency"]),
    });
  });

  it("rejects updates from STAFF", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.businessA },
    });
    await prisma.businessUser.update({
      where: {
        businessId_userId: { businessId: businessAId, userId: user.id },
      },
      data: { role: "STAFF" },
    });

    try {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/business")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ name: "Forbidden update" })
        .expect(403);
      expect(response.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: {
          businessId_userId: { businessId: businessAId, userId: user.id },
        },
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  it("rejects cross-tenant access without changing the target", async () => {
    const before = await prisma.business.findUniqueOrThrow({
      where: { id: businessBId },
    });
    const response = await request(app.getHttpServer())
      .patch("/api/v1/business")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessBId)
      .send({ name: "Cross-tenant update" })
      .expect(403);
    expect(response.body.code).toBe("TENANT_ACCESS_DENIED");

    const after = await prisma.business.findUniqueOrThrow({
      where: { id: businessBId },
    });
    expect(after.name).toBe(before.name);
  });

  it("invites an accountant and accepts the login", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/business/accountant-invites")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        email: emails.accountant,
        firstName: "Ayse",
        lastName: "Muhasebe",
      })
      .expect(200);

    const invite = await prisma.authToken.findFirstOrThrow({
      where: {
        businessId: businessAId,
        email: emails.accountant,
        purpose: "STAFF_INVITE",
      },
    });
    expect(invite.metadata).toMatchObject({
      role: "ACCOUNTANT",
      staffId: expect.any(String),
    });

    const { createAuthTokenValue, hashAuthToken } = await import(
      "../src/auth/auth-token"
    );
    const raw = createAuthTokenValue();
    await prisma.authToken.update({
      where: { id: invite.id },
      data: { tokenHash: hashAuthToken(raw) },
    });

    const accepted = await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invite")
      .send({
        token: raw,
        password,
      })
      .expect(200);
    expect(accepted.body.user.email).toBe(emails.accountant);

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accepted.body.accessToken}`)
      .expect(200);
    expect(me.body.memberships[0].role).toBe("ACCOUNTANT");

    await request(app.getHttpServer())
      .get("/api/v1/business")
      .set("Authorization", `Bearer ${accepted.body.accessToken}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);

    const denied = await request(app.getHttpServer())
      .patch("/api/v1/business")
      .set("Authorization", `Bearer ${accepted.body.accessToken}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Muhasebe degistiremez" })
      .expect(403);
    expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
  });

  it("does not let an invite overwrite an existing account's password", async () => {
    // Business B sahibini Business A'ya muhasebeci olarak davet et: davet
    // linki ele geçse bile hesabın parolası değiştirilememeli.
    await request(app.getHttpServer())
      .post("/api/v1/business/accountant-invites")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ email: emails.businessB, firstName: "B", lastName: "Sahibi" })
      .expect(200);

    const invite = await prisma.authToken.findFirstOrThrow({
      where: {
        businessId: businessAId,
        email: emails.businessB,
        purpose: "STAFF_INVITE",
      },
    });
    const { createAuthTokenValue, hashAuthToken } = await import(
      "../src/auth/auth-token"
    );
    const raw = createAuthTokenValue();
    await prisma.authToken.update({
      where: { id: invite.id },
      data: { tokenHash: hashAuthToken(raw) },
    });

    // Mevcut parola gönderilmeden kabul edilemez (yeni parola verilse bile).
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invite")
      .send({ token: raw, password: "AttackerChosen!123" })
      .expect(400);
    expect(missing.body.code).toBe("CURRENT_PASSWORD_REQUIRED");

    // Yanlış mevcut parola reddedilir ve davet token'ı yakılmaz.
    const wrong = await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invite")
      .send({ token: raw, currentPassword: "WrongPassword!123" })
      .expect(401);
    expect(wrong.body.code).toBe("INVALID_CREDENTIALS");

    // Saldırganın seçtiği parolayla giriş yapılamaz, orijinaliyle yapılır.
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emails.businessB, password: "AttackerChosen!123" })
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emails.businessB, password })
      .expect(200);

    // Doğru mevcut parola ile davet kabul edilir; parola yine değişmez.
    const accepted = await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invite")
      .send({ token: raw, currentPassword: password })
      .expect(200);
    expect(accepted.body.user.email).toBe(emails.businessB);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emails.businessB, password })
      .expect(200);

    // Kullanılmış token ikinci kez kabul edilmez.
    await request(app.getHttpServer())
      .post("/api/v1/auth/accept-invite")
      .send({ token: raw, currentPassword: password })
      .expect(400);
  });

  it.each([
    ["invalid email", { email: "not-an-email" }],
    ["invalid phone", { phone: "123" }],
    ["invalid timezone", { timezone: "Not/A/Timezone" }],
    ["invalid currency", { currency: "try" }],
    ["short name", { name: "A" }],
    ["empty update", {}],
    ["client-provided businessId", { businessId: randomUUID() }],
  ])("rejects %s", async (_name, body) => {
    await request(app.getHttpServer())
      .patch("/api/v1/business")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send(body)
      .expect(400);
  });

  async function register(
    email: string,
    businessName: string,
  ): Promise<{ accessToken: string }> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
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
