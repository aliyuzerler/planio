import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  AdminAuditLogItem,
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminBusinessUser,
  AdminDashboardMetrics,
  AdminPaymentSummary,
  AdminSubscriptionSummary,
  PaginatedResponse,
  PaymentStatus,
  PlanRecord,
  SubscriptionStatus,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { parsePlanLimits } from "../subscriptions/subscription-period";
import {
  CreateAdminPlanDto,
  ListAdminAuditLogsQueryDto,
  ListAdminBusinessesQueryDto,
  ListAdminSubscriptionsQueryDto,
  UpdateAdminBusinessStatusDto,
  UpdateAdminPlanDto,
} from "./dto/admin.dto";

const planSelect = {
  id: true,
  name: true,
  billingPeriod: true,
  price: true,
  currency: true,
  isActive: true,
  limits: true,
} satisfies Prisma.PlanSelect;

const paymentSelect = {
  id: true,
  status: true,
  amount: true,
  currency: true,
  paidAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

const latestSubscriptionInclude = {
  plan: { select: planSelect },
  payments: {
    select: paymentSelect,
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.SubscriptionInclude;

type LatestSubscription = Prisma.SubscriptionGetPayload<{
  include: typeof latestSubscriptionInclude;
}>;

const BUSINESS_STATUSES = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;
const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
] as const;
const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async dashboard(): Promise<AdminDashboardMetrics> {
    const liveLicenseStatuses = [
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
      "PAUSED",
    ] as const;
    const [
      businessGroups,
      subscriptionGroups,
      userTotal,
      paymentGroups,
      liveLicenses,
    ] = await Promise.all([
      this.prisma.business.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.user.count(),
      this.prisma.payment.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: [...liveLicenseStatuses] } },
        select: { plan: { select: { billingPeriod: true } } },
      }),
    ]);

    const licenses = {
      total: 0,
      MONTHLY: 0,
      SEMIANNUAL: 0,
      YEARLY: 0,
    };
    for (const row of liveLicenses) {
      licenses[row.plan.billingPeriod] += 1;
      licenses.total += 1;
    }

    return {
      businesses: this.countMap(
        businessGroups.map((row) => ({
          key: row.status,
          count: row._count._all,
        })),
        BUSINESS_STATUSES,
      ),
      subscriptions: this.countMap(
        subscriptionGroups.map((row) => ({
          key: row.status,
          count: row._count._all,
        })),
        SUBSCRIPTION_STATUSES,
      ),
      licenses,
      users: { total: userTotal },
      payments: this.countMap(
        paymentGroups.map((row) => ({
          key: row.status,
          count: row._count._all,
        })),
        PAYMENT_STATUSES,
      ),
    };
  }

  async listBusinesses(
    query: ListAdminBusinessesQueryDto,
  ): Promise<PaginatedResponse<AdminBusinessListItem>> {
    const where: Prisma.BusinessWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: latestSubscriptionInclude,
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    return this.toPage(
      businesses.map((business) =>
        this.toBusinessListItem(business, business.subscriptions[0] ?? null),
      ),
      total,
      query.page,
      query.pageSize,
    );
  }

  async getBusiness(id: string): Promise<AdminBusinessDetail> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: latestSubscriptionInclude,
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                platformRole: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!business) {
      throw this.notFound();
    }

    return {
      ...this.toBusinessListItem(business, business.subscriptions[0] ?? null),
      address: business.address,
      users: business.users.map((membership) => this.toBusinessUser(membership)),
    };
  }

  async updateBusinessStatus(
    id: string,
    input: UpdateAdminBusinessStatusDto,
  ): Promise<AdminBusinessDetail> {
    const existing = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw this.notFound();
    }
    if (existing.status === input.status) {
      return this.getBusiness(id);
    }

    const actorId = this.requestContext.get()?.user.userId;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.business.update({
        where: { id },
        data: { status: input.status },
      });
      await this.auditLog.record(
        {
          businessId: id,
          userId: actorId,
          action: "BUSINESS_STATUS_UPDATED",
          entityType: "Business",
          entityId: id,
          metadata: { from: existing.status, to: input.status },
        },
        transaction,
      );
    });

    return this.getBusiness(id);
  }

  async listPlans(): Promise<PlanRecord[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ price: "asc" }, { billingPeriod: "asc" }],
    });
    return plans.map((plan) => this.toPlan(plan));
  }

  async createPlan(input: CreateAdminPlanDto): Promise<PlanRecord> {
    try {
      const plan = await this.prisma.plan.create({
        data: {
          name: input.name,
          billingPeriod: input.billingPeriod,
          price: input.price,
          currency: input.currency ?? "TRY",
          isActive: input.isActive ?? true,
          limits: parsePlanLimits(input.limits),
          externalPricingPlanCode: input.externalPricingPlanCode || null,
        },
      });
      return this.toPlan(plan);
    } catch (error) {
      this.throwPlanConflict(error);
      throw error;
    }
  }

  async updatePlan(id: string, input: UpdateAdminPlanDto): Promise<PlanRecord> {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw this.notFound();
    }
    try {
      const plan = await this.prisma.plan.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.billingPeriod !== undefined
            ? { billingPeriod: input.billingPeriod }
            : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.limits !== undefined
            ? { limits: parsePlanLimits(input.limits) }
            : {}),
          ...(input.externalPricingPlanCode !== undefined
            ? { externalPricingPlanCode: input.externalPricingPlanCode || null }
            : {}),
        },
      });
      return this.toPlan(plan);
    } catch (error) {
      this.throwPlanConflict(error);
      throw error;
    }
  }

  async listSubscriptions(
    query: ListAdminSubscriptionsQueryDto,
  ): Promise<PaginatedResponse<AdminSubscriptionSummary>> {
    const where: Prisma.SubscriptionWhereInput = {};
    if (query.businessId) {
      where.businessId = query.businessId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const skip = (query.page - 1) * query.pageSize;
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: {
          ...latestSubscriptionInclude,
          business: { select: { name: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return this.toPage(
      subscriptions.map((subscription) =>
        this.toSubscriptionSummary(subscription, subscription.business.name),
      ),
      total,
      query.page,
      query.pageSize,
    );
  }

  async listAuditLogs(
    query: ListAdminAuditLogsQueryDto,
  ): Promise<PaginatedResponse<AdminAuditLogItem>> {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException({
        message: "from must be earlier than or equal to to.",
        code: "INVALID_DATE_RANGE",
      });
    }

    const where: Prisma.AuditLogWhereInput = {};
    if (query.businessId) {
      where.businessId = query.businessId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const skip = (query.page - 1) * query.pageSize;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: {
          business: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return this.toPage(
      logs.map((log) => ({
        id: log.id,
        businessId: log.businessId,
        businessName: log.business.name,
        userId: log.userId,
        userEmail: log.user?.email ?? null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  private toBusinessListItem(
    business: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      timezone: string;
      currency: string;
      status: AdminBusinessListItem["status"];
      createdAt: Date;
      updatedAt: Date;
    },
    subscription: LatestSubscription | null,
  ): AdminBusinessListItem {
    return {
      id: business.id,
      name: business.name,
      phone: business.phone,
      email: business.email,
      timezone: business.timezone,
      currency: business.currency,
      status: business.status,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
      subscription: subscription
        ? this.toSubscriptionSummary(subscription, business.name)
        : null,
    };
  }

  private toBusinessUser(membership: {
    id: string;
    role: AdminBusinessUser["role"];
    isActive: boolean;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      platformRole: AdminBusinessUser["platformRole"];
    };
  }): AdminBusinessUser {
    return {
      membershipId: membership.id,
      userId: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      role: membership.role,
      isActive: membership.isActive,
      platformRole: membership.user.platformRole,
    };
  }

  private toSubscriptionSummary(
    subscription: LatestSubscription,
    businessName: string,
  ): AdminSubscriptionSummary {
    const lastPayment = subscription.payments[0];
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      businessName,
      status: subscription.status as SubscriptionStatus,
      startedAt: subscription.startedAt.toISOString(),
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      billingPeriod: subscription.plan.billingPeriod,
      plan: this.toPlan(subscription.plan),
      lastPayment: lastPayment ? this.toPaymentSummary(lastPayment) : null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  private toPlan(plan: {
    id: string;
    name: string;
    billingPeriod: PlanRecord["billingPeriod"];
    price: { toFixed(digits: number): string };
    currency: string;
    isActive: boolean;
    limits: unknown;
    externalPricingPlanCode?: string | null;
  }): PlanRecord {
    return {
      id: plan.id,
      name: plan.name,
      billingPeriod: plan.billingPeriod,
      price: plan.price.toFixed(2),
      currency: plan.currency,
      isActive: plan.isActive,
      limits: parsePlanLimits(plan.limits),
      externalPricingPlanCode: plan.externalPricingPlanCode ?? null,
    };
  }

  private toPaymentSummary(payment: {
    id: string;
    status: PaymentStatus;
    amount: { toFixed(digits: number): string };
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
  }): AdminPaymentSummary {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private countMap<T extends string>(
    rows: { key: T; count: number }[],
    keys: readonly T[],
  ): { total: number } & Record<T, number> {
    const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
      T,
      number
    >;
    let total = 0;
    for (const row of rows) {
      counts[row.key] = row.count;
      total += row.count;
    }
    return { total, ...counts };
  }

  private toPage<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    };
  }

  private throwPlanConflict(error: unknown): void {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        message: "A plan with this name, period, and currency already exists.",
        code: "PLAN_ALREADY_EXISTS",
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: "The requested resource was not found.",
      code: "RESOURCE_NOT_FOUND",
    });
  }
}
