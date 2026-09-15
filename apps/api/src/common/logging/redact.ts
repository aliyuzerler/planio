const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|refresh|cookie|card|cvv|pan|identityNumber|gsmNumber/i;

export function redactValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nextKey, next]) => [
        nextKey,
        redactValue(next, nextKey),
      ]),
    );
  }
  return value;
}

export function safeErrorName(exception: unknown): string {
  if (exception instanceof Error && exception.name) {
    return exception.name;
  }
  return "UnknownError";
}
