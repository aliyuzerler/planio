import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/customers/application/customer_models.dart';

class CustomerRepository {
  CustomerRepository(this._dio);

  final Dio _dio;

  Future<PaginatedCustomers> listCustomers(CustomerListParams params) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/customers',
      queryParameters: {
        if (params.q != null && params.q!.trim().isNotEmpty) 'q': params.q,
        if (params.isActive != null) 'isActive': params.isActive,
        'page': params.page,
        'pageSize': params.pageSize,
      },
    );
    return PaginatedCustomers.fromJson(_required(response.data));
  }

  Future<CustomerProfile> getCustomer(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/customers/$id');
    return CustomerProfile.fromJson(_required(response.data));
  }

  Future<PaginatedCustomerAppointments> listAppointments(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/customers/$id/appointments',
    );
    return PaginatedCustomerAppointments.fromJson(_required(response.data));
  }

  Future<CustomerProfile> createCustomer(CustomerInput input) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/customers',
      data: input.toJson(),
    );
    return CustomerProfile.fromJson(_required(response.data));
  }

  Future<CustomerProfile> updateCustomer(String id, CustomerInput input) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/customers/$id',
      data: input.toJson(),
    );
    return CustomerProfile.fromJson(_required(response.data));
  }

  Future<CustomerProfile> setActive(String id, bool isActive) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/customers/$id',
      data: {'isActive': isActive},
    );
    return CustomerProfile.fromJson(_required(response.data));
  }

  Map<String, dynamic> _required(Map<String, dynamic>? data) {
    if (data == null) {
      throw const FormatException('Invalid customer response.');
    }
    return data;
  }
}

final customerRepositoryProvider = Provider<CustomerRepository>(
  (ref) => CustomerRepository(ref.watch(dioProvider)),
);

final customerListProvider = FutureProvider.autoDispose
    .family<PaginatedCustomers, CustomerListParams>((ref, params) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(customerRepositoryProvider).listCustomers(params);
    });

final customerDetailProvider = FutureProvider.autoDispose
    .family<CustomerProfile, String>((ref, id) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(customerRepositoryProvider).getCustomer(id);
    });

final customerAppointmentsProvider = FutureProvider.autoDispose
    .family<PaginatedCustomerAppointments, String>((ref, id) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(customerRepositoryProvider).listAppointments(id);
    });
