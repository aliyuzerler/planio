import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/services/application/service_models.dart';

class ServiceRepository {
  ServiceRepository(this._dio);
  final Dio _dio;

  Future<List<ServiceProfile>> list() async {
    final response = await _dio.get<List<dynamic>>('/services');
    return (response.data ?? [])
        .map((item) => ServiceProfile.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ServiceProfile> get(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/services/$id');
    return ServiceProfile.fromJson(_required(response.data));
  }

  Future<ServiceProfile> create(ServiceInput input) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/services',
      data: input.toJson(),
    );
    return ServiceProfile.fromJson(_required(response.data));
  }

  Future<ServiceProfile> update(String id, ServiceInput input) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/services/$id',
      data: input.toJson(),
    );
    return ServiceProfile.fromJson(_required(response.data));
  }

  Future<ServiceProfile> setActive(String id, bool isActive) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/services/$id',
      data: {'isActive': isActive},
    );
    return ServiceProfile.fromJson(_required(response.data));
  }

  Map<String, dynamic> _required(Map<String, dynamic>? data) {
    if (data == null) throw const FormatException('Invalid service response.');
    return data;
  }
}

final serviceRepositoryProvider = Provider<ServiceRepository>(
  (ref) => ServiceRepository(ref.watch(dioProvider)),
);

final serviceListProvider = FutureProvider.autoDispose<List<ServiceProfile>>((
  ref,
) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) throw StateError('Business selection is required.');
  return ref.watch(serviceRepositoryProvider).list();
});

final serviceDetailProvider = FutureProvider.autoDispose
    .family<ServiceProfile, String>((ref, id) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(serviceRepositoryProvider).get(id);
    });
