import type { AppointmentRecord } from "@xenior/types";

export const APPOINTMENT_STATUS_LABELS: Record<
  AppointmentRecord["status"],
  string
> = {
  CONFIRMED: "Onaylı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
  NO_SHOW: "Gelmedi",
};

export const APPOINTMENT_STATUS_CLASSES: Record<
  AppointmentRecord["status"],
  string
> = {
  CONFIRMED: "border-sky-200 bg-sky-50 text-sky-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600",
  NO_SHOW: "border-amber-200 bg-amber-50 text-amber-900",
};

export function appointmentStatusLabel(status: AppointmentRecord["status"]) {
  return APPOINTMENT_STATUS_LABELS[status];
}

export function appointmentStatusClass(status: AppointmentRecord["status"]) {
  return APPOINTMENT_STATUS_CLASSES[status];
}
