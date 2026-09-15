import { randomUUID } from "node:crypto";
import {
  Controller,
  Get,
  INestApplication,
  Param,
  Patch,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { parseApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import * as argon2 from "argon2";
import request from "supertest";
import type { App } from "supertest/types";
import { AuthModule } from "../src/auth/auth.module";
import {
  AllowSuperAdminBypass,
  RequireBusinessRoles,
  RequirePlatformRoles,
  SkipTenant,
} from "../src/authorization/authorization.decorators";
import { AuthorizationModule } from "../src/authorization/authorization.module";
import { BusinessRolesGuard } from "../src/authorization/business-roles.guard";
import { CurrentAuthorization } from "../src/authorization/current-authorization.decorator";
import { PlatformRolesGuard } from "../src/authorization/platform-roles.guard";
import { RequestContextInterceptor } from "../src/authorization/request-context.interceptor";
import type { RequestAuthorizationContext } from "../src/authorization/request-authorization-context.interface";
import { TenantContextGuard } from "../src/authorization/tenant-context.guard";
import {
  TenantResourceAccessService,
  type TenantResourceType,
} from "../src/authorization/tenant-resource-access.service";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

const resourceTypes = new Set<TenantResourceType>([
  "customer",
  "staff",
  "service",
  "appointment",
]);

@Controller("_authorization-test")
class AuthorizationTestController {
  constructor(private readonly resources: TenantResourceAccessService) {}

  @Get("resources/:type/:id")
  @RequireBusinessRoles("BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF")
  async readResource(
    @Param("type") type: TenantResourceType,
    @Param("id") id: string,
  ): Promise<{ allowed: true }> {
    if (!resourceTypes.has(type)) {
      throw new Error("Unsupported test resource.");
    }
    await this.resources.assertOwned(type, id);
    return { allowed: true };
  }

  @Patch("staff/:id")
  @RequireBusinessRoles("BUSINESS_OWNER", "BUSINESS_ADMIN")
  async modifyStaff(@Param("id") id: string): Promise<{ allowed: true }> {
    await this.resources.assertOwned("staff", id);
    return { allowed: true };
  }

  @Get("owner")
  @RequireBusinessRoles("BUSINESS_OWNER")
  ownerOnly(
    @CurrentAuthorization() authorization: RequestAuthorizationContext,
  ): RequestAuthorizationContext {
    return authorization;
  }

  @Get("platform")
  @SkipTenant()
  @RequirePlatformRoles("SUPER_ADMIN")
  platformOnly(): { allowed: true } {
    return { allowed: true };
  }

  @Get("bypass/service/:id")
  @AllowSuperAdminBypass()
  @RequirePlatformRoles("SUPER_ADMIN")
  @RequireBusinessRoles("BUSINESS_OWNER")
  async superAdminBypass(
    @Param("id") id: string,
  ): Promise<{ allowed: true }> {
    await this.resources.assertOwned("service", id);
    return { allowed: true };
  }
}

describe("Multi-tenant authorization (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    businessA: `tenant-a-${suffix}@example.test`,
    businessB: `tenant-b-${suffix}@example.test`,
    superAdmin: `super-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let superAdminToken = "";
  let businessAId = "";
  let businessBId = "";
  let customerBId = "";
  let staffBId = "";
  let serviceBId = "";
  let appointmentBId = "";

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
      ],
      controllers: [AuthorizationTestController],
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
    tokenB = accountB.accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);

    const userB = await prisma.user.findUniqueOrThrow({
      where: { email: emails.businessB },
    });
    const [customerB, staffB, serviceB] = await Promise.all([
      prisma.customer.create({
        data: {
          businessId: businessBId,
          firstName: "Customer",
          lastName: "B",
        },
      }),
      prisma.staff.create({
        data: {
          businessId: businessBId,
          firstName: "Staff",
          lastName: "B",
        },
      }),
      prisma.service.create({
        data: {
          businessId: businessBId,
          name: `Service ${suffix}`,
          durationMinutes: 30,
          price: "100.00",
        },
      }),
    ]);
    customerBId = customerB.id;
    staffBId = staffB.id;
    serviceBId = serviceB.id;
    const appointmentB = await prisma.appointment.create({
      data: {
        businessId: businessBId,
        customerId: customerB.id,
        staffId: staffB.id,
        serviceId: serviceB.id,
        createdByUserId: userB.id,
        startAt: new Date("2030-01-01T09:00:00.000Z"),
        endAt: new Date("2030-01-01T09:30:00.000Z"),
        serviceNameSnapshot: serviceB.name,
        serviceDurationSnapshot: serviceB.durationMinutes,
        servicePriceSnapshot: serviceB.price,
        listPriceSnapshot: serviceB.price,
        currency: "TRY",
      },
    });
    appointmentBId = appointmentB.id;

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
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.staff.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.service.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({
      where: { id: { in: [businessAId, businessBId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("rejects requests without an explicit tenant header", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/_authorization-test/resources/customer/${customerBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(400);

    expect(response.body.code).toBe("TENANT_HEADER_REQUIRED");
  });

  it("rejects Business A selecting Business B", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/_authorization-test/resources/customer/${customerBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessBId)
      .expect(403);

    expect(response.body.code).toBe("TENANT_ACCESS_DENIED");
  });

  it.each([
    ["customer", () => customerBId],
    ["service", () => serviceBId],
    ["appointment", () => appointmentBId],
  ] as const)(
    "prevents Business A reading Business B %s",
    async (type, getId) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/_authorization-test/resources/${type}/${getId()}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(404);

      expect(response.body.code).toBe("RESOURCE_NOT_FOUND");
    },
  );

  it("prevents Business A modifying Business B staff", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/_authorization-test/staff/${staffBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);

    expect(response.body.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("allows Business B to access its own resources", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/_authorization-test/resources/customer/${customerBId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(200, { allowed: true });
  });

  it("enforces declarative business roles", async () => {
    const userA = await prisma.user.findUniqueOrThrow({
      where: { email: emails.businessA },
    });
    await prisma.businessUser.update({
      where: {
        businessId_userId: {
          businessId: businessAId,
          userId: userA.id,
        },
      },
      data: { role: "STAFF" },
    });

    try {
      const response = await request(app.getHttpServer())
        .get("/api/v1/_authorization-test/owner")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(403);
      expect(response.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: {
          businessId_userId: {
            businessId: businessAId,
            userId: userA.id,
          },
        },
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  it("does not grant ordinary users platform authorization", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/_authorization-test/platform")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(403);

    expect(response.body.code).toBe("INSUFFICIENT_PLATFORM_ROLE");
  });

  it("does not give SUPER_ADMIN an implicit tenant bypass", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/_authorization-test/resources/service/${serviceBId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .set(TENANT_HEADER, businessBId)
      .expect(403);
  });

  it("allows SUPER_ADMIN only on explicitly bypass-enabled routes", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/_authorization-test/bypass/service/${serviceBId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .set(TENANT_HEADER, businessBId)
      .expect(200, { allowed: true });
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
        firstName: "Tenant",
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
