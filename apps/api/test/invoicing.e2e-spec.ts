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
import { CampaignsModule } from "../src/campaigns/campaigns.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { PrismaModule } from "../src/infrastructure/prisma/prisma.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { cleanupTenantFixtures } from "./cleanup";
import { InvoicingModule } from "../src/invoicing/invoicing.module";
import { LedgerModule } from "../src/ledger/ledger.module";
import { NotificationsModule } from "../src/notifications/notifications.module";

describe("Official documents and campaign SMS (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const email = `invoicing-${suffix}@example.test`;
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
        InvoicingModule,
        CampaignsModule,
        NotificationsModule,
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
    token = (await register(email, "Invoice Salon")).accessToken;
    businessId = await getBusinessId(token);
    const seeded = await seedTenant(businessId);
    customerId = seeded.customerId;
    staffId = seeded.staffId;
    serviceId = seeded.serviceId;
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.notification.deleteMany({ where: { businessId } });
      await prisma.notificationSettings.deleteMany({ where: { businessId } });
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
      await prisma.campaignService.deleteMany({ where: { businessId } });
      await prisma.campaign.deleteMany({ where: { businessId } });
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

  it("issues an official SMM number after the internal receipt", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId,
        staffId,
        serviceId,
        startAt: "2036-03-10T10:00:00.000Z",
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

    const missing = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/official-document`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ type: "SMM" })
      .expect(400);
    expect(missing.body.code).toBe("RECEIPT_REQUIRED");

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/receipt`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);

    const issued = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/official-document`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ type: "SMM" })
      .expect(201);
    expect(issued.body).toMatchObject({
      saleId,
      type: "SMM",
      status: "ISSUED",
    });
    expect(issued.body.documentNo).toMatch(/^SMM-\d{4}-\d{5}$/);

    const again = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/official-document`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ type: "SMM" })
      .expect(201);
    expect(again.body.documentNo).toBe(issued.body.documentNo);

    const conflict = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleId}/official-document`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ type: "E_FATURA" })
      .expect(409);
    expect(conflict.body.code).toBe("OFFICIAL_DOCUMENT_EXISTS");

    const sale = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleId}`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(sale.body.officialDocument).toMatchObject({
      type: "SMM",
      status: "ISSUED",
      documentNo: issued.body.documentNo,
    });
  });

  it("skips customers without SMS consent on campaign broadcast", async () => {
    await prisma.customer.create({
      data: {
        businessId,
        firstName: "No",
        lastName: "Consent",
        phone: "+905551111111",
        smsConsent: false,
      },
    });
    await prisma.customer.create({
      data: {
        businessId,
        firstName: "No",
        lastName: "Phone",
        smsConsent: true,
      },
    });
    const campaign = await request(app.getHttpServer())
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        name: "Yaz SMS",
        discountType: "PERCENT",
        discountValue: "10.00",
        startsAt: "2036-06-01T00:00:00.000Z",
        endsAt: "2036-08-31T23:59:59.000Z",
        smsTemplate: "Yaz kampanyası başladı.",
      })
      .expect(201);

    const result = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/broadcast-sms`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({})
      .expect(201);
    expect(result.body).toMatchObject({
      queued: 1,
      skippedNoConsent: 1,
      skippedNoPhone: 1,
      skippedOverLimit: 0,
      body: "Yaz kampanyası başladı.",
    });
  });

  async function seedTenant(id: string) {
    const [customer, staff, service] = await Promise.all([
      prisma.customer.create({
        data: {
          businessId: id,
          firstName: "Ada",
          lastName: "Lovelace",
          phone: "+905550000001",
          smsConsent: true,
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
