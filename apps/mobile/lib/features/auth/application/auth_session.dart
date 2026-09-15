class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.platformRole,
  });

  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String platformRole;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      platformRole: json['platformRole'] as String,
    );
  }
}

class AuthMembership {
  const AuthMembership({
    required this.businessId,
    required this.businessName,
    required this.businessStatus,
    required this.role,
    required this.isActive,
  });

  final String businessId;
  final String businessName;
  final String businessStatus;
  final String role;
  final bool isActive;

  bool get isSelectable => isActive && businessStatus == 'ACTIVE';

  factory AuthMembership.fromJson(Map<String, dynamic> json) {
    return AuthMembership(
      businessId: json['businessId'] as String,
      businessName: json['businessName'] as String,
      businessStatus: json['businessStatus'] as String,
      role: json['role'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

class AuthSession {
  const AuthSession._({
    required this.isAuthenticated,
    this.user,
    this.memberships = const [],
    this.selectedBusinessId,
  });

  const AuthSession.authenticated(
    AuthUser user, {
    required List<AuthMembership> memberships,
    required String? selectedBusinessId,
  }) : this._(
         isAuthenticated: true,
         user: user,
         memberships: memberships,
         selectedBusinessId: selectedBusinessId,
       );

  const AuthSession.unauthenticated() : this._(isAuthenticated: false);

  final bool isAuthenticated;
  final AuthUser? user;
  final List<AuthMembership> memberships;
  final String? selectedBusinessId;

  List<AuthMembership> get selectableMemberships =>
      memberships.where((membership) => membership.isSelectable).toList();

  AuthMembership? get activeMembership {
    for (final membership in memberships) {
      if (membership.businessId == selectedBusinessId) return membership;
    }
    return null;
  }

  AuthSession withSelectedBusiness(String businessId) {
    return AuthSession.authenticated(
      user!,
      memberships: memberships,
      selectedBusinessId: businessId,
    );
  }
}
