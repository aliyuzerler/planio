export function minutesInTimeZone(instant: Date, timeZone: string): {
  weekday: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    weekday: Math.max(0, weekdays.indexOf(map.weekday ?? "Sun")),
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

export function isWithinHours(
  slot: { startMinutes: number; endMinutes: number; isClosed: boolean } | undefined,
  minutes: number,
): boolean {
  if (!slot || slot.isClosed) return false;
  return minutes >= slot.startMinutes && minutes < slot.endMinutes;
}

export function defaultWeeklyHours(): Array<{
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  isClosed: boolean;
}> {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    startMinutes: 540,
    endMinutes: 1140,
    isClosed: weekday === 0,
  }));
}
