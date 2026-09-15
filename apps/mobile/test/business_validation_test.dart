import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/business/application/business_profile.dart';
import 'package:xenior_mobile/features/business/application/business_validation.dart';

void main() {
  UpdateBusinessInput input({
    String name = 'Xenior Beauty',
    String? phone = '+905551112233',
    String? email = 'info@xenior.test',
    String? address = 'Istanbul',
    String timezone = 'Europe/Istanbul',
    String currency = 'TRY',
  }) {
    return UpdateBusinessInput(
      name: name,
      phone: phone,
      email: email,
      address: address,
      timezone: timezone,
      currency: currency,
    );
  }

  test('accepts valid business settings', () {
    expect(validateBusinessInput(input()), isNull);
  });

  test('rejects invalid required and formatted fields', () {
    expect(validateBusinessInput(input(name: 'A')), isNotNull);
    expect(validateBusinessInput(input(phone: '123')), isNotNull);
    expect(validateBusinessInput(input(email: 'invalid')), isNotNull);
    expect(validateBusinessInput(input(timezone: 'invalid')), isNotNull);
    expect(validateBusinessInput(input(currency: 'try')), isNotNull);
  });
}
