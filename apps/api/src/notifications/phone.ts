export function normalizeTrMsisdn(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 13 && digits.startsWith("090")) return digits.slice(1);
  return digits.length >= 8 ? digits : null;
}
