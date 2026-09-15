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
import { subscriptionWebhookSignature } from "../src/payments/iyzico/iyzico-webhook";
import { PaymentsModule } from "../src/payments/payments.module";
import { SubscriptionsModule } from "../src/subscriptions/subscriptions.module";

const webhookSecret = "test-iyzico-secret-key-not-for-production";
const merchantId = "123456";

describe("iyzico payments (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const email = `pay-${suffix}@example.test`;
  let token = "";
  let businessId = "";
  let planId = "";

  beforeAll(async () => {
    process.env.IYZICO_SECRET_KEY = webhookSecret;
    process.env.IYZICO_MERCHANT_ID = merchantId;
    delete process.env.IYZICO_API_KEY;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config) => parseApiEnv(config),
        }),
        PrismaModule,
        AuthModule,
        AuthorizationModule,
        SubscriptionsModule,
        PaymentsModule,
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

    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "StrongPassword!123",
        firstName: "Pay",
        lastName: "Owner",
        businessName: "Pay Salon",
      })
      .expect(201);
    token = registered.body.accessToken as string;
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    businessId = me.body.memberships[0].businessId as string;
    const plan = await prisma.plan.findFirstOrThrow({
      where: { name: "Starter", billingPeriod: "MONTHLY", isActive: true },
    });
    planId = plan.id;
  }, 30000);

  afterAll(async () => {
    if (!prisma) return;
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.auditLog.deleteMany({ where: { businessId } });
    await prisma.payment.deleteMany({ where: { businessId } });
    await prisma.subscription.deleteMany({ where: { businessId } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.businessUser.deleteMany({ where: { userId: user.id } });
      await prisma.business.deleteMany({ where: { id: businessId } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
    await app.close();
  });

  function checkoutBody(id = planId) {
    return {
      planId: id,
      identityNumber: "11111111110",
      gsmNumber: "+905551112233",
      billingAddress: {
        address: "Test Street 1",
        city: "Istanbul",
        country: "Turkey",
      },
    };
  }

  it("activates a subscription only after a verified checkout result", async () => {
    const started = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send(checkoutBody())
      .expect(201);
    expect(started.body.payment.status).toBe("PROCESSING");
    expect(started.body.subscription.status).toBe("TRIALING");
    expect(started.body.checkout.token).toBeTruthy();

    const before = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(before.body.status).toBe("TRIALING");

    const synced = await request(app.getHttpServer())
      .post(`/api/v1/payments/${started.body.payment.id}/sync`)
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(201);
    expect(synced.body.status).toBe("SUCCEEDED");
    expect(synced.body.amount).toMatch(/^\d+\.\d{2}$/);

    const current = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(current.body.status).toBe("ACTIVE");
    expect(current.body.externalProvider).toBe("IYZICO");
  });

  it("rejects an invalid webhook signature and ignores a duplicate success", async () => {
    const current = await prisma.subscription.findFirstOrThrow({
      where: { businessId, status: "ACTIVE" },
    });
    const payload = {
      iyziEventType: "subscription.order.success",
      orderReferenceCode: `ord-${suffix}`,
      customerReferenceCode: current.externalCustomerId,
      subscriptionReferenceCode: current.externalSubscriptionId,
      iyziReferenceCode: `evt-${suffix}`,
    };
    const invalid = await request(app.getHttpServer())
      .post("/api/v1/payments/iyzico/webhooks")
      .set("x-iyz-signature-v3", "00".repeat(32))
      .send(payload)
      .expect(401);
    expect(invalid.body.code).toBe("WEBHOOK_SIGNATURE_INVALID");

    const signature = subscriptionWebhookSignature({
      merchantId,
      secretKey: webhookSecret,
      eventType: "subscription.order.success",
      subscriptionReferenceCode: String(payload.subscriptionReferenceCode),
      orderReferenceCode: payload.orderReferenceCode,
      customerReferenceCode: String(payload.customerReferenceCode),
    });
    await request(app.getHttpServer())
      .post("/api/v1/payments/iyzico/webhooks")
      .set("x-iyz-signature-v3", signature)
      .send(payload)
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/v1/payments/iyzico/webhooks")
      .set("x-iyz-signature-v3", signature)
      .send(payload)
      .expect(200);
    const paid = await prisma.payment.count({
      where: {
        businessId,
        externalPaymentId: payload.orderReferenceCode,
        status: "SUCCEEDED",
      },
    });
    expect(paid).toBe(1);
  });

  it("marks a recurring failure as PAST_DUE without trusting the payload alone", async () => {
    const current = await prisma.subscription.findFirstOrThrow({
      where: { businessId, status: "ACTIVE" },
    });
    const payload = {
      iyziEventType: "subscription.order.failure",
      orderReferenceCode: `fail-${suffix}`,
      customerReferenceCode: current.externalCustomerId,
      subscriptionReferenceCode: current.externalSubscriptionId,
    };
    const signature = subscriptionWebhookSignature({
      merchantId,
      secretKey: webhookSecret,
      eventType: "subscription.order.failure",
      subscriptionReferenceCode: String(payload.subscriptionReferenceCode),
      orderReferenceCode: payload.orderReferenceCode,
      customerReferenceCode: String(payload.customerReferenceCode),
    });
    await request(app.getHttpServer())
      .post("/api/v1/payments/iyzico/webhooks")
      .set("x-iyz-signature-v3", signature)
      .send(payload)
      .expect(200);
    const updated = await prisma.subscription.findFirstOrThrow({
      where: { id: current.id },
    });
    expect(updated.status).toBe("PAST_DUE");
  });
});
