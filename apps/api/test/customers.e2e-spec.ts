import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { CustomersModule } from "../src/customers/customers.module";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures } from "./cleanup";

describe("Customer management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `customer-a-${suffix}@example.test`,
    b: `customer-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let customerAId = "";
  let customerBId = "";
  let storageDir = "";

  beforeAll(async () => {
    storageDir = await mkdtemp(join(tmpdir(), "xenior-customer-files-"));
    process.env.STORAGE_DRIVER = "local";
    process.env.STORAGE_LOCAL_DIR = storageDir;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config) => parseApiEnv(config),
        }),
        PrismaModule,
        AuthModule,
        AuthorizationModule,
        CustomersModule,
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

    const accountA = await register(emails.a, "Customer Business A");
    const accountB = await register(emails.b, "Customer Business B");
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
    const userIds = users.map((user) => user.id);
    await prisma.appointment.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customerFile.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.staff.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.service.deleteMany({
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
    if (storageDir) {
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it("creates, lists, reads and updates a tenant customer", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        phone: "+905551112233",
        email: "ADA@EXAMPLE.TEST",
        birthDate: "1990-05-15",
        notes: "Regular client",
      })
      .expect(201);
    customerAId = created.body.id as string;
    expect(created.body).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+905551112233",
      email: "ada@example.test",
      birthDate: "1990-05-15",
      ledgerBalance: "0.00",
      isActive: true,
    });

    const listed = await request(app.getHttpServer())
      .get("/api/v1/customers?isActive=true")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(
      customerAId,
    );
    expect(listed.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      hasMore: false,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ notes: "VIP client", lastName: "Byron" })
      .expect(200);
    expect(updated.body).toMatchObject({
      notes: "VIP client",
      lastName: "Byron",
    });
  });

  it("searches customers server-side by name, phone and email", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        firstName: "Mehmet",
        lastName: "Demir",
        phone: "+905559998877",
        email: "mehmet.demir@example.test",
      })
      .expect(201);

    const byName = await search("Ada");
    expect(byName.body.items).toHaveLength(1);
    expect(byName.body.items[0].id).toBe(customerAId);

    const byFullName = await search("Ada Byron");
    expect(byFullName.body.items.map((item: { id: string }) => item.id)).toContain(
      customerAId,
    );

    const byPhone = await search("555111");
    expect(byPhone.body.items).toHaveLength(1);
    expect(byPhone.body.items[0].phone).toBe("+905551112233");

    const byEmail = await search("ada@example");
    expect(byEmail.body.items).toHaveLength(1);
    expect(byEmail.body.items[0].email).toBe("ada@example.test");

    const paged = await request(app.getHttpServer())
      .get("/api/v1/customers?page=1&pageSize=1")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.total).toBe(2);
    expect(paged.body.hasMore).toBe(true);
  });

  it("deactivates without deleting the customer row", async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(204);
    expect(
      await prisma.customer.findUniqueOrThrow({ where: { id: customerAId } }),
    ).toMatchObject({ isActive: false });

    const active = await request(app.getHttpServer())
      .get("/api/v1/customers?isActive=true")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(
      active.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(customerAId);

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ isActive: true })
      .expect(200);
  });

  it("returns real appointment history and an empty page when none exist", async () => {
    const empty = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}/appointments`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(empty.body).toMatchObject({
      items: [],
      total: 0,
      hasMore: false,
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    const [staff, service] = await Promise.all([
      prisma.staff.create({
        data: { businessId: businessAId, firstName: "Stylist", lastName: "One" },
      }),
      prisma.service.create({
        data: {
          businessId: businessAId,
          name: "Hair Cut",
          durationMinutes: 45,
          price: "250.00",
        },
      }),
    ]);
    await prisma.appointment.create({
      data: {
        businessId: businessAId,
        customerId: customerAId,
        staffId: staff.id,
        serviceId: service.id,
        createdByUserId: user.id,
        startAt: new Date("2032-01-01T09:00:00.000Z"),
        endAt: new Date("2032-01-01T09:45:00.000Z"),
        serviceNameSnapshot: "Hair Cut",
        serviceDurationSnapshot: 45,
        servicePriceSnapshot: "250.00",
        listPriceSnapshot: "250.00",
        currency: "TRY",
      },
    });

    const history = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}/appointments`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(history.body.total).toBe(1);
    expect(history.body.items[0]).toMatchObject({
      serviceNameSnapshot: "Hair Cut",
      servicePriceSnapshot: "250.00",
      currency: "TRY",
      staff: { firstName: "Stylist", lastName: "One" },
    });
  });

  it("prevents cross-tenant reads, writes and history access", async () => {
    customerBId = (
      await request(app.getHttpServer())
        .post("/api/v1/customers")
        .set("Authorization", `Bearer ${tokenB}`)
        .set(TENANT_HEADER, businessBId)
        .send({ firstName: "Grace", lastName: "Hopper" })
        .expect(201)
    ).body.id as string;

    const read = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);
    expect(read.body.code).toBe("RESOURCE_NOT_FOUND");

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ firstName: "Forbidden" })
      .expect(404);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerBId}/appointments`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);
    expect(history.body.code).toBe("RESOURCE_NOT_FOUND");

    const searchB = await request(app.getHttpServer())
      .get("/api/v1/customers?q=Grace")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
      expect(searchB.body.items).toHaveLength(0);
  });

  it("stores a KVKK PDF on the customer card and keeps ledger at zero", async () => {
    const pdf = Buffer.from("%PDF-1.4 xenior-kvkk-test");
    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerAId}/files`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .field("kind", "KVKK")
      .attach("file", pdf, { filename: "kvkk.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(uploaded.body).toMatchObject({
      customerId: customerAId,
      kind: "KVKK",
      originalName: "kvkk.pdf",
      contentType: "application/pdf",
      sizeBytes: pdf.length,
    });

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}/files`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: uploaded.body.id, kind: "KVKK" }),
      ]),
    );

    const downloaded = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customerAId}/files/${uploaded.body.id as string}/content`,
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .buffer()
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(Buffer.from(downloaded.body as Buffer)).toEqual(pdf);

    const isolated = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}/files`)
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(404);
    expect(isolated.body.code).toBe("RESOURCE_NOT_FOUND");

    const card = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(card.body.ledgerBalance).toBe("0.00");
  });

  it("rejects unsupported customer file types", async () => {
    const denied = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerAId}/files`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .field("kind", "OTHER")
      .attach("file", Buffer.from("not-a-document"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .expect(400);
    expect(denied.body.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("allows STAFF reads and rejects customer mutations", async () => {
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
        .get("/api/v1/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerAId}/appointments`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerAId}/files`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      const denied = await request(app.getHttpServer())
        .post("/api/v1/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ firstName: "No", lastName: "Access" })
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
      const fileDenied = await request(app.getHttpServer())
        .post(`/api/v1/customers/${customerAId}/files`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .field("kind", "KVKK")
        .attach("file", Buffer.from("%PDF-1.4"), {
          filename: "staff.pdf",
          contentType: "application/pdf",
        })
        .expect(403);
      expect(fileDenied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
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
    ["missing names", {}],
    ["invalid phone", { firstName: "A", lastName: "B", phone: "123" }],
    ["invalid email", { firstName: "A", lastName: "B", email: "bad" }],
    [
      "future birth date",
      { firstName: "A", lastName: "B", birthDate: "2099-01-01" },
    ],
    [
      "invalid birth date",
      { firstName: "A", lastName: "B", birthDate: "2026-02-30" },
    ],
    [
      "client business id",
      { firstName: "A", lastName: "B", businessId: randomUUID() },
    ],
  ])("rejects %s during customer creation", async (_name, body) => {
    await request(app.getHttpServer())
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send(body)
      .expect(400);
  });

  it("rejects empty updates and missing tenant context", async () => {
    const empty = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({})
      .expect(400);
    expect(empty.body.code).toBe("EMPTY_UPDATE");
    const missingTenant = await request(app.getHttpServer())
      .get("/api/v1/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(400);
    expect(missingTenant.body.code).toBe("TENANT_HEADER_REQUIRED");
  });

  async function search(q: string) {
    return request(app.getHttpServer())
      .get(`/api/v1/customers?q=${encodeURIComponent(q)}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
  }

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
