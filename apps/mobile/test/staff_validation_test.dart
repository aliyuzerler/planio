import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/staff/application/staff_models.dart';
import 'package:xenior_mobile/features/staff/application/staff_validation.dart';

void main() {
  StaffInput input({
    String firstName = 'Ada',
    String lastName = 'Lovelace',
    String? phone = '+905551112233',
    String? email = 'ada@example.test',
    String? notes = 'Lead stylist',
  }) {
    return StaffInput(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      notes: notes,
    );
  }

  test('accepts valid staff data', () {
    expect(validateStaffInput(input()), isNull);
    expect(validateSpecializationName('Hair Styling'), isNull);
  });

  test('rejects invalid staff and specialization data', () {
    expect(validateStaffInput(input(firstName: '')), isNotNull);
    expect(validateStaffInput(input(lastName: '')), isNotNull);
    expect(validateStaffInput(input(phone: '123')), isNotNull);
    expect(validateStaffInput(input(email: 'invalid')), isNotNull);
    expect(validateSpecializationName(''), isNotNull);
  });
}
