import 'package:dio/dio.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

abstract interface class TokenRefresher {
  Future<AuthTokens?> refresh(String refreshToken);
}

class DioTokenRefresher implements TokenRefresher {
  DioTokenRefresher(this._dio);

  final Dio _dio;

  @override
  Future<AuthTokens?> refresh(String refreshToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data;
      final accessToken = data?['accessToken'];
      final rotatedRefreshToken = data?['refreshToken'];

      if (accessToken is! String || rotatedRefreshToken is! String) {
        return null;
      }
      return AuthTokens(
        accessToken: accessToken,
        refreshToken: rotatedRefreshToken,
      );
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        return null;
      }
      rethrow;
    }
  }
}
