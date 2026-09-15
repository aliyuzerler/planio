import { BadRequestException } from "@nestjs/common";
import {
  addMinutes,
  inclusiveCalendarDays,
  parseStartAt,
  rangesOverlap,
  zonedDateRange,
  zonedInclusiveDateRange,
} from "./appointment-time";

describe("appointment time helpers", () => {
  it("treats back-to-back ranges as non-overlapping", () => {
    const firstStart = new Date("2033-01-15T10:00:00.000Z");
    const firstEnd = new Date("2033-01-15T11:00:00.000Z");
    const secondStart = new Date("2033-01-15T11:00:00.000Z");
    const secondEnd = new Date("2033-01-15T12:00:00.000Z");
    expect(rangesOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(
      false,
    );
  });

  it("detects overlapping ranges", () => {
    const firstStart = new Date("2033-01-15T10:00:00.000Z");
    const firstEnd = new Date("2033-01-15T11:00:00.000Z");
    const secondStart = new Date("2033-01-15T10:30:00.000Z");
    const secondEnd = new Date("2033-01-15T11:30:00.000Z");
    expect(rangesOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(
      true,
    );
  });

  it("adds whole minutes without floating point", () => {
    expect(addMinutes(new Date("2033-01-15T10:00:00.000Z"), 45).toISOString()).toBe(
      "2033-01-15T10:45:00.000Z",
    );
  });

  it("parses explicit instants and business-local wall times", () => {
    expect(
      parseStartAt("2033-01-15T10:00:00.000Z", "Europe/Istanbul").toISOString(),
    ).toBe("2033-01-15T10:00:00.000Z");
    expect(
      parseStartAt("2033-01-15T10:00", "Europe/Istanbul").toISOString(),
    ).toBe("2033-01-15T07:00:00.000Z");
  });

  it("builds an inclusive business-local date window", () => {
    const range = zonedDateRange("2033-01-15", "Europe/Istanbul");
    expect(range.start.toISOString()).toBe("2033-01-14T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2033-01-15T21:00:00.000Z");
  });

  it("rejects invalid start times", () => {
    expect(() => parseStartAt("not-a-date", "Europe/Istanbul")).toThrow(
      BadRequestException,
    );
  });

  it("counts inclusive calendar days and builds a multi-day window", () => {
    expect(inclusiveCalendarDays("2033-01-15", "2033-01-15")).toBe(1);
    expect(inclusiveCalendarDays("2033-01-12", "2033-01-18")).toBe(7);
    expect(inclusiveCalendarDays("2033-01-20", "2033-01-15")).toBeLessThan(1);
    const range = zonedInclusiveDateRange(
      "2033-01-15",
      "2033-01-16",
      "Europe/Istanbul",
    );
    expect(range.start.toISOString()).toBe("2033-01-14T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2033-01-16T21:00:00.000Z");
  });
});
