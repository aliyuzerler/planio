import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/network/api_client.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';

class AppointmentRepository {
  AppointmentRepository(this._dio);

  final Dio _dio;

  Future<PaginatedAppointments> listAppointments(
    AppointmentListParams params,
  ) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/appointments',
      queryParameters: params.toQuery(),
    );
    return PaginatedAppointments.fromJson(_required(response.data));
  }

  Future<AppointmentRecord> getAppointment(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/appointments/$id');
    return AppointmentRecord.fromJson(_required(response.data));
  }

  Future<AppointmentRecord> createAppointment(AppointmentInput input) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/appointments',
      data: input.toJson(),
    );
    return AppointmentRecord.fromJson(_required(response.data));
  }

  Future<AppointmentRecord> rescheduleAppointment(
    String id,
    AppointmentInput input,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/appointments/$id/reschedule',
      data: {
        'customerId': input.customerId,
        'staffId': input.staffId,
        'serviceId': input.serviceId,
        'startAt': input.startAt,
        'resourceId': input.resourceId,
      },
    );
    return AppointmentRecord.fromJson(_required(response.data));
  }

  Future<AppointmentRecord> cancel(String id) => _action(id, 'cancel');
  Future<AppointmentRecord> complete(String id) => _action(id, 'complete');
  Future<AppointmentRecord> markNoShow(String id) => _action(id, 'no-show');

  Future<Map<String, dynamic>> createPaymentLink(String id) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/checkout/appointments/$id/link',
    );
    return _required(response.data);
  }

  Future<AppointmentRecord> _action(String id, String path) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/appointments/$id/$path',
    );
    return AppointmentRecord.fromJson(_required(response.data));
  }

  Map<String, dynamic> _required(Map<String, dynamic>? data) {
    if (data == null) {
      throw const FormatException('Invalid appointment response.');
    }
    return data;
  }
}

final appointmentRepositoryProvider = Provider<AppointmentRepository>(
  (ref) => AppointmentRepository(ref.watch(dioProvider)),
);

final appointmentListProvider = FutureProvider.autoDispose
    .family<PaginatedAppointments, AppointmentListParams>((ref, params) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(appointmentRepositoryProvider).listAppointments(params);
    });

final appointmentDetailProvider = FutureProvider.autoDispose
    .family<AppointmentRecord, String>((ref, id) {
      final businessId = ref.watch(
        authControllerProvider.select((auth) => auth.value?.selectedBusinessId),
      );
      if (businessId == null) {
        throw StateError('Business selection is required.');
      }
      return ref.watch(appointmentRepositoryProvider).getAppointment(id);
    });
