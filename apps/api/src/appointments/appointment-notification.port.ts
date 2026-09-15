export const APPOINTMENT_NOTIFICATION_PORT = "APPOINTMENT_NOTIFICATION_PORT";

export type AppointmentNotificationEvent =
  | "CREATED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface AppointmentNotificationPort {
  onAppointmentEvent(input: {
    businessId: string;
    appointmentId: string;
    type: AppointmentNotificationEvent;
  }): Promise<void>;
}
