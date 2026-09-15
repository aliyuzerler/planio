import { redactValue, safeErrorName } from "./redact";

describe("redact", () => {
  it("redacts passwords, tokens, and card-like fields", () => {
    expect(
      redactValue({
        email: "owner@example.test",
        password: "StrongPassword!123",
        accessToken: "jwt-token",
        refreshToken: "opaque-token",
        authorization: "Bearer abc",
        cardNumber: "4111111111111111",
        cvv: "123",
        nested: { secret: "hidden" },
      }),
    ).toEqual({
      email: "owner@example.test",
      password: "[REDACTED]",
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
      authorization: "[REDACTED]",
      cardNumber: "[REDACTED]",
      cvv: "[REDACTED]",
      nested: { secret: "[REDACTED]" },
    });
  });

  it("returns a safe error name", () => {
    expect(safeErrorName(new TypeError("boom"))).toBe("TypeError");
    expect(safeErrorName("plain")).toBe("UnknownError");
  });
});
