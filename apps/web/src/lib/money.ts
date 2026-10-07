/**
 * TRY para biçimlendirme: API ondalık dize döner ("1234.50"), arayüzde
 * tutarlı biçimde ₺ simgesiyle gösterilir ("₺1.234,50").
 *
 * Intl.NumberFormat kullanılmaz: jsdom/test ortamları ile tarayıcıların
 * locale verisi sembol konumunda farklılaşabiliyor; biçim burada
 * sabitlenir (binlik ayraç ".", ondalık ayraç ",").
 */
export function formatTry(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return "₺0,00";
  }
  // Negatifler ve yuvarlama: 2 basamakta sabitle.
  const negative = value < 0;
  const [whole, fraction = ""] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}₺${grouped},${fraction.padEnd(2, "0").slice(0, 2)}`;
}

/**
 * Para birimi bilinçli gösterim: TRY için ₺ biçimi, diğer para birimlerinde
 * ham tutar + kod (ürün şu an yalnızca TRY kullanıyor).
 */
export function formatMoney(
  amount: string | number,
  currency = "TRY",
): string {
  if (currency === "TRY") {
    return formatTry(amount);
  }
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return `0,00 ${currency}`;
  }
  const [whole, fraction = ""] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "-" : ""}${grouped},${fraction.padEnd(2, "0").slice(0, 2)} ${currency}`;
}
