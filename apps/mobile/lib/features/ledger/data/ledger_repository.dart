import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/ledger/application/ledger_models.dart';

class LedgerRepository {
  LedgerRepository(this._dio);

  final Dio _dio;

  Future<void> collectPos(String saleId, String amount) async {
    await _dio.post<Map<String, dynamic>>(
      '/sales/$saleId/collections',
      data: {'amount': amount, 'method': 'CARD'},
    );
  }

  Future<List<SaleSummary>> listSales() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/sales',
      queryParameters: {'page': 1, 'pageSize': 50},
    );
    final items = response.data?['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid sales response.');
    }
    return items
        .map((item) => SaleSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<CashAccountSummary>> listAccounts() async {
    final response = await _dio.get<List<dynamic>>('/cash-accounts');
    return (response.data ?? [])
        .map((item) => CashAccountSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ExpenseSummary>> listExpenses() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/expenses',
      queryParameters: {'page': 1, 'pageSize': 50},
    );
    final items = response.data?['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid expenses response.');
    }
    return items
        .map((item) => ExpenseSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<LedgerCustomerSummary>> listCustomers() async {
    final response = await _dio.get<List<dynamic>>('/ledger/customers');
    return (response.data ?? [])
        .map(
          (item) =>
              LedgerCustomerSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }
}

final ledgerRepositoryProvider = Provider<LedgerRepository>(
  (ref) => LedgerRepository(ref.watch(dioProvider)),
);

final salesProvider = FutureProvider.autoDispose<List<SaleSummary>>((ref) {
  _requireBusiness(ref);
  return ref.watch(ledgerRepositoryProvider).listSales();
});

final cashAccountsProvider =
    FutureProvider.autoDispose<List<CashAccountSummary>>((ref) {
      _requireBusiness(ref);
      return ref.watch(ledgerRepositoryProvider).listAccounts();
    });

final expensesProvider = FutureProvider.autoDispose<List<ExpenseSummary>>((ref) {
  _requireBusiness(ref);
  return ref.watch(ledgerRepositoryProvider).listExpenses();
});

final ledgerCustomersProvider =
    FutureProvider.autoDispose<List<LedgerCustomerSummary>>((ref) {
      _requireBusiness(ref);
      return ref.watch(ledgerRepositoryProvider).listCustomers();
    });

void _requireBusiness(Ref ref) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) {
    throw StateError('Business selection is required.');
  }
}
