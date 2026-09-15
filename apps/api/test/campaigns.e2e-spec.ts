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
import { CampaignsModule } from "../src/campaigns/campaigns.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

describe("Campaigns (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `campaign-a-${suffix}@example.test`,
    b: `campaign-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let serviceAId = "";
  let campaignAId = "";

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
        CampaignsModule,
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

    tokenA = (await register(emails.a, "Campaign A")).accessToken;
    tokenB = (await register(emails.b, "Campaign B")).accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);
    serviceAId = (
      await prisma.service.create({
        data: {
          businessId: businessAId,
          name: "Hair Cut",
          durationMinutes: 60,
          price: "250.00",
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
    await prisma.campaignService.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.campaign.deleteMany({
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

  it("creates a tenant campaign and quotes the discounted price", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        name: "Haziran",
        discountType: "AMOUNT",
        discountValue: "50.00",
        startsAt: "2033-06-01T00:00:00.000Z",
        endsAt: "2033-06-30T23:59:59.000Z",
        serviceIds: [serviceAId],
      })
      .expect(201);
    campaignAId = created.body.id as string;

    const quote = await request(app.getHttpServer())
      .get(
        `/api/v1/campaigns/quote?serviceId=${serviceAId}&at=2033-06-10T09:00:00.000Z`,
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(quote.body).toMatchObject({
      listPrice: "250.00",
      discountAmount: "50.00",
      payableAmount: "200.00",
      campaignId: campaignAId,
    });

    const outside = await request(app.getHttpServer())
      .get(
        `/api/v1/campaigns/quote?serviceId=${serviceAId}&at=2033-07-10T09:00:00.000Z`,
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(outside.body).toMatchObject({
      payableAmount: "250.00",
      campaignId: null,
    });
  });

  it("hides campaigns from the other tenant and rejects staff writes", async () => {
    const isolated = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignAId}`)
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
      await request(app.getHttpServer())
        .get("/api/v1/campaigns")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      const denied = await request(app.getHttpServer())
        .post("/api/v1/campaigns")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          name: "Staff",
          discountType: "PERCENT",
          discountValue: "10.00",
          startsAt: "2033-08-01T00:00:00.000Z",
          endsAt: "2033-08-31T23:59:59.000Z",
        })
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
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
