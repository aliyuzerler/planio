import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/business/application/business_profile.dart';

class BusinessRepository {
  BusinessRepository(this._dio);

  final Dio _dio;

  Future<BusinessProfile> getProfile() async {
    final response = await _dio.get<Map<String, dynamic>>('/business');
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid business response.');
    }
    return BusinessProfile.fromJson(data);
  }

  Future<BusinessProfile> updateProfile(UpdateBusinessInput input) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/business',
      data: input.toJson(),
    );
    final data = response.data;
    if (data == null) {
      throw const FormatException('Invalid business response.');
    }
    return BusinessProfile.fromJson(data);
  }
}

final businessRepositoryProvider = Provider<BusinessRepository>(
  (ref) => BusinessRepository(ref.watch(dioProvider)),
);

final businessProfileProvider = FutureProvider.autoDispose<BusinessProfile>((
  ref,
) {
  final selectedBusinessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (selectedBusinessId == null) {
    throw StateError('Business selection is required.');
  }
  return ref.watch(businessRepositoryProvider).getProfile();
});
