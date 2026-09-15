import 'dart:async';

import 'package:dio/dio.dart';
import 'package:xenior_mobile/core/network/token_refresher.dart';
import 'package:xenior_mobile/core/storage/token_storage.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(
    this._dio,
    this._tokenStorage,
    this._tokenRefresher,
    this._onSessionExpired,
  );

  static const _retriedKey = 'auth_retried';

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final TokenRefresher _tokenRefresher;
  final void Function() _onSessionExpired;
  Future<AuthTokens?>? _refreshInFlight;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await _tokenStorage.readAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final request = err.requestOptions;
    final isAuthRequest = request.path.startsWith('/auth/');
    final shouldRefresh =
        err.response?.statusCode == 401 &&
        !isAuthRequest &&
        request.extra[_retriedKey] != true;

    if (!shouldRefresh) {
      handler.next(err);
      return;
    }

    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      handler.next(err);
      return;
    }

    try {
      final tokens = await _refreshOnce(refreshToken);
      if (tokens == null) {
        await _tokenStorage.clearTokens();
        _onSessionExpired();
        handler.next(err);
        return;
      }

      final currentRefreshToken = await _tokenStorage.readRefreshToken();
      final refreshStillCurrent =
          currentRefreshToken == refreshToken ||
          currentRefreshToken == tokens.refreshToken;
      if (!refreshStillCurrent) {
        handler.next(err);
        return;
      }

      await _tokenStorage.writeTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      request.extra[_retriedKey] = true;
      request.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      handler.resolve(await _dio.fetch<Object?>(request));
    } on Object {
      await _tokenStorage.clearTokens();
      _onSessionExpired();
      handler.next(err);
    }
  }

  Future<AuthTokens?> _refreshOnce(String refreshToken) {
    final activeRefresh = _refreshInFlight;
    if (activeRefresh != null) {
      return activeRefresh;
    }

    final refresh = _tokenRefresher.refresh(refreshToken);
    _refreshInFlight = refresh;
    return refresh.whenComplete(() => _refreshInFlight = null);
  }
}
