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
import { cleanupTenantFixtures } from "./cleanup";
import { ServicesModule } from "../src/services/services.module";

describe("Service management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `service-a-${suffix}@example.test`,
    b: `service-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let serviceAId = "";
  let serviceBId = "";

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
        ServicesModule,
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

    const accountA = await register(emails.a, "Service Business A");
    const accountB = await register(emails.b, "Service Business B");
    tokenA = accountA.accessToken;
    tokenB = accountB.accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);
  });

  afterAll(async () => {
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

  it("creates services with decimal-string prices and rejects duplicate names", async () => {
    const created = await createService(tokenA, businessAId, "Hair Cut");
    serviceAId = created.id;
    serviceBId = (await createService(tokenB, businessBId, "Hair Cut")).id;
    expect(created).toMatchObject({
      name: "Hair Cut",
      durationMinutes: 45,
      price: "250.00",
      currency: "TRY",
      isActive: true,
    });
    expect(typeof created.price).toBe("string");

    const duplicate = await request(app.getHttpServer())
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Hair Cut", durationMinutes: 30, price: "100.00" })
      .expect(409);
    expect(duplicate.body.code).toBe("SERVICE_NAME_EXISTS");
  });

  it("lists, gets and updates tenant services", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/services?isActive=true&q=Hair")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        description: "Premium cut",
        durationMinutes: 60,
        price: "300.50",
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      description: "Premium cut",
      durationMinutes: 60,
      price: "300.50",
    });

    await request(app.getHttpServer())
      .get(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
  });

  it("deactivates and reactivates without deleting the service", async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    expect(
      await prisma.service.findUniqueOrThrow({ where: { id: serviceAId } }),
    ).toMatchObject({ isActive: false });

    await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ isActive: true })
      .expect(200);
  });

  it("preserves historical appointments when a service is deactivated", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    const [customer, staff] = await Promise.all([
      prisma.customer.create({
        data: { businessId: businessAId, firstName: "History", lastName: "One" },
      }),
      prisma.staff.create({
        data: { businessId: businessAId, firstName: "Stylist", lastName: "One" },
      }),
    ]);
    const appointment = await prisma.appointment.create({
      data: {
        businessId: businessAId,
        customerId: customer.id,
        staffId: staff.id,
        serviceId: serviceAId,
        createdByUserId: user.id,
        startAt: new Date("2032-01-01T09:00:00.000Z"),
        endAt: new Date("2032-01-01T10:00:00.000Z"),
        serviceNameSnapshot: "Hair Cut",
        serviceDurationSnapshot: 60,
        servicePriceSnapshot: "300.50",
        listPriceSnapshot: "300.50",
        currency: "TRY",
      },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    const preserved = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    expect(preserved).toMatchObject({
      serviceId: serviceAId,
      serviceNameSnapshot: "Hair Cut",
      serviceDurationSnapshot: 60,
    });
    expect(preserved.servicePriceSnapshot.toFixed(2)).toBe("300.50");
  });

  it("prevents cross-tenant access and writes", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/services/${serviceBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Forbidden" })
      .expect(404);
  });

  it("allows STAFF reads but rejects service mutations", async () => {
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
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      await request(app.getHttpServer())
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ name: "Forbidden", durationMinutes: 30, price: "100.00" })
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

  it.each([
    ["numeric price", { name: "A", durationMinutes: 30, price: 100 }],
    ["imprecise price", { name: "A", durationMinutes: 30, price: "100.1" }],
    ["negative price", { name: "A", durationMinutes: 30, price: "-1.00" }],
    ["zero duration", { name: "A", durationMinutes: 0, price: "1.00" }],
    [
      "client business id",
      {
        name: "A",
        durationMinutes: 30,
        price: "1.00",
        businessId: randomUUID(),
      },
    ],
  ])("rejects %s", async (_name, body) => {
    await request(app.getHttpServer())
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send(body)
      .expect(400);
  });

  it("rejects empty updates and missing tenant context", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/services")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(400);
  });

  async function register(email: string, businessName: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        firstName: "Service",
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

  async function createService(
    token: string,
    businessId: string,
    name: string,
  ): Promise<{ id: string; price: string }> {
    return (
      await request(app.getHttpServer())
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${token}`)
        .set(TENANT_HEADER, businessId)
        .send({ name, durationMinutes: 45, price: "250.00" })
        .expect(201)
    ).body as { id: string; price: string };
  }
});
