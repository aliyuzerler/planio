import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_status.dart';

void main() {
  test('maps appointment statuses to consistent labels and colors', () {
    expect(appointmentStatusStyle('CONFIRMED').label, 'Onaylı');
    expect(appointmentStatusStyle('COMPLETED').label, 'Tamamlandı');
    expect(appointmentStatusStyle('CANCELLED').label, 'İptal');
    expect(appointmentStatusStyle('NO_SHOW').label, 'Gelmedi');
    expect(
      appointmentStatusStyle('CONFIRMED').foreground,
      isNot(appointmentStatusStyle('COMPLETED').foreground),
    );
    expect(
      appointmentStatusStyle('CANCELLED').background,
      isNot(appointmentStatusStyle('NO_SHOW').background),
    );
  });

  testWidgets('renders a status chip with the Turkish label', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: AppointmentStatusChip(status: 'CONFIRMED')),
    );
    expect(find.text('Onaylı'), findsOneWidget);
    expect(find.text('CONFIRMED'), findsNothing);
  });
}
