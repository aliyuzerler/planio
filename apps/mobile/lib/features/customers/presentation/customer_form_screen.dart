import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/customers/application/customer_models.dart';
import 'package:xenior_mobile/features/customers/application/customer_validation.dart';
import 'package:xenior_mobile/features/customers/data/customer_repository.dart';
import 'package:xenior_mobile/features/subscriptions/presentation/subscription_write_gate.dart';

class CustomerFormScreen extends ConsumerWidget {
  const CustomerFormScreen({super.key, this.customerId});

  final String? customerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editor = customerId == null
        ? const _CustomerEditor()
        : ref
            .watch(customerDetailProvider(customerId!))
            .when(
              loading: () =>
                  const Scaffold(body: Center(child: CircularProgressIndicator())),
              error: (error, _) =>
                  Scaffold(body: Center(child: Text(authErrorMessage(error)))),
              data: (customer) =>
                  _CustomerEditor(key: ValueKey(customer.id), initial: customer),
            );
    return SubscriptionWriteGate(child: editor);
  }
}

class _CustomerEditor extends ConsumerStatefulWidget {
  const _CustomerEditor({super.key, this.initial});

  final CustomerProfile? initial;

  @override
  ConsumerState<_CustomerEditor> createState() => _CustomerEditorState();
}

class _CustomerEditorState extends ConsumerState<_CustomerEditor> {
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _birthDate;
  late final TextEditingController _notes;
  bool _smsConsent = true;
  bool _whatsappConsent = true;
  bool _emailConsent = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController(text: widget.initial?.firstName ?? '');
    _lastName = TextEditingController(text: widget.initial?.lastName ?? '');
    _phone = TextEditingController(text: widget.initial?.phone ?? '');
    _email = TextEditingController(text: widget.initial?.email ?? '');
    _birthDate = TextEditingController(text: widget.initial?.birthDate ?? '');
    _notes = TextEditingController(text: widget.initial?.notes ?? '');
    _smsConsent = widget.initial?.smsConsent ?? true;
    _whatsappConsent = widget.initial?.whatsappConsent ?? true;
    _emailConsent = widget.initial?.emailConsent ?? true;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _email.dispose();
    _birthDate.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final input = CustomerInput(
      firstName: _firstName.text,
      lastName: _lastName.text,
      phone: _phone.text,
      email: _email.text,
      birthDate: _birthDate.text,
      notes: _notes.text,
      smsConsent: _smsConsent,
      whatsappConsent: _whatsappConsent,
      emailConsent: _emailConsent,
    );
    final validationError = validateCustomerInput(input);
    if (validationError != null) {
      _show(validationError);
      return;
    }
    setState(() => _saving = true);
    try {
      final repository = ref.read(customerRepositoryProvider);
      final result = widget.initial == null
          ? await repository.createCustomer(input)
          : await repository.updateCustomer(widget.initial!.id, input);
      ref.invalidate(customerListProvider);
      ref.invalidate(customerDetailProvider(result.id));
      if (mounted) context.go('/customers/${result.id}');
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
    final isCreate = widget.initial == null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isCreate ? 'Yeni müşteri' : 'Müşteriyi düzenle'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _field('Ad', _firstName),
            _field('Soyad', _lastName),
            _field('Telefon', _phone, keyboard: TextInputType.phone),
            _field('E-posta', _email, keyboard: TextInputType.emailAddress),
            _field(
              'Doğum tarihi',
              _birthDate,
              keyboard: TextInputType.datetime,
              hint: 'YYYY-MM-AA',
            ),
            _field('Notlar', _notes, maxLines: 4),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('SMS rızası'),
              value: _smsConsent,
              onChanged: (value) =>
                  setState(() => _smsConsent = value ?? true),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('WhatsApp rızası'),
              value: _whatsappConsent,
              onChanged: (value) =>
                  setState(() => _whatsappConsent = value ?? true),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('E-posta rızası'),
              value: _emailConsent,
              onChanged: (value) =>
                  setState(() => _emailConsent = value ?? true),
            ),
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
    String? hint,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        keyboardType: keyboard,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }
}
