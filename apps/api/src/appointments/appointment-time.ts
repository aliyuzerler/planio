import { BadRequestException } from "@nestjs/common";

const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const WALL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function addMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function parseStartAt(value: string, timeZone: string): Date {
  if (INSTANT.test(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw invalidStartAt();
    }
    return parsed;
  }
  const wall = WALL.exec(value);
  const date = wall?.[1];
  const time = wall?.[2];
  if (!date || !time) {
    throw invalidStartAt();
  }
  return zonedWallTimeToUtc(date, normalizeTime(time), timeZone);
}

export const MAX_APPOINTMENT_RANGE_DAYS = 42;

export function inclusiveCalendarDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new BadRequestException({
      message: "from and to must be valid YYYY-MM-DD values.",
      code: "INVALID_DATE_RANGE",
    });
  }
  return Math.round((end - start) / 86_400_000) + 1;
}

export function zonedInclusiveDateRange(
  from: string,
  to: string,
  timeZone: string,
): { start: Date; end: Date } {
  return {
    start: zonedDateRange(from, timeZone).start,
    end: zonedDateRange(to, timeZone).end,
  };
}

export function zonedDateRange(
  date: string,
  timeZone: string,
): { start: Date; end: Date } {
  if (!DATE_ONLY.test(date) || !isRealDate(date)) {
    throw new BadRequestException({
      message: "date must be a valid YYYY-MM-DD value.",
      code: "INVALID_DATE",
    });
  }
  const start = zonedWallTimeToUtc(date, "00:00:00", timeZone);
  const end = zonedWallTimeToUtc(nextCalendarDate(date), "00:00:00", timeZone);
  return { start, end };
}

export function zonedWallTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = parseDateParts(date);
  const [hour, minute, second] = parseTimeParts(time);
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let index = 0; index < 3; index += 1) {
    const offset = offsetMsAt(new Date(utc), timeZone);
    const next = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
    if (next === utc) break;
    utc = next;
  }
  const result = new Date(utc);
  const actual = formatInTimeZone(result, timeZone);
  const expected = `${date}T${normalizeTime(time)}`;
  if (actual !== expected) {
    throw invalidStartAt();
  }
  return result;
}

function normalizeTime(time: string): string {
  const [hour, minute, second] = parseTimeParts(time);
  return `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`;
}

function parseDateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw invalidStartAt();
  }
  return [year, month, day];
}

function parseTimeParts(time: string): [number, number, number] {
  const [hour, minute, second = 0] = normalizeTimePieces(time);
  return [hour, minute, second];
}

function normalizeTimePieces(time: string): [number, number, number] {
  const pieces = time.split(":");
  const hour = Number(pieces[0]);
  const minute = Number(pieces[1]);
  const second = Number(pieces[2] ?? "0");
  if ([hour, minute, second].some((value) => Number.isNaN(value))) {
    throw invalidStartAt();
  }
  return [hour, minute, second];
}

function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = tzParts(instant, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asIfUtc - instant.getTime();
}

function formatInTimeZone(instant: Date, timeZone: string): string {
  const parts = tzParts(instant, timeZone);
  return `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}T${pad(parts.hour, 2)}:${pad(parts.minute, 2)}:${pad(parts.second, 2)}`;
}

function tzParts(instant: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function nextCalendarDate(date: string): string {
  const [year, month, day] = parseDateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1, 2)}-${pad(next.getUTCDate(), 2)}`;
}

function isRealDate(date: string): boolean {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, "0");
}

function invalidStartAt(): BadRequestException {
  return new BadRequestException({
    message: "startAt must be a valid ISO-8601 date-time.",
    code: "INVALID_START_AT",
  });
}
