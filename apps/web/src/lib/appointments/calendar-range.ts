export type CalendarView = "day" | "week" | "month";

const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseYmd(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return copy;
}

export function calendarDays(view: CalendarView, cursor: Date): Date[] {
  if (view === "day") {
    return [new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())];
  }
  if (view === "week") {
    const start = startOfWeekMonday(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeekMonday(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function calendarRange(
  view: CalendarView,
  cursor: Date,
): { from: string; to: string } {
  const days = calendarDays(view, cursor);
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    const today = formatYmd(cursor);
    return { from: today, to: today };
  }
  return { from: formatYmd(first), to: formatYmd(last) };
}

export function shiftCalendarCursor(
  cursor: Date,
  view: CalendarView,
  direction: -1 | 1,
): Date {
  if (view === "month") return addMonths(cursor, direction);
  return addDays(cursor, direction * (view === "week" ? 7 : 1));
}

export function weekdayLabel(date: Date): string {
  const index = (date.getDay() + 6) % 7;
  return WEEKDAY_SHORT[index] ?? "";
}

export function isSameDay(left: Date, right: Date): boolean {
  return formatYmd(left) === formatYmd(right);
}

export function localDateKey(iso: string): string {
  return formatYmd(new Date(iso));
}

export function suggestedStartAt(day: Date, hour: number, minute = 0): string {
  const start = new Date(day);
  start.setHours(hour, minute, 0, 0);
  return start.toISOString();
}

export function startAtOnDay(iso: string, day: Date): string {
  const current = new Date(iso);
  const next = new Date(day);
  next.setHours(
    current.getHours(),
    current.getMinutes(),
    current.getSeconds(),
    0,
  );
  return next.toISOString();
}

export function snapDropStartAt(
  day: Date,
  startHour: number,
  clientY: number,
  columnTop: number,
  hourPx: number,
): string {
  const offset = Math.max(0, clientY - columnTop);
  const totalMinutes = startHour * 60 + (offset / hourPx) * 60;
  const snapped = Math.round(totalMinutes / 15) * 15;
  const hour = Math.floor(snapped / 60);
  const minute = snapped % 60;
  return suggestedStartAt(day, hour, minute);
}

export type AppointmentDragPayload = {
  id: string;
  startAt: string;
  staffId: string;
};

export function serializeAppointmentDrag(
  payload: AppointmentDragPayload,
): string {
  return JSON.stringify(payload);
}

export function parseAppointmentDrag(raw: string): AppointmentDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppointmentDragPayload>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.startAt !== "string" ||
      typeof parsed.staffId !== "string"
    ) {
      return null;
    }
    return { id: parsed.id, startAt: parsed.startAt, staffId: parsed.staffId };
  } catch {
    return null;
  }
}

export function visibleHourWindow(
  items: Array<{ startAt: string; endAt: string }>,
  fallbackStart = 8,
  fallbackEnd = 20,
): { startHour: number; endHour: number } {
  let startHour = fallbackStart;
  let endHour = fallbackEnd;
  for (const item of items) {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt);
    startHour = Math.min(startHour, start.getHours());
    endHour = Math.max(
      endHour,
      end.getMinutes() > 0 || end.getSeconds() > 0
        ? end.getHours() + 1
        : Math.max(end.getHours(), start.getHours() + 1),
    );
  }
  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  };
}
