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
  CONFIRMED: "border-[#9fd0dc] bg-[#eef6f8] text-[#2f5563]",
  COMPLETED: "border-[#b8e6df] bg-[#b8e6df]/35 text-[#2f5563]",
  CANCELLED: "border-[#c5dde6] bg-[#F7FBFC] text-[#5a7380]",
  NO_SHOW: "border-amber-200 bg-amber-50 text-amber-900",
};

export function appointmentStatusLabel(status: AppointmentRecord["status"]) {
  return APPOINTMENT_STATUS_LABELS[status];
}

export function appointmentStatusClass(status: AppointmentRecord["status"]) {
  return APPOINTMENT_STATUS_CLASSES[status];
}

const APPOINTMENT_EVENT_LABELS: Record<string, string> = {
  CREATED: "Oluşturuldu",
  RESCHEDULED: "Yeniden planlandı",
  CANCELLED: "İptal edildi",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
};

export function appointmentEventLabel(type: string) {
  return APPOINTMENT_EVENT_LABELS[type] ?? type;
}
