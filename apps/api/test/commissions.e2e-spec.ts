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
import { CommissionsModule } from "../src/commissions/commissions.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures } from "./cleanup";

describe("Commissions (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `commission-a-${suffix}@example.test`,
    b: `commission-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let serviceAId = "";
  let ruleAId = "";

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
        CommissionsModule,
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

    tokenA = (await register(emails.a, "Commission A")).accessToken;
    tokenB = (await register(emails.b, "Commission B")).accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);
    serviceAId = (
      await prisma.service.create({
        data: {
          businessId: businessAId,
          name: "Manikür",
          durationMinutes: 45,
          price: "450.00",
        },
      })
    ).id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.checkoutIntent.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.commissionEntry.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.commissionRule.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.service.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({
      where: { id: { in: [businessAId, businessBId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("creates a tenant commission rule", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/commissions/rules")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        name: "Manikür %20",
        commissionType: "PERCENT",
        commissionValue: "20.00",
        serviceId: serviceAId,
      })
      .expect(201);
    ruleAId = created.body.id as string;
    expect(created.body).toMatchObject({
      name: "Manikür %20",
      commissionType: "PERCENT",
      commissionValue: "20.00",
      serviceId: serviceAId,
    });
  });

  it("hides rules from the other tenant and rejects staff writes", async () => {
    const isolated = await request(app.getHttpServer())
      .get(`/api/v1/commissions/rules/${ruleAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(404);
    expect(isolated.body.code).toBe("RESOURCE_NOT_FOUND");

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    await prisma.businessUser.update({
      where: {
        businessId_userId: { businessId: businessAId, userId: user.id },
      },
      data: { role: "STAFF" },
    });
    try {
      const deniedRules = await request(app.getHttpServer())
        .get("/api/v1/commissions/rules")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(403);
      expect(deniedRules.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
      const entries = await request(app.getHttpServer())
        .get("/api/v1/commissions/entries")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(403);
      expect(entries.body.code).toBe("STAFF_PROFILE_REQUIRED");
    } finally {
      await prisma.businessUser.update({
        where: {
          businessId_userId: { businessId: businessAId, userId: user.id },
        },
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  async function register(email: string, businessName: string) {
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
