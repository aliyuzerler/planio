import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/core/storage/token_storage.dart';
import 'package:xenior_mobile/core/tenant/tenant_storage.dart';
import 'package:xenior_mobile/features/auth/application/auth_session.dart';
import 'package:xenior_mobile/features/auth/data/auth_api.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokenStorage, this._tenantStorage);

  final AuthApi _api;
  final TokenStorage _tokenStorage;
  final TenantStorage _tenantStorage;

  Future<AuthSession> restoreSession() async {
    final accessToken = await _tokenStorage.readAccessToken();
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (accessToken == null ||
        accessToken.isEmpty ||
        refreshToken == null ||
        refreshToken.isEmpty) {
      await _tokenStorage.clearTokens();
      return const AuthSession.unauthenticated();
    }

    try {
      return await _hydrateSession();
    } on Object {
      await _tokenStorage.clearTokens();
      await _tenantStorage.clearSelectedBusinessId();
      return const AuthSession.unauthenticated();
    }
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final result = await _api.login(email: email, password: password);
    await _writeResult(result);
    return _hydrateAfterAuthentication();
  }

  Future<AuthSession> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String businessName,
    String? businessPhone,
    String? timezone,
  }) async {
    final result = await _api.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      businessName: businessName,
      businessPhone: businessPhone,
      timezone: timezone,
    );
    await _writeResult(result);
    return _hydrateAfterAuthentication();
  }

  Future<AuthSession> selectBusiness(
    AuthSession session,
    String businessId,
  ) async {
    final allowed = session.selectableMemberships.any(
      (membership) => membership.businessId == businessId,
    );
    if (!allowed) {
      throw ArgumentError.value(
        businessId,
        'businessId',
        'Business is not an active membership.',
      );
    }
    await _tenantStorage.writeSelectedBusinessId(businessId);
    return session.withSelectedBusiness(businessId);
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    try {
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _api.logout(refreshToken);
      }
    } on Object {
      // Local logout must still complete when the network is unavailable.
    } finally {
      await _tokenStorage.clearTokens();
      await _tenantStorage.clearSelectedBusinessId();
    }
  }

  Future<void> _writeResult(AuthResult result) {
    return _tokenStorage.writeTokens(
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    );
  }

  Future<AuthSession> _hydrateAfterAuthentication() async {
    try {
      return await _hydrateSession();
    } on Object {
      await _tokenStorage.clearTokens();
      await _tenantStorage.clearSelectedBusinessId();
      rethrow;
    }
  }

  Future<AuthSession> _hydrateSession() async {
    final currentUser = await _api.getCurrentUser();
    final selectable = currentUser.memberships
        .where((membership) => membership.isSelectable)
        .toList();
    final storedBusinessId = await _tenantStorage.readSelectedBusinessId();
    String? selectedBusinessId;
    if (selectable.any(
      (membership) => membership.businessId == storedBusinessId,
    )) {
      selectedBusinessId = storedBusinessId;
    } else if (selectable.length == 1) {
      selectedBusinessId = selectable.single.businessId;
    }

    if (selectedBusinessId == null) {
      await _tenantStorage.clearSelectedBusinessId();
    } else {
      await _tenantStorage.writeSelectedBusinessId(selectedBusinessId);
    }

    return AuthSession.authenticated(
      currentUser.user,
      memberships: currentUser.memberships,
      selectedBusinessId: selectedBusinessId,
    );
  }
}

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(authDioProvider), ref.watch(dioProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(authApiProvider),
    ref.watch(tokenStorageProvider),
    ref.watch(tenantStorageProvider),
  ),
);
