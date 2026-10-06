import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { parseApiEnv } from "@xenior/config";
import { TENANT_HEADER } from "@xenior/types";
import request from "supertest";
import type { App } from "supertest/types";
import { AppointmentsModule } from "../src/appointments/appointments.module";
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
import { LedgerModule } from "../src/ledger/ledger.module";

describe("Ledger cash sales (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `ledger-a-${suffix}@example.test`,
    b: `ledger-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let customerAId = "";
  let staffAId = "";
  let serviceAId = "";

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
        AppointmentsModule,
        LedgerModule,
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
    tokenA = (await register(emails.a, "Ledger A")).accessToken;
    tokenB = (await register(emails.b, "Ledger B")).accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);
    const seeded = await seedTenant(businessAId);
    customerAId = seeded.customerId;
    staffAId = seeded.staffId;
    serviceAId = seeded.serviceId;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const businessIds = [businessAId, businessBId].filter(Boolean);
    await prisma.checkoutIntent.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.officialDocument.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.tenantUyumsoftSettings.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.tenantPaymentSettings.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.customerLedgerEntry.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.collection.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.salesReceipt.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.expense.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.sale.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.cashAccount.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.appointmentEvent.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.appointment.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.staff.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.service.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.authToken.deleteMany({
      where: { businessId: { in: businessIds } },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("creates a sale on complete, collects cash, and issues a receipt", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2034-03-10T10:00:00.000Z",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/complete`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);

    const sales = await request(app.getHttpServer())
      .get(`/api/v1/sales?appointmentId=${created.body.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(sales.body.items[0]).toMatchObject({
      totalAmount: "250.00",
      remainingAmount: "250.00",
      status: "OPEN",
    });
    const saleId = sales.body.items[0].id as string;

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerAId },
    });
    expect(customer.ledgerBalance.toFixed(2)).toBe("250.00");

    const isolated = await request(app.getHttpServer())
      .get("/api/v1/sales")
      .set("Authorization", `Bearer ${tokenB}`)
      .set(TENANT_HEADER, businessBId)
      .expect(200);
    expect(isolated.body.items).toHaveLength(0);

    const collected = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/collections`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ amount: "250.00" })
      .expect(201);
    expect(collected.body).toMatchObject({
      status: "SETTLED",
      collectedAmount: "250.00",
      remainingAmount: "0.00",
    });

    const after = await prisma.customer.findUniqueOrThrow({
      where: { id: customerAId },
    });
    expect(after.ledgerBalance.toFixed(2)).toBe("0.00");

    const accounts = await request(app.getHttpServer())
      .get("/api/v1/cash-accounts")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(accounts.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Nakit kasa", balance: "250.00" }),
      ]),
    );

    const receipt = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/receipt`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
    expect(receipt.body.receiptNo).toMatch(/^FIS-\d{4}-00001$/);
    expect(receipt.body.html).toContain("250.00");
  });

  it("blocks ADMIN cash writes and STAFF account definition", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    const membership = {
      businessId_userId: { businessId: businessAId, userId: user.id },
    };
    await prisma.businessUser.update({
      where: membership,
      data: { role: "BUSINESS_ADMIN" },
    });
    try {
      const denied = await request(app.getHttpServer())
        .post("/api/v1/cash-accounts")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({ name: "Banka", type: "BANK" })
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: membership,
        data: { role: "BUSINESS_OWNER" },
      });
    }

    await prisma.businessUser.update({
      where: membership,
      data: { role: "STAFF" },
    });
    try {
      const denied = await request(app.getHttpServer())
        .get("/api/v1/cash-accounts")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: membership,
        data: { role: "BUSINESS_OWNER" },
      });
    }
  });

  async function seedTenant(businessId: string) {
    const [customer, staff, service] = await Promise.all([
      prisma.customer.create({
        data: { businessId, firstName: "Ada", lastName: "Lovelace" },
      }),
      prisma.staff.create({
        data: { businessId, firstName: "Stylist", lastName: "One" },
      }),
      prisma.service.create({
        data: {
          businessId,
          name: "Hair Cut",
          durationMinutes: 60,
          price: "250.00",
        },
      }),
    ]);
    return {
      customerId: customer.id,
      staffId: staff.id,
      serviceId: service.id,
    };
  }

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
