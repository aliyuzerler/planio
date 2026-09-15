import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/application/auth_session.dart';
import 'package:xenior_mobile/features/auth/presentation/login_screen.dart';
import 'package:xenior_mobile/features/auth/presentation/register_screen.dart';
import 'package:xenior_mobile/features/business/presentation/business_settings_screen.dart';
import 'package:xenior_mobile/features/business/presentation/select_business_screen.dart';
import 'package:xenior_mobile/features/home/presentation/home_screen.dart';
import 'package:xenior_mobile/features/commissions/presentation/earnings_screen.dart';
import 'package:xenior_mobile/features/ledger/presentation/cash_screen.dart';
import 'package:xenior_mobile/features/ledger/presentation/expenses_screen.dart';
import 'package:xenior_mobile/features/ledger/presentation/ledger_screen.dart';
import 'package:xenior_mobile/features/ledger/presentation/sales_screen.dart';
import 'package:xenior_mobile/features/home/presentation/more_screen.dart';
import 'package:xenior_mobile/features/subscriptions/presentation/subscription_screen.dart';
import 'package:xenior_mobile/features/staff/presentation/staff_detail_screen.dart';
import 'package:xenior_mobile/features/staff/presentation/staff_form_screen.dart';
import 'package:xenior_mobile/features/staff/presentation/staff_list_screen.dart';
import 'package:xenior_mobile/features/appointments/presentation/appointment_detail_screen.dart';
import 'package:xenior_mobile/features/appointments/presentation/appointment_form_screen.dart';
import 'package:xenior_mobile/features/appointments/presentation/appointment_list_screen.dart';
import 'package:xenior_mobile/features/customers/presentation/customer_detail_screen.dart';
import 'package:xenior_mobile/features/customers/presentation/customer_form_screen.dart';
import 'package:xenior_mobile/features/customers/presentation/customer_list_screen.dart';
import 'package:xenior_mobile/features/services/presentation/service_detail_screen.dart';
import 'package:xenior_mobile/features/services/presentation/service_form_screen.dart';
import 'package:xenior_mobile/features/services/presentation/service_list_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.isLoading) return null;

      final isAuthenticated = auth.value?.isAuthenticated ?? false;
      final isAuthRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      if (!isAuthenticated && !isAuthRoute) return '/login';
      if (isAuthenticated && isAuthRoute) return '/';
      if (isAuthenticated &&
          (state.matchedLocation == '/' ||
              state.matchedLocation == '/more' ||
              state.matchedLocation == '/settings/business' ||
              state.matchedLocation == '/settings/subscription' ||
              state.matchedLocation.startsWith('/staff') ||
              state.matchedLocation.startsWith('/services') ||
              state.matchedLocation.startsWith('/customers') ||
              state.matchedLocation.startsWith('/appointments') ||
              state.matchedLocation == '/earnings' ||
              state.matchedLocation == '/sales' ||
              state.matchedLocation == '/cash' ||
              state.matchedLocation == '/ledger' ||
              state.matchedLocation == '/expenses') &&
          auth.value?.selectedBusinessId == null) {
        return '/select-business';
      }
      final role = auth.value?.activeMembership?.role;
      final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';
      if (isAuthenticated &&
          role == 'ACCOUNTANT' &&
          (state.matchedLocation.startsWith('/appointments') ||
              state.matchedLocation.startsWith('/staff') ||
              state.matchedLocation.startsWith('/services') ||
              state.matchedLocation.startsWith('/settings/business') ||
              state.matchedLocation.startsWith('/settings/subscription'))) {
        return '/';
      }
      final isCatalogWriteRoute =
          state.matchedLocation == '/staff/new' ||
          state.matchedLocation == '/services/new' ||
          state.matchedLocation == '/customers/new' ||
          ((state.matchedLocation.startsWith('/staff') ||
                  state.matchedLocation.startsWith('/services') ||
                  state.matchedLocation.startsWith('/customers')) &&
              state.matchedLocation.endsWith('/edit'));
      if (isAuthenticated && isCatalogWriteRoute && !canManage) {
        if (state.matchedLocation.startsWith('/services')) return '/services';
        if (state.matchedLocation.startsWith('/customers')) {
          return '/customers';
        }
        return '/staff';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/more',
        name: 'more',
        builder: (context, state) => const MoreScreen(),
      ),
      GoRoute(
        path: '/earnings',
        name: 'earnings',
        builder: (context, state) => const EarningsScreen(),
      ),
      GoRoute(
        path: '/sales',
        name: 'sales',
        builder: (context, state) => const SalesScreen(),
      ),
      GoRoute(
        path: '/cash',
        name: 'cash',
        builder: (context, state) => const CashScreen(),
      ),
      GoRoute(
        path: '/ledger',
        name: 'ledger',
        builder: (context, state) => const LedgerScreen(),
      ),
      GoRoute(
        path: '/expenses',
        name: 'expenses',
        builder: (context, state) => const ExpensesScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/select-business',
        name: 'select-business',
        builder: (context, state) => const SelectBusinessScreen(),
      ),
      GoRoute(
        path: '/settings/business',
        name: 'business-settings',
        builder: (context, state) => const BusinessSettingsScreen(),
      ),
      GoRoute(
        path: '/settings/subscription',
        name: 'subscription',
        builder: (context, state) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: '/staff',
        name: 'staff',
        builder: (context, state) => const StaffListScreen(),
      ),
      GoRoute(
        path: '/staff/new',
        name: 'new-staff',
        builder: (context, state) => const StaffFormScreen(),
      ),
      GoRoute(
        path: '/staff/:id',
        name: 'staff-detail',
        builder: (context, state) =>
            StaffDetailScreen(staffId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/staff/:id/edit',
        name: 'edit-staff',
        builder: (context, state) =>
            StaffFormScreen(staffId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/services',
        name: 'services',
        builder: (context, state) => const ServiceListScreen(),
      ),
      GoRoute(
        path: '/services/new',
        name: 'new-service',
        builder: (context, state) => const ServiceFormScreen(),
      ),
      GoRoute(
        path: '/services/:id',
        name: 'service-detail',
        builder: (context, state) =>
            ServiceDetailScreen(serviceId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/services/:id/edit',
        name: 'edit-service',
        builder: (context, state) =>
            ServiceFormScreen(serviceId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/customers',
        name: 'customers',
        builder: (context, state) => const CustomerListScreen(),
      ),
      GoRoute(
        path: '/customers/new',
        name: 'new-customer',
        builder: (context, state) => const CustomerFormScreen(),
      ),
      GoRoute(
        path: '/customers/:id',
        name: 'customer-detail',
        builder: (context, state) =>
            CustomerDetailScreen(customerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/customers/:id/edit',
        name: 'edit-customer',
        builder: (context, state) =>
            CustomerFormScreen(customerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/appointments',
        name: 'appointments',
        builder: (context, state) => const AppointmentListScreen(),
      ),
      GoRoute(
        path: '/appointments/new',
        name: 'new-appointment',
        builder: (context, state) => AppointmentFormScreen(
          suggestedStartAt: state.uri.queryParameters['startAt'],
        ),
      ),
      GoRoute(
        path: '/appointments/:id',
        name: 'appointment-detail',
        builder: (context, state) =>
            AppointmentDetailScreen(appointmentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/appointments/:id/edit',
        name: 'edit-appointment',
        builder: (context, state) =>
            AppointmentFormScreen(appointmentId: state.pathParameters['id']!),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('Planio')),
      body: const Center(child: Text('Page not found')),
    ),
  );

  ref.listen<AsyncValue<AuthSession>>(
    authControllerProvider,
    (_, _) => router.refresh(),
  );
  ref.onDispose(router.dispose);
  return router;
});
