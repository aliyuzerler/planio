import type { SubscriptionAccess } from "@xenior/types";
import {
  featureIsAvailable,
  shouldExpireSubscription,
  subscriptionGrantsAccess,
  withinLimit,
} from "./subscription-access";

const periodEnd = new Date("2026-10-01T00:00:00.000Z");
const beforeEnd = new Date("2026-09-15T00:00:00.000Z");
const afterEnd = new Date("2026-10-02T00:00:00.000Z");

function access(
  overrides: Partial<SubscriptionAccess> = {},
): SubscriptionAccess {
  return {
    hasAccess: true,
    status: "ACTIVE",
    plan: {
      id: "81111111-1111-4111-8111-111111111111",
      name: "Starter",
      billingPeriod: "MONTHLY",
      price: "499.00",
      currency: "TRY",
      isActive: true,
      limits: { maxStaff: 3, maxCustomers: 50, advancedFeatures: false },
    },
    limits: { maxStaff: 3, maxCustomers: 50, advancedFeatures: false },
    usage: { staff: 1, customers: 2 },
    ...overrides,
  };
}

describe("subscription access", () => {
  it("blocks businesses without a subscription", () => {
    expect(subscriptionGrantsAccess(null, null, beforeEnd)).toBe(false);
  });

  it("grants access for current states until the period ends", () => {
    expect(subscriptionGrantsAccess("ACTIVE", periodEnd, beforeEnd)).toBe(true);
    expect(subscriptionGrantsAccess("PAST_DUE", periodEnd, beforeEnd)).toBe(true);
    expect(subscriptionGrantsAccess("TRIALING", periodEnd, beforeEnd)).toBe(true);
    expect(subscriptionGrantsAccess("CANCELLED", periodEnd, beforeEnd)).toBe(true);
    expect(subscriptionGrantsAccess("ACTIVE", periodEnd, afterEnd)).toBe(false);
    expect(subscriptionGrantsAccess("CANCELLED", periodEnd, afterEnd)).toBe(false);
    expect(subscriptionGrantsAccess("EXPIRED", periodEnd, beforeEnd)).toBe(false);
  });

  it("expires cancelled and current subscriptions after the period", () => {
    expect(shouldExpireSubscription("ACTIVE", periodEnd, afterEnd)).toBe(true);
    expect(shouldExpireSubscription("CANCELLED", periodEnd, afterEnd)).toBe(true);
    expect(shouldExpireSubscription("CANCELLED", periodEnd, beforeEnd)).toBe(false);
    expect(shouldExpireSubscription("EXPIRED", periodEnd, afterEnd)).toBe(false);
    expect(shouldExpireSubscription("TRIALING", periodEnd, afterEnd)).toBe(true);
  });

  it("enforces staff and customer limits only when a plan sets them", () => {
    expect(withinLimit(access({ usage: { staff: 2, customers: 2 } }), "staff")).toBe(
      true,
    );
    expect(withinLimit(access({ usage: { staff: 3, customers: 2 } }), "staff")).toBe(
      false,
    );
    expect(
      withinLimit(
        access({
          limits: { maxStaff: null, maxCustomers: null, advancedFeatures: false },
          usage: { staff: 99, customers: 99 },
        }),
        "staff",
      ),
    ).toBe(true);
    expect(withinLimit(access({ hasAccess: false }), "staff")).toBe(false);
  });

  it("treats advanced features as a backend entitlement", () => {
    expect(featureIsAvailable(access(), "advancedFeatures")).toBe(false);
    expect(
      featureIsAvailable(
        access({
          limits: { maxStaff: 15, maxCustomers: 500, advancedFeatures: true },
        }),
        "advancedFeatures",
      ),
    ).toBe(true);
    expect(
      featureIsAvailable(
        access({ hasAccess: true, status: null, plan: null }),
        "advancedFeatures",
      ),
    ).toBe(true);
    expect(
      featureIsAvailable(access({ hasAccess: false, status: "EXPIRED" }), "advancedFeatures"),
    ).toBe(false);
  });
});
