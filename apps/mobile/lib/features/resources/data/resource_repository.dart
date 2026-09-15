import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/resources/application/resource_models.dart';

class ResourceRepository {
  ResourceRepository(this._dio);
  final Dio _dio;

  Future<List<ResourceProfile>> list({bool? isActive}) async {
    final response = await _dio.get<List<dynamic>>(
      '/resources',
      queryParameters: {
        if (isActive != null) 'isActive': isActive,
      },
    );
    return (response.data ?? [])
        .map((item) => ResourceProfile.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}

final resourceRepositoryProvider = Provider<ResourceRepository>(
  (ref) => ResourceRepository(ref.watch(dioProvider)),
);

final resourceListProvider = FutureProvider.autoDispose<List<ResourceProfile>>((
  ref,
) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) throw StateError('Business selection is required.');
  return ref.watch(resourceRepositoryProvider).list(isActive: true);
});
