import 'package:dio/dio.dart';
import 'package:xenior_mobile/core/network/token_refresher.dart';
import 'package:xenior_mobile/features/auth/application/auth_session.dart';

class AuthResult {
  const AuthResult({required this.tokens, required this.user});

  final AuthTokens tokens;
  final AuthUser user;
}

class CurrentUserResult {
  const CurrentUserResult({required this.user, required this.memberships});

  final AuthUser user;
  final List<AuthMembership> memberships;
}

class AuthApi {
  AuthApi(this._authDio, this._apiDio);

  final Dio _authDio;
  final Dio _apiDio;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _authDio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return _parseAuthResult(response.data);
  }

  Future<AuthResult> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String businessName,
    String? businessPhone,
    String? timezone,
  }) async {
    final response = await _authDio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'businessName': businessName,
        if (businessPhone != null && businessPhone.isNotEmpty)
          'businessPhone': businessPhone,
        if (timezone != null && timezone.isNotEmpty) 'timezone': timezone,
      },
    );
    return _parseAuthResult(response.data);
  }

  Future<CurrentUserResult> getCurrentUser() async {
    final response = await _apiDio.get<Map<String, dynamic>>('/auth/me');
    final data = response.data;
    final user = data?['user'];
    final memberships = data?['memberships'];
    if (user is! Map<String, dynamic> || memberships is! List<dynamic>) {
      throw const FormatException('Invalid current-user response.');
    }
    return CurrentUserResult(
      user: AuthUser.fromJson(user),
      memberships: memberships.map((membership) {
        if (membership is! Map<String, dynamic>) {
          throw const FormatException('Invalid membership response.');
        }
        return AuthMembership.fromJson(membership);
      }).toList(),
    );
  }

  Future<void> logout(String refreshToken) async {
    await _authDio.post<void>(
      '/auth/logout',
      data: {'refreshToken': refreshToken},
    );
  }

  AuthResult _parseAuthResult(Map<String, dynamic>? data) {
    final accessToken = data?['accessToken'];
    final refreshToken = data?['refreshToken'];
    final user = data?['user'];
    if (accessToken is! String ||
        refreshToken is! String ||
        user is! Map<String, dynamic>) {
      throw const FormatException('Invalid authentication response.');
    }

    return AuthResult(
      tokens: AuthTokens(accessToken: accessToken, refreshToken: refreshToken),
      user: AuthUser.fromJson(user),
    );
  }
}
