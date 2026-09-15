import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/subscriptions/application/subscription_models.dart';

class SubscriptionRepository {
  SubscriptionRepository(this._dio);

  final Dio _dio;

  Future<SubscriptionAccess> getAccess() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/subscriptions/access',
    );
    return SubscriptionAccess.fromJson(_required(response.data));
  }

  Future<SubscriptionRecord?> getCurrent() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/subscriptions/current',
    );
    final data = response.data;
    if (data == null || data.isEmpty) return null;
    return SubscriptionRecord.fromJson(data);
  }

  Future<List<PlanRecord>> listPlans() async {
    final response = await _dio.get<List<dynamic>>('/plans');
    return (response.data ?? [])
        .whereType<Map<String, dynamic>>()
        .map(PlanRecord.fromJson)
        .toList();
  }

  Map<String, dynamic> _required(Map<String, dynamic>? data) {
    if (data == null) {
      throw const FormatException('Invalid subscription response.');
    }
    return data;
  }
}

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>(
  (ref) => SubscriptionRepository(ref.watch(dioProvider)),
);

final subscriptionAccessProvider =
    FutureProvider.autoDispose<SubscriptionAccess>((ref) {
      final businessId = ref.watch(
        authControllerProvider.select(
          (auth) => auth.value?.selectedBusinessId,
        ),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(subscriptionRepositoryProvider).getAccess();
    });

final currentSubscriptionProvider =
    FutureProvider.autoDispose<SubscriptionRecord?>((ref) {
      final businessId = ref.watch(
        authControllerProvider.select(
          (auth) => auth.value?.selectedBusinessId,
        ),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(subscriptionRepositoryProvider).getCurrent();
    });

final subscriptionPlansProvider = FutureProvider.autoDispose<List<PlanRecord>>((
  ref,
) {
  final businessId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
  );
  if (businessId == null) {
    throw StateError('Business selection is required.');
  }
  return ref.watch(subscriptionRepositoryProvider).listPlans();
});
