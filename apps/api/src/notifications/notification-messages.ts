import type { NotificationChannel, NotificationType } from "@xenior/types";

export interface AppointmentMessageContext {
  customerName: string;
  staffName: string;
  serviceName: string;
  when: string;
  businessName: string;
}

export function renderAppointmentMessage(
  type: NotificationType,
  channel: NotificationChannel,
  context: AppointmentMessageContext,
): { subject: string | null; body: string } {
  const subject =
    channel === "PUSH" || channel === "EMAIL"
      ? pushSubject(type, context.businessName)
      : null;
  return { subject, body: bodyFor(type, context) };
}

function pushSubject(type: NotificationType, businessName: string): string {
  switch (type) {
    case "APPOINTMENT_CONFIRMED":
      return `${businessName}: yeni randevu`;
    case "APPOINTMENT_RESCHEDULED":
      return `${businessName}: randevu değişti`;
    case "APPOINTMENT_CANCELLED":
      return `${businessName}: randevu iptal`;
    case "APPOINTMENT_REMINDER":
      return `${businessName}: randevu hatırlatması`;
    default:
      return businessName;
  }
}

function bodyFor(
  type: NotificationType,
  context: AppointmentMessageContext,
): string {
  const base = `${context.customerName} · ${context.serviceName} · ${context.when} · ${context.staffName}`;
  switch (type) {
    case "APPOINTMENT_CONFIRMED":
      return `${context.businessName}: randevunuz onaylandı. ${base}`;
    case "APPOINTMENT_RESCHEDULED":
      return `${context.businessName}: randevunuz yeniden planlandı. ${base}`;
    case "APPOINTMENT_CANCELLED":
      return `${context.businessName}: randevunuz iptal edildi. ${base}`;
    case "APPOINTMENT_REMINDER":
      return `${context.businessName}: randevu hatırlatması. ${base}`;
    default:
      return base;
  }
}

export function formatAppointmentWhen(startAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startAt);
}
