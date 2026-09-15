import 'package:xenior_mobile/features/staff/application/staff_models.dart';

String? validateStaffInput(StaffInput input) {
  final firstName = input.firstName.trim();
  final lastName = input.lastName.trim();
  if (firstName.isEmpty || firstName.length > 100) {
    return 'Ad 1-100 karakter olmalıdır.';
  }
  if (lastName.isEmpty || lastName.length > 100) {
    return 'Soyad 1-100 karakter olmalıdır.';
  }
  final phone = input.phone?.trim() ?? '';
  if (phone.isNotEmpty && !RegExp(r'^\+?[1-9]\d{6,14}$').hasMatch(phone)) {
    return 'Telefon uluslararası numara biçiminde olmalıdır.';
  }
  final email = input.email?.trim() ?? '';
  if (email.isNotEmpty &&
      (email.length > 320 ||
          !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email))) {
    return 'Geçerli bir e-posta adresi girin.';
  }
  if ((input.notes?.trim().length ?? 0) > 5000) {
    return 'Notlar 5000 karakterden uzun olamaz.';
  }
  return null;
}

String? validateSpecializationName(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty || trimmed.length > 120) {
    return 'Uzmanlık adı 1-120 karakter olmalıdır.';
  }
  return null;
}
