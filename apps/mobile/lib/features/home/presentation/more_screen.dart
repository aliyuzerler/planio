import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membership = ref.watch(authControllerProvider).value?.activeMembership;
    return WorkspaceScaffold(
      selectedIndex: 3,
      appBar: AppBar(title: const Text('Daha fazla')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (membership != null)
            ListTile(
              title: Text(membership.businessName),
              subtitle: Text(membership.role),
            ),
          if (membership?.role != 'ACCOUNTANT')
            ListTile(
              leading: const Icon(Icons.workspace_premium),
              title: const Text('Abonelik'),
              onTap: () => context.push('/settings/subscription'),
            ),
          ListTile(
            leading: const Icon(Icons.payments_outlined),
            title: const Text('Hakediş'),
            onTap: () => context.push('/earnings'),
          ),
          if (membership?.role == 'BUSINESS_OWNER' ||
              membership?.role == 'ACCOUNTANT' ||
              membership?.role == 'BUSINESS_ADMIN' ||
              membership?.role == 'STAFF')
            ListTile(
              leading: const Icon(Icons.point_of_sale_outlined),
              title: const Text('Satışlar'),
              onTap: () => context.push('/sales'),
            ),
          if (membership?.role == 'BUSINESS_OWNER' ||
              membership?.role == 'ACCOUNTANT' ||
              membership?.role == 'BUSINESS_ADMIN') ...[
            ListTile(
              leading: const Icon(Icons.account_balance_wallet_outlined),
              title: const Text('Kasa'),
              onTap: () => context.push('/cash'),
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('Cari'),
              onTap: () => context.push('/ledger'),
            ),
            ListTile(
              leading: const Icon(Icons.money_off_outlined),
              title: const Text('Giderler'),
              onTap: () => context.push('/expenses'),
            ),
          ],
          if (membership?.role != 'ACCOUNTANT') ...[
            ListTile(
              leading: const Icon(Icons.people),
              title: const Text('Personel'),
              onTap: () => context.push('/staff'),
            ),
            ListTile(
              leading: const Icon(Icons.design_services),
              title: const Text('Hizmetler'),
              onTap: () => context.push('/services'),
            ),
            ListTile(
              leading: const Icon(Icons.business),
              title: const Text('İşletme ayarları'),
              onTap: () => context.push('/settings/business'),
            ),
          ] else ...[
            ListTile(
              leading: const Icon(Icons.people_alt_outlined),
              title: const Text('Müşteriler'),
              onTap: () => context.push('/customers'),
            ),
            const ListTile(
              title: Text('Muhasebe'),
              subtitle: Text(
                'Kasa özeti gösterge ekranındadır. Satış, kasa, cari, gider ve POS tahsilatı bu menüden açılır.',
              ),
            ),
          ],
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Çıkış yap'),
            onTap: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}
