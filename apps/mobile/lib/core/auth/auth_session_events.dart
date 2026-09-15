import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthSessionEvents {
  final StreamController<void> _expiredController =
      StreamController<void>.broadcast();

  Stream<void> get onExpired => _expiredController.stream;

  void notifyExpired() => _expiredController.add(null);

  Future<void> dispose() => _expiredController.close();
}

final authSessionEventsProvider = Provider<AuthSessionEvents>((ref) {
  final events = AuthSessionEvents();
  ref.onDispose(events.dispose);
  return events;
});
