const SENSITIVE_KEYS = new Set([
  "cardnumber",
  "card_number",
  "cvc",
  "cvv",
  "expiremonth",
  "expireyear",
  "cardholdername",
  "paymentcard",
  "secretkey",
  "apikey",
]);

export function sanitizeProviderMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProviderMetadata(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase().replaceAll("_", ""))) {
      continue;
    }
    next[key] = sanitizeProviderMetadata(item);
  }
  return next;
}
