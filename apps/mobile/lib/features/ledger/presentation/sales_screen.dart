import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/ledger/data/ledger_repository.dart';
import 'package:xenior_mobile/shared/widgets/confirm_action.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sales = ref.watch(salesProvider);
    final role = ref.watch(
      authControllerProvider.select(
        (auth) => auth.value?.activeMembership?.role,
      ),
    );
    final canPos = role == 'BUSINESS_OWNER' || role == 'ACCOUNTANT';
    return WorkspaceScaffold(
      selectedIndex: 3,
      appBar: AppBar(title: const Text('Satışlar')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(salesProvider.future),
        child: sales.when(
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
                      child: Text('Henüz satış yok.'),
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
                      title: Text(
                        '${item.customerName} · ${item.serviceName}',
                      ),
                      subtitle: Text(
                        '${item.totalAmount} ${item.currency} · kalan ${item.remainingAmount}${item.receiptNo != null ? ' · fiş ${item.receiptNo}' : ''}',
                      ),
                      trailing: canPos && item.remainingAmount != '0.00'
                          ? TextButton(
                              onPressed: () async {
                                final confirmed = await confirmAction(
                                  context,
                                  title: 'POS tahsilatı',
                                  message:
                                      'Kalan ${item.remainingAmount} ${item.currency} POS olarak işaretlenecek.',
                                );
                                if (!confirmed) return;
                                try {
                                  await ref
                                      .read(ledgerRepositoryProvider)
                                      .collectPos(
                                        item.id,
                                        item.remainingAmount,
                                      );
                                  ref.invalidate(salesProvider);
                                } on Object catch (error) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(authErrorMessage(error)),
                                      ),
                                    );
                                  }
                                }
                              },
                              child: const Text('POS'),
                            )
                          : null,
                    );
                  },
                ),
        ),
      ),
    );
  }
}
