class AppointmentParty {
  const AppointmentParty({
    required this.id,
    required this.firstName,
    required this.lastName,
  });

  final String id;
  final String firstName;
  final String lastName;

  String get fullName => '$firstName $lastName';

  factory AppointmentParty.fromJson(Map<String, dynamic> json) {
    return AppointmentParty(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
    );
  }
}

class AppointmentRecord {
  const AppointmentRecord({
    required this.id,
    required this.customer,
    required this.staff,
    required this.serviceId,
    required this.serviceName,
    required this.startAt,
    required this.endAt,
    required this.status,
    required this.notes,
    required this.servicePriceSnapshot,
    required this.currency,
    required this.events,
    this.listPriceSnapshot,
    this.discountAmountSnapshot = '0.00',
    this.campaignId,
    this.campaignNameSnapshot,
    this.resourceId,
    this.resourceName,
    this.paymentPlan = 'ON_DAY',
    this.depositAmount,
    this.paymentStatus = 'UNPAID',
    this.remainingAmount,
    this.collectedAmount,
  });

  final String id;
  final AppointmentParty customer;
  final AppointmentParty staff;
  final String serviceId;
  final String serviceName;
  final DateTime startAt;
  final DateTime endAt;
  final String status;
  final String? notes;
  final String servicePriceSnapshot;
  final String currency;
  final List<String> events;
  final String? listPriceSnapshot;
  final String discountAmountSnapshot;
  final String? campaignId;
  final String? campaignNameSnapshot;
  final String? resourceId;
  final String? resourceName;
  final String paymentPlan;
  final String? depositAmount;
  final String paymentStatus;
  final String? remainingAmount;
  final String? collectedAmount;

  bool get isConfirmed => status == 'CONFIRMED';
  bool get hasCampaignDiscount =>
      discountAmountSnapshot != '0.00' && discountAmountSnapshot.isNotEmpty;

  factory AppointmentRecord.fromJson(Map<String, dynamic> json) {
    final service = json['service'];
    if (service is! Map<String, dynamic>) {
      throw const FormatException('Invalid appointment service.');
    }
    final events = json['events'];
    return AppointmentRecord(
      id: json['id'] as String,
      customer: AppointmentParty.fromJson(
        json['customer'] as Map<String, dynamic>,
      ),
      staff: AppointmentParty.fromJson(json['staff'] as Map<String, dynamic>),
      serviceId: service['id'] as String,
      serviceName: json['serviceNameSnapshot'] as String,
      startAt: DateTime.parse(json['startAt'] as String),
      endAt: DateTime.parse(json['endAt'] as String),
      status: json['status'] as String,
      notes: json['notes'] as String?,
      servicePriceSnapshot: json['servicePriceSnapshot'] as String,
      currency: json['currency'] as String,
      listPriceSnapshot: json['listPriceSnapshot'] as String?,
      discountAmountSnapshot:
          (json['discountAmountSnapshot'] as String?) ?? '0.00',
      campaignId: json['campaignId'] as String?,
      campaignNameSnapshot: json['campaignNameSnapshot'] as String?,
      events: events is List<dynamic>
          ? events
                .map((item) => (item as Map<String, dynamic>)['type'] as String)
                .toList()
          : const [],
      resourceId: json['resource'] is Map<String, dynamic>
          ? (json['resource'] as Map<String, dynamic>)['id'] as String?
          : null,
      resourceName: json['resource'] is Map<String, dynamic>
          ? (json['resource'] as Map<String, dynamic>)['name'] as String?
          : null,
      paymentPlan: (json['paymentPlan'] as String?) ?? 'ON_DAY',
      depositAmount: json['depositAmount'] as String?,
      paymentStatus: (json['paymentStatus'] as String?) ?? 'UNPAID',
      remainingAmount: json['remainingAmount'] as String?,
      collectedAmount: json['collectedAmount'] as String?,
    );
  }
}

class PaginatedAppointments {
  const PaginatedAppointments({
    required this.items,
    required this.page,
    required this.total,
    required this.hasMore,
  });

  final List<AppointmentRecord> items;
  final int page;
  final int total;
  final bool hasMore;

  factory PaginatedAppointments.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid appointment page.');
    }
    return PaginatedAppointments(
      items: items
          .map(
            (item) => AppointmentRecord.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      page: json['page'] as int,
      total: json['total'] as int,
      hasMore: json['hasMore'] as bool,
    );
  }
}

class AppointmentInput {
  const AppointmentInput({
    required this.customerId,
    required this.staffId,
    required this.serviceId,
    required this.startAt,
    this.notes,
    this.resourceId,
    this.paymentPlan = 'ON_DAY',
    this.depositAmount,
  });

  final String customerId;
  final String staffId;
  final String serviceId;
  final String startAt;
  final String? notes;
  final String? resourceId;
  final String paymentPlan;
  final String? depositAmount;

  Map<String, dynamic> toJson() => {
    'customerId': customerId,
    'staffId': staffId,
    'serviceId': serviceId,
    'startAt': startAt,
    'notes': notes?.trim().isEmpty ?? true ? null : notes?.trim(),
    'resourceId': resourceId,
    'paymentPlan': paymentPlan,
    if (paymentPlan == 'DEPOSIT') 'depositAmount': depositAmount,
  };
}

class AppointmentListParams {
  const AppointmentListParams({
    this.date,
    this.from,
    this.to,
    this.status,
    this.page = 1,
  });

  final String? date;
  final String? from;
  final String? to;
  final String? status;
  final int page;

  Map<String, dynamic> toQuery() {
    return {
      if (from != null || to != null) ...{
        if (from != null) 'from': from,
        if (to != null) 'to': to,
      } else if (date != null && date!.isNotEmpty) ...{
        'from': date,
        'to': date,
      },
      if (status != null && status!.isNotEmpty) 'status': status,
      'page': page,
      'pageSize': 100,
    };
  }

  @override
  bool operator ==(Object other) {
    return other is AppointmentListParams &&
        other.date == date &&
        other.from == from &&
        other.to == to &&
        other.status == status &&
        other.page == page;
  }

  @override
  int get hashCode => Object.hash(date, from, to, status, page);
}
