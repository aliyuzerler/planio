import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppConfig {
  const AppConfig({required this.apiUrl});

  factory AppConfig.fromEnvironment() {
    const apiUrl = String.fromEnvironment('API_URL');
    final uri = Uri.tryParse(apiUrl);

    if (apiUrl.isEmpty || uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw const FormatException(
        'API_URL must be provided as an absolute URL using --dart-define.',
      );
    }

    return const AppConfig(apiUrl: apiUrl);
  }

  final String apiUrl;
}

final appConfigProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);
