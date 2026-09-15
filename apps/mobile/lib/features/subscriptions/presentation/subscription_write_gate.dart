import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/subscriptions/data/subscription_repository.dart';

class SubscriptionWriteGate extends ConsumerWidget {
  const SubscriptionWriteGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(subscriptionAccessProvider)
        .when(
          loading: () =>
              const Scaffold(body: Center(child: CircularProgressIndicator())),
          error: (error, _) => Scaffold(
            appBar: AppBar(title: const Text('Lisans')),
            body: Center(child: Text(authErrorMessage(error))),
          ),
          data: (access) {
            if (access.hasAccess) return child;
            return Scaffold(
              appBar: AppBar(title: const Text('Lisans')),
              body: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'İşletme lisansının süresi doldu. Yazma ekranları kilitli.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.go('/settings/subscription'),
                      child: const Text('Abonelik sayfası'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
  }
}
