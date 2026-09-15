import 'package:flutter/material.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_status.dart';
import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';

class AppointmentTile extends StatelessWidget {
  const AppointmentTile({
    super.key,
    required this.appointment,
    required this.onTap,
    this.showDate = false,
  });

  final AppointmentRecord appointment;
  final VoidCallback onTap;
  final bool showDate;

  @override
  Widget build(BuildContext context) {
    final time = showDate
        ? formatAppointmentDateTime(appointment.startAt, appointment.endAt)
        : formatAppointmentTime(appointment.startAt, appointment.endAt);
    return Card(
      child: ListTile(
        isThreeLine: true,
        title: Text(appointment.customer.fullName),
        subtitle: Text(
          '${appointment.serviceName}\n'
          '${appointment.staff.fullName} · $time',
        ),
        trailing: AppointmentStatusChip(status: appointment.status),
        onTap: onTap,
      ),
    );
  }
}
