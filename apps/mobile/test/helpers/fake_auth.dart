import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/application/auth_session.dart';

class FakeAuthController extends AuthController {
  @override
  Future<AuthSession> build() async {
    return AuthSession.authenticated(
      const AuthUser(
        id: '11111111-1111-4111-8111-111111111111',
        email: 'owner@example.test',
        firstName: 'Test',
        lastName: 'Owner',
        platformRole: 'USER',
      ),
      memberships: const [
        AuthMembership(
          businessId: '22222222-2222-4222-8222-222222222222',
          businessName: 'Xenior Beauty',
          businessStatus: 'ACTIVE',
          role: 'BUSINESS_OWNER',
          isActive: true,
        ),
      ],
      selectedBusinessId: '22222222-2222-4222-8222-222222222222',
    );
  }
}
