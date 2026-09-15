class SaleSummary {
  const SaleSummary({
    required this.id,
    required this.customerName,
    required this.serviceName,
    required this.totalAmount,
    required this.remainingAmount,
    required this.currency,
    required this.status,
    this.receiptNo,
  });

  final String id;
  final String customerName;
  final String serviceName;
  final String totalAmount;
  final String remainingAmount;
  final String currency;
  final String status;
  final String? receiptNo;

  factory SaleSummary.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>;
    final lines = json['lines'];
    final first = lines is List && lines.isNotEmpty
        ? lines.first as Map<String, dynamic>
        : null;
    final receipt = json['receipt'];
    return SaleSummary(
      id: json['id'] as String,
      customerName: '${customer['firstName']} ${customer['lastName']}',
      serviceName: (first?['nameSnapshot'] as String?) ?? 'Hizmet',
      totalAmount: json['totalAmount'] as String,
      remainingAmount: json['remainingAmount'] as String,
      currency: json['currency'] as String,
      status: json['status'] as String,
      receiptNo: receipt is Map<String, dynamic>
          ? receipt['receiptNo'] as String?
          : null,
    );
  }
}

class CashAccountSummary {
  const CashAccountSummary({
    required this.id,
    required this.name,
    required this.balance,
    required this.currency,
  });

  final String id;
  final String name;
  final String balance;
  final String currency;

  factory CashAccountSummary.fromJson(Map<String, dynamic> json) {
    return CashAccountSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      balance: json['balance'] as String,
      currency: json['currency'] as String,
    );
  }
}

class ExpenseSummary {
  const ExpenseSummary({
    required this.id,
    required this.category,
    required this.amount,
    required this.currency,
    required this.occurredAt,
  });

  final String id;
  final String category;
  final String amount;
  final String currency;
  final DateTime occurredAt;

  factory ExpenseSummary.fromJson(Map<String, dynamic> json) {
    return ExpenseSummary(
      id: json['id'] as String,
      category: json['category'] as String,
      amount: json['amount'] as String,
      currency: json['currency'] as String,
      occurredAt: DateTime.parse(json['occurredAt'] as String),
    );
  }
}

class LedgerCustomerSummary {
  const LedgerCustomerSummary({
    required this.id,
    required this.name,
    required this.ledgerBalance,
  });

  final String id;
  final String name;
  final String ledgerBalance;

  factory LedgerCustomerSummary.fromJson(Map<String, dynamic> json) {
    return LedgerCustomerSummary(
      id: json['id'] as String,
      name: '${json['firstName']} ${json['lastName']}',
      ledgerBalance: json['ledgerBalance'] as String,
    );
  }
}
