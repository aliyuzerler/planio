import { describe, expect, it } from "vitest";
import { addDaysYmd, formatYmdInTimeZone } from "./business-date";

describe("business-date", () => {
  it("formats a UTC instant in the business timezone", () => {
    const date = new Date("2026-09-05T21:30:00.000Z");
    expect(formatYmdInTimeZone(date, "Europe/Istanbul")).toBe("2026-09-06");
    expect(formatYmdInTimeZone(date, "UTC")).toBe("2026-09-05");
  });

  it("adds calendar days without inventing slot rules", () => {
    expect(addDaysYmd("2026-09-05", 13)).toBe("2026-09-18");
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
  });
});
