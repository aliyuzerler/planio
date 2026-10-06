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
import { AuditModule } from "../src/audit/audit.module";
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
import { PrivacyModule } from "../src/privacy/privacy.module";
import { ReportsModule } from "../src/reports/reports.module";

describe("Reports audit privacy (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const email = `reports-${suffix}@example.test`;
  let token = "";
  let businessId = "";
  let customerId = "";
  let staffId = "";
  let serviceId = "";

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
        ReportsModule,
        AuditModule,
        PrivacyModule,
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
    token = (await register(email, "Report Salon")).accessToken;
    businessId = await getBusinessId(token);
    const seeded = await seedTenant(businessId);
    customerId = seeded.customerId;
    staffId = seeded.staffId;
    serviceId = seeded.serviceId;
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.dataRequest.deleteMany({ where: { businessId } });
      await prisma.officialDocument.deleteMany({ where: { businessId } });
      await prisma.tenantUyumsoftSettings.deleteMany({ where: { businessId } });
      await prisma.checkoutIntent.deleteMany({ where: { businessId } });
      await prisma.tenantPaymentSettings.deleteMany({ where: { businessId } });
      await prisma.customerLedgerEntry.deleteMany({ where: { businessId } });
      await prisma.collection.deleteMany({ where: { businessId } });
      await prisma.salesReceipt.deleteMany({ where: { businessId } });
      await prisma.expense.deleteMany({ where: { businessId } });
      await prisma.sale.deleteMany({ where: { businessId } });
      await prisma.cashAccount.deleteMany({ where: { businessId } });
      await prisma.appointmentEvent.deleteMany({ where: { businessId } });
      await prisma.appointment.deleteMany({ where: { businessId } });
      await prisma.customer.deleteMany({ where: { businessId } });
      await prisma.staff.deleteMany({ where: { businessId } });
      await prisma.auditLog.deleteMany({ where: { businessId } });
      await prisma.service.deleteMany({ where: { businessId } });
      await prisma.subscription.deleteMany({ where: { businessId } });
      await prisma.authToken.deleteMany({ where: { businessId } });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.businessUser.deleteMany({ where: { userId: user.id } });
      if (businessId) {
        await prisma.business.deleteMany({ where: { id: businessId } });
      }
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
    await app.close();
  });

  it("returns daily finance summary for the owner", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId,
        staffId,
        serviceId,
        startAt: "2037-04-10T10:00:00.000Z",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    const sales = await request(app.getHttpServer())
      .get(`/api/v1/sales?appointmentId=${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    const saleId = sales.body.items[0].id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/collections`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ amount: "250.00" })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(summary.body.currency).toBe("TRY");
    expect(summary.body.cash.accounts.length).toBeGreaterThan(0);
    expect(Number(summary.body.cash.collectionsIn)).toBeGreaterThanOrEqual(250);

    const audit = await request(app.getHttpServer())
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(audit.body.items.length).toBeGreaterThan(0);
  });

  it("blocks STAFF from reports and anonymizes customers on erase", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const membership = {
      businessId_userId: { businessId, userId: user.id },
    };
    await prisma.businessUser.update({
      where: membership,
      data: { role: "STAFF" },
    });
    try {
      const denied = await request(app.getHttpServer())
        .get("/api/v1/reports/summary")
        .set("Authorization", `Bearer ${token}`)
        .set(TENANT_HEADER, businessId)
        .expect(403);
      expect(denied.body.code).toBe("INSUFFICIENT_BUSINESS_ROLE");
    } finally {
      await prisma.businessUser.update({
        where: membership,
        data: { role: "BUSINESS_OWNER" },
      });
    }

    const erase = await request(app.getHttpServer())
      .post("/api/v1/privacy/erase")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(202);
    expect(erase.body).toMatchObject({ type: "ERASE", status: "COMPLETED" });

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(customer.firstName).toBe("Anonim");
    expect(customer.phone).toBeNull();
    expect(customer.email).toBeNull();
  });

  async function seedTenant(id: string) {
    const [customer, staff, service] = await Promise.all([
      prisma.customer.create({
        data: {
          businessId: id,
          firstName: "Ada",
          lastName: "Lovelace",
          phone: "+905559999001",
          email: `ada-${suffix}@example.test`,
        },
      }),
      prisma.staff.create({
        data: { businessId: id, firstName: "Stylist", lastName: "One" },
      }),
      prisma.service.create({
        data: {
          businessId: id,
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

  async function register(ownerEmail: string, businessName: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: ownerEmail,
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
