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
import { StaffModule } from "../src/staff/staff.module";

describe("Staff management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    businessA: `staff-a-${suffix}@example.test`,
    businessB: `staff-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let staffAId = "";
  let staffBId = "";
  let specialtyAId = "";
  let specialtyA2Id = "";
  let specialtyBId = "";

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

    const accountA = await register(emails.businessA, "Staff Business A");
    const accountB = await register(emails.businessB, "Staff Business B");
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

  it("creates tenant specialties and rejects duplicate names", async () => {
    specialtyAId = await createSpecialty(
      tokenA,
      businessAId,
      "Hair Styling",
    );
    specialtyA2Id = await createSpecialty(
      tokenA,
      businessAId,
      "Coloring",
    );
    specialtyBId = await createSpecialty(
      tokenB,
      businessBId,
      "Hair Styling",
    );

    const duplicate = await request(app.getHttpServer())
      .post("/api/v1/specializations")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ name: "Hair Styling" })
      .expect(409);
    expect(duplicate.body.code).toBe("SPECIALIZATION_NAME_EXISTS");
  });

  it("creates, lists and reads staff with assigned specialties", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        loginRole: "STAFF", firstName: "Ada",
        lastName: "Lovelace",
        phone: "+905551112233",
        email: "ADA@EXAMPLE.TEST",
        notes: "Senior stylist",
        specializationIds: [specialtyAId],
      })
      .expect(201);
    staffAId = response.body.id as string;
    expect(response.body).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.test",
      isActive: true,
    });
    expect(response.body.specializations).toHaveLength(1);

    const list = await request(app.getHttpServer())
      .get("/api/v1/staff?isActive=true&q=Ada")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(list.body.map((staff: { id: string }) => staff.id)).toContain(
      staffAId,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/staff/${staffAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
  });

  it("updates, deactivates and reactivates staff", async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/staff/${staffAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ notes: "Lead stylist", isActive: false })
      .expect(200);
    expect(updated.body).toMatchObject({
      notes: "Lead stylist",
      isActive: false,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/staff/${staffAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ isActive: true })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/staff/${staffAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    expect(
      await prisma.staff.findUniqueOrThrow({ where: { id: staffAId } }),
    ).toMatchObject({ isActive: false });
  });

  it("assigns and unassigns specialties with lifecycle checks", async () => {
    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/staff/${staffAId}/specializations`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ specializationId: specialtyA2Id })
      .expect(201);
    expect(assigned.body.specializations).toHaveLength(2);

    const duplicate = await request(app.getHttpServer())
      .post(`/api/v1/staff/${staffAId}/specializations`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ specializationId: specialtyA2Id })
      .expect(409);
    expect(duplicate.body.code).toBe(
      "STAFF_SPECIALIZATION_ALREADY_ASSIGNED",
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/specializations/${specialtyA2Id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/staff/${staffAId}/specializations/${specialtyA2Id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    const inactive = await request(app.getHttpServer())
      .post(`/api/v1/staff/${staffAId}/specializations`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ specializationId: specialtyA2Id })
      .expect(409);
    expect(inactive.body.code).toBe("SPECIALIZATION_INACTIVE");
  });

  it("prevents cross-tenant reads, writes and specialty assignments", async () => {
    staffBId = (
      await request(app.getHttpServer())
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${tokenB}`)
        .set(TENANT_HEADER, businessBId)
        .send({ loginRole: "STAFF", firstName: "Grace", lastName: "Hopper" })
        .expect(201)
    ).body.id as string;

    const read = await request(app.getHttpServer())
      .get(`/api/v1/staff/${staffBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);
    expect(read.body.code).toBe("RESOURCE_NOT_FOUND");

    await request(app.getHttpServer())
      .patch(`/api/v1/staff/${staffBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ firstName: "Forbidden" })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/staff/${staffAId}/specializations`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ specializationId: specialtyBId })
      .expect(404);
  });

  it("allows STAFF reads and rejects all management mutations", async () => {
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
      await request(app.getHttpServer())
        .get("/api/v1/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      const denied = await request(app.getHttpServer())
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ loginRole: "STAFF", firstName: "No", lastName: "Access" })
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

  it("returns default staff hours and stores weekly hours", async () => {
    const initial = await request(app.getHttpServer())
      .get(`/api/v1/staff/${staffAId}/hours`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(initial.body.days).toHaveLength(7);
    expect(initial.body.days[0]).toMatchObject({
      weekday: 0,
      isClosed: true,
    });

    const days = initial.body.days.map(
      (day: {
        weekday: number;
        startMinutes: number;
        endMinutes: number;
        isClosed: boolean;
      }) =>
        day.weekday === 1
          ? { ...day, startMinutes: 600, endMinutes: 1080, isClosed: false }
          : day,
    );
    const saved = await request(app.getHttpServer())
      .put(`/api/v1/staff/${staffAId}/hours`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ days })
      .expect(200);
    expect(saved.body.days[1]).toMatchObject({
      weekday: 1,
      startMinutes: 600,
      endMinutes: 1080,
      isClosed: false,
    });
  });

  it.each([
    ["missing names", {}],
    ["invalid phone", { firstName: "A", lastName: "B", phone: "123" }],
    ["invalid email", { firstName: "A", lastName: "B", email: "bad" }],
    [
      "client business id",
      { firstName: "A", lastName: "B", businessId: randomUUID() },
    ],
  ])("rejects %s during staff creation", async (_name, body) => {
    await request(app.getHttpServer())
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send(body)
      .expect(400);
  });

  it("rejects empty updates and missing tenant context", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/staff/${staffAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({})
      .expect(400);
    const missingTenant = await request(app.getHttpServer())
      .get("/api/v1/staff")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(400);
    expect(missingTenant.body.code).toBe("TENANT_HEADER_REQUIRED");
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

  async function createSpecialty(
    token: string,
    businessId: string,
    name: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/specializations")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ name })
      .expect(201);
    return response.body.id as string;
  }
});
