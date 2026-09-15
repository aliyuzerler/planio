import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/ledger/data/ledger_repository.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class LedgerScreen extends ConsumerWidget {
  const LedgerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customers = ref.watch(ledgerCustomersProvider);
    return WorkspaceScaffold(
      selectedIndex: 3,
      appBar: AppBar(title: const Text('Cari')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(ledgerCustomersProvider.future),
        child: customers.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(authErrorMessage(error)),
              ),
            ],
          ),
          data: (items) => items.isEmpty
              ? ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('Henüz müşteri yok.'),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item.name),
                      subtitle: Text('${item.ledgerBalance} TRY'),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
