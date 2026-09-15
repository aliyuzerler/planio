import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/business/application/business_profile.dart';
import 'package:xenior_mobile/features/business/application/business_validation.dart';
import 'package:xenior_mobile/features/business/data/business_repository.dart';

class BusinessSettingsScreen extends ConsumerWidget {
  const BusinessSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(businessProfileProvider);
    return profile.when(
      loading: () => const Scaffold(
        appBar: _SettingsAppBar(),
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        appBar: const _SettingsAppBar(),
        body: Center(child: Text(authErrorMessage(error))),
      ),
      data: (business) =>
          _BusinessForm(key: ValueKey(business.id), business: business),
    );
  }
}

class _BusinessForm extends ConsumerStatefulWidget {
  const _BusinessForm({super.key, required this.business});

  final BusinessProfile business;

  @override
  ConsumerState<_BusinessForm> createState() => _BusinessFormState();
}

class _BusinessFormState extends ConsumerState<_BusinessForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _address;
  late final TextEditingController _timezone;
  late final TextEditingController _currency;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final business = widget.business;
    _name = TextEditingController(text: business.name);
    _phone = TextEditingController(text: business.phone ?? '');
    _email = TextEditingController(text: business.email ?? '');
    _address = TextEditingController(text: business.address ?? '');
    _timezone = TextEditingController(text: business.timezone);
    _currency = TextEditingController(text: business.currency);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
    _timezone.dispose();
    _currency.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final input = UpdateBusinessInput(
      name: _name.text,
      phone: _phone.text,
      email: _email.text,
      address: _address.text,
      timezone: _timezone.text,
      currency: _currency.text.toUpperCase(),
    );
    final validationError = validateBusinessInput(input);
    if (validationError != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(validationError)));
      return;
    }

    setState(() => _saving = true);
    try {
      await ref.read(businessRepositoryProvider).updateProfile(input);
      ref.invalidate(businessProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('İşletme bilgileri kaydedildi.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(authErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider).value;
    final readOnly = session?.activeMembership?.role == 'STAFF';

    return Scaffold(
      appBar: const _SettingsAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (readOnly)
                      const Card(
                        color: Color(0xFFFFF8E1),
                        child: Padding(
                          padding: EdgeInsets.all(12),
                          child: Text(
                            'STAFF rolü bu bilgileri yalnızca görüntüleyebilir.',
                          ),
                        ),
                      ),
                    _field('İşletme adı', _name, enabled: !readOnly),
                    _field(
                      'Telefon',
                      _phone,
                      enabled: !readOnly,
                      keyboardType: TextInputType.phone,
                    ),
                    _field(
                      'E-posta',
                      _email,
                      enabled: !readOnly,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    _field('Adres', _address, enabled: !readOnly, maxLines: 3),
                    _field('Saat dilimi', _timezone, enabled: !readOnly),
                    _field(
                      'Para birimi',
                      _currency,
                      enabled: !readOnly,
                      maxLength: 3,
                    ),
                    const SizedBox(height: 8),
                    if (!readOnly)
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(
                          _saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    required bool enabled,
    TextInputType? keyboardType,
    int maxLines = 1,
    int? maxLength,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        maxLines: maxLines,
        maxLength: maxLength,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }
}

class _SettingsAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const _SettingsAppBar();

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).value;
    final memberships = session?.selectableMemberships ?? const [];
    return AppBar(
      title: const Text('İşletme ayarları'),
      actions: [
        if (memberships.length > 1)
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: session?.selectedBusinessId,
              items: memberships
                  .map(
                    (membership) => DropdownMenuItem(
                      value: membership.businessId,
                      child: Text(membership.businessName),
                    ),
                  )
                  .toList(),
              onChanged: (businessId) async {
                if (businessId != null) {
                  await ref
                      .read(authControllerProvider.notifier)
                      .selectBusiness(businessId);
                }
              },
            ),
          ),
        const SizedBox(width: 12),
      ],
    );
  }
}
