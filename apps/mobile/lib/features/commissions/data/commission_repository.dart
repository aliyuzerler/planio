import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/commissions/application/commission_models.dart';

class CommissionRepository {
  CommissionRepository(this._dio);

  final Dio _dio;

  Future<PaginatedCommissionEntries> listEntries({String? staffId}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/commissions/entries',
      queryParameters: {
        'page': 1,
        'pageSize': 50,
        if (staffId != null) 'staffId': staffId,
      },
    );
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid commission response.');
    }
    return PaginatedCommissionEntries.fromJson(data);
  }
}

final commissionRepositoryProvider = Provider<CommissionRepository>(
  (ref) => CommissionRepository(ref.watch(dioProvider)),
);

final commissionEntriesProvider =
    FutureProvider.autoDispose<PaginatedCommissionEntries>((ref) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(commissionRepositoryProvider).listEntries();
    });
