import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/staff/application/staff_models.dart';
import 'package:xenior_mobile/features/staff/application/staff_validation.dart';
import 'package:xenior_mobile/features/staff/data/staff_repository.dart';

class StaffDetailScreen extends ConsumerWidget {
  const StaffDetailScreen({super.key, required this.staffId});

  final String staffId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staff = ref.watch(staffDetailProvider(staffId));
    final role = ref
        .watch(authControllerProvider)
        .value
        ?.activeMembership
        ?.role;
    final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';
    return staff.when(
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
                onPressed: () => context.push('/staff/$staffId/edit'),
                icon: const Icon(Icons.edit),
              ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () => ref.refresh(staffDetailProvider(staffId).future),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              if (!canManage)
                const Card(
                  color: Color(0xFFFFF8E1),
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: Text(
                      'STAFF rolü personel bilgilerini yalnızca görüntüleyebilir.',
                    ),
                  ),
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
                leading: const Icon(Icons.notes),
                title: Text(person.notes ?? 'Not yok'),
              ),
              if (canManage)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Aktif personel'),
                  value: person.isActive,
                  onChanged: (value) =>
                      _setActive(context, ref, person.id, value),
                ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Uzmanlıklar',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  if (canManage)
                    TextButton.icon(
                      onPressed: () => _showSpecialties(context, ref, person),
                      icon: const Icon(Icons.add),
                      label: const Text('Ata'),
                    ),
                ],
              ),
              Wrap(
                spacing: 8,
                children: [
                  for (final specialty in person.specializations)
                    InputChip(
                      label: Text(
                        '${specialty.name}${specialty.isActive ? '' : ' (pasif)'}',
                      ),
                      onDeleted: canManage
                          ? () =>
                                _unassign(context, ref, person.id, specialty.id)
                          : null,
                    ),
                ],
              ),
              if (person.specializations.isEmpty)
                const Text('Uzmanlık atanmamış.'),
              if (canManage)
                TextButton(
                  onPressed: () => _createSpecialty(context, ref, person.id),
                  child: const Text('Yeni uzmanlık oluştur ve ata'),
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
      await ref.read(staffRepositoryProvider).setActive(id, value);
      ref.invalidate(staffListProvider);
      ref.invalidate(staffDetailProvider(id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _unassign(
    BuildContext context,
    WidgetRef ref,
    String id,
    String specializationId,
  ) async {
    try {
      await ref
          .read(staffRepositoryProvider)
          .unassignSpecialization(id, specializationId);
      ref.invalidate(staffDetailProvider(id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _showSpecialties(
    BuildContext context,
    WidgetRef ref,
    StaffProfile person,
  ) async {
    final catalog = await ref.read(staffSpecializationsProvider.future);
    final assignedIds = person.specializations.map((item) => item.id).toSet();
    final available = catalog
        .where((item) => item.isActive && !assignedIds.contains(item.id))
        .toList();
    if (!context.mounted) return;
    final selected = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Uzmanlık ata'),
        children: [
          for (final item in available)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, item.id),
              child: Text(item.name),
            ),
          if (available.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Atanabilecek aktif uzmanlık yok.'),
            ),
        ],
      ),
    );
    if (selected == null) return;
    try {
      await ref
          .read(staffRepositoryProvider)
          .assignSpecialization(person.id, selected);
      ref.invalidate(staffDetailProvider(person.id));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  Future<void> _createSpecialty(
    BuildContext context,
    WidgetRef ref,
    String staffId,
  ) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yeni uzmanlık'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Uzmanlık adı'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Oluştur'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name == null) return;
    final validation = validateSpecializationName(name);
    if (validation != null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(validation)));
      }
      return;
    }
    try {
      final repository = ref.read(staffRepositoryProvider);
      final specialization = await repository.createSpecialization(name);
      await repository.assignSpecialization(staffId, specialization.id);
      ref.invalidate(staffSpecializationsProvider);
      ref.invalidate(staffDetailProvider(staffId));
    } on Object catch (error) {
      if (context.mounted) _showError(context, error);
    }
  }

  void _showError(BuildContext context, Object error) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(authErrorMessage(error))));
  }
}
