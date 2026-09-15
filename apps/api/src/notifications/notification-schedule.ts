import { REMINDER_LEAD_BUFFER_MS } from "./notification.constants";

export function reminderScheduledAt(
  startAt: Date,
  minutesBefore: number,
  now = new Date(),
): Date | null {
  if (!Number.isInteger(minutesBefore) || minutesBefore < 15) {
    return null;
  }
  const scheduled = new Date(startAt.getTime() - minutesBefore * 60_000);
  if (scheduled.getTime() <= now.getTime() + REMINDER_LEAD_BUFFER_MS) {
    return null;
  }
  return scheduled;
}

export function queueDelayMs(scheduledAt: Date | null, now = new Date()): number {
  if (!scheduledAt) return 0;
  return Math.max(0, scheduledAt.getTime() - now.getTime());
}
