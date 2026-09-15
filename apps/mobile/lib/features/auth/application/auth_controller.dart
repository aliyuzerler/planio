import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/auth/auth_session_events.dart';
import 'package:xenior_mobile/core/tenant/tenant_storage.dart';
import 'package:xenior_mobile/features/auth/application/auth_session.dart';
import 'package:xenior_mobile/features/auth/data/auth_repository.dart';

class AuthController extends AsyncNotifier<AuthSession> {
  @override
  Future<AuthSession> build() {
    final subscription = ref.watch(authSessionEventsProvider).onExpired.listen((
      _,
    ) {
      ref.read(tenantStorageProvider).clearSelectedBusinessId();
      state = const AsyncData(AuthSession.unauthenticated());
    });
    ref.onDispose(subscription.cancel);
    return ref.watch(authRepositoryProvider).restoreSession();
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(authRepositoryProvider)
          .login(email: email.trim(), password: password),
    );
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String businessName,
    String? businessPhone,
    String? timezone,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(authRepositoryProvider)
          .register(
            email: email.trim(),
            password: password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            businessName: businessName.trim(),
            businessPhone: businessPhone?.trim(),
            timezone: timezone,
          ),
    );
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(AuthSession.unauthenticated());
  }

  Future<bool> selectBusiness(String businessId) async {
    final session = state.value;
    if (session == null || !session.isAuthenticated) return false;
    try {
      final selected = await ref
          .read(authRepositoryProvider)
          .selectBusiness(session, businessId);
      state = AsyncData(selected);
      return true;
    } on ArgumentError {
      return false;
    }
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession>(AuthController.new);
