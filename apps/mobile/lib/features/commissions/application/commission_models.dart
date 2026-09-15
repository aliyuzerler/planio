class CommissionEntry {
  const CommissionEntry({
    required this.id,
    required this.staffName,
    required this.serviceName,
    required this.ruleName,
    required this.amount,
    required this.currency,
    required this.earnedAt,
  });

  final String id;
  final String staffName;
  final String serviceName;
  final String ruleName;
  final String amount;
  final String currency;
  final DateTime earnedAt;

  factory CommissionEntry.fromJson(Map<String, dynamic> json) {
    return CommissionEntry(
      id: json['id'] as String,
      staffName: json['staffNameSnapshot'] as String,
      serviceName: json['serviceNameSnapshot'] as String,
      ruleName: json['ruleNameSnapshot'] as String,
      amount: json['amount'] as String,
      currency: json['currency'] as String,
      earnedAt: DateTime.parse(json['earnedAt'] as String),
    );
  }
}

class PaginatedCommissionEntries {
  const PaginatedCommissionEntries({
    required this.items,
    required this.total,
  });

  final List<CommissionEntry> items;
  final int total;

  factory PaginatedCommissionEntries.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid commission page.');
    }
    return PaginatedCommissionEntries(
      items: items
          .map((item) => CommissionEntry.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
    );
  }
}
