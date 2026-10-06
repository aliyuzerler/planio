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
import { cleanupTenantFixtures as _cleanupTenantFixtures } from "./cleanup";
import { ResourcesModule } from "../src/resources/resources.module";

describe("Resource management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `resource-a-${suffix}@example.test`,
    b: `resource-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let resourceAId = "";

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
        ResourcesModule,
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

    tokenA = (await register(emails.a, "Resource Business A")).accessToken;
    tokenB = (await register(emails.b, "Resource Business B")).accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.resource.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.authToken.deleteMany({
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

  it("creates, lists and isolates tenant resources", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/resources")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Koltuk 1" })
      .expect(201);
    resourceAId = created.body.id as string;
    expect(created.body).toMatchObject({
      name: "Koltuk 1",
      isActive: true,
    });

    await request(app.getHttpServer())
      .post("/api/v1/resources")
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .send({ name: "Koltuk 1" })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post("/api/v1/resources")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Koltuk 1" })
      .expect(409);
    expect(duplicate.body.code).toBe("RESOURCE_NAME_EXISTS");

    const list = await request(app.getHttpServer())
      .get("/api/v1/resources?isActive=true")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(resourceAId);
  });

  it("deactivates a resource without deleting it", async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/resources/${resourceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    expect(
      await prisma.resource.findUniqueOrThrow({ where: { id: resourceAId } }),
    ).toMatchObject({ isActive: false });
  });

  it("allows STAFF reads and rejects resource mutations", async () => {
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
        .get("/api/v1/resources")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      await request(app.getHttpServer())
        .post("/api/v1/resources")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ name: "Forbidden" })
        .expect(403);
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
        firstName: "Resource",
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
