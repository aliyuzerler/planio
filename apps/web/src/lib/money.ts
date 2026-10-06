/**
 * TRY para biçimlendirme: API ondalık dize döner ("1234.50"), arayüzde
 * tutarlı biçimde ₺ simgesiyle gösterilir. "\"1234.50 TRY\""
 * birleştirmeleri yerine kullanılmalı.
 */
export function formatTry(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return "0,00 ₺";
  }
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}
