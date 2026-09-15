import { ForbiddenException, Injectable } from "@nestjs/common";
import type { PlanLimits, SubscriptionAccess } from "@xenior/types";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import {
  featureIsAvailable,
  planLimitsApply,
  subscriptionGrantsAccess,
  withinLimit,
} from "./subscription-access";
import { parsePlanLimits } from "./subscription-period";
import { SubscriptionsService } from "./subscriptions.service";

@Injectable()
export class SubscriptionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async getAccess(businessId?: string): Promise<SubscriptionAccess> {
    const tenantId = businessId ?? this.requestContext.requireTenant().businessId;
    await this.subscriptions.expireIfNeeded(tenantId);
    const subscription = await this.subscriptions.currentRecord(tenantId);
    const [staff, customers] = await Promise.all([
      this.prisma.staff.count({ where: { businessId: tenantId, isActive: true } }),
      this.prisma.customer.count({
        where: { businessId: tenantId, isActive: true },
      }),
    ]);
    const limits =
      subscription && planLimitsApply(subscription.status)
        ? parsePlanLimits(subscription.plan.limits)
        : { maxStaff: null, maxCustomers: null, advancedFeatures: false };
    return {
      hasAccess: subscriptionGrantsAccess(
        subscription?.status ?? null,
        subscription?.currentPeriodEnd ?? null,
      ),
      status: subscription?.status ?? null,
      plan: subscription ? this.subscriptions.toPlan(subscription.plan) : null,
      limits,
      usage: { staff, customers },
    };
  }

  async assertCanUseBusiness(businessId: string): Promise<void> {
    await this.subscriptions.expireIfNeeded(businessId);
    const access = await this.getAccess(businessId);
    if (!access.hasAccess) {
      throw new ForbiddenException({
        message: "This business does not have an active subscription.",
        code: "SUBSCRIPTION_INACTIVE",
      });
    }
  }

  async assertWithinLimit(
    kind: "staff" | "customers",
    businessId?: string,
  ): Promise<void> {
    const tenantId = businessId ?? this.requestContext.requireTenant().businessId;
    const access = await this.getAccess(tenantId);
    if (!access.hasAccess) {
      throw new ForbiddenException({
        message: "This business does not have an active subscription.",
        code: "SUBSCRIPTION_INACTIVE",
      });
    }
    if (!withinLimit(access, kind)) {
      const max = kind === "staff" ? access.limits.maxStaff : access.limits.maxCustomers;
      const used = kind === "staff" ? access.usage.staff : access.usage.customers;
      throw new ForbiddenException({
        message: `The current plan does not allow more ${kind}.`,
        code: "PLAN_LIMIT_REACHED",
        details: { kind, max, used },
      });
    }
  }

  async assertFeature(
    feature: keyof Pick<PlanLimits, "advancedFeatures">,
    businessId?: string,
  ): Promise<void> {
    const tenantId = businessId ?? this.requestContext.requireTenant().businessId;
    const access = await this.getAccess(tenantId);
    if (!access.hasAccess) {
      throw new ForbiddenException({
        message: "This business does not have an active subscription.",
        code: "SUBSCRIPTION_INACTIVE",
      });
    }
    if (!featureIsAvailable(access, feature)) {
      throw new ForbiddenException({
        message: "The current plan does not include this feature.",
        code: "FEATURE_NOT_AVAILABLE",
        details: { feature },
      });
    }
  }
}
