import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';
import 'package:xenior_mobile/features/home/application/dashboard_window.dart';

void main() {
  test('builds a 14-day upcoming window from a local calendar day', () {
    final window = dashboardWindow(DateTime(2026, 9, 5));
    expect(window.today, '2026-09-05');
    expect(window.upcomingTo, '2026-09-18');
    expect(addDaysYmd(window.today, 13), window.upcomingTo);
  });

  test('appointment list params stay within a bounded query', () {
    expect(
      const AppointmentListParams(date: '2026-09-05').toQuery(),
      {
        'from': '2026-09-05',
        'to': '2026-09-05',
        'page': 1,
        'pageSize': 100,
      },
    );
    expect(
      const AppointmentListParams(
        from: '2026-09-05',
        to: '2026-09-18',
        status: 'CONFIRMED',
      ).toQuery(),
      {
        'from': '2026-09-05',
        'to': '2026-09-18',
        'status': 'CONFIRMED',
        'page': 1,
        'pageSize': 100,
      },
    );
  });
}
