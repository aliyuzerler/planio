class ResourceProfile {
  const ResourceProfile({
    required this.id,
    required this.name,
    required this.isActive,
  });

  final String id;
  final String name;
  final bool isActive;

  factory ResourceProfile.fromJson(Map<String, dynamic> json) {
    return ResourceProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}
