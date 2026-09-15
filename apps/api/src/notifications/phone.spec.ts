import { normalizeTrMsisdn } from "./phone";

describe("normalizeTrMsisdn", () => {
  it("normalizes common Turkish mobile formats", () => {
    expect(normalizeTrMsisdn("0555 111 22 33")).toBe("905551112233");
    expect(normalizeTrMsisdn("+90 555 111 22 33")).toBe("905551112233");
    expect(normalizeTrMsisdn("5551112233")).toBe("905551112233");
  });

  it("returns null for empty values", () => {
    expect(normalizeTrMsisdn(null)).toBeNull();
    expect(normalizeTrMsisdn("")).toBeNull();
  });
});
