import 'package:xenior_mobile/features/customers/application/customer_models.dart';

String? validateCustomerInput(CustomerInput input) {
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
  final birthDate = input.birthDate?.trim() ?? '';
  if (birthDate.isNotEmpty) {
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(birthDate)) {
      return 'Doğum tarihi YYYY-MM-AA biçiminde olmalıdır.';
    }
    final parsed = DateTime.tryParse(birthDate);
    final today = DateTime.now();
    final todayStamp =
        '${today.year.toString().padLeft(4, '0')}-'
        '${today.month.toString().padLeft(2, '0')}-'
        '${today.day.toString().padLeft(2, '0')}';
    if (parsed == null ||
        parsed.toIso8601String().substring(0, 10) != birthDate ||
        birthDate.compareTo(todayStamp) > 0) {
      return 'Doğum tarihi geçerli ve gelecekte olmamalıdır.';
    }
  }
  if ((input.notes?.trim().length ?? 0) > 5000) {
    return 'Notlar 5000 karakterden uzun olamaz.';
  }
  return null;
}
