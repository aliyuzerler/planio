import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/auth/auth_session_events.dart';
import 'package:xenior_mobile/core/config/app_config.dart';
import 'package:xenior_mobile/core/errors/app_exception.dart';
import 'package:xenior_mobile/core/network/auth_interceptor.dart';
import 'package:xenior_mobile/core/network/token_refresher.dart';
import 'package:xenior_mobile/core/network/tenant_interceptor.dart';
import 'package:xenior_mobile/core/storage/token_storage.dart';
import 'package:xenior_mobile/core/tenant/tenant_storage.dart';

class ApiClient {
  const ApiClient(this.dio);

  final Dio dio;
}

BaseOptions _baseOptions(String apiUrl) => BaseOptions(
  baseUrl: apiUrl,
  connectTimeout: const Duration(seconds: 15),
  receiveTimeout: const Duration(seconds: 20),
  sendTimeout: const Duration(seconds: 20),
  headers: const {'Accept': 'application/json'},
);

final authDioProvider = Provider<Dio>((ref) {
  final dio = Dio(_baseOptions(ref.watch(appConfigProvider).apiUrl));
  dio.interceptors.add(_ErrorNormalizationInterceptor());
  ref.onDispose(dio.close);
  return dio;
});

final tokenRefresherProvider = Provider<TokenRefresher>(
  (ref) => DioTokenRefresher(ref.watch(authDioProvider)),
);

final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final dio = Dio(_baseOptions(config.apiUrl));

  dio.interceptors.addAll([
    AuthInterceptor(
      dio,
      ref.watch(tokenStorageProvider),
      ref.watch(tokenRefresherProvider),
      ref.watch(authSessionEventsProvider).notifyExpired,
    ),
    TenantInterceptor(ref.watch(tenantStorageProvider)),
    _ErrorNormalizationInterceptor(),
  ]);

  ref.onDispose(dio.close);
  return dio;
});

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.watch(dioProvider)),
);

class _ErrorNormalizationInterceptor extends Interceptor {
  @override
  void onError(DioException error, ErrorInterceptorHandler handler) {
    final data = error.response?.data;
    final payload = data is Map<String, dynamic> ? data : null;
    final message = payload?['message'];
    final code = payload?['code'];

    final exception = AppException(
      message: message is String && message.isNotEmpty
          ? message
          : _fallbackMessage(error.type),
      code: code is String && code.isNotEmpty ? code : 'NETWORK_ERROR',
      statusCode: error.response?.statusCode,
      details: payload?['details'],
    );

    handler.reject(
      DioException(
        requestOptions: error.requestOptions,
        response: error.response,
        type: error.type,
        error: exception,
        stackTrace: error.stackTrace,
      ),
    );
  }

  String _fallbackMessage(DioExceptionType type) {
    return switch (type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout => 'The request timed out.',
      DioExceptionType.connectionError => 'Unable to connect to the server.',
      _ => 'An unexpected network error occurred.',
    };
  }
}
