import type { SubscriptionAccess, SubscriptionStatus } from "@xenior/types";

export const CURRENT_SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
] as const;

export function subscriptionGrantsAccess(
  status: SubscriptionStatus | null,
  currentPeriodEnd: Date | null,
  now = new Date(),
): boolean {
  if (!status) return false;
  if (status === "EXPIRED") return false;
  if (status === "CANCELLED") {
    return Boolean(currentPeriodEnd && now < currentPeriodEnd);
  }
  if (
    status === "ACTIVE" ||
    status === "TRIALING" ||
    status === "PAST_DUE" ||
    status === "PAUSED"
  ) {
    return Boolean(currentPeriodEnd && now < currentPeriodEnd);
  }
  return false;
}

export function featureIsAvailable(
  access: SubscriptionAccess,
  feature: "advancedFeatures",
): boolean {
  if (!access.hasAccess) return false;
  if (!access.plan) return true;
  return access.limits[feature] === true;
}

export function withinLimit(
  access: SubscriptionAccess,
  kind: "staff" | "customers",
): boolean {
  if (!access.hasAccess) return false;
  const max =
    kind === "staff" ? access.limits.maxStaff : access.limits.maxCustomers;
  const used = kind === "staff" ? access.usage.staff : access.usage.customers;
  if (max == null) return true;
  return used < max;
}

export function planLimitsApply(status: SubscriptionStatus | null): boolean {
  return (
    status === "ACTIVE" ||
    status === "PAST_DUE" ||
    status === "CANCELLED" ||
    status === "PAUSED"
  );
}

export function shouldExpireSubscription(
  status: SubscriptionStatus,
  currentPeriodEnd: Date,
  now = new Date(),
): boolean {
  if (status === "EXPIRED") return false;
  if (status === "TRIALING") return now >= currentPeriodEnd;
  if (status === "CANCELLED") return now >= currentPeriodEnd;
  return (
    CURRENT_SUBSCRIPTION_STATUSES.includes(
      status as (typeof CURRENT_SUBSCRIPTION_STATUSES)[number],
    ) && now >= currentPeriodEnd
  );
}
