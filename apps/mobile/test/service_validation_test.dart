import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/services/application/service_models.dart';
import 'package:xenior_mobile/features/services/application/service_validation.dart';

void main() {
  test('normalizes decimal prices without floating point arithmetic', () {
    expect(normalizeServicePrice('100'), '100.00');
    expect(normalizeServicePrice('100.5'), '100.50');
    expect(normalizeServicePrice('100.50'), '100.50');
    expect(normalizeServicePrice('100.555'), isNull);
    expect(normalizeServicePrice('-1'), isNull);
  });

  test('validates service fields', () {
    expect(
      validateServiceInput(
        const ServiceInput(
          name: 'Hair Cut',
          description: null,
          durationMinutes: 45,
          price: '250.00',
        ),
      ),
      isNull,
    );
    expect(
      validateServiceInput(
        const ServiceInput(
          name: '',
          description: null,
          durationMinutes: 0,
          price: 'bad',
        ),
      ),
      isNotNull,
    );
  });
}
