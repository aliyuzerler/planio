import { describe, expect, it } from "vitest";
import {
  calendarDays,
  calendarRange,
  formatYmd,
  parseAppointmentDrag,
  shiftCalendarCursor,
  startAtOnDay,
} from "./calendar-range";

describe("calendar-range", () => {
  it("builds a six-week month grid starting on Monday", () => {
    const cursor = new Date(2026, 8, 8);
    const days = calendarDays("month", cursor);
    expect(days).toHaveLength(42);
    expect(formatYmd(days[0]!)).toBe("2026-08-31");
    expect(formatYmd(days[41]!)).toBe("2026-10-11");
    expect(calendarRange("month", cursor)).toEqual({
      from: "2026-08-31",
      to: "2026-10-11",
    });
  });

  it("shifts month view by calendar months", () => {
    const next = shiftCalendarCursor(new Date(2026, 8, 8), "month", 1);
    expect(formatYmd(next)).toBe("2026-10-01");
  });

  it("keeps local time when moving an appointment to another day", () => {
    const moved = startAtOnDay(
      "2033-01-15T10:30:00.000Z",
      new Date(2033, 0, 16),
    );
    const parsed = new Date(moved);
    expect(parsed.getHours()).toBe(new Date("2033-01-15T10:30:00.000Z").getHours());
    expect(parsed.getMinutes()).toBe(30);
    expect(parsed.getDate()).toBe(16);
  });

  it("parses drag payloads and rejects invalid JSON", () => {
    expect(parseAppointmentDrag("{")).toBeNull();
    expect(
      parseAppointmentDrag(
        JSON.stringify({
          id: "id",
          startAt: "2033-01-15T10:00:00.000Z",
          staffId: "staff",
        }),
      ),
    ).toEqual({
      id: "id",
      startAt: "2033-01-15T10:00:00.000Z",
      staffId: "staff",
    });
  });
});
