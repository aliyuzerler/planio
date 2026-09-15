import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/business/data/business_repository.dart';
import 'package:xenior_mobile/features/home/application/dashboard_window.dart';
import 'package:xenior_mobile/features/reports/data/report_repository.dart';
import 'package:xenior_mobile/shared/widgets/appointment_tile.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).value;
    final membership = session?.activeMembership;
    if (membership?.role == 'ACCOUNTANT') {
      return const AccountantHome();
    }
    return OperationsHome(
      membershipName: membership?.businessName,
      showFinanceSummary: membership?.role == 'BUSINESS_OWNER',
    );
  }
}

class AccountantHome extends ConsumerWidget {
  const AccountantHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(financeSummaryProvider);
    return WorkspaceScaffold(
      selectedIndex: 0,
      appBar: AppBar(
        title: const Text('Muhasebe'),
        actions: [
          IconButton(
            tooltip: 'Çıkış yap',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(financeSummaryProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Text(
                'Kasa özeti',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                'Randevu menüsü bu hesapta yoktur. Tahsilat satış listesinden yapılır.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              summary.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text(authErrorMessage(error)),
                data: (report) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.date,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    _SummaryTile(
                      title: 'Günlük tahsilat',
                      value: '${report.collectionsIn} ${report.currency}',
                    ),
                    _SummaryTile(
                      title: 'Günlük gider',
                      value: '${report.expensesOut} ${report.currency}',
                    ),
                    _SummaryTile(
                      title: 'Net',
                      value: '${report.net} ${report.currency}',
                    ),
                    _SummaryTile(
                      title: 'Cari alacak',
                      value:
                          '${report.receivablesTotal} ${report.currency} · ${report.receivableCustomers} müşteri',
                    ),
                    _SummaryTile(
                      title: 'Prim toplamı',
                      value: '${report.commissionTotal} ${report.currency}',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Hesap bakiyeleri',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    for (final account in report.accounts)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(account.name),
                        trailing: Text(
                          '${account.balance} ${report.currency}',
                        ),
                      ),
                  ],
                ),
              ),
              const Divider(height: 32),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.point_of_sale_outlined),
                title: const Text('Satışlar ve tahsilat'),
                onTap: () => context.push('/sales'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.account_balance_wallet_outlined),
                title: const Text('Kasa'),
                onTap: () => context.push('/cash'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.receipt_long_outlined),
                title: const Text('Cari'),
                onTap: () => context.push('/ledger'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.money_off_outlined),
                title: const Text('Giderler'),
                onTap: () => context.push('/expenses'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title),
      trailing: Text(value),
    );
  }
}

class OperationsHome extends ConsumerWidget {
  const OperationsHome({
    super.key,
    required this.membershipName,
    this.showFinanceSummary = false,
  });

  final String? membershipName;
  final bool showFinanceSummary;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membership = ref.watch(authControllerProvider).value?.activeMembership;
    final window = dashboardWindow(DateTime.now());
    final business = ref.watch(businessProfileProvider);
    final summary = showFinanceSummary
        ? ref.watch(financeSummaryProvider)
        : null;
    final today = ref.watch(
      appointmentListProvider(AppointmentListParams(date: window.today)),
    );
    final upcoming = ref.watch(
      appointmentListProvider(
        AppointmentListParams(
          from: window.today,
          to: window.upcomingTo,
          status: 'CONFIRMED',
        ),
      ),
    );

    return WorkspaceScaffold(
      selectedIndex: 0,
      appBar: AppBar(
        title: const Text('Gösterge'),
        actions: [
          IconButton(
            tooltip: 'Çıkış yap',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/appointments/new'),
        icon: const Icon(Icons.add),
        label: const Text('Yeni randevu'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(businessProfileProvider);
            ref.invalidate(appointmentListProvider);
            if (showFinanceSummary) {
              ref.invalidate(financeSummaryProvider);
            }
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              Text(
                membershipName ?? membership?.businessName ?? 'İşletme',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                membership?.role ?? '',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              if (summary != null) ...[
                Text(
                  'Günlük kasa özeti',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                summary.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, _) => Text(authErrorMessage(error)),
                  data: (report) => Column(
                    children: [
                      _SummaryTile(
                        title: 'Tahsilat',
                        value: '${report.collectionsIn} ${report.currency}',
                      ),
                      _SummaryTile(
                        title: 'Gider',
                        value: '${report.expensesOut} ${report.currency}',
                      ),
                      _SummaryTile(
                        title: 'Net',
                        value: '${report.net} ${report.currency}',
                      ),
                      _SummaryTile(
                        title: 'Cari alacak',
                        value:
                            '${report.receivablesTotal} ${report.currency}',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              business.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text(authErrorMessage(error)),
                data: (profile) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'İşletme bilgisi',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(profile.name),
                        Text('${profile.timezone} · ${profile.currency}'),
                        if (profile.phone != null) Text(profile.phone!),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Bugünün randevuları',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              today.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => Text(authErrorMessage(error)),
                data: (page) {
                  if (page.items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('Bugün için randevu yok.'),
                    );
                  }
                  return Column(
                    children: [
                      for (final item in page.items)
                        AppointmentTile(
                          appointment: item,
                          onTap: () => context.push('/appointments/${item.id}'),
                        ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              Text(
                'Yaklaşan randevular',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              upcoming.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => Text(authErrorMessage(error)),
                data: (page) {
                  if (page.items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('Önümüzdeki 14 günde onaylı randevu yok.'),
                    );
                  }
                  return Column(
                    children: [
                      for (final item in page.items.take(8))
                        AppointmentTile(
                          appointment: item,
                          showDate: true,
                          onTap: () => context.push('/appointments/${item.id}'),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
