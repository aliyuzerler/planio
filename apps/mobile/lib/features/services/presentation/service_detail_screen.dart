import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/services/data/service_repository.dart';

class ServiceDetailScreen extends ConsumerWidget {
  const ServiceDetailScreen({super.key, required this.serviceId});
  final String serviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(serviceDetailProvider(serviceId));
    final role = ref
        .watch(authControllerProvider)
        .value
        ?.activeMembership
        ?.role;
    final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';
    return service.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) =>
          Scaffold(body: Center(child: Text(authErrorMessage(error)))),
      data: (item) => Scaffold(
        appBar: AppBar(
          title: Text(item.name),
          actions: [
            if (canManage)
              IconButton(
                tooltip: 'Düzenle',
                onPressed: () => context.push('/services/$serviceId/edit'),
                icon: const Icon(Icons.edit),
              ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (!canManage)
              const Card(
                color: Color(0xFFFFF8E1),
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'STAFF rolü hizmet bilgilerini yalnızca görüntüleyebilir.',
                  ),
                ),
              ),
            ListTile(
              leading: const Icon(Icons.schedule),
              title: Text('${item.durationMinutes} dakika'),
            ),
            ListTile(
              leading: const Icon(Icons.payments),
              title: Text('${item.price} ${item.currency}'),
            ),
            ListTile(
              leading: const Icon(Icons.description),
              title: Text(item.description ?? 'Açıklama yok'),
            ),
            if (canManage)
              SwitchListTile(
                title: const Text('Aktif hizmet'),
                value: item.isActive,
                onChanged: (value) async {
                  try {
                    await ref
                        .read(serviceRepositoryProvider)
                        .setActive(item.id, value);
                    ref.invalidate(serviceListProvider);
                    ref.invalidate(serviceDetailProvider(item.id));
                  } on Object catch (error) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(authErrorMessage(error))),
                      );
                    }
                  }
                },
              ),
          ],
        ),
      ),
    );
  }
}
