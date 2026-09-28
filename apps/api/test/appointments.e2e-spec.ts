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

describe("Appointment engine (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const password = "StrongPassword!123";
  const emails = {
    a: `appt-a-${suffix}@example.test`,
    b: `appt-b-${suffix}@example.test`,
  };
  let tokenA = "";
  let tokenB = "";
  let businessAId = "";
  let businessBId = "";
  let customerAId = "";
  let staffAId = "";
  let serviceAId = "";
  let customerBId = "";
  let staffBId = "";
  let serviceBId = "";
  let appointmentAId = "";

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

    const accountA = await register(emails.a, "Appointment Business A");
    const accountB = await register(emails.b, "Appointment Business B");
    tokenA = accountA.accessToken;
    tokenB = accountB.accessToken;
    businessAId = await getBusinessId(tokenA);
    businessBId = await getBusinessId(tokenB);

    const seededA = await seedTenant(businessAId);
    customerAId = seededA.customerId;
    staffAId = seededA.staffId;
    serviceAId = seededA.serviceId;
    const seededB = await seedTenant(businessBId);
    customerBId = seededB.customerId;
    staffBId = seededB.staffId;
    serviceBId = seededB.serviceId;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.checkoutIntent.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.officialDocument.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.tenantUyumsoftSettings.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.tenantPaymentSettings.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customerLedgerEntry.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.collection.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.salesReceipt.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.expense.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.sale.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.cashAccount.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.commissionEntry.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.commissionRule.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.appointmentEvent.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.appointment.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.campaignService.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.campaign.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.resource.deleteMany({
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

  it("creates a confirmed appointment and snapshots the service", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2033-01-15T10:00:00.000Z",
        notes: "First visit",
      })
      .expect(201);
    appointmentAId = created.body.id as string;
    expect(created.body).toMatchObject({
      status: "CONFIRMED",
      startAt: "2033-01-15T10:00:00.000Z",
      endAt: "2033-01-15T11:00:00.000Z",
      serviceNameSnapshot: "Hair Cut",
      serviceDurationSnapshot: 60,
      servicePriceSnapshot: "250.00",
      listPriceSnapshot: "250.00",
      discountAmountSnapshot: "0.00",
      campaignId: null,
      currency: "TRY",
      notes: "First visit",
    });
    expect(created.body.events?.[0]).toMatchObject({ type: "CREATED" });

    const listed = await request(app.getHttpServer())
      .get(
        `/api/v1/appointments?date=2033-01-15&staffId=${staffAId}&customerId=${customerAId}&status=CONFIRMED`,
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(
      appointmentAId,
    );
  });

  it("filters appointments by inclusive from/to and rejects oversized ranges", async () => {
    const week = await request(app.getHttpServer())
      .get("/api/v1/appointments?from=2033-01-12&to=2033-01-18&pageSize=100")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(week.body.items.map((item: { id: string }) => item.id)).toContain(
      appointmentAId,
    );

    const outside = await request(app.getHttpServer())
      .get("/api/v1/appointments?from=2033-01-16&to=2033-01-18")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(outside.body.items.map((item: { id: string }) => item.id)).not.toContain(
      appointmentAId,
    );

    const inverted = await request(app.getHttpServer())
      .get("/api/v1/appointments?from=2033-01-20&to=2033-01-15")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(400);
    expect(inverted.body.code).toBe("INVALID_DATE_RANGE");

    const tooLarge = await request(app.getHttpServer())
      .get("/api/v1/appointments?from=2033-01-01&to=2033-02-12")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(400);
    expect(tooLarge.body.code).toBe("DATE_RANGE_TOO_LARGE");

    const monthGrid = await request(app.getHttpServer())
      .get("/api/v1/appointments?from=2033-01-01&to=2033-02-11&pageSize=100")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(monthGrid.body.items.map((item: { id: string }) => item.id)).toContain(
      appointmentAId,
    );

    const conflict = await request(app.getHttpServer())
      .get("/api/v1/appointments?date=2033-01-15&from=2033-01-15")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(400);
    expect(conflict.body.code).toBe("DATE_FILTER_CONFLICT");
  });

  it("rejects overlapping appointments and allows back-to-back bookings", async () => {
    const overlap = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2033-01-15T10:30:00.000Z",
      })
      .expect(409);
    expect(overlap.body.code).toBe("APPOINTMENT_OVERLAP");

    const backToBack = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2033-01-15T11:00:00.000Z",
      })
      .expect(201);
    expect(backToBack.body).toMatchObject({
      startAt: "2033-01-15T11:00:00.000Z",
      endAt: "2033-01-15T12:00:00.000Z",
    });
  });

  it("reschedules, preserves history and rechecks conflicts", async () => {
    const rescheduled = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentAId}/reschedule`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ startAt: "2033-01-15T14:00:00.000Z" })
      .expect(201);
    expect(rescheduled.body).toMatchObject({
      startAt: "2033-01-15T14:00:00.000Z",
      endAt: "2033-01-15T15:00:00.000Z",
    });
    expect(
      rescheduled.body.events.map((event: { type: string }) => event.type),
    ).toEqual(["CREATED", "RESCHEDULED"]);

    const conflict = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentAId}/reschedule`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({ startAt: "2033-01-15T11:00:00.000Z" })
      .expect(409);
    expect(conflict.body.code).toBe("APPOINTMENT_OVERLAP");
  });

  it("cancels without deleting and frees the staff slot", async () => {
    const cancelledId = (
      await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          customerId: customerAId,
          staffId: staffAId,
          serviceId: serviceAId,
          startAt: "2033-01-16T10:00:00.000Z",
        })
        .expect(201)
    ).body.id as string;

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${cancelledId}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(
      await prisma.appointment.findUniqueOrThrow({ where: { id: cancelledId } }),
    ).toMatchObject({ status: "CANCELLED" });

    await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2033-01-16T10:00:00.000Z",
      })
      .expect(201);
  });

  it("completes and marks no-show without deleting rows", async () => {
    const completedId = await createAt("2033-01-17T10:00:00.000Z");
    const noShowId = await createAt("2033-01-17T12:00:00.000Z");

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${completedId}/complete`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
    expect(completed.body.status).toBe("COMPLETED");

    const noShow = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${noShowId}/no-show`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
    expect(noShow.body.status).toBe("NO_SHOW");

    await request(app.getHttpServer())
      .post(`/api/v1/appointments/${completedId}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(409);
  });

  it("writes a commission entry when a manicure is completed", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/commissions/rules")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        name: "Manikür prim",
        commissionType: "PERCENT",
        commissionValue: "20.00",
        serviceId: serviceAId,
      })
      .expect(201);
    const appointmentId = await createAt("2033-02-01T10:00:00.000Z");
    await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(201);
    const entries = await request(app.getHttpServer())
      .get("/api/v1/commissions/entries")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(entries.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appointmentId,
          amount: "50.00",
          basisAmount: "250.00",
          ruleNameSnapshot: "Manikür prim",
        }),
      ]),
    );
    const sales = await request(app.getHttpServer())
      .get(`/api/v1/sales?appointmentId=${appointmentId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(sales.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appointmentId,
          totalAmount: "250.00",
          collectedAmount: "0.00",
          remainingAmount: "250.00",
          status: "OPEN",
          source: "APPOINTMENT",
        }),
      ]),
    );
  });

  it("rejects invalid customer, staff and service identifiers", async () => {
    const missingCustomer = await book({
      customerId: randomUUID(),
      staffId: staffAId,
      serviceId: serviceAId,
      startAt: "2033-01-18T10:00:00.000Z",
    });
    expect(missingCustomer.status).toBe(404);

    const missingStaff = await book({
      customerId: customerAId,
      staffId: randomUUID(),
      serviceId: serviceAId,
      startAt: "2033-01-18T10:00:00.000Z",
    });
    expect(missingStaff.status).toBe(404);

    const missingService = await book({
      customerId: customerAId,
      staffId: staffAId,
      serviceId: randomUUID(),
      startAt: "2033-01-18T10:00:00.000Z",
    });
    expect(missingService.status).toBe(404);

    await prisma.staff.update({
      where: { id: staffAId },
      data: { isActive: false },
    });
    const inactive = await book({
      customerId: customerAId,
      staffId: staffAId,
      serviceId: serviceAId,
      startAt: "2033-01-18T10:00:00.000Z",
    });
    expect(inactive.status).toBe(409);
    expect(inactive.body.code).toBe("STAFF_INACTIVE");
    await prisma.staff.update({
      where: { id: staffAId },
      data: { isActive: true },
    });
  });

  it("prevents cross-tenant appointment access", async () => {
    const foreignId = (
      await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenB}`)
        .set(TENANT_HEADER, businessBId)
        .send({
          customerId: customerBId,
          staffId: staffBId,
          serviceId: serviceBId,
          startAt: "2033-01-19T10:00:00.000Z",
        })
        .expect(201)
    ).body.id as string;

    const read = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${foreignId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);
    expect(read.body.code).toBe("RESOURCE_NOT_FOUND");

    await request(app.getHttpServer())
      .post(`/api/v1/appointments/${foreignId}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(404);

    const crossBook = await book({
      customerId: customerBId,
      staffId: staffAId,
      serviceId: serviceAId,
      startAt: "2033-01-19T13:00:00.000Z",
    });
    expect(crossBook.status).toBe(404);
  });

  it("rejects a concurrent overlapping create for the same staff", async () => {
    const payload = {
      customerId: customerAId,
      staffId: staffAId,
      serviceId: serviceAId,
      startAt: "2033-01-20T10:00:00.000Z",
    };
    const [first, second] = await Promise.all([
      book(payload),
      book(payload),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const failed = first.status === 409 ? first : second;
    expect(failed.body.code).toBe("APPOINTMENT_OVERLAP");
  });

  it("allows STAFF to manage only their own agenda", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    const membership = await prisma.businessUser.findUniqueOrThrow({
      where: {
        businessId_userId: { businessId: businessAId, userId: user.id },
      },
    });
    const otherStaff = await prisma.staff.create({
      data: { businessId: businessAId, firstName: "Stylist", lastName: "Two" },
    });
    const otherAppointment = await book({
      customerId: customerAId,
      staffId: otherStaff.id,
      serviceId: serviceAId,
      startAt: "2033-01-21T14:00:00.000Z",
    });
    expect(otherAppointment.status).toBe(201);
    await prisma.staff.update({
      where: { id: staffAId },
      data: { businessUserId: membership.id },
    });
    await prisma.businessUser.update({
      where: { id: membership.id },
      data: { role: "STAFF" },
    });
    try {
      await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          customerId: customerAId,
          staffId: staffAId,
          serviceId: serviceAId,
          startAt: "2033-01-21T10:00:00.000Z",
        })
        .expect(201);

      const forbidden = await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          customerId: customerAId,
          staffId: otherStaff.id,
          serviceId: serviceAId,
          startAt: "2033-01-21T16:00:00.000Z",
        })
        .expect(403);
      expect(forbidden.body.code).toBe("STAFF_AGENDA_FORBIDDEN");

      const listed = await request(app.getHttpServer())
        .get("/api/v1/appointments?from=2033-01-21&to=2033-01-21&pageSize=100")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(200);
      const ids = listed.body.items.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(otherAppointment.body.id);

      await request(app.getHttpServer())
        .get(`/api/v1/appointments/${otherAppointment.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .expect(404);

      const empty = await request(app.getHttpServer())
        .patch(`/api/v1/appointments/${appointmentAId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({})
        .expect(400);
      expect(empty.body.code).toBe("EMPTY_UPDATE");
    } finally {
      await prisma.businessUser.update({
        where: { id: membership.id },
        data: { role: "BUSINESS_OWNER" },
      });
      await prisma.staff.update({
        where: { id: staffAId },
        data: { businessUserId: null },
      });
    }
  });

  it("rejects ACCOUNTANT appointment writes", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: emails.a },
    });
    await prisma.businessUser.update({
      where: {
        businessId_userId: { businessId: businessAId, userId: user.id },
      },
      data: { role: "ACCOUNTANT" },
    });
    try {
      const denied = await request(app.getHttpServer())
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set(TENANT_HEADER, businessAId)
        .send({
          customerId: customerAId,
          staffId: staffAId,
          serviceId: serviceAId,
          startAt: "2033-01-22T10:00:00.000Z",
        })
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

  it("rejects overlapping appointments on the same resource", async () => {
    const resource = await prisma.resource.create({
      data: { businessId: businessAId, name: `Chair ${suffix}` },
    });
    const otherResource = await prisma.resource.create({
      data: { businessId: businessAId, name: `Room ${suffix}` },
    });
    const otherStaff = await prisma.staff.create({
      data: {
        businessId: businessAId,
        firstName: "Stylist",
        lastName: "Resource",
      },
    });

    await book({
      customerId: customerAId,
      staffId: staffAId,
      serviceId: serviceAId,
      resourceId: resource.id,
      startAt: "2033-01-24T10:00:00.000Z",
    }).expect(201);

    const overlap = await book({
      customerId: customerAId,
      staffId: otherStaff.id,
      serviceId: serviceAId,
      resourceId: resource.id,
      startAt: "2033-01-24T10:30:00.000Z",
    });
    expect(overlap.status).toBe(409);
    expect(overlap.body.code).toBe("RESOURCE_OVERLAP");

    await book({
      customerId: customerAId,
      staffId: otherStaff.id,
      serviceId: serviceAId,
      resourceId: otherResource.id,
      startAt: "2033-01-24T10:00:00.000Z",
    }).expect(201);

    await book({
      customerId: customerAId,
      staffId: otherStaff.id,
      serviceId: serviceAId,
      startAt: "2033-01-24T12:00:00.000Z",
    }).expect(201);
  });

  it("blocks appointment create when the subscription is expired", async () => {
    await prisma.subscription.updateMany({
      where: { businessId: businessAId },
      data: {
        currentPeriodStart: new Date("2019-12-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2020-01-01T00:00:00.000Z"),
        status: "EXPIRED",
      },
    });
    const blocked = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: "2033-01-23T10:00:00.000Z",
      })
      .expect(403);
    expect(blocked.body.code).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("snapshots the campaign payable amount onto the appointment", async () => {
    await prisma.subscription.updateMany({
      where: { businessId: businessAId },
      data: {
        status: "TRIALING",
        currentPeriodEnd: new Date("2035-01-01T00:00:00.000Z"),
      },
    });
    const campaign = await request(app.getHttpServer())
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send({
        name: "Yaz kesim",
        discountType: "PERCENT",
        discountValue: "20.00",
        startsAt: "2033-06-01T00:00:00.000Z",
        endsAt: "2033-06-30T23:59:59.000Z",
        serviceIds: [serviceAId],
        smsTemplate: "Yaz kampanyası başladı.",
      })
      .expect(201);
    expect(campaign.body).toMatchObject({
      name: "Yaz kesim",
      discountType: "PERCENT",
      serviceIds: [serviceAId],
    });

    const quote = await request(app.getHttpServer())
      .get(
        `/api/v1/campaigns/quote?serviceId=${serviceAId}&at=2033-06-15T10:00:00.000Z`,
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .expect(200);
    expect(quote.body).toMatchObject({
      listPrice: "250.00",
      discountAmount: "50.00",
      payableAmount: "200.00",
      campaignId: campaign.body.id,
    });

    const created = await book({
      customerId: customerAId,
      staffId: staffAId,
      serviceId: serviceAId,
      startAt: "2033-06-15T10:00:00.000Z",
    }).expect(201);
    expect(created.body).toMatchObject({
      servicePriceSnapshot: "200.00",
      listPriceSnapshot: "250.00",
      discountAmountSnapshot: "50.00",
      campaignId: campaign.body.id,
      campaignNameSnapshot: "Yaz kesim",
    });
  });

  async function createAt(startAt: string): Promise<string> {
    return (await book({
      customerId: customerAId,
      staffId: staffAId,
      serviceId: serviceAId,
      startAt,
    })).body.id as string;
  }

  function book(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${tokenA}`)
      .set(TENANT_HEADER, businessAId)
      .send(body);
  }

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
