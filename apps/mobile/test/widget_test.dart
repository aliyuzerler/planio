import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/app.dart';
import 'package:xenior_mobile/core/config/app_config.dart';
import 'package:xenior_mobile/core/storage/token_storage.dart';

void main() {
  testWidgets('shows login when no secure session exists', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(apiUrl: 'http://localhost/api/v1'),
          ),
          tokenStorageProvider.overrideWithValue(_MemoryTokenStorage()),
        ],
        child: const XeniorApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Planio'), findsOneWidget);
    expect(find.text('Giriş yap'), findsWidgets);
    expect(find.text('Yeni işletme hesabı oluştur'), findsOneWidget);
  });
}

class _MemoryTokenStorage implements TokenStorage {
  String? accessToken;
  String? refreshToken;

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
  }

  @override
  Future<String?> readAccessToken() async => accessToken;

  @override
  Future<String?> readRefreshToken() async => refreshToken;

  @override
  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
