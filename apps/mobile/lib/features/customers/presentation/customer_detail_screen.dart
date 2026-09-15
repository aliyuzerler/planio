import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/customers/data/customer_repository.dart';

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({super.key, required this.customerId});

  final String customerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(customerDetailProvider(customerId));
    final history = ref.watch(customerAppointmentsProvider(customerId));
    final role = ref
        .watch(authControllerProvider)
        .value
        ?.activeMembership
        ?.role;
    final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';

    return customer.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) =>
          Scaffold(body: Center(child: Text(authErrorMessage(error)))),
      data: (person) => Scaffold(
        appBar: AppBar(
          title: Text(person.fullName),
          actions: [
            if (canManage)
              IconButton(
                tooltip: 'Düzenle',
                onPressed: () => context.push('/customers/$customerId/edit'),
                icon: const Icon(Icons.edit),
              ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () => Future.wait([
            ref.refresh(customerDetailProvider(customerId).future),
            ref.refresh(customerAppointmentsProvider(customerId).future),
          ]),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              if (!canManage)
                Card(
                  color: const Color(0xFFFFF8E1),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      role == 'ACCOUNTANT'
                          ? 'Muhasebe rolü müşteri kartını görüntüleyebilir; düzenleyemez.'
                          : 'STAFF rolü müşteri bilgilerini yalnızca görüntüleyebilir.',
                    ),
                  ),
                ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.account_balance_wallet_outlined),
                title: Text(person.ledgerLabel),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.phone),
                title: Text(person.phone ?? 'Telefon bilgisi yok'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.email),
                title: Text(person.email ?? 'E-posta bilgisi yok'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.cake),
                title: Text(person.birthDate ?? 'Doğum tarihi yok'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.notes),
                title: Text(person.notes ?? 'Not yok'),
              ),
              if (canManage)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Aktif müşteri'),
                  value: person.isActive,
                  onChanged: (value) =>
                      _setActive(context, ref, person.id, value),
                ),
              const Divider(height: 32),
              const Text(
                'Randevu geçmişi',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'Yalnızca gerçek randevular listelenir. Randevu oluşturma henüz açık değildir.',
              ),
              const SizedBox(height: 12),
              history.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text(authErrorMessage(error)),
                data: (page) {
                  if (page.items.isEmpty) {
                    return const Text(
                      'Bu müşteri için henüz randevu kaydı yok.',
                    );
                  }
                  return Column(
                    children: [
                      for (final appointment in page.items)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(appointment.serviceNameSnapshot),
                          subtitle: Text(
                            '${appointment.startAt.toLocal()} · ${appointment.staffName}\n'
                            '${appointment.servicePriceSnapshot} ${appointment.currency} · ${appointment.status}',
                          ),
                          isThreeLine: true,
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

  Future<void> _setActive(
    BuildContext context,
    WidgetRef ref,
    String id,
    bool value,
  ) async {
    try {
      await ref.read(customerRepositoryProvider).setActive(id, value);
      ref.invalidate(customerListProvider);
      ref.invalidate(customerDetailProvider(id));
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(authErrorMessage(error))));
      }
    }
  }
}
