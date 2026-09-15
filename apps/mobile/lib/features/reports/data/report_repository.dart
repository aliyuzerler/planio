import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/reports/application/report_models.dart';

class ReportRepository {
  ReportRepository(this._dio);

  final Dio _dio;

  Future<FinanceSummary> summary() async {
    final response = await _dio.get<Map<String, dynamic>>('/reports/summary');
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid finance summary response.');
    }
    return FinanceSummary.fromJson(data);
  }
}

final reportRepositoryProvider = Provider<ReportRepository>(
  (ref) => ReportRepository(ref.watch(dioProvider)),
);

final financeSummaryProvider = FutureProvider.autoDispose<FinanceSummary>((
  ref,
) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) {
    throw StateError('Business selection is required.');
  }
  return ref.watch(reportRepositoryProvider).summary();
});
