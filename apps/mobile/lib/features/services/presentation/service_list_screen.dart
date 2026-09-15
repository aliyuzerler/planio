import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/services/data/service_repository.dart';

class ServiceListScreen extends ConsumerStatefulWidget {
  const ServiceListScreen({super.key});

  @override
  ConsumerState<ServiceListScreen> createState() => _ServiceListScreenState();
}

class _ServiceListScreenState extends ConsumerState<ServiceListScreen> {
  String _query = '';
  bool _activeOnly = true;

  @override
  Widget build(BuildContext context) {
    final role = ref
        .watch(authControllerProvider)
        .value
        ?.activeMembership
        ?.role;
    final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';
    final services = ref.watch(serviceListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Hizmetler')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/services/new'),
              icon: const Icon(Icons.add),
              label: const Text('Yeni hizmet'),
            )
          : null,
      body: services.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(authErrorMessage(error))),
        data: (items) {
          final query = _query.trim().toLowerCase();
          final filtered = items.where((item) {
            if (_activeOnly && !item.isActive) return false;
            return query.isEmpty ||
                item.name.toLowerCase().contains(query) ||
                (item.description?.toLowerCase().contains(query) ?? false);
          }).toList();
          return RefreshIndicator(
            onRefresh: () => ref.refresh(serviceListProvider.future),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Hizmet ara',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) => setState(() => _query = value),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Yalnızca aktif hizmetler'),
                  value: _activeOnly,
                  onChanged: (value) => setState(() => _activeOnly = value),
                ),
                for (final item in filtered)
                  Card(
                    child: ListTile(
                      title: Text(item.name),
                      subtitle: Text(
                        '${item.durationMinutes} dk · ${item.price} ${item.currency}',
                      ),
                      trailing: Chip(
                        label: Text(item.isActive ? 'Aktif' : 'Pasif'),
                      ),
                      onTap: () => context.push('/services/${item.id}'),
                    ),
                  ),
                if (filtered.isEmpty)
                  const Center(child: Text('Hizmet bulunamadı.')),
              ],
            ),
          );
        },
      ),
    );
  }
}
