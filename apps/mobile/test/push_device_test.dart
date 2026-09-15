import 'package:flutter_test/flutter_test.dart';
import 'package:xenior_mobile/features/notifications/application/push_models.dart';
import 'package:xenior_mobile/features/notifications/application/push_token_source.dart';

void main() {
  test('accepts a valid push device payload', () {
    expect(
      validatePushDeviceInput(
        const PushDeviceInput(token: 'fcm-token-1234', platform: 'ANDROID'),
      ),
      isNull,
    );
  });

  test('rejects invalid tokens and platforms', () {
    expect(
      validatePushDeviceInput(
        const PushDeviceInput(token: 'short', platform: 'ANDROID'),
      ),
      isNotNull,
    );
    expect(
      validatePushDeviceInput(
        const PushDeviceInput(token: 'fcm-token-1234', platform: 'WINDOWS'),
      ),
      isNotNull,
    );
  });

  test('noop push source does not invent a token', () async {
    const source = NoopPushTokenSource();
    expect(await source.currentToken(), isNull);
  });
}
