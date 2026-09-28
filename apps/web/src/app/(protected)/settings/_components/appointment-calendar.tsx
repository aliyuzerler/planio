"use client";

import { useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AppointmentRecord, StaffProfile } from "@xenior/types";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { rescheduleAppointment } from "@/lib/appointments/appointment-api";
import { useCalendarAppointments } from "@/lib/appointments/appointment-queries";
import { appointmentStatusClass } from "@/lib/appointments/appointment-status";
import {
  calendarDays,
  calendarRange,
  formatYmd,
  isSameDay,
  localDateKey,
  parseAppointmentDrag,
  parseYmd,
  serializeAppointmentDrag,
  shiftCalendarCursor,
  snapDropStartAt,
  startAtOnDay,
  suggestedStartAt,
  visibleHourWindow,
  weekdayLabel,
  type CalendarView,
} from "@/lib/appointments/calendar-range";
import { useBusinessRole } from "@/lib/resources/resource-queries";
import { useStaffList } from "@/lib/staff/staff-queries";
import { useSubscriptionAccess } from "@/lib/subscriptions/subscription-queries";
import { AppointmentStatusBadge } from "./appointment-status-badge";

const HOUR_PX = 56;
const VIEWS: Array<{ id: CalendarView; label: string }> = [
  { id: "day", label: "Gün" },
  { id: "week", label: "Hafta" },
  { id: "month", label: "Ay" },
];

export function AppointmentCalendar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const role = useBusinessRole();
  const isStaff = role === "STAFF";
  const access = useSubscriptionAccess();
  const canWrite = access.data?.hasAccess !== false;
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [staffId, setStaffId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const staff = useStaffList({ isActive: true, loginRole: "STAFF" });
  const range = calendarRange(view, cursor);
  const days = calendarDays(view, cursor);
  const appointments = useCalendarAppointments({
    from: range.from,
    to: range.to,
    staffId: isStaff ? undefined : staffId || undefined,
  });
  const items = useMemo(() => appointments.data ?? [], [appointments.data]);
  const hours = visibleHourWindow(items);
  const hourCount = hours.endHour - hours.startHour;
  const today = new Date();
  const staffColumns = useMemo(
    () => visibleStaffColumns(staff.data ?? [], staffId, isStaff),
    [isStaff, staff.data, staffId],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const day of days) map.set(formatYmd(day), []);
    for (const item of items) {
      const key = localDateKey(item.startAt);
      map.get(key)?.push(item);
    }
    return map;
  }, [days, items]);

  async function moveAppointment(
    id: string,
    input: { startAt: string; staffId?: string },
  ) {
    try {
      await rescheduleAppointment(id, input);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      pushToast("Randevu taşındı.");
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Randevu taşınamadı.",
        "error",
      );
    } finally {
      setDraggingId(null);
    }
  }

  function handleTimeDrop(
    event: DragEvent<HTMLElement>,
    day: Date,
    nextStaffId?: string,
  ) {
    event.preventDefault();
    if (!canWrite) return;
    const payload = parseAppointmentDrag(event.dataTransfer.getData("text/plain"));
    if (!payload) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const startAt = snapDropStartAt(
      day,
      hours.startHour,
      event.clientY,
      rect.top,
      HOUR_PX,
    );
    void moveAppointment(payload.id, {
      startAt,
      ...(nextStaffId && nextStaffId !== payload.staffId
        ? { staffId: nextStaffId }
        : {}),
    });
  }

  function handleDayDrop(event: DragEvent<HTMLElement>, day: Date) {
    event.preventDefault();
    if (!canWrite) return;
    const payload = parseAppointmentDrag(event.dataTransfer.getData("text/plain"));
    if (!payload) return;
    void moveAppointment(payload.id, { startAt: startAtOnDay(payload.startAt, day) });
  }

  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <div className="flex overflow-hidden rounded-xl bg-white ring-1 ring-[#c5dde6]/80">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                className={`px-3.5 py-2 text-sm font-semibold transition ${
                  view === item.id
                    ? "bg-[#7eb8c8] text-white"
                    : "bg-white text-[#3d6b7a] hover:bg-[#F7FBFC]"
                }`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton
              onClick={() =>
                setCursor((current) => shiftCalendarCursor(current, view, -1))
              }
            >
              Önceki
            </ToolbarButton>
            <ToolbarButton onClick={() => setCursor(new Date())}>Bugün</ToolbarButton>
            <ToolbarButton
              onClick={() =>
                setCursor((current) => shiftCalendarCursor(current, view, 1))
              }
            >
              Sonraki
            </ToolbarButton>
          </div>
          <input
            aria-label="Tarih"
            type="date"
            value={formatYmd(cursor)}
            onChange={(event) => {
              if (!event.target.value) return;
              setCursor(parseYmd(event.target.value));
            }}
            className="rounded-xl bg-white px-3 py-2 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none focus:ring-2 focus:ring-[#7eb8c8]"
          />
          {isStaff ? null : (
            <select
              aria-label="Personel filtresi"
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              className="rounded-xl bg-white px-3 py-2 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none focus:ring-2 focus:ring-[#7eb8c8]"
            >
              <option value="">Tüm personel</option>
              {(staff.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          )}
          <p className="text-[13px] font-semibold text-[#3d6b7a]">
            {view === "month"
              ? cursor.toLocaleDateString("tr-TR", {
                  month: "long",
                  year: "numeric",
                })
              : range.from === range.to
                ? cursor.toLocaleDateString("tr-TR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : `${range.from} – ${range.to}`}
          </p>
        </div>

        <div className="p-3 sm:p-4">
          {view === "month" ? (
            <MonthGrid
              days={days}
              byDay={byDay}
              cursor={cursor}
              today={today}
              draggingId={draggingId}
              canWrite={canWrite}
              onOpen={(id) => router.push(`/settings/appointments/${id}`)}
              onDragStart={setDraggingId}
              onDropDay={handleDayDrop}
            />
          ) : view === "day" ? (
            <DayStaffGrid
              day={days[0] ?? cursor}
              staffColumns={staffColumns}
              items={items}
              hours={hours}
              hourCount={hourCount}
              today={today}
              draggingId={draggingId}
              canWrite={canWrite}
              onOpen={(id) => router.push(`/settings/appointments/${id}`)}
              onDragStart={setDraggingId}
              onDropColumn={handleTimeDrop}
            />
          ) : (
            <WeekGrid
              days={days}
              byDay={byDay}
              hours={hours}
              hourCount={hourCount}
              today={today}
              draggingId={draggingId}
              canWrite={canWrite}
              onOpen={(id) => router.push(`/settings/appointments/${id}`)}
              onDragStart={setDraggingId}
              onDropColumn={handleTimeDrop}
            />
          )}
        </div>
      </div>

      {appointments.isLoading ? (
        <p className="mt-3 text-sm text-[#5a7380]">Takvim yükleniyor…</p>
      ) : null}
      {appointments.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Takvim yüklenemedi.
        </p>
      ) : null}
      {!appointments.isLoading && !appointments.isError && items.length === 0 ? (
        <p className="mt-3 text-sm text-[#5a7380]">
          Bu aralıkta randevu yok. Boş bir saate tıklayarak oluşturabilirsiniz;
          uygunluk sunucuda kontrol edilir.
        </p>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#3d6b7a] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#F7FBFC]"
    >
      {children}
    </button>
  );
}

function visibleStaffColumns(
  staff: StaffProfile[],
  staffId: string,
  isStaff: boolean,
): StaffProfile[] {
  const self = staff.filter((item) => item.isSelf);
  const source = isStaff && self.length > 0 ? self : staff;
  return staffId ? source.filter((item) => item.id === staffId) : source;
}

function WeekGrid({
  days,
  byDay,
  hours,
  hourCount,
  today,
  draggingId,
  canWrite,
  onOpen,
  onDragStart,
  onDropColumn,
}: {
  days: Date[];
  byDay: Map<string, AppointmentRecord[]>;
  hours: { startHour: number; endHour: number };
  hourCount: number;
  today: Date;
  draggingId: string | null;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
  onDropColumn: (event: DragEvent<HTMLElement>, day: Date) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-[#F7FBFC]/50 ring-1 ring-[#e4f0f4]">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: `72px repeat(${days.length}, minmax(140px, 1fr))`,
        }}
      >
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/70" />
        {days.map((day) => (
          <div
            key={formatYmd(day)}
            className={`border-b border-l border-[#e4f0f4] px-2 py-2 text-center text-sm ${
              isSameDay(day, today)
                ? "bg-[#b8e6df]/40 font-semibold text-[#2f5563]"
                : "bg-[#eef6f8]/70 text-[#3d6b7a]"
            }`}
          >
            <div>{weekdayLabel(day)}</div>
            <div>{day.getDate()}</div>
          </div>
        ))}
        <div className="relative" style={{ gridColumn: "1 / -1" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(140px, 1fr))`,
              height: hourCount * HOUR_PX,
            }}
          >
            <HourGutter startHour={hours.startHour} hourCount={hourCount} />
            {days.map((day) => {
              const key = formatYmd(day);
              return (
                <TimeColumn
                  key={key}
                  day={day}
                  dayKey={key}
                  items={byDay.get(key) ?? []}
                  startHour={hours.startHour}
                  hourCount={hourCount}
                  draggingId={draggingId}
                  canWrite={canWrite}
                  onOpen={onOpen}
                  onDragStart={onDragStart}
                  onDrop={(event) => onDropColumn(event, day)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayStaffGrid({
  day,
  staffColumns,
  items,
  hours,
  hourCount,
  today,
  draggingId,
  canWrite,
  onOpen,
  onDragStart,
  onDropColumn,
}: {
  day: Date;
  staffColumns: StaffProfile[];
  items: AppointmentRecord[];
  hours: { startHour: number; endHour: number };
  hourCount: number;
  today: Date;
  draggingId: string | null;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
  onDropColumn: (
    event: DragEvent<HTMLElement>,
    day: Date,
    staffId?: string,
  ) => void;
}) {
  const columns =
    staffColumns.length > 0
      ? staffColumns
      : [{ id: "", firstName: "Personel", lastName: "" } as StaffProfile];
  const key = formatYmd(day);
  return (
    <div className="overflow-x-auto rounded-xl bg-[#F7FBFC]/50 ring-1 ring-[#e4f0f4]">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: `72px repeat(${columns.length}, minmax(160px, 1fr))`,
        }}
      >
        <div
          className={`border-b border-[#e4f0f4] px-2 py-2 text-center text-sm ${
            isSameDay(day, today)
              ? "bg-[#b8e6df]/40 font-semibold text-[#2f5563]"
              : "bg-[#eef6f8]/70 text-[#3d6b7a]"
          }`}
        >
          {weekdayLabel(day)}
          <div>{day.getDate()}</div>
        </div>
        {columns.map((person) => (
          <div
            key={person.id || "all"}
            className="border-b border-l border-[#e4f0f4] bg-[#eef6f8]/70 px-2 py-2 text-center text-sm font-semibold text-[#3d6b7a]"
          >
            {person.firstName} {person.lastName}
          </div>
        ))}
        <div className="relative" style={{ gridColumn: "1 / -1" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `72px repeat(${columns.length}, minmax(160px, 1fr))`,
              height: hourCount * HOUR_PX,
            }}
          >
            <HourGutter startHour={hours.startHour} hourCount={hourCount} />
            {columns.map((person) => (
              <TimeColumn
                key={person.id || "all"}
                day={day}
                dayKey={key}
                staffId={person.id || undefined}
                items={
                  person.id
                    ? items.filter((item) => item.staff.id === person.id)
                    : items
                }
                startHour={hours.startHour}
                hourCount={hourCount}
                draggingId={draggingId}
                canWrite={canWrite}
                onOpen={onOpen}
                onDragStart={onDragStart}
                onDrop={(event) => onDropColumn(event, day, person.id || undefined)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  days,
  byDay,
  cursor,
  today,
  draggingId,
  canWrite,
  onOpen,
  onDragStart,
  onDropDay,
}: {
  days: Date[];
  byDay: Map<string, AppointmentRecord[]>;
  cursor: Date;
  today: Date;
  draggingId: string | null;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
  onDropDay: (event: DragEvent<HTMLElement>, day: Date) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-[#F7FBFC]/50 ring-1 ring-[#e4f0f4]">
      <div className="grid min-w-[720px] grid-cols-7">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label) => (
          <div
            key={label}
            className="border-b border-[#e4f0f4] bg-[#eef6f8]/70 px-2 py-2 text-center text-xs font-semibold text-[#5a7380]"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = formatYmd(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          return (
            <div
              key={key}
              data-calendar-day={key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropDay(event, day)}
              className={`min-h-32 border-b border-r border-[#eef6f8] p-1 ${
                isSameDay(day, today)
                  ? "bg-[#b8e6df]/30"
                  : inMonth
                    ? "bg-white"
                    : "bg-[#eef6f8]/70"
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-xs font-semibold ${inMonth ? "text-[#1e3340]" : "text-[#98b5d7]"}`}
                >
                  {day.getDate()}
                </span>
                {canWrite ? (
                  <Link
                    href={`/settings/appointments/new?startAt=${encodeURIComponent(suggestedStartAt(day, 10))}`}
                    aria-label={`${key} için randevu oluştur`}
                    className="text-xs font-bold text-[#7eb8c8] hover:text-[#2f5563]"
                  >
                    +
                  </Link>
                ) : null}
              </div>
              <div className="mt-1 grid gap-1">
                {(byDay.get(key) ?? []).map((item) => (
                  <CalendarAppointmentChip
                    key={item.id}
                    appointment={item}
                    dragging={draggingId === item.id}
                    canWrite={canWrite}
                    onOpen={onOpen}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourGutter({
  startHour,
  hourCount,
}: {
  startHour: number;
  hourCount: number;
}) {
  return (
    <div className="relative">
      {Array.from({ length: hourCount }, (_, index) => {
        const hour = startHour + index;
        return (
          <div
            key={hour}
            className="absolute right-2 text-xs text-[#7eb8c8]"
            style={{ top: index * HOUR_PX - 6 }}
          >
            {String(hour).padStart(2, "0")}:00
          </div>
        );
      })}
    </div>
  );
}

function TimeColumn({
  day,
  dayKey,
  staffId,
  items,
  startHour,
  hourCount,
  draggingId,
  canWrite,
  onOpen,
  onDragStart,
  onDrop,
}: {
  day: Date;
  dayKey: string;
  staffId?: string;
  items: AppointmentRecord[];
  startHour: number;
  hourCount: number;
  draggingId: string | null;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  return (
    <div
      className="relative border-l border-[#e4f0f4]"
      data-calendar-day={dayKey}
      data-calendar-staff={staffId ?? ""}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {Array.from({ length: hourCount }, (_, index) => {
        const hour = startHour + index;
        const startAt = suggestedStartAt(day, hour);
        const href = staffId
          ? `/settings/appointments/new?startAt=${encodeURIComponent(startAt)}&staffId=${staffId}`
          : `/settings/appointments/new?startAt=${encodeURIComponent(startAt)}`;
        const slotClass =
          "absolute inset-x-0 z-0 border-t border-[#eef6f8] hover:bg-[#eef6f8]/70";
        const slotStyle = {
          top: index * HOUR_PX,
          height: HOUR_PX,
        };
        if (!canWrite) {
          return (
            <div
              key={hour}
              data-calendar-hour={hour}
              className={slotClass}
              style={slotStyle}
            />
          );
        }
        return (
          <Link
            key={hour}
            href={href}
            data-calendar-hour={hour}
            aria-label={`${dayKey} ${String(hour).padStart(2, "0")}:00 için randevu oluştur`}
            className={slotClass}
            style={slotStyle}
          />
        );
      })}
      {items.map((item) => (
        <CalendarAppointmentBlock
          key={item.id}
          appointment={item}
          startHour={startHour}
          dragging={draggingId === item.id}
          canWrite={canWrite}
          onOpen={onOpen}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}

function CalendarAppointmentBlock({
  appointment,
  startHour,
  dragging,
  canWrite,
  onOpen,
  onDragStart,
}: {
  appointment: AppointmentRecord;
  startHour: number;
  dragging: boolean;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
}) {
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const top =
    ((start.getHours() - startHour) * 60 + start.getMinutes()) * (HOUR_PX / 60);
  const duration = Math.max((end.getTime() - start.getTime()) / 60_000, 20);
  const height = (duration * HOUR_PX) / 60;
  const confirmed = appointment.status === "CONFIRMED";

  return (
    <div
      role="link"
      tabIndex={0}
      draggable={confirmed && canWrite}
      aria-label={`${appointment.customer.firstName} ${appointment.customer.lastName} randevusu`}
      className={`absolute inset-x-1 z-20 cursor-pointer overflow-hidden rounded-xl border px-2 py-1 text-xs shadow-sm ${appointmentStatusClass(appointment.status)} ${
        dragging ? "opacity-50" : ""
      }`}
      style={{ top, height }}
      onDragStart={(event) => {
        if (!confirmed || !canWrite) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "text/plain",
          serializeAppointmentDrag({
            id: appointment.id,
            startAt: appointment.startAt,
            staffId: appointment.staff.id,
          }),
        );
        onDragStart(appointment.id);
      }}
      onDragEnd={() => onDragStart(null)}
      onClick={() => onOpen(appointment.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(appointment.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium">
          {appointment.customer.firstName} {appointment.customer.lastName}
        </p>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <p className="truncate">
        {start.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        –{" "}
        {end.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <p className="truncate">{appointment.serviceNameSnapshot}</p>
      <p className="truncate">
        {appointment.staff.firstName} {appointment.staff.lastName}
      </p>
      {appointment.resource ? (
        <p className="truncate">{appointment.resource.name}</p>
      ) : null}
    </div>
  );
}

function CalendarAppointmentChip({
  appointment,
  dragging,
  canWrite,
  onOpen,
  onDragStart,
}: {
  appointment: AppointmentRecord;
  dragging: boolean;
  canWrite: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string | null) => void;
}) {
  const start = new Date(appointment.startAt);
  const confirmed = appointment.status === "CONFIRMED";
  return (
    <div
      role="link"
      tabIndex={0}
      draggable={confirmed && canWrite}
      aria-label={`${appointment.customer.firstName} ${appointment.customer.lastName} randevusu`}
      className={`cursor-pointer truncate rounded-lg border px-1.5 py-0.5 text-[11px] font-medium ${appointmentStatusClass(appointment.status)} ${
        dragging ? "opacity-50" : ""
      }`}
      onDragStart={(event) => {
        if (!confirmed || !canWrite) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "text/plain",
          serializeAppointmentDrag({
            id: appointment.id,
            startAt: appointment.startAt,
            staffId: appointment.staff.id,
          }),
        );
        onDragStart(appointment.id);
      }}
      onDragEnd={() => onDragStart(null)}
      onClick={() => onOpen(appointment.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(appointment.id);
        }
      }}
    >
      {start.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })}{" "}
      {appointment.customer.firstName}
    </div>
  );
}
