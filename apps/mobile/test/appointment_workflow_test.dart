import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/features/appointments/presentation/appointment_detail_screen.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';

import 'helpers/fake_auth.dart';

AppointmentRecord _appointment({String status = 'CONFIRMED'}) {
  return AppointmentRecord(
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
    startAt: DateTime.utc(2033, 1, 15, 10),
    endAt: DateTime.utc(2033, 1, 15, 11),
    status: status,
    notes: null,
    servicePriceSnapshot: '250.00',
    currency: 'TRY',
    events: const ['CREATED'],
  );
}

void main() {
  test('create and reschedule payloads omit endAt', () {
    const input = AppointmentInput(
      customerId: 'c1',
      staffId: 's1',
      serviceId: 'svc1',
      startAt: '2033-01-15T10:00:00.000Z',
    );
    expect(input.toJson().containsKey('endAt'), isFalse);
    expect(input.toJson()['startAt'], '2033-01-15T10:00:00.000Z');
  });

  testWidgets('cancel requires confirmation and calls the API action', (
    tester,
  ) async {
    final repository = _FakeAppointmentRepository(_appointment());
    await _pumpDetail(tester, repository);
    await tester.tap(find.text('İptal et'));
    await tester.pumpAndSettle();
    expect(find.text('Randevuyu iptal et'), findsOneWidget);
    await tester.tap(find.text('Vazgeç'));
    await tester.pumpAndSettle();
    expect(repository.cancelled, isEmpty);

    await tester.tap(find.text('İptal et'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Onayla'));
    await tester.pumpAndSettle();
    expect(repository.cancelled, ['33333333-3333-4333-8333-333333333333']);
    expect(find.text('İptal'), findsOneWidget);
  });

  testWidgets('complete requires confirmation', (tester) async {
    final repository = _FakeAppointmentRepository(_appointment());
    await _pumpDetail(tester, repository);
    await tester.tap(find.text('Tamamla'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Onayla'));
    await tester.pumpAndSettle();
    expect(repository.completed, ['33333333-3333-4333-8333-333333333333']);
    expect(find.text('Tamamlandı'), findsOneWidget);
  });

  testWidgets('no-show requires confirmation', (tester) async {
    final repository = _FakeAppointmentRepository(_appointment());
    await _pumpDetail(tester, repository);
    await tester.tap(find.text('Gelmedi'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Onayla'));
    await tester.pumpAndSettle();
    expect(repository.noShows, ['33333333-3333-4333-8333-333333333333']);
  });
}

Future<void> _pumpDetail(
  WidgetTester tester,
  _FakeAppointmentRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authControllerProvider.overrideWith(FakeAuthController.new),
        appointmentRepositoryProvider.overrideWith((ref) => repository),
      ],
      child: const MaterialApp(
        home: AppointmentDetailScreen(
          appointmentId: '33333333-3333-4333-8333-333333333333',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _FakeAppointmentRepository extends AppointmentRepository {
  _FakeAppointmentRepository(this.current) : super(Dio());

  AppointmentRecord current;
  final cancelled = <String>[];
  final completed = <String>[];
  final noShows = <String>[];

  @override
  Future<AppointmentRecord> getAppointment(String id) async => current;

  @override
  Future<AppointmentRecord> cancel(String id) async {
    cancelled.add(id);
    current = _appointment(status: 'CANCELLED');
    return current;
  }

  @override
  Future<AppointmentRecord> complete(String id) async {
    completed.add(id);
    current = _appointment(status: 'COMPLETED');
    return current;
  }

  @override
  Future<AppointmentRecord> markNoShow(String id) async {
    noShows.add(id);
    current = _appointment(status: 'NO_SHOW');
    return current;
  }
}
