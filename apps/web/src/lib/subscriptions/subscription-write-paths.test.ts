import { describe, expect, it } from "vitest";
import { isSubscriptionWritePath } from "./subscription-write-paths";

describe("subscription write paths", () => {
  it("locks appointment create/detail and catalog writes", () => {
    expect(isSubscriptionWritePath("/settings/appointments/new")).toBe(true);
    expect(
      isSubscriptionWritePath("/settings/appointments/75ac17f5-75a4-4363-9b55-42d5fa53f8b7"),
    ).toBe(true);
    expect(isSubscriptionWritePath("/settings/customers/new")).toBe(true);
    expect(isSubscriptionWritePath("/settings/staff/abc/edit")).toBe(true);
    expect(isSubscriptionWritePath("/settings/campaigns/new")).toBe(true);
    expect(isSubscriptionWritePath("/settings/commissions/new")).toBe(true);
    expect(isSubscriptionWritePath("/settings/sales/new")).toBe(true);
    expect(isSubscriptionWritePath("/settings/cash/new")).toBe(true);
    expect(isSubscriptionWritePath("/settings/resources")).toBe(true);
    expect(isSubscriptionWritePath("/settings/business")).toBe(true);
  });

  it("keeps lists, dashboard, and subscription readable", () => {
    expect(isSubscriptionWritePath("/dashboard")).toBe(false);
    expect(isSubscriptionWritePath("/settings/appointments")).toBe(false);
    expect(isSubscriptionWritePath("/settings/customers")).toBe(false);
    expect(isSubscriptionWritePath("/settings/subscription")).toBe(false);
    expect(isSubscriptionWritePath("/settings/sales")).toBe(false);
    expect(isSubscriptionWritePath("/settings/cash")).toBe(false);
  });
});
