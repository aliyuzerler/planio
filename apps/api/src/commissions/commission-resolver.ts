export type CommissionType = "PERCENT" | "AMOUNT";

export interface CommissionCandidate {
  id: string;
  name: string;
  serviceId: string | null;
  commissionType: CommissionType;
  commissionValue: string;
}

export interface ResolvedCommission {
  ruleId: string;
  ruleName: string;
  commissionType: CommissionType;
  commissionValue: string;
  amount: string;
}

export function resolveCommission(
  basisAmount: string,
  rules: CommissionCandidate[],
  serviceId: string,
): ResolvedCommission | null {
  const applicable = rules.filter(
    (rule) => rule.serviceId === null || rule.serviceId === serviceId,
  );
  const specific = applicable.filter((rule) => rule.serviceId === serviceId);
  const pool = specific.length > 0 ? specific : applicable;
  const basisCents = toCents(basisAmount);
  let best: CommissionCandidate | null = null;
  let bestAmount = 0;

  for (const rule of pool) {
    const amount = commissionCents(basisCents, rule);
    if (
      amount > bestAmount ||
      (amount === bestAmount &&
        best !== null &&
        rule.id.localeCompare(best.id) < 0 &&
        amount > 0)
    ) {
      best = rule;
      bestAmount = amount;
    } else if (!best && amount > 0) {
      best = rule;
      bestAmount = amount;
    }
  }

  if (!best || bestAmount <= 0) return null;
  return {
    ruleId: best.id,
    ruleName: best.name,
    commissionType: best.commissionType,
    commissionValue: best.commissionValue,
    amount: fromCents(bestAmount),
  };
}

function commissionCents(
  basisCents: number,
  rule: CommissionCandidate,
): number {
  if (rule.commissionType === "PERCENT") {
    return Math.min(
      basisCents,
      Math.round((basisCents * Number(rule.commissionValue)) / 100),
    );
  }
  return Math.min(basisCents, toCents(rule.commissionValue));
}

function toCents(value: string): number {
  const [whole = "0", fraction = "00"] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function fromCents(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  return `${Math.floor(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}
