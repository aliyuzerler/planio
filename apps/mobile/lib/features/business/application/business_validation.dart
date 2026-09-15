import 'package:xenior_mobile/features/business/application/business_profile.dart';

String? validateBusinessInput(UpdateBusinessInput input) {
  final name = input.name.trim();
  if (name.length < 2 || name.length > 200) {
    return 'İşletme adı 2-200 karakter olmalıdır.';
  }

  final phone = input.phone?.trim() ?? '';
  if (phone.isNotEmpty && !RegExp(r'^\+?[1-9]\d{6,14}$').hasMatch(phone)) {
    return 'Telefon uluslararası numara biçiminde olmalıdır.';
  }

  final email = input.email?.trim() ?? '';
  if (email.isNotEmpty &&
      !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if ((input.address?.trim().length ?? 0) > 5000) {
    return 'Adres 5000 karakterden uzun olamaz.';
  }

  final timezone = input.timezone.trim();
  if (timezone.isEmpty ||
      timezone.length > 64 ||
      !RegExp(r'^(UTC|[A-Za-z_]+(?:/[A-Za-z0-9_+\-]+)+)$').hasMatch(timezone)) {
    return 'Geçerli bir IANA saat dilimi girin.';
  }

  if (!RegExp(r'^[A-Z]{3}$').hasMatch(input.currency.trim())) {
    return 'Para birimi üç harfli ISO 4217 kodu olmalıdır.';
  }

  return null;
}
