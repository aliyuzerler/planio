import { isWithinHours, minutesInTimeZone } from "./hours";

describe("business hours", () => {
  it("treats closed days as outside hours", () => {
    expect(
      isWithinHours({ startMinutes: 540, endMinutes: 1140, isClosed: true }, 600),
    ).toBe(false);
  });

  it("includes start and excludes end", () => {
    const slot = { startMinutes: 540, endMinutes: 1140, isClosed: false };
    expect(isWithinHours(slot, 540)).toBe(true);
    expect(isWithinHours(slot, 1139)).toBe(true);
    expect(isWithinHours(slot, 1140)).toBe(false);
  });

  it("reads Istanbul weekday and minutes", () => {
    const instant = new Date("2026-09-07T08:00:00.000Z");
    expect(minutesInTimeZone(instant, "Europe/Istanbul")).toEqual({
      weekday: 1,
      minutes: 11 * 60,
    });
  });
});
