import { queueDelayMs, reminderScheduledAt } from "./notification-schedule";

describe("notification reminder schedule", () => {
  const now = new Date("2033-01-15T09:00:00.000Z");

  it("schedules a reminder before the appointment", () => {
    const startAt = new Date("2033-01-15T11:00:00.000Z");
    const scheduled = reminderScheduledAt(startAt, 60, now);
    expect(scheduled?.toISOString()).toBe("2033-01-15T10:00:00.000Z");
    expect(queueDelayMs(scheduled, now)).toBe(60 * 60_000);
  });

  it("skips reminders that would fire in the past or too soon", () => {
    const startAt = new Date("2033-01-15T09:30:00.000Z");
    expect(reminderScheduledAt(startAt, 60, now)).toBeNull();
    expect(queueDelayMs(null, now)).toBe(0);
  });
});
