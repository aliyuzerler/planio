class PriceQuote {
  const PriceQuote({
    required this.serviceId,
    required this.listPrice,
    required this.discountAmount,
    required this.payableAmount,
    required this.currency,
    this.campaignId,
    this.campaignName,
  });

  final String serviceId;
  final String listPrice;
  final String discountAmount;
  final String payableAmount;
  final String currency;
  final String? campaignId;
  final String? campaignName;

  bool get hasDiscount => campaignId != null;

  factory PriceQuote.fromJson(Map<String, dynamic> json) {
    return PriceQuote(
      serviceId: json['serviceId'] as String,
      listPrice: json['listPrice'] as String,
      discountAmount: json['discountAmount'] as String,
      payableAmount: json['payableAmount'] as String,
      currency: json['currency'] as String,
      campaignId: json['campaignId'] as String?,
      campaignName: json['campaignName'] as String?,
    );
  }
}

class PriceQuoteParams {
  const PriceQuoteParams({required this.serviceId, required this.at});

  final String serviceId;
  final String at;

  @override
  bool operator ==(Object other) {
    return other is PriceQuoteParams &&
        other.serviceId == serviceId &&
        other.at == at;
  }

  @override
  int get hashCode => Object.hash(serviceId, at);
}
