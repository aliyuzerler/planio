class PushDeviceInput {
  const PushDeviceInput({required this.token, required this.platform});

  final String token;
  final String platform;

  Map<String, dynamic> toJson() => {'token': token, 'platform': platform};
}

class PushDeviceRecord {
  const PushDeviceRecord({
    required this.id,
    required this.token,
    required this.platform,
    required this.isActive,
  });

  final String id;
  final String token;
  final String platform;
  final bool isActive;

  factory PushDeviceRecord.fromJson(Map<String, dynamic> json) {
    return PushDeviceRecord(
      id: json['id'] as String,
      token: json['token'] as String,
      platform: json['platform'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

String? validatePushDeviceInput(PushDeviceInput input) {
  if (input.token.trim().length < 8) {
    return 'Push token too short.';
  }
  const platforms = {'IOS', 'ANDROID', 'WEB'};
  if (!platforms.contains(input.platform)) {
    return 'Unsupported push platform.';
  }
  return null;
}
