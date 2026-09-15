import type { BillingPeriod } from "@xenior/types";

export function addBillingPeriod(start: Date, period: BillingPeriod): Date {
  const next = new Date(start.getTime());
  if (period === "YEARLY") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else if (period === "SEMIANNUAL") {
    next.setUTCMonth(next.getUTCMonth() + 6);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

export function toIyzicoPaymentInterval(period: BillingPeriod): {
  paymentInterval: "MONTHLY" | "YEARLY";
  paymentIntervalCount: number;
} {
  if (period === "YEARLY") {
    return { paymentInterval: "YEARLY", paymentIntervalCount: 1 };
  }
  if (period === "SEMIANNUAL") {
    return { paymentInterval: "MONTHLY", paymentIntervalCount: 6 };
  }
  return { paymentInterval: "MONTHLY", paymentIntervalCount: 1 };
}

export function parsePlanLimits(value: unknown): {
  maxStaff: number | null;
  maxCustomers: number | null;
  advancedFeatures: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { maxStaff: null, maxCustomers: null, advancedFeatures: false };
  }
  const record = value as Record<string, unknown>;
  return {
    maxStaff: positiveInt(record.maxStaff),
    maxCustomers: positiveInt(record.maxCustomers),
    advancedFeatures: record.advancedFeatures === true,
  };
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}
