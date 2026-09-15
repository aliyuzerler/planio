class BusinessProfile {
  const BusinessProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    required this.timezone,
    required this.currency,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String timezone;
  final String currency;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory BusinessProfile.fromJson(Map<String, dynamic> json) {
    return BusinessProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      timezone: json['timezone'] as String,
      currency: json['currency'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

class UpdateBusinessInput {
  const UpdateBusinessInput({
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    required this.timezone,
    required this.currency,
  });

  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String timezone;
  final String currency;

  Map<String, dynamic> toJson() => {
    'name': name.trim(),
    'phone': _nullableTrim(phone),
    'email': _nullableTrim(email)?.toLowerCase(),
    'address': _nullableTrim(address),
    'timezone': timezone.trim(),
    'currency': currency.trim(),
  };

  static String? _nullableTrim(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}
