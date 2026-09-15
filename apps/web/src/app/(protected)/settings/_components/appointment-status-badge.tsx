import type { AppointmentRecord } from "@xenior/types";
import {
  appointmentStatusClass,
  appointmentStatusLabel,
} from "@/lib/appointments/appointment-status";

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentRecord["status"];
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${appointmentStatusClass(status)}`}
    >
      {appointmentStatusLabel(status)}
    </span>
  );
}
