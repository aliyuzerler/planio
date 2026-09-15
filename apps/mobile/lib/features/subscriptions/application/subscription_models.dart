class SubscriptionAccess {
  const SubscriptionAccess({
    required this.hasAccess,
    this.status,
  });

  final bool hasAccess;
  final String? status;

  factory SubscriptionAccess.fromJson(Map<String, dynamic> json) {
    return SubscriptionAccess(
      hasAccess: json['hasAccess'] == true,
      status: json['status'] as String?,
    );
  }
}

class PlanRecord {
  const PlanRecord({
    required this.id,
    required this.name,
    required this.billingPeriod,
    required this.price,
    required this.currency,
  });

  final String id;
  final String name;
  final String billingPeriod;
  final String price;
  final String currency;

  factory PlanRecord.fromJson(Map<String, dynamic> json) {
    return PlanRecord(
      id: json['id'] as String,
      name: json['name'] as String,
      billingPeriod: json['billingPeriod'] as String,
      price: json['price'] as String,
      currency: json['currency'] as String,
    );
  }
}

class SubscriptionRecord {
  const SubscriptionRecord({
    required this.id,
    required this.status,
    required this.currentPeriodEnd,
    required this.plan,
  });

  final String id;
  final String status;
  final DateTime currentPeriodEnd;
  final PlanRecord plan;

  factory SubscriptionRecord.fromJson(Map<String, dynamic> json) {
    return SubscriptionRecord(
      id: json['id'] as String,
      status: json['status'] as String,
      currentPeriodEnd: DateTime.parse(json['currentPeriodEnd'] as String),
      plan: PlanRecord.fromJson(json['plan'] as Map<String, dynamic>),
    );
  }
}

String billingPeriodLabel(String period) {
  switch (period) {
    case 'SEMIANNUAL':
      return '6 aylık';
    case 'YEARLY':
      return 'Yıllık';
    default:
      return 'Aylık';
  }
}

String subscriptionStatusLabel(String? status) {
  switch (status) {
    case 'TRIALING':
      return 'Ödeme bekleniyor';
    case 'ACTIVE':
      return 'Aktif';
    case 'PAST_DUE':
      return 'Ödeme bekliyor';
    case 'PAUSED':
      return 'Duraklatıldı';
    case 'CANCELLED':
      return 'İptal edildi';
    case 'EXPIRED':
      return 'Süresi doldu';
    default:
      return 'Lisans yok';
  }
}
