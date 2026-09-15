String formatYmd(DateTime date) {
  final local = DateTime(date.year, date.month, date.day);
  return '${local.year.toString().padLeft(4, '0')}-'
      '${local.month.toString().padLeft(2, '0')}-'
      '${local.day.toString().padLeft(2, '0')}';
}

DateTime parseYmd(String value) {
  final parts = value.split('-').map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

DateTime addCalendarDays(DateTime date, int days) {
  return DateTime(date.year, date.month, date.day + days);
}

String formatAppointmentTime(DateTime start, DateTime end) {
  String clock(DateTime value) {
    final local = value.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }

  return '${clock(start)} – ${clock(end)}';
}

DateTime suggestedStartForDate(String ymd, {int hour = 10}) {
  final date = parseYmd(ymd);
  return DateTime(date.year, date.month, date.day, hour);
}

String addDaysYmd(String ymd, int days) {
  return formatYmd(addCalendarDays(parseYmd(ymd), days));
}

String formatAppointmentDateTime(DateTime start, DateTime end) {
  final local = start.toLocal();
  return '${formatYmd(local)} · ${formatAppointmentTime(start, end)}';
}
