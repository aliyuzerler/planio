class StaffSpecialization {
  const StaffSpecialization({
    required this.id,
    required this.name,
    required this.isActive,
    required this.assignedAt,
  });

  final String id;
  final String name;
  final bool isActive;
  final DateTime assignedAt;

  factory StaffSpecialization.fromJson(Map<String, dynamic> json) {
    return StaffSpecialization(
      id: json['id'] as String,
      name: json['name'] as String,
      isActive: json['isActive'] as bool,
      assignedAt: DateTime.parse(json['assignedAt'] as String),
    );
  }
}

class StaffProfile {
  const StaffProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.email,
    required this.notes,
    required this.isActive,
    required this.specializations,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? notes;
  final bool isActive;
  final List<StaffSpecialization> specializations;

  String get fullName => '$firstName $lastName';

  factory StaffProfile.fromJson(Map<String, dynamic> json) {
    final rawSpecializations = json['specializations'];
    if (rawSpecializations is! List<dynamic>) {
      throw const FormatException('Invalid staff specializations.');
    }
    return StaffProfile(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      notes: json['notes'] as String?,
      isActive: json['isActive'] as bool,
      specializations: rawSpecializations
          .map(
            (item) =>
                StaffSpecialization.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class SpecializationProfile {
  const SpecializationProfile({
    required this.id,
    required this.name,
    required this.isActive,
  });

  final String id;
  final String name;
  final bool isActive;

  factory SpecializationProfile.fromJson(Map<String, dynamic> json) {
    return SpecializationProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

class StaffInput {
  const StaffInput({
    required this.firstName,
    required this.lastName,
    this.phone,
    this.email,
    this.notes,
    this.specializationIds = const [],
  });

  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? notes;
  final List<String> specializationIds;

  Map<String, dynamic> toJson({required bool includeSpecializations}) => {
    'firstName': firstName.trim(),
    'lastName': lastName.trim(),
    'phone': _nullable(phone),
    'email': _nullable(email)?.toLowerCase(),
    'notes': _nullable(notes),
    if (includeSpecializations) 'specializationIds': specializationIds,
  };

  static String? _nullable(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}
