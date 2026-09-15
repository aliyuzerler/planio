import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/notifications/application/push_models.dart';
import 'package:xenior_mobile/features/notifications/application/push_token_source.dart';

class PushDeviceRepository {
  PushDeviceRepository(this._dio, this._tokenSource);

  final Dio _dio;
  final PushTokenSource _tokenSource;

  Future<PushDeviceRecord?> registerCurrentDevice() async {
    final token = await _tokenSource.currentToken();
    if (token == null || token.trim().isEmpty) return null;
    final input = PushDeviceInput(
      token: token,
      platform: _tokenSource.platform,
    );
    final validation = validatePushDeviceInput(input);
    if (validation != null) {
      throw FormatException(validation);
    }
    final response = await _dio.post<Map<String, dynamic>>(
      '/notifications/devices',
      data: input.toJson(),
    );
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid push device response.');
    }
    return PushDeviceRecord.fromJson(data);
  }
}

final pushTokenSourceProvider = Provider<PushTokenSource>(
  (ref) => const NoopPushTokenSource(),
);

final pushDeviceRepositoryProvider = Provider<PushDeviceRepository>(
  (ref) => PushDeviceRepository(
    ref.watch(dioProvider),
    ref.watch(pushTokenSourceProvider),
  ),
);
