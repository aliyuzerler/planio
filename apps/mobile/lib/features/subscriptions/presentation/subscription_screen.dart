import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/subscriptions/application/subscription_models.dart';
import 'package:xenior_mobile/features/subscriptions/data/subscription_repository.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(subscriptionAccessProvider);
    final current = ref.watch(currentSubscriptionProvider);
    final plans = ref.watch(subscriptionPlansProvider);

    return WorkspaceScaffold(
      selectedIndex: 3,
      appBar: AppBar(title: const Text('Abonelik')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          access.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Text(authErrorMessage(error)),
            data: (value) => Card(
              child: ListTile(
                title: Text(
                  value.hasAccess ? 'Lisans açık' : 'Lisans kilitli',
                ),
                subtitle: Text(subscriptionStatusLabel(value.status)),
              ),
            ),
          ),
          const SizedBox(height: 12),
          current.when(
            loading: () => const SizedBox.shrink(),
            error: (error, _) => Text(authErrorMessage(error)),
            data: (subscription) {
              if (subscription == null) {
                return const ListTile(
                  title: Text('Aktif abonelik yok'),
                );
              }
              return Card(
                child: ListTile(
                  title: Text(subscription.plan.name),
                  subtitle: Text(
                    '${billingPeriodLabel(subscription.plan.billingPeriod)} · ${subscription.plan.price} ${subscription.plan.currency}',
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          const Text('Kullanılabilir planlar', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          plans.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Text(authErrorMessage(error)),
            data: (items) => Column(
              children: items
                  .map(
                    (plan) => ListTile(
                      title: Text(
                        '${plan.name} · ${billingPeriodLabel(plan.billingPeriod)}',
                      ),
                      subtitle: Text('${plan.price} ${plan.currency}'),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Ödeme web panelinden yapılır. Süre bitince randevu oluşturma kilitlenir.',
          ),
        ],
      ),
    );
  }
}
