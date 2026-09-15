import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  AppointmentEventItem,
  AppointmentRecord,
  PaginatedResponse,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { CommissionsService } from "../commissions/commissions.service";
import { remainingAmount, toCents } from "../ledger/money";
import { SalesService } from "../ledger/sales.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { isWithinHours, minutesInTimeZone } from "../business/hours";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  addMinutes,
  inclusiveCalendarDays,
  MAX_APPOINTMENT_RANGE_DAYS,
  parseStartAt,
  rangesOverlap,
  zonedDateRange,
  zonedInclusiveDateRange,
} from "./appointment-time";
import {
  APPOINTMENT_NOTIFICATION_PORT,
  type AppointmentNotificationEvent,
  type AppointmentNotificationPort,
} from "./appointment-notification.port";
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from "./dto/appointment.dto";

const appointmentInclude = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  staff: { select: { id: true, firstName: true, lastName: true } },
  service: { select: { id: true, name: true } },
  resource: { select: { id: true, name: true } },
  sale: { select: { id: true, collectedAmount: true, totalAmount: true } },
} satisfies Prisma.AppointmentInclude;

const appointmentDetailInclude = {
  ...appointmentInclude,
  events: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.AppointmentInclude;

type Database = PrismaService | Prisma.TransactionClient;
type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;
type AppointmentWithEvents = Prisma.AppointmentGetPayload<{
  include: typeof appointmentDetailInclude;
}>;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly campaigns: CampaignsService,
    private readonly commissions: CommissionsService,
    private readonly sales: SalesService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    @Optional()
    @Inject(APPOINTMENT_NOTIFICATION_PORT)
    private readonly appointmentNotifications?: AppointmentNotificationPort,
  ) {}

  async list(
    query: ListAppointmentsQueryDto,
  ): Promise<PaginatedResponse<AppointmentRecord>> {
    const tenant = this.requestContext.requireTenant();
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: tenant.businessId },
      select: { timezone: true },
    });
    const agenda = await this.actorStaffScope(tenant.businessId, tenant.role, tenant.businessUserId);
    if (agenda === "none") {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };
    }
    const where: Prisma.AppointmentWhereInput = {
      businessId: tenant.businessId,
      staffId: agenda === "open" ? query.staffId : agenda.staffId,
      customerId: query.customerId,
      status: query.status,
    };
    if (agenda !== "open" && query.staffId && query.staffId !== agenda.staffId) {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };
    }
    const window = this.resolveListWindow(query, business.timezone);
    if (window) {
      where.startAt = { gte: window.start, lt: window.end };
    }

    const skip = (query.page - 1) * query.pageSize;
    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { startAt: window ? "asc" : "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      items: appointments.map((item) => this.toRecord(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
      hasMore: query.page * query.pageSize < total,
    };
  }

  private resolveListWindow(
    query: ListAppointmentsQueryDto,
    timeZone: string,
  ): { start: Date; end: Date } | null {
    if (query.date && (query.from || query.to)) {
      throw new BadRequestException({
        message: "Use either date or from/to, not both.",
        code: "DATE_FILTER_CONFLICT",
      });
    }
    if (query.to && !query.from) {
      throw new BadRequestException({
        message: "from is required when to is provided.",
        code: "INVALID_DATE_RANGE",
      });
    }
    if (query.from) {
      const to = query.to ?? query.from;
      const days = inclusiveCalendarDays(query.from, to);
      if (days < 1) {
        throw new BadRequestException({
          message: "from must be on or before to.",
          code: "INVALID_DATE_RANGE",
        });
      }
      if (days > MAX_APPOINTMENT_RANGE_DAYS) {
        throw new BadRequestException({
          message: `Date range cannot exceed ${MAX_APPOINTMENT_RANGE_DAYS} days.`,
          code: "DATE_RANGE_TOO_LARGE",
        });
      }
      return zonedInclusiveDateRange(query.from, to, timeZone);
    }
    if (query.date) {
      return zonedDateRange(query.date, timeZone);
    }
    return null;
  }

  async get(id: string): Promise<AppointmentRecord> {
    const tenant = this.requestContext.requireTenant();
    const appointment = await this.findAppointment(
      this.prisma,
      tenant.businessId,
      id,
      true,
    );
    await this.assertStaffMayAccess(appointment.staffId);
    return this.toRecord(appointment);
  }

  async create(input: CreateAppointmentDto): Promise<AppointmentRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    await this.assertStaffMayBook(input.staffId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }

    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        await this.lockStaff(transaction, tenant.businessId, input.staffId);
        if (input.resourceId) {
          await this.lockResource(
            transaction,
            tenant.businessId,
            input.resourceId,
          );
        }
        const { customer, staff, service, resource, business } =
          await this.loadBookingTargets(transaction, tenant.businessId, input);
        this.assertBookable(customer, staff, service, resource);
        const startAt = parseStartAt(input.startAt, business.timezone);
        const endAt = addMinutes(startAt, service.durationMinutes);
        await this.assertWithinHours(
          transaction,
          tenant.businessId,
          staff.id,
          startAt,
          business.timezone,
        );
        await this.assertNoOverlap(
          transaction,
          tenant.businessId,
          staff.id,
          startAt,
          endAt,
        );
        await this.assertNoResourceOverlap(
          transaction,
          tenant.businessId,
          resource?.id ?? null,
          startAt,
          endAt,
        );

        const priced = await this.campaigns.resolveForService(
          transaction,
          tenant.businessId,
          service.id,
          startAt,
          service.price.toFixed(2),
        );
        const payment = this.resolvePaymentPlan(
          input.paymentPlan,
          input.depositAmount,
          priced.payableAmount,
        );
        const appointment = await transaction.appointment.create({
          data: {
            businessId: tenant.businessId,
            customerId: customer.id,
            staffId: staff.id,
            serviceId: service.id,
            resourceId: resource?.id ?? null,
            createdByUserId: actorId,
            startAt,
            endAt,
            notes: input.notes,
            serviceNameSnapshot: service.name,
            serviceDurationSnapshot: service.durationMinutes,
            servicePriceSnapshot: priced.payableAmount,
            listPriceSnapshot: priced.listPrice,
            discountAmountSnapshot: priced.discountAmount,
            campaignId: priced.campaignId,
            campaignNameSnapshot: priced.campaignName,
            currency: business.currency,
            paymentPlan: payment.plan,
            depositAmount: payment.depositAmount,
            paymentStatus: "UNPAID",
          },
          include: appointmentDetailInclude,
        });
        if (payment.plan === "DEPOSIT" || payment.plan === "FULL") {
          await this.sales.ensureForAppointment(transaction, appointment, actorId);
        }
        await transaction.appointmentEvent.create({
          data: {
            businessId: tenant.businessId,
            appointmentId: appointment.id,
            actorUserId: actorId,
            type: "CREATED",
            newStartAt: startAt,
            newEndAt: endAt,
            newStatus: "CONFIRMED",
          },
        });
        await this.auditLog.record(
          {
            businessId: tenant.businessId,
            userId: actorId,
            action: "APPOINTMENT_CREATED",
            entityType: "Appointment",
            entityId: appointment.id,
            metadata: { fields: ["customerId", "staffId", "serviceId", "startAt", "resourceId"] },
          },
          transaction,
        );
        return this.toRecord(
          await this.findAppointment(transaction, tenant.businessId, appointment.id, true),
        );
      });
      this.emitNotification("CREATED", tenant.businessId, record.id);
      return record;
    } catch (error) {
      this.throwOverlap(error);
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateAppointmentDto,
  ): Promise<AppointmentRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    if (input.notes === undefined) {
      throw new BadRequestException({
        message: "At least one appointment field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      const current = await this.findAppointment(transaction, businessId, id);
      await this.assertStaffMayAccess(current.staffId);
      const appointment = await transaction.appointment.update({
        where: { id },
        data: { notes: input.notes },
        include: appointmentDetailInclude,
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "APPOINTMENT_UPDATED",
          entityType: "Appointment",
          entityId: id,
          metadata: { fields: ["notes"] },
        },
        transaction,
      );
      return this.toRecord(appointment);
    });
  }

  async reschedule(
    id: string,
    input: RescheduleAppointmentDto,
  ): Promise<AppointmentRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (
      input.customerId === undefined &&
      input.staffId === undefined &&
      input.serviceId === undefined &&
      input.startAt === undefined &&
      input.resourceId === undefined
    ) {
      throw new BadRequestException({
        message: "At least one reschedule field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        const current = await this.findAppointment(
          transaction,
          tenant.businessId,
          id,
        );
        this.assertConfirmed(current.status, "rescheduled");
        await this.assertStaffMayAccess(current.staffId);
        const nextStaffId = input.staffId ?? current.staffId;
        await this.assertStaffMayBook(nextStaffId);
        const nextResourceId =
          input.resourceId === undefined ? current.resourceId : input.resourceId;
        await this.lockStaffs(transaction, tenant.businessId, [
          current.staffId,
          nextStaffId,
        ]);
        if (nextResourceId) {
          await this.lockResource(transaction, tenant.businessId, nextResourceId);
        }

        const targets = await this.loadBookingTargets(transaction, tenant.businessId, {
          customerId: input.customerId ?? current.customerId,
          staffId: nextStaffId,
          serviceId: input.serviceId ?? current.serviceId,
          resourceId: nextResourceId,
        });
        this.assertBookable(targets.customer, targets.staff, targets.service, targets.resource);

        const serviceChanged = targets.service.id !== current.serviceId;
        const startAt = input.startAt
          ? parseStartAt(input.startAt, targets.business.timezone)
          : current.startAt;
        const durationMinutes = serviceChanged
          ? targets.service.durationMinutes
          : current.serviceDurationSnapshot;
        const endAt = addMinutes(startAt, durationMinutes);
        await this.assertWithinHours(
          transaction,
          tenant.businessId,
          targets.staff.id,
          startAt,
          targets.business.timezone,
        );

        await this.assertNoOverlap(
          transaction,
          tenant.businessId,
          targets.staff.id,
          startAt,
          endAt,
          current.id,
        );
        await this.assertNoResourceOverlap(
          transaction,
          tenant.businessId,
          targets.resource?.id ?? null,
          startAt,
          endAt,
          current.id,
        );

        const shouldReprice = serviceChanged || Boolean(input.startAt);
        const priced = shouldReprice
          ? await this.campaigns.resolveForService(
              transaction,
              tenant.businessId,
              targets.service.id,
              startAt,
              targets.service.price.toFixed(2),
            )
          : null;
        await transaction.appointment.update({
          where: { id },
          data: {
            customerId: targets.customer.id,
            staffId: targets.staff.id,
            serviceId: targets.service.id,
            resourceId: targets.resource?.id ?? null,
            startAt,
            endAt,
            ...(serviceChanged
              ? {
                  serviceNameSnapshot: targets.service.name,
                  serviceDurationSnapshot: targets.service.durationMinutes,
                  currency: targets.business.currency,
                }
              : {}),
            ...(priced
              ? {
                  servicePriceSnapshot: priced.payableAmount,
                  listPriceSnapshot: priced.listPrice,
                  discountAmountSnapshot: priced.discountAmount,
                  campaignId: priced.campaignId,
                  campaignNameSnapshot: priced.campaignName,
                }
              : {}),
          },
        });
        await transaction.appointmentEvent.create({
          data: {
            businessId: tenant.businessId,
            appointmentId: id,
            actorUserId: actorId,
            type: "RESCHEDULED",
            previousStartAt: current.startAt,
            previousEndAt: current.endAt,
            newStartAt: startAt,
            newEndAt: endAt,
            previousStatus: current.status,
            newStatus: current.status,
            metadata: {
              fields: Object.entries(input)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key),
            },
          },
        });
        await this.auditLog.record(
          {
            businessId: tenant.businessId,
            userId: actorId,
            action: "APPOINTMENT_RESCHEDULED",
            entityType: "Appointment",
            entityId: id,
            metadata: {
              fields: Object.entries(input)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key),
            },
          },
          transaction,
        );
        return this.toRecord(
          await this.findAppointment(transaction, tenant.businessId, id, true),
        );
      });
      this.emitNotification("RESCHEDULED", tenant.businessId, record.id);
      return record;
    } catch (error) {
      this.throwOverlap(error);
      throw error;
    }
  }

  async cancel(id: string): Promise<AppointmentRecord> {
    return this.transition(id, "CANCELLED", "CANCELLED", "APPOINTMENT_CANCELLED");
  }

  async complete(id: string): Promise<AppointmentRecord> {
    return this.transition(id, "COMPLETED", "COMPLETED", "APPOINTMENT_COMPLETED");
  }

  async markNoShow(id: string): Promise<AppointmentRecord> {
    return this.transition(id, "NO_SHOW", "NO_SHOW", "APPOINTMENT_NO_SHOW");
  }

  private async transition(
    id: string,
    status: "CANCELLED" | "COMPLETED" | "NO_SHOW",
    eventType: "CANCELLED" | "COMPLETED" | "NO_SHOW",
    auditAction: string,
  ): Promise<AppointmentRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const record = await this.prisma.$transaction(async (transaction) => {
      const current = await this.findAppointment(
        transaction,
        tenant.businessId,
        id,
      );
      this.assertConfirmed(current.status, status.toLowerCase());
      await this.assertStaffMayAccess(current.staffId);
      await this.lockStaff(transaction, tenant.businessId, current.staffId);
      await transaction.appointment.update({
        where: { id },
        data: { status },
      });
      await transaction.appointmentEvent.create({
        data: {
          businessId: tenant.businessId,
          appointmentId: id,
          actorUserId: authorization?.user.userId,
          type: eventType,
          previousStatus: current.status,
          newStatus: status,
        },
      });
      await this.auditLog.record(
        {
          businessId: tenant.businessId,
          userId: authorization?.user.userId,
          action: auditAction,
          entityType: "Appointment",
          entityId: id,
          metadata: { fields: ["status"] },
        },
        transaction,
      );
      if (status === "COMPLETED") {
        const completedAt = new Date();
        await this.commissions.recordForCompletedAppointment(
          transaction,
          current,
          completedAt,
        );
        await this.sales.recordForCompletedAppointment(
          transaction,
          current,
          authorization?.user.userId ?? current.createdByUserId,
          completedAt,
        );
      }
      return this.toRecord(
        await this.findAppointment(transaction, tenant.businessId, id, true),
      );
    });
    this.emitNotification(status, tenant.businessId, record.id);
    return record;
  }

  private emitNotification(
    type: AppointmentNotificationEvent,
    businessId: string,
    appointmentId: string,
  ): void {
    void this.appointmentNotifications
      ?.onAppointmentEvent({ businessId, appointmentId, type })
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to dispatch ${type} notification for ${appointmentId}`,
          error,
        );
      });
  }

  private async loadBookingTargets(
    database: Database,
    businessId: string,
    ids: {
      customerId: string;
      staffId: string;
      serviceId: string;
      resourceId?: string | null;
    },
  ) {
    const [customer, staff, service, resource, business] = await Promise.all([
      database.customer.findFirst({
        where: { id: ids.customerId, businessId },
      }),
      database.staff.findFirst({
        where: { id: ids.staffId, businessId },
      }),
      database.service.findFirst({
        where: { id: ids.serviceId, businessId },
      }),
      ids.resourceId
        ? database.resource.findFirst({
            where: { id: ids.resourceId, businessId },
          })
        : Promise.resolve(null),
      database.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { timezone: true, currency: true },
      }),
    ]);
    if (!customer || !staff || !service || (ids.resourceId && !resource)) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return { customer, staff, service, resource, business };
  }

  private assertBookable(
    customer: { isActive: boolean },
    staff: { isActive: boolean },
    service: { isActive: boolean },
    resource: { isActive: boolean } | null,
  ): void {
    if (!customer.isActive) {
      throw new ConflictException({
        message: "Inactive customers cannot be booked.",
        code: "CUSTOMER_INACTIVE",
      });
    }
    if (!staff.isActive) {
      throw new ConflictException({
        message: "Inactive staff cannot be booked.",
        code: "STAFF_INACTIVE",
      });
    }
    if (!service.isActive) {
      throw new ConflictException({
        message: "Inactive services cannot be booked.",
        code: "SERVICE_INACTIVE",
      });
    }
    if (resource && !resource.isActive) {
      throw new ConflictException({
        message: "Inactive resources cannot be booked.",
        code: "RESOURCE_INACTIVE",
      });
    }
  }

  private assertConfirmed(status: string, action: string): void {
    if (status !== "CONFIRMED") {
      throw new ConflictException({
        message: `Only confirmed appointments can be ${action}.`,
        code: "APPOINTMENT_NOT_CONFIRMED",
      });
    }
  }

  private async assertWithinHours(
    database: Database,
    businessId: string,
    staffId: string,
    startAt: Date,
    timeZone: string,
  ): Promise<void> {
    const business = await database.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { hoursEnforced: true },
    });
    if (!business.hoursEnforced) {
      return;
    }

    const { weekday, minutes } = minutesInTimeZone(startAt, timeZone);
    const [businessHours, staffHours] = await Promise.all([
      database.businessHours.findUnique({
        where: { businessId_weekday: { businessId, weekday } },
      }),
      database.staffHours.findUnique({
        where: { staffId_weekday: { staffId, weekday } },
      }),
    ]);

    if (
      !isWithinHours(
        businessHours ?? {
          startMinutes: 540,
          endMinutes: 1140,
          isClosed: weekday === 0,
        },
        minutes,
      )
    ) {
      throw new ConflictException({
        message: "Appointment is outside business hours.",
        code: "OUTSIDE_BUSINESS_HOURS",
      });
    }

    if (
      staffHours &&
      !isWithinHours(staffHours, minutes)
    ) {
      throw new ConflictException({
        message: "Appointment is outside staff working hours.",
        code: "OUTSIDE_STAFF_HOURS",
      });
    }
  }

  private async assertNoOverlap(
    database: Database,
    businessId: string,
    staffId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const existing = await database.appointment.findMany({
      where: {
        businessId,
        staffId,
        status: "CONFIRMED",
        id: excludeId ? { not: excludeId } : undefined,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });
    if (
      existing.some((item) =>
        rangesOverlap(startAt, endAt, item.startAt, item.endAt),
      )
    ) {
      throw this.overlapError();
    }
  }

  private async assertNoResourceOverlap(
    database: Database,
    businessId: string,
    resourceId: string | null,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    if (!resourceId) return;
    const existing = await database.appointment.findMany({
      where: {
        businessId,
        resourceId,
        status: "CONFIRMED",
        id: excludeId ? { not: excludeId } : undefined,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });
    if (
      existing.some((item) =>
        rangesOverlap(startAt, endAt, item.startAt, item.endAt),
      )
    ) {
      throw this.resourceOverlapError();
    }
  }

  private async actorStaffScope(
    businessId: string,
    role: string | null,
    businessUserId: string | null,
  ): Promise<"open" | "none" | { staffId: string }> {
    if (role !== "STAFF") return "open";
    if (!businessUserId) return "none";
    const staff = await this.prisma.staff.findFirst({
      where: { businessId, businessUserId },
      select: { id: true },
    });
    return staff ? { staffId: staff.id } : "none";
  }

  private async assertStaffMayAccess(appointmentStaffId: string): Promise<void> {
    const tenant = this.requestContext.requireTenant();
    const agenda = await this.actorStaffScope(
      tenant.businessId,
      tenant.role,
      tenant.businessUserId,
    );
    if (agenda === "open") return;
    if (agenda === "none" || agenda.staffId !== appointmentStaffId) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
  }

  private async assertStaffMayBook(staffId: string): Promise<void> {
    const tenant = this.requestContext.requireTenant();
    const agenda = await this.actorStaffScope(
      tenant.businessId,
      tenant.role,
      tenant.businessUserId,
    );
    if (agenda === "open") return;
    if (agenda === "none") {
      throw new ForbiddenException({
        message: "Staff profile is required to manage appointments.",
        code: "STAFF_PROFILE_REQUIRED",
      });
    }
    if (agenda.staffId !== staffId) {
      throw new ForbiddenException({
        message: "Staff can only manage their own agenda.",
        code: "STAFF_AGENDA_FORBIDDEN",
      });
    }
  }

  private async lockStaffs(
    database: Prisma.TransactionClient,
    businessId: string,
    staffIds: string[],
  ): Promise<void> {
    const unique = [...new Set(staffIds)].sort();
    for (const staffId of unique) {
      await this.lockStaff(database, businessId, staffId);
    }
  }

  private async lockStaff(
    database: Prisma.TransactionClient,
    businessId: string,
    staffId: string,
  ): Promise<void> {
    await database.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${businessId}), hashtext(${staffId}))
    `;
  }

  private async lockResource(
    database: Prisma.TransactionClient,
    businessId: string,
    resourceId: string,
  ): Promise<void> {
    await database.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`${businessId}:resource`}),
        hashtext(${resourceId})
      )
    `;
  }

  private async findAppointment(
    database: Database,
    businessId: string,
    id: string,
    withEvents = false,
  ): Promise<AppointmentWithEvents | AppointmentWithRelations> {
    const appointment = await database.appointment.findFirst({
      where: { id, businessId },
      include: withEvents ? appointmentDetailInclude : appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return appointment;
  }

  private resolvePaymentPlan(
    plan: "DEPOSIT" | "FULL" | "ON_DAY" | undefined,
    depositAmount: string | null | undefined,
    payable: string,
  ): { plan: "DEPOSIT" | "FULL" | "ON_DAY"; depositAmount: string | null } {
    const resolved = plan ?? "ON_DAY";
    if (resolved !== "DEPOSIT") {
      return { plan: resolved, depositAmount: null };
    }
    if (!depositAmount || toCents(depositAmount) <= 0) {
      throw new BadRequestException({
        message: "Deposit amount is required for a deposit payment plan.",
        code: "INVALID_DEPOSIT",
      });
    }
    if (toCents(depositAmount) >= toCents(payable)) {
      throw new BadRequestException({
        message: "Deposit must be less than the payable amount.",
        code: "INVALID_DEPOSIT",
      });
    }
    return { plan: resolved, depositAmount };
  }

  private toRecord(
    appointment: AppointmentWithRelations | AppointmentWithEvents,
  ): AppointmentRecord {
    const payable = appointment.servicePriceSnapshot.toFixed(2);
    const collected = appointment.sale
      ? appointment.sale.collectedAmount.toFixed(2)
      : "0.00";
    return {
      id: appointment.id,
      customer: appointment.customer,
      staff: appointment.staff,
      service: appointment.service,
      resource: appointment.resource,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      createdByUserId: appointment.createdByUserId,
      serviceNameSnapshot: appointment.serviceNameSnapshot,
      serviceDurationSnapshot: appointment.serviceDurationSnapshot,
      servicePriceSnapshot: payable,
      listPriceSnapshot: appointment.listPriceSnapshot.toFixed(2),
      discountAmountSnapshot: appointment.discountAmountSnapshot.toFixed(2),
      campaignId: appointment.campaignId,
      campaignNameSnapshot: appointment.campaignNameSnapshot,
      currency: appointment.currency,
      paymentPlan: appointment.paymentPlan,
      depositAmount: appointment.depositAmount?.toFixed(2) ?? null,
      paymentStatus: appointment.paymentStatus,
      collectedAmount: collected,
      remainingAmount: appointment.sale
        ? remainingAmount(appointment.sale.totalAmount.toFixed(2), collected)
        : payable,
      saleId: appointment.sale?.id ?? null,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      ...("events" in appointment
        ? { events: appointment.events.map((event) => this.toEvent(event)) }
        : {}),
    };
  }

  private toEvent(event: {
    id: string;
    type: AppointmentEventItem["type"];
    previousStartAt: Date | null;
    previousEndAt: Date | null;
    newStartAt: Date | null;
    newEndAt: Date | null;
    previousStatus: AppointmentEventItem["previousStatus"];
    newStatus: AppointmentEventItem["newStatus"];
    createdAt: Date;
  }): AppointmentEventItem {
    return {
      id: event.id,
      type: event.type,
      previousStartAt: event.previousStartAt?.toISOString() ?? null,
      previousEndAt: event.previousEndAt?.toISOString() ?? null,
      newStartAt: event.newStartAt?.toISOString() ?? null,
      newEndAt: event.newEndAt?.toISOString() ?? null,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private throwOverlap(error: unknown): void {
    if (!error || typeof error !== "object") return;
    const candidate = error as { code?: string; message?: string };
    const message = candidate.message ?? "";
    if (message.includes("Appointment_resource_no_overlap")) {
      throw this.resourceOverlapError();
    }
    if (this.isOverlapConstraint(error)) {
      throw this.overlapError();
    }
  }

  private isOverlapConstraint(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: string; message?: string };
    const message = candidate.message ?? "";
    return (
      message.includes("Appointment_staff_no_overlap") ||
      message.includes("Appointment_resource_no_overlap") ||
      message.includes("23P01") ||
      candidate.code === "23P01"
    );
  }

  private overlapError(): ConflictException {
    return new ConflictException({
      message: "This staff member already has an overlapping appointment.",
      code: "APPOINTMENT_OVERLAP",
    });
  }

  private resourceOverlapError(): ConflictException {
    return new ConflictException({
      message: "This resource already has an overlapping appointment.",
      code: "RESOURCE_OVERLAP",
    });
  }
}
