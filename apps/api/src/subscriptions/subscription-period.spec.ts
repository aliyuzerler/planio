import {
  addBillingPeriod,
  parsePlanLimits,
  toIyzicoPaymentInterval,
} from "./subscription-period";

describe("subscription period helpers", () => {
  it("adds one UTC month for monthly billing", () => {
    expect(
      addBillingPeriod(new Date("2026-01-15T10:00:00.000Z"), "MONTHLY").toISOString(),
    ).toBe("2026-02-15T10:00:00.000Z");
  });

  it("adds one UTC year for yearly billing", () => {
    expect(
      addBillingPeriod(new Date("2026-01-15T10:00:00.000Z"), "YEARLY").toISOString(),
    ).toBe("2027-01-15T10:00:00.000Z");
  });

  it("adds six UTC months for semiannual billing", () => {
    expect(
      addBillingPeriod(new Date("2026-01-15T10:00:00.000Z"), "SEMIANNUAL").toISOString(),
    ).toBe("2026-07-15T10:00:00.000Z");
  });

  it("maps billing periods to iyzico payment intervals", () => {
    expect(toIyzicoPaymentInterval("MONTHLY")).toEqual({
      paymentInterval: "MONTHLY",
      paymentIntervalCount: 1,
    });
    expect(toIyzicoPaymentInterval("SEMIANNUAL")).toEqual({
      paymentInterval: "MONTHLY",
      paymentIntervalCount: 6,
    });
    expect(toIyzicoPaymentInterval("YEARLY")).toEqual({
      paymentInterval: "YEARLY",
      paymentIntervalCount: 1,
    });
  });

  it("treats missing plan limits as unlimited without advanced features", () => {
    expect(parsePlanLimits(null)).toEqual({
      maxStaff: null,
      maxCustomers: null,
      advancedFeatures: false,
    });
  });

  it("reads only positive integer limits from JSON", () => {
    expect(
      parsePlanLimits({
        maxStaff: 3,
        maxCustomers: 50,
        advancedFeatures: true,
      }),
    ).toEqual({
      maxStaff: 3,
      maxCustomers: 50,
      advancedFeatures: true,
    });
    expect(
      parsePlanLimits({ maxStaff: 0, maxCustomers: "50", advancedFeatures: "yes" }),
    ).toEqual({
      maxStaff: null,
      maxCustomers: null,
      advancedFeatures: false,
    });
  });
});
