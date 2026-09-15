class FinanceSummary {
  const FinanceSummary({
    required this.date,
    required this.currency,
    required this.collectionsIn,
    required this.expensesOut,
    required this.net,
    required this.accounts,
    required this.receivablesTotal,
    required this.receivableCustomers,
    required this.commissionTotal,
  });

  final String date;
  final String currency;
  final String collectionsIn;
  final String expensesOut;
  final String net;
  final List<FinanceAccountBalance> accounts;
  final String receivablesTotal;
  final int receivableCustomers;
  final String commissionTotal;

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    final cash = json['cash'] as Map<String, dynamic>;
    final receivables = json['receivables'] as Map<String, dynamic>;
    final commissions = json['commissions'] as Map<String, dynamic>;
    final accounts = cash['accounts'];
    return FinanceSummary(
      date: json['date'] as String,
      currency: json['currency'] as String,
      collectionsIn: cash['collectionsIn'] as String,
      expensesOut: cash['expensesOut'] as String,
      net: cash['net'] as String,
      accounts: accounts is List
          ? accounts
                .map(
                  (item) => FinanceAccountBalance.fromJson(
                    item as Map<String, dynamic>,
                  ),
                )
                .toList()
          : const [],
      receivablesTotal: receivables['totalOutstanding'] as String,
      receivableCustomers: (receivables['customerCount'] as num).toInt(),
      commissionTotal: commissions['totalAmount'] as String,
    );
  }
}

class FinanceAccountBalance {
  const FinanceAccountBalance({
    required this.name,
    required this.balance,
  });

  final String name;
  final String balance;

  factory FinanceAccountBalance.fromJson(Map<String, dynamic> json) {
    return FinanceAccountBalance(
      name: json['name'] as String,
      balance: json['balance'] as String,
    );
  }
}
