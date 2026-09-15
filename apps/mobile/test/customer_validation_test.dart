import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/customers/application/customer_models.dart';
import 'package:xenior_mobile/features/customers/application/customer_validation.dart';

void main() {
  CustomerInput input({
    String firstName = 'Ada',
    String lastName = 'Lovelace',
    String? phone = '+905551112233',
    String? email = 'ada@example.test',
    String? birthDate = '1990-05-15',
    String? notes = 'Regular client',
  }) {
    return CustomerInput(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      birthDate: birthDate,
      notes: notes,
    );
  }

  test('accepts valid customer data', () {
    expect(validateCustomerInput(input()), isNull);
    expect(validateCustomerInput(input(phone: null, email: null)), isNull);
  });

  test('rejects invalid customer data', () {
    expect(validateCustomerInput(input(firstName: '')), isNotNull);
    expect(validateCustomerInput(input(lastName: '')), isNotNull);
    expect(validateCustomerInput(input(phone: '123')), isNotNull);
    expect(validateCustomerInput(input(email: 'invalid')), isNotNull);
    expect(validateCustomerInput(input(birthDate: '2026-02-30')), isNotNull);
    expect(validateCustomerInput(input(birthDate: '2099-01-01')), isNotNull);
  });
}
