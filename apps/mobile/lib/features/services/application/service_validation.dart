import 'package:xenior_mobile/features/services/application/service_models.dart';

String? normalizeServicePrice(String value) {
  final match = RegExp(r'^(\d{1,10})(?:\.(\d{0,2}))?$')
      .firstMatch(value.trim());
  if (match == null) return null;
  final fraction = (match.group(2) ?? '').padRight(2, '0');
  return '${match.group(1)}.$fraction';
}

String? validateServiceInput(ServiceInput input) {
  final name = input.name.trim();
  if (name.isEmpty || name.length > 160) {
    return 'Hizmet adı 1-160 karakter olmalıdır.';
  }
  if ((input.description?.trim().length ?? 0) > 5000) {
    return 'Açıklama 5000 karakterden uzun olamaz.';
  }
  if (input.durationMinutes < 1 || input.durationMinutes > 1440) {
    return 'Süre 1-1440 dakika arasında olmalıdır.';
  }
  if (!RegExp(r'^\d{1,10}\.\d{2}$').hasMatch(input.price)) {
    return 'Fiyat en fazla iki ondalık basamak içermelidir.';
  }
  return null;
}
