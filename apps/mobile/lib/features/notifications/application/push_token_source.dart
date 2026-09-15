/// Supplies a device push token. A production adapter can wrap FCM/APNs
/// without changing appointment or notification business logic.
abstract class PushTokenSource {
  Future<String?> currentToken();
  String get platform;
}

class NoopPushTokenSource implements PushTokenSource {
  const NoopPushTokenSource();

  @override
  Future<String?> currentToken() async => null;

  @override
  String get platform => 'ANDROID';
}
