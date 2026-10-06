import { describe, expect, it } from "vitest";
import { formatTry } from "./money";

describe("formatTry", () => {
  it("formats decimal string amounts with the ₺ symbol", () => {
    expect(formatTry("0.00")).toBe("₺0,00");
    expect(formatTry("1234.50")).toBe("₺1.234,50");
  });

  it("formats numeric amounts", () => {
    expect(formatTry(42)).toBe("₺42,00");
  });

  it("falls back to zero for invalid input", () => {
    expect(formatTry("not-a-number")).toBe("₺0,00");
    expect(formatTry(Number.NaN)).toBe("₺0,00");
  });
});
