const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Deneme süresi bitimine kaç gün önce uyarı bandı gösterilmeye başlanır. */
export const TRIAL_WARNING_DAYS = 5;

export function trialDaysRemaining(currentPeriodEnd: string): number {
  return Math.ceil(
    (new Date(currentPeriodEnd).getTime() - Date.now()) / MS_PER_DAY,
  );
}

export function trialStatusLabel(days: number): string {
  if (days <= 0) return "Deneme · bugün doluyor";
  return `Deneme · ${days} gün kaldı`;
}

export function subscriptionStatusText(
  status: string,
  currentPeriodEnd: string | null | undefined,
  fallback: string,
): string {
  if (status === "TRIALING" && currentPeriodEnd) {
    return trialStatusLabel(trialDaysRemaining(currentPeriodEnd));
  }
  return fallback;
}
