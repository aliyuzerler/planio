export function toCents(value: string): number {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [whole = "0", fraction = "00"] = raw.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

export function fromCents(cents: number): string {
  const safe = Math.round(cents);
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function remainingAmount(total: string, collected: string): string {
  return fromCents(Math.max(0, toCents(total) - toCents(collected)));
}
