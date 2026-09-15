import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/campaigns/application/price_quote.dart';

class CampaignRepository {
  CampaignRepository(this._dio);

  final Dio _dio;

  Future<PriceQuote> quote({
    required String serviceId,
    required String at,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/campaigns/quote',
      queryParameters: {'serviceId': serviceId, 'at': at},
    );
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid price quote.');
    }
    return PriceQuote.fromJson(data);
  }
}

final campaignRepositoryProvider = Provider<CampaignRepository>(
  (ref) => CampaignRepository(ref.watch(dioProvider)),
);

final priceQuoteProvider = FutureProvider.autoDispose
    .family<PriceQuote, PriceQuoteParams>((ref, params) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref
          .watch(campaignRepositoryProvider)
          .quote(serviceId: params.serviceId, at: params.at);
    });
