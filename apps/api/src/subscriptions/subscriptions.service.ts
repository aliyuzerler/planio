import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { Prisma } from "@xenior/database";
import type {
  PlanRecord,
  SubscriptionRecord,
  SubscriptionStatus,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import {
  IYZICO_SUBSCRIPTION_PORT,
  type IyzicoSubscriptionPort,
} from "../payments/iyzico/iyzico.port";
import { CURRENT_SUBSCRIPTION_STATUSES, shouldExpireSubscription } from "./subscription-access";
import { addBillingPeriod, parsePlanLimits } from "./subscription-period";

const planSelect = {
  id: true,
  name: true,
  billingPeriod: true,
  price: true,
  currency: true,
  isActive: true,
  limits: true,
} satisfies Prisma.PlanSelect;

const subscriptionInclude = {
  plan: { select: planSelect },
} satisfies Prisma.SubscriptionInclude;

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async listPlans(): Promise<PlanRecord[]> {
    this.requestContext.requireTenant();
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { billingPeriod: "asc" }],
    });
    return plans.map((plan) => this.toPlan(plan));
  }

  async getCurrent(): Promise<SubscriptionRecord | null> {
    const { businessId } = this.requestContext.requireTenant();
    await this.expireIfNeeded(businessId);
    const subscription = await this.currentRecord(businessId);
    return subscription ? this.toRecord(subscription) : null;
  }

  async getById(id: string): Promise<SubscriptionRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, businessId },
      include: subscriptionInclude,
    });
    if (!subscription) {
      throw new NotFoundException({
        message: "The requested resource was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.toRecord(subscription);
  }

  async prepareForCheckout(planId: string): Promise<SubscriptionWithPlan> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    const plan = await this.prisma.plan.findFirst({ where: { id: planId } });
    if (!plan?.isActive) {
      throw new NotFoundException({
        message: "Plan was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    await this.expireIfNeeded(businessId);
    const current = await this.currentRecord(businessId);
    if (current && current.planId === plan.id && current.status === "ACTIVE") {
      throw new BadRequestException({
        message: "The business is already on this plan.",
        code: "ALREADY_ON_PLAN",
      });
    }
    const now = new Date();
    const checkoutWindowEnd = new Date(now.getTime() + 45 * 60 * 1000);
    if (current?.status === "ACTIVE" || current?.status === "PAST_DUE") {
      return current;
    }
    if (current?.status === "TRIALING") {
      return this.prisma.subscription.update({
        where: { id: current.id },
        data: {
          planId: plan.id,
          currentPeriodStart: now,
          currentPeriodEnd: checkoutWindowEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
        include: subscriptionInclude,
      });
    }

    const created = await this.prisma.$transaction(async (transaction) => {
      const subscription = await transaction.subscription.create({
        data: {
          businessId,
          planId: plan.id,
          status: "TRIALING",
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: checkoutWindowEnd,
        },
        include: subscriptionInclude,
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "SUBSCRIPTION_CHECKOUT_STARTED",
          entityType: "Subscription",
          entityId: subscription.id,
          metadata: { fields: ["planId", "status"] },
        },
        transaction,
      );
      return subscription;
    });
    return created;
  }

  async activateAfterPayment(
    input: {
      subscriptionId: string;
      businessId: string;
      planId: string;
      externalCustomerId: string | null;
      externalSubscriptionId: string | null;
    },
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    const plan = await transaction.plan.findFirstOrThrow({
      where: { id: input.planId },
    });
    const now = new Date();
    await transaction.subscription.update({
      where: { id: input.subscriptionId },
      data: {
        planId: plan.id,
        status: "ACTIVE",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: addBillingPeriod(now, plan.billingPeriod),
        cancelledAt: null,
        cancelAtPeriodEnd: false,
        externalProvider: "IYZICO",
        externalCustomerId: input.externalCustomerId,
        externalSubscriptionId: input.externalSubscriptionId,
      },
    });
    await this.auditLog.record(
      {
        businessId: input.businessId,
        action: "SUBSCRIPTION_ACTIVATED",
        entityType: "Subscription",
        entityId: input.subscriptionId,
        metadata: { fields: ["status", "planId", "externalSubscriptionId"] },
      },
      transaction,
    );
  }

  async markPastDueByExternalId(externalSubscriptionId: string): Promise<void> {
    const current = await this.prisma.subscription.findFirst({
      where: {
        externalProvider: "IYZICO",
        externalSubscriptionId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
    });
    if (!current) return;
    await this.prisma.subscription.update({
      where: { id: current.id },
      data: { status: "PAST_DUE" },
    });
  }

  async renewByExternalId(externalSubscriptionId: string): Promise<void> {
    const current = await this.prisma.subscription.findFirst({
      where: {
        externalProvider: "IYZICO",
        externalSubscriptionId,
      },
      include: { plan: true },
    });
    if (!current) return;
    const periodStart = current.currentPeriodEnd;
    await this.prisma.subscription.update({
      where: { id: current.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: addBillingPeriod(periodStart, current.plan.billingPeriod),
        cancelledAt: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  async cancel(): Promise<SubscriptionRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.expireIfNeeded(businessId);
    const current = await this.currentRecord(businessId);
    if (!current || !CURRENT_SUBSCRIPTION_STATUSES.includes(current.status as never)) {
      throw new BadRequestException({
        message: "There is no cancellable subscription.",
        code: "NO_ACTIVE_SUBSCRIPTION",
      });
    }
    if (current.externalSubscriptionId) {
      try {
        const iyzico = this.moduleRef.get<IyzicoSubscriptionPort>(
          IYZICO_SUBSCRIPTION_PORT,
          { strict: false },
        );
        await iyzico.cancelSubscription(current.externalSubscriptionId);
      } catch {
        // Provider is optional in isolated modules that do not import payments.
      }
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const next = await transaction.subscription.update({
        where: { id: current.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelAtPeriodEnd: true,
        },
        include: subscriptionInclude,
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "SUBSCRIPTION_CANCELLED",
          entityType: "Subscription",
          entityId: next.id,
          metadata: { fields: ["status", "cancelledAt", "cancelAtPeriodEnd"] },
        },
        transaction,
      );
      return next;
    });
    return this.toRecord(updated);
  }

  async currentRecord(businessId: string): Promise<SubscriptionWithPlan | null> {
    return this.prisma.subscription.findFirst({
      where: { businessId },
      include: subscriptionInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async expireIfNeeded(businessId: string): Promise<void> {
    const current = await this.prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    if (
      current &&
      shouldExpireSubscription(current.status, current.currentPeriodEnd)
    ) {
      await this.prisma.subscription.update({
        where: { id: current.id },
        data: { status: "EXPIRED" },
      });
    }
  }

  toPlan(plan: {
    id: string;
    name: string;
    billingPeriod: PlanRecord["billingPeriod"];
    price: { toFixed(digits: number): string };
    currency: string;
    isActive: boolean;
    limits: unknown;
  }): PlanRecord {
    return {
      id: plan.id,
      name: plan.name,
      billingPeriod: plan.billingPeriod,
      price: plan.price.toFixed(2),
      currency: plan.currency,
      isActive: plan.isActive,
      limits: parsePlanLimits(plan.limits),
    };
  }

  toRecord(subscription: SubscriptionWithPlan): SubscriptionRecord {
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      status: subscription.status as SubscriptionStatus,
      startedAt: subscription.startedAt.toISOString(),
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      externalProvider: subscription.externalProvider,
      externalSubscriptionId: subscription.externalSubscriptionId,
      plan: this.toPlan(subscription.plan),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
