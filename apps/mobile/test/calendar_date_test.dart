import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';

void main() {
  test('formats and shifts calendar days without loading history', () {
    expect(formatYmd(DateTime(2033, 1, 15)), '2033-01-15');
    expect(
      formatYmd(addCalendarDays(parseYmd('2033-01-15'), -1)),
      '2033-01-14',
    );
    expect(formatYmd(addCalendarDays(parseYmd('2033-01-15'), 1)), '2033-01-16');
  });

  test('formats appointment times and suggests a start for create', () {
    final start = DateTime.utc(2033, 1, 15, 10);
    final end = DateTime.utc(2033, 1, 15, 11);
    expect(formatAppointmentTime(start, end), contains(' – '));
    final suggested = suggestedStartForDate('2033-01-15');
    expect(suggested.year, 2033);
    expect(suggested.month, 1);
    expect(suggested.day, 15);
    expect(suggested.hour, 10);
    expect(addDaysYmd('2026-09-05', 13), '2026-09-18');
  });
}
