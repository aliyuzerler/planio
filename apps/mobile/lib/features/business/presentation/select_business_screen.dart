import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';

class SelectBusinessScreen extends ConsumerWidget {
  const SelectBusinessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memberships =
        ref.watch(authControllerProvider).value?.selectableMemberships ??
        const [];
    return Scaffold(
      appBar: AppBar(title: const Text('İşletme seçin')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text('İşlem yapmak istediğiniz aktif işletmeyi seçin.'),
          const SizedBox(height: 16),
          for (final membership in memberships)
            Card(
              child: ListTile(
                title: Text(membership.businessName),
                subtitle: Text(membership.role),
                onTap: () async {
                  final selected = await ref
                      .read(authControllerProvider.notifier)
                      .selectBusiness(membership.businessId);
                  if (selected && context.mounted) {
                    context.go('/settings/business');
                  }
                },
              ),
            ),
          if (memberships.isEmpty)
            const Text('Erişilebilir aktif işletme bulunamadı.'),
        ],
      ),
    );
  }
}
