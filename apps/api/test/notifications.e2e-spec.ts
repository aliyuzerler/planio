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
import { cleanupTenantFixtures } from "./cleanup";
import { NotificationDeliveryService } from "../src/notifications/notification-delivery.service";
import { NotificationsModule } from "../src/notifications/notifications.module";

describe("Notification system (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let delivery: NotificationDeliveryService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const email = `notify-${suffix}@example.test`;
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
    delivery = app.get(NotificationDeliveryService);

    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        firstName: "Notify",
        lastName: "Owner",
        businessName: "Notify Salon",
      })
      .expect(201);
    token = registered.body.accessToken as string;
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    businessId = me.body.memberships[0].businessId as string;
    const [customer, staff, service] = await Promise.all([
      prisma.customer.create({
        data: {
          businessId,
          firstName: "Ada",
          lastName: "Lovelace",
          phone: "+905551112233",
        },
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
    customerId = customer.id;
    staffId = staff.id;
    serviceId = service.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email },
      select: { id: true },
    });
    await cleanupTenantFixtures(
      prisma,
      [businessId],
      users.map((user) => user.id),
    );
    await app.close();
  });

  it("reads and updates tenant notification settings", async () => {
    const initial = await request(app.getHttpServer())
      .get("/api/v1/notifications/settings")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(initial.body).toMatchObject({
      businessId,
      smsEnabled: true,
      reminderMinutesBefore: 60,
    });

    const updated = await request(app.getHttpServer())
      .patch("/api/v1/notifications/settings")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ reminderMinutesBefore: 1440, pushEnabled: false })
      .expect(200);
    expect(updated.body).toMatchObject({
      reminderMinutesBefore: 1440,
      pushEnabled: false,
    });
  });

  it("enqueues and delivers appointment notifications through mock providers", async () => {
    await request(app.getHttpServer())
      .patch("/api/v1/notifications/settings")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ reminderMinutesBefore: 60, smsEnabled: true, pushEnabled: true })
      .expect(200);

    const created = await book("2033-02-01T10:00:00.000Z");
    const items = await waitForNotifications(created.id, 2);
    const sms = items.find((item) => item.channel === "SMS" && item.type === "APPOINTMENT_CONFIRMED");
    expect(sms).toBeTruthy();
    await delivery.process(sms!.id);
    const sent = await prisma.notification.findUniqueOrThrow({ where: { id: sms!.id } });
    expect(sent.status).toBe("SENT");
    expect(sent.provider).toBe("mock-sms");

    const listed = await request(app.getHttpServer())
      .get("/api/v1/notifications?status=SENT")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .expect(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(
      sms!.id,
    );

    let reminder = items.find((item) => item.type === "APPOINTMENT_REMINDER");
    for (let attempt = 0; attempt < 30 && !reminder; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const latest = await prisma.notification.findMany({
        where: { businessId, appointmentId: created.id },
      });
      reminder = latest.find((item) => item.type === "APPOINTMENT_REMINDER");
    }
    expect(reminder).toBeTruthy();
    expect(reminder!.status).toBe("SCHEDULED");
    expect(reminder!.scheduledAt).toBeTruthy();
  });

  it("records invalid notifications and provider failures", async () => {
    const silent = await prisma.customer.create({
      data: { businessId, firstName: "No", lastName: "Phone" },
    });
    const created = await book("2033-02-02T10:00:00.000Z", silent.id);
    const items = await waitForNotifications(created.id, 2);
    const sms = items.find((item) => item.channel === "SMS" && item.type === "APPOINTMENT_CONFIRMED");
    await expect(delivery.process(sms!.id)).rejects.toThrow();
    const failed = await prisma.notification.findUniqueOrThrow({
      where: { id: sms!.id },
    });
    expect(failed.status).toBe("FAILED");
    expect(failed.errorCode).toBe("MISSING_DESTINATION");

    const flaky = await prisma.customer.create({
      data: {
        businessId,
        firstName: "Fail",
        lastName: "Provider",
        phone: "+900000000000",
      },
    });
    const failedAppt = await book("2033-02-03T10:00:00.000Z", flaky.id);
    const failItems = await waitForNotifications(failedAppt.id, 2);
    const failSms = failItems.find(
      (item) => item.channel === "SMS" && item.type === "APPOINTMENT_CONFIRMED",
    );
    await expect(delivery.process(failSms!.id)).rejects.toThrow();
    const providerFailed = await prisma.notification.findUniqueOrThrow({
      where: { id: failSms!.id },
    });
    expect(providerFailed.status).toBe("FAILED");
    expect(providerFailed.errorCode).toBe("PROVIDER_FAILURE");
  });

  it("registers a push device for the authenticated member", async () => {
    const device = await request(app.getHttpServer())
      .post("/api/v1/notifications/devices")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({ token: "fcm-test-token-1234", platform: "ANDROID" })
      .expect(201);
    expect(device.body).toMatchObject({
      token: "fcm-test-token-1234",
      platform: "ANDROID",
      isActive: true,
    });
  });

  function book(startAt: string, nextCustomerId = customerId) {
    return request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .set(TENANT_HEADER, businessId)
      .send({
        customerId: nextCustomerId,
        staffId,
        serviceId,
        startAt,
      })
      .expect(201)
      .then((response) => ({ id: response.body.id as string }));
  }

  async function waitForNotifications(appointmentId: string, minimum: number) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const items = await prisma.notification.findMany({
        where: { businessId, appointmentId },
      });
      if (items.length >= minimum) return items;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Expected at least ${minimum} notifications.`);
  }
});
