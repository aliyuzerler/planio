import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/staff/data/staff_repository.dart';

class StaffListScreen extends ConsumerStatefulWidget {
  const StaffListScreen({super.key});

  @override
  ConsumerState<StaffListScreen> createState() => _StaffListScreenState();
}

class _StaffListScreenState extends ConsumerState<StaffListScreen> {
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
    final staff = ref.watch(staffListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Personel')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/staff/new'),
              icon: const Icon(Icons.person_add),
              label: const Text('Yeni personel'),
            )
          : null,
      body: SafeArea(
        child: staff.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text(authErrorMessage(error))),
          data: (items) {
            final query = _query.trim().toLowerCase();
            final filtered = items.where((person) {
              if (_activeOnly && !person.isActive) return false;
              return query.isEmpty ||
                  person.fullName.toLowerCase().contains(query) ||
                  (person.phone?.toLowerCase().contains(query) ?? false) ||
                  (person.email?.toLowerCase().contains(query) ?? false);
            }).toList();
            return RefreshIndicator(
              onRefresh: () => ref.refresh(staffListProvider.future),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Personel ara',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) => setState(() => _query = value),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Yalnızca aktif personel'),
                    value: _activeOnly,
                    onChanged: (value) => setState(() => _activeOnly = value),
                  ),
                  for (final person in filtered)
                    Card(
                      child: ListTile(
                        title: Text(person.fullName),
                        subtitle: Text(
                          person.specializations
                              .map((item) => item.name)
                              .join(', '),
                        ),
                        trailing: Chip(
                          label: Text(person.isActive ? 'Aktif' : 'Pasif'),
                        ),
                        onTap: () => context.push('/staff/${person.id}'),
                      ),
                    ),
                  if (filtered.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('Personel bulunamadı.')),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
