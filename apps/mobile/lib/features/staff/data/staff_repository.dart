import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/staff/application/staff_models.dart';

class StaffRepository {
  StaffRepository(this._dio);

  final Dio _dio;

  Future<List<StaffProfile>> listStaff() async {
    final response = await _dio.get<List<dynamic>>('/staff');
    return (response.data ?? [])
        .map((item) => StaffProfile.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<StaffProfile> getStaff(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/staff/$id');
    return StaffProfile.fromJson(_required(response.data));
  }

  Future<StaffProfile> createStaff(StaffInput input) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/staff',
      data: input.toJson(includeSpecializations: true),
    );
    return StaffProfile.fromJson(_required(response.data));
  }

  Future<StaffProfile> updateStaff(String id, StaffInput input) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/staff/$id',
      data: input.toJson(includeSpecializations: false),
    );
    return StaffProfile.fromJson(_required(response.data));
  }

  Future<StaffProfile> setActive(String id, bool isActive) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/staff/$id',
      data: {'isActive': isActive},
    );
    return StaffProfile.fromJson(_required(response.data));
  }

  Future<List<SpecializationProfile>> listSpecializations() async {
    final response = await _dio.get<List<dynamic>>('/specializations');
    return (response.data ?? [])
        .map(
          (item) =>
              SpecializationProfile.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<SpecializationProfile> createSpecialization(String name) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/specializations',
      data: {'name': name.trim()},
    );
    return SpecializationProfile.fromJson(_required(response.data));
  }

  Future<StaffProfile> assignSpecialization(
    String staffId,
    String specializationId,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/staff/$staffId/specializations',
      data: {'specializationId': specializationId},
    );
    return StaffProfile.fromJson(_required(response.data));
  }

  Future<void> unassignSpecialization(
    String staffId,
    String specializationId,
  ) async {
    await _dio.delete<void>(
      '/staff/$staffId/specializations/$specializationId',
    );
  }

  Map<String, dynamic> _required(Map<String, dynamic>? data) {
    if (data == null) throw const FormatException('Invalid staff response.');
    return data;
  }
}

final staffRepositoryProvider = Provider<StaffRepository>(
  (ref) => StaffRepository(ref.watch(dioProvider)),
);

final staffListProvider = FutureProvider.autoDispose<List<StaffProfile>>((ref) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) throw StateError('Business selection is required.');
  return ref.watch(staffRepositoryProvider).listStaff();
});

final staffDetailProvider = FutureProvider.autoDispose
    .family<StaffProfile, String>((ref, id) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(staffRepositoryProvider).getStaff(id);
    });

final staffSpecializationsProvider =
    FutureProvider.autoDispose<List<SpecializationProfile>>((ref) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(staffRepositoryProvider).listSpecializations();
    });
