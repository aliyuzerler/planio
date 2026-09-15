import 'package:flutter/material.dart';

class AppointmentStatusStyle {
  const AppointmentStatusStyle({
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;
}

AppointmentStatusStyle appointmentStatusStyle(String status) {
  switch (status) {
    case 'CONFIRMED':
      return const AppointmentStatusStyle(
        label: 'Onaylı',
        foreground: Color(0xFF075985),
        background: Color(0xFFE0F2FE),
      );
    case 'COMPLETED':
      return const AppointmentStatusStyle(
        label: 'Tamamlandı',
        foreground: Color(0xFF065F46),
        background: Color(0xFFD1FAE5),
      );
    case 'CANCELLED':
      return const AppointmentStatusStyle(
        label: 'İptal',
        foreground: Color(0xFF52525B),
        background: Color(0xFFF4F4F5),
      );
    case 'NO_SHOW':
      return const AppointmentStatusStyle(
        label: 'Gelmedi',
        foreground: Color(0xFF92400E),
        background: Color(0xFFFEF3C7),
      );
    default:
      return AppointmentStatusStyle(
        label: status,
        foreground: const Color(0xFF52525B),
        background: const Color(0xFFF4F4F5),
      );
  }
}

class AppointmentStatusChip extends StatelessWidget {
  const AppointmentStatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final style = appointmentStatusStyle(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        style.label,
        style: TextStyle(
          color: style.foreground,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
