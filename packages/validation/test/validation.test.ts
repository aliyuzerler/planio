import { describe, expect, it } from "vitest";
import {
  acceptStaffInviteInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
} from "./src/auth";
import { servicePriceSchema } from "./src/service";
import { createCollectionInputSchema, createCounterSaleInputSchema } from "./src/ledger";

describe("auth schemas", () => {
  it("accepts a valid login", () => {
    const parsed = loginInputSchema.parse({
      email: "  User@Example.COM ",
      password: "strong-password-123",
    });
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects short passwords", () => {
    expect(() =>
      loginInputSchema.parse({ email: "a@b.com", password: "short" }),
    ).toThrow();
  });

  it("rejects invalid emails", () => {
    expect(() =>
      loginInputSchema.parse({ email: "not-an-email", password: "x".repeat(12) }),
    ).toThrow();
  });

  it("registers with defaults for timezone", () => {
    const parsed = registerInputSchema.parse({
      email: "owner@example.com",
      password: "strong-password-123",
      firstName: "Ali",
      lastName: "Yılmaz",
      businessName: "Güzellik Salonu",
    });
    expect(parsed.timezone).toBe("Europe/Istanbul");
  });

  it("requires token and password on password reset", () => {
    expect(() => resetPasswordInputSchema.parse({ token: "short" })).toThrow();
    expect(() =>
      resetPasswordInputSchema.parse({
        token: "a".repeat(20),
        password: "strong-password-123",
      }),
    ).not.toThrow();
  });

  it("accepts invite with currentPassword instead of a new password", () => {
    expect(
      acceptStaffInviteInputSchema.safeParse({
        token: "a".repeat(20),
        currentPassword: "existing-secret-123",
      }).success,
    ).toBe(true);
    expect(
      acceptStaffInviteInputSchema.safeParse({
        token: "a".repeat(20),
        password: "strong-password-123",
      }).success,
    ).toBe(true);
    // Ne yeni parola ne mevcut parola: reddedilir.
    expect(
      acceptStaffInviteInputSchema.safeParse({ token: "a".repeat(20) }).success,
    ).toBe(false);
  });
});

describe("money schema", () => {
  it("accepts decimal strings with exactly two fractional digits", () => {
    expect(servicePriceSchema.safeParse("0.00").success).toBe(true);
    expect(servicePriceSchema.safeParse("12345.67").success).toBe(true);
  });

  it("rejects malformed amounts", () => {
    expect(servicePriceSchema.safeParse("10").success).toBe(false);
    expect(servicePriceSchema.safeParse("10.5").success).toBe(false);
    expect(servicePriceSchema.safeParse("10.555").success).toBe(false);
    expect(servicePriceSchema.safeParse("-10.00").success).toBe(false);
    expect(servicePriceSchema.safeParse("10,00").success).toBe(false);
  });
});

describe("counter sale and collection schemas", () => {
  const uuid = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

  it("rejects a counter sale without a customer", () => {
    expect(
      createCounterSaleInputSchema.safeParse({ serviceId: uuid }).success,
    ).toBe(false);
    expect(
      createCounterSaleInputSchema.safeParse({
        customerId: uuid,
        serviceId: uuid,
      }).success,
    ).toBe(true);
  });

  it("rejects collections with malformed amounts", () => {
    expect(
      createCollectionInputSchema.safeParse({
        cashAccountId: uuid,
        amount: "10.5",
      }).success,
    ).toBe(false);
    expect(
      createCollectionInputSchema.safeParse({
        cashAccountId: uuid,
        amount: "10.50",
      }).success,
    ).toBe(true);
  });
});
