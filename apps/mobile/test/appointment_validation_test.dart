import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_validation.dart';

void main() {
  AppointmentInput input({
    String customerId = 'customer-1',
    String staffId = 'staff-1',
    String serviceId = 'service-1',
    String startAt = '2033-01-15T10:00:00.000Z',
    String? notes = 'First visit',
  }) {
    return AppointmentInput(
      customerId: customerId,
      staffId: staffId,
      serviceId: serviceId,
      startAt: startAt,
      notes: notes,
    );
  }

  test('accepts a valid appointment payload', () {
    expect(validateAppointmentInput(input()), isNull);
  });

  test('requires deposit amount for kapora plan', () {
    expect(
      validateAppointmentInput(
        AppointmentInput(
          customerId: 'customer-1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startAt: '2033-01-15T10:00:00.000Z',
          paymentPlan: 'DEPOSIT',
        ),
      ),
      isNotNull,
    );
  });

  test('rejects missing parties and invalid start times', () {
    expect(validateAppointmentInput(input(customerId: '')), isNotNull);
    expect(validateAppointmentInput(input(staffId: '')), isNotNull);
    expect(validateAppointmentInput(input(serviceId: '')), isNotNull);
    expect(validateAppointmentInput(input(startAt: 'bad')), isNotNull);
  });
}
