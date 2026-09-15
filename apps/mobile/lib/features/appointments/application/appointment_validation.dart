import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';

String? validateAppointmentInput(AppointmentInput input) {
  if (input.customerId.trim().isEmpty) return 'Müşteri seçilmelidir.';
  if (input.staffId.trim().isEmpty) return 'Personel seçilmelidir.';
  if (input.serviceId.trim().isEmpty) return 'Hizmet seçilmelidir.';
  final startAt = DateTime.tryParse(input.startAt);
  if (startAt == null) return 'Geçerli bir başlangıç zamanı girin.';
  if ((input.notes?.trim().length ?? 0) > 5000) {
    return 'Notlar 5000 karakterden uzun olamaz.';
  }
  if (input.paymentPlan == 'DEPOSIT' &&
      (input.depositAmount == null || input.depositAmount!.trim().isEmpty)) {
    return 'Kapora tutarı girilmelidir.';
  }
  return null;
}
