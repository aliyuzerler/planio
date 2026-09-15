import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/business/application/business_profile.dart';
import 'package:xenior_mobile/features/business/data/business_repository.dart';
import 'package:xenior_mobile/features/home/application/dashboard_window.dart';
import 'package:xenior_mobile/features/home/presentation/home_screen.dart';

import 'helpers/fake_auth.dart';

void main() {
  testWidgets('dashboard shows business info and appointment sections', (
    tester,
  ) async {
    final window = dashboardWindow(DateTime.now());
    final todayAppointment = AppointmentRecord(
      id: '33333333-3333-4333-8333-333333333333',
      customer: const AppointmentParty(
        id: 'c1',
        firstName: 'Ada',
        lastName: 'Lovelace',
      ),
      staff: const AppointmentParty(
        id: 's1',
        firstName: 'Stylist',
        lastName: 'One',
      ),
      serviceId: 'svc1',
      serviceName: 'Hair Cut',
      startAt: DateTime.now(),
      endAt: DateTime.now().add(const Duration(hours: 1)),
      status: 'CONFIRMED',
      notes: null,
      servicePriceSnapshot: '250.00',
      currency: 'TRY',
      events: const [],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(FakeAuthController.new),
          businessProfileProvider.overrideWith(
            (ref) async => BusinessProfile(
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Xenior Beauty',
              phone: '+905551112233',
              email: 'info@xenior.test',
              address: 'Istanbul',
              timezone: 'Europe/Istanbul',
              currency: 'TRY',
              status: 'ACTIVE',
              createdAt: DateTime.utc(2026, 9, 5),
              updatedAt: DateTime.utc(2026, 9, 5),
            ),
          ),
          appointmentListProvider.overrideWith((ref, params) async {
            if (params.status == 'CONFIRMED' && params.from == window.today) {
              return const PaginatedAppointments(
                items: [],
                page: 1,
                total: 0,
                hasMore: false,
              );
            }
            return PaginatedAppointments(
              items: [todayAppointment],
              page: 1,
              total: 1,
              hasMore: false,
            );
          }),
        ],
        child: const MaterialApp(home: HomeScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Gösterge'), findsWidgets);
    expect(find.text('Bugünün randevuları'), findsOneWidget);
    expect(find.text('Yaklaşan randevular'), findsOneWidget);
    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.text('Xenior Beauty'), findsWidgets);
    expect(find.textContaining('Europe/Istanbul'), findsOneWidget);
    expect(find.text('Randevular'), findsOneWidget);
    expect(find.text('Müşteriler'), findsOneWidget);
  });
}
