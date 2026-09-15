import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/commissions/data/commission_repository.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = ref.watch(commissionEntriesProvider);
    return WorkspaceScaffold(
      selectedIndex: 3,
      appBar: AppBar(title: const Text('Hakediş')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(commissionEntriesProvider.future),
        child: entries.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(authErrorMessage(error)),
              ),
            ],
          ),
          data: (page) => page.items.isEmpty
              ? ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('Henüz prim satırı yok.'),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: page.items.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, index) {
                    final item = page.items[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${item.serviceName} · ${item.amount} ${item.currency}'),
                      subtitle: Text(
                        '${item.staffName} · ${item.ruleName}',
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
