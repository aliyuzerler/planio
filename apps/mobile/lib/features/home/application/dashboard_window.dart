import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';

class DashboardWindow {
  const DashboardWindow({required this.today, required this.upcomingTo});

  final String today;
  final String upcomingTo;
}

DashboardWindow dashboardWindow(DateTime now) {
  final today = formatYmd(now);
  return DashboardWindow(today: today, upcomingTo: addDaysYmd(today, 13));
}
