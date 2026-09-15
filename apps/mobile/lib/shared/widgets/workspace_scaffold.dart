import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';

class WorkspaceScaffold extends ConsumerWidget {
  const WorkspaceScaffold({
    super.key,
    required this.selectedIndex,
    required this.body,
    this.appBar,
    this.floatingActionButton,
  });

  final int selectedIndex;
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).value?.activeMembership?.role;
    final accountant = role == 'ACCOUNTANT';
    final destinations = accountant
        ? const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Gösterge',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_alt_outlined),
              selectedIcon: Icon(Icons.people_alt),
              label: 'Müşteriler',
            ),
            NavigationDestination(
              icon: Icon(Icons.more_horiz),
              label: 'Daha fazla',
            ),
          ]
        : const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Gösterge',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: 'Randevular',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_alt_outlined),
              selectedIcon: Icon(Icons.people_alt),
              label: 'Müşteriler',
            ),
            NavigationDestination(
              icon: Icon(Icons.more_horiz),
              label: 'Daha fazla',
            ),
          ];
    final index = accountant
        ? (selectedIndex == 0
            ? 0
            : selectedIndex == 2
            ? 1
            : 2)
        : selectedIndex.clamp(0, 3);

    return Scaffold(
      appBar: appBar,
      floatingActionButton: accountant ? null : floatingActionButton,
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) {
          if (accountant) {
            if (value == 0) context.go('/');
            if (value == 1) context.go('/customers');
            if (value == 2) context.go('/more');
            return;
          }
          switch (value) {
            case 0:
              context.go('/');
            case 1:
              context.go('/appointments');
            case 2:
              context.go('/customers');
            case 3:
              context.go('/more');
          }
        },
        destinations: destinations,
      ),
    );
  }
}
