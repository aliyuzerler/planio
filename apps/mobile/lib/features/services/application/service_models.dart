class ServiceProfile {
  const ServiceProfile({
    required this.id,
    required this.name,
    required this.description,
    required this.durationMinutes,
    required this.price,
    required this.currency,
    required this.isActive,
  });

  final String id;
  final String name;
  final String? description;
  final int durationMinutes;
  final String price;
  final String currency;
  final bool isActive;

  factory ServiceProfile.fromJson(Map<String, dynamic> json) {
    return ServiceProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      durationMinutes: json['durationMinutes'] as int,
      price: json['price'] as String,
      currency: json['currency'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

class ServiceInput {
  const ServiceInput({
    required this.name,
    required this.description,
    required this.durationMinutes,
    required this.price,
  });

  final String name;
  final String? description;
  final int durationMinutes;
  final String price;

  Map<String, dynamic> toJson() => {
    'name': name.trim(),
    'description': _nullable(description),
    'durationMinutes': durationMinutes,
    'price': price,
  };

  static String? _nullable(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}
