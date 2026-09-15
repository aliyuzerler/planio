import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/notifications/data/push_device_repository.dart';

/// Registers the current device after a tenant is selected. No-ops until a
/// real [PushTokenSource] is provided (FCM/APNs).
final pushRegistrarProvider = Provider<void>((ref) {
  ref.listen(authControllerProvider, (previous, next) {
    final session = next.value;
    if (session == null ||
        !session.isAuthenticated ||
        session.selectedBusinessId == null) {
      return;
    }
    ref.read(pushDeviceRepositoryProvider).registerCurrentDevice();
  });
});
