import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/staff/application/staff_models.dart';
import 'package:xenior_mobile/features/staff/application/staff_validation.dart';
import 'package:xenior_mobile/features/staff/data/staff_repository.dart';
import 'package:xenior_mobile/features/subscriptions/presentation/subscription_write_gate.dart';

class StaffFormScreen extends ConsumerWidget {
  const StaffFormScreen({super.key, this.staffId});

  final String? staffId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editor = staffId == null
        ? const _StaffEditor()
        : ref
            .watch(staffDetailProvider(staffId!))
            .when(
              loading: () =>
                  const Scaffold(body: Center(child: CircularProgressIndicator())),
              error: (error, _) =>
                  Scaffold(body: Center(child: Text(authErrorMessage(error)))),
              data: (staff) =>
                  _StaffEditor(key: ValueKey(staff.id), initial: staff),
            );
    return SubscriptionWriteGate(child: editor);
  }
}

class _StaffEditor extends ConsumerStatefulWidget {
  const _StaffEditor({super.key, this.initial});

  final StaffProfile? initial;

  @override
  ConsumerState<_StaffEditor> createState() => _StaffEditorState();
}

class _StaffEditorState extends ConsumerState<_StaffEditor> {
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _notes;
  final Set<String> _specializationIds = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController(text: widget.initial?.firstName ?? '');
    _lastName = TextEditingController(text: widget.initial?.lastName ?? '');
    _phone = TextEditingController(text: widget.initial?.phone ?? '');
    _email = TextEditingController(text: widget.initial?.email ?? '');
    _notes = TextEditingController(text: widget.initial?.notes ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _email.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final input = StaffInput(
      firstName: _firstName.text,
      lastName: _lastName.text,
      phone: _phone.text,
      email: _email.text,
      notes: _notes.text,
      specializationIds: _specializationIds.toList(),
    );
    final validationError = validateStaffInput(input);
    if (validationError != null) {
      _show(validationError);
      return;
    }
    setState(() => _saving = true);
    try {
      final repository = ref.read(staffRepositoryProvider);
      final result = widget.initial == null
          ? await repository.createStaff(input)
          : await repository.updateStaff(widget.initial!.id, input);
      ref.invalidate(staffListProvider);
      ref.invalidate(staffDetailProvider(result.id));
      if (mounted) context.go('/staff/${result.id}');
    } on Object catch (error) {
      if (mounted) _show(authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final specializations = ref.watch(staffSpecializationsProvider);
    final isCreate = widget.initial == null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isCreate ? 'Yeni personel' : 'Personeli düzenle'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _field('Ad', _firstName),
            _field('Soyad', _lastName),
            _field('Telefon', _phone, keyboard: TextInputType.phone),
            _field('E-posta', _email, keyboard: TextInputType.emailAddress),
            _field('Notlar', _notes, maxLines: 4),
            if (isCreate)
              specializations.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, _) => const Text('Uzmanlıklar yüklenemedi.'),
                data: (items) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Uzmanlıklar',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    for (final item in items.where((item) => item.isActive))
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(item.name),
                        value: _specializationIds.contains(item.id),
                        onChanged: (selected) => setState(() {
                          if (selected ?? false) {
                            _specializationIds.add(item.id);
                          } else {
                            _specializationIds.remove(item.id);
                          }
                        }),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Kaydediliyor…' : 'Kaydet'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    TextInputType? keyboard,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        keyboardType: keyboard,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }
}
