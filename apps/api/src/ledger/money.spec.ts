import { fromCents, remainingAmount, toCents } from "./money";

describe("ledger money", () => {
  it("keeps two-decimal cents math", () => {
    expect(toCents("360.00")).toBe(36000);
    expect(fromCents(7200)).toBe("72.00");
    expect(remainingAmount("360.00", "100.00")).toBe("260.00");
  });

  it("formats signed ledger amounts", () => {
    expect(fromCents(-36000)).toBe("-360.00");
    expect(toCents("-12.50")).toBe(-1250);
  });
});
