class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.email,
    required this.birthDate,
    required this.notes,
    required this.smsConsent,
    required this.whatsappConsent,
    required this.emailConsent,
    required this.ledgerBalance,
    required this.isActive,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? birthDate;
  final String? notes;
  final bool smsConsent;
  final bool whatsappConsent;
  final bool emailConsent;
  final String ledgerBalance;
  final bool isActive;

  String get fullName => '$firstName $lastName';

  String get ledgerLabel {
    final parts = ledgerBalance.split('.');
    final whole = parts.isEmpty ? '0' : parts.first;
    final fraction = parts.length > 1
        ? parts[1].padRight(2, '0').substring(0, 2)
        : '00';
    return 'Cari: $whole,$fraction TRY';
  }

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      birthDate: json['birthDate'] as String?,
      notes: json['notes'] as String?,
      smsConsent: json['smsConsent'] as bool? ?? true,
      whatsappConsent: json['whatsappConsent'] as bool? ?? true,
      emailConsent: json['emailConsent'] as bool? ?? true,
      ledgerBalance: json['ledgerBalance'] as String? ?? '0.00',
      isActive: json['isActive'] as bool,
    );
  }
}

class CustomerAppointmentHistoryItem {
  const CustomerAppointmentHistoryItem({
    required this.id,
    required this.startAt,
    required this.endAt,
    required this.status,
    required this.serviceNameSnapshot,
    required this.serviceDurationSnapshot,
    required this.servicePriceSnapshot,
    required this.currency,
    required this.staffFirstName,
    required this.staffLastName,
  });

  final String id;
  final DateTime startAt;
  final DateTime endAt;
  final String status;
  final String serviceNameSnapshot;
  final int serviceDurationSnapshot;
  final String servicePriceSnapshot;
  final String currency;
  final String staffFirstName;
  final String staffLastName;

  String get staffName => '$staffFirstName $staffLastName';

  factory CustomerAppointmentHistoryItem.fromJson(Map<String, dynamic> json) {
    final staff = json['staff'];
    if (staff is! Map<String, dynamic>) {
      throw const FormatException('Invalid appointment staff.');
    }
    return CustomerAppointmentHistoryItem(
      id: json['id'] as String,
      startAt: DateTime.parse(json['startAt'] as String),
      endAt: DateTime.parse(json['endAt'] as String),
      status: json['status'] as String,
      serviceNameSnapshot: json['serviceNameSnapshot'] as String,
      serviceDurationSnapshot: json['serviceDurationSnapshot'] as int,
      servicePriceSnapshot: json['servicePriceSnapshot'] as String,
      currency: json['currency'] as String,
      staffFirstName: staff['firstName'] as String,
      staffLastName: staff['lastName'] as String,
    );
  }
}

class PaginatedCustomers {
  const PaginatedCustomers({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.totalPages,
    required this.hasMore,
  });

  final List<CustomerProfile> items;
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;
  final bool hasMore;

  factory PaginatedCustomers.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid customer page.');
    }
    return PaginatedCustomers(
      items: items
          .map((item) => CustomerProfile.fromJson(item as Map<String, dynamic>))
          .toList(),
      page: json['page'] as int,
      pageSize: json['pageSize'] as int,
      total: json['total'] as int,
      totalPages: json['totalPages'] as int,
      hasMore: json['hasMore'] as bool,
    );
  }
}

class PaginatedCustomerAppointments {
  const PaginatedCustomerAppointments({
    required this.items,
    required this.page,
    required this.total,
    required this.hasMore,
  });

  final List<CustomerAppointmentHistoryItem> items;
  final int page;
  final int total;
  final bool hasMore;

  factory PaginatedCustomerAppointments.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List<dynamic>) {
      throw const FormatException('Invalid appointment history.');
    }
    return PaginatedCustomerAppointments(
      items: items
          .map(
            (item) => CustomerAppointmentHistoryItem.fromJson(
              item as Map<String, dynamic>,
            ),
          )
          .toList(),
      page: json['page'] as int,
      total: json['total'] as int,
      hasMore: json['hasMore'] as bool,
    );
  }
}

class CustomerInput {
  const CustomerInput({
    required this.firstName,
    required this.lastName,
    this.phone,
    this.email,
    this.birthDate,
    this.notes,
    this.smsConsent = true,
    this.whatsappConsent = true,
    this.emailConsent = true,
  });

  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? birthDate;
  final String? notes;
  final bool smsConsent;
  final bool whatsappConsent;
  final bool emailConsent;

  Map<String, dynamic> toJson() => {
    'firstName': firstName.trim(),
    'lastName': lastName.trim(),
    'phone': _nullable(phone),
    'email': _nullable(email)?.toLowerCase(),
    'birthDate': _nullable(birthDate),
    'notes': _nullable(notes),
    'smsConsent': smsConsent,
    'whatsappConsent': whatsappConsent,
    'emailConsent': emailConsent,
  };

  static String? _nullable(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}

class CustomerListParams {
  const CustomerListParams({
    this.q,
    this.isActive,
    this.page = 1,
    this.pageSize = 25,
  });

  final String? q;
  final bool? isActive;
  final int page;
  final int pageSize;

  @override
  bool operator ==(Object other) {
    return other is CustomerListParams &&
        other.q == q &&
        other.isActive == isActive &&
        other.page == page &&
        other.pageSize == pageSize;
  }

  @override
  int get hashCode => Object.hash(q, isActive, page, pageSize);
}
