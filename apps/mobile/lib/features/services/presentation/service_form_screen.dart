import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/services/application/service_models.dart';
import 'package:xenior_mobile/features/services/application/service_validation.dart';
import 'package:xenior_mobile/features/services/data/service_repository.dart';
import 'package:xenior_mobile/features/subscriptions/presentation/subscription_write_gate.dart';

class ServiceFormScreen extends ConsumerWidget {
  const ServiceFormScreen({super.key, this.serviceId});
  final String? serviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editor = serviceId == null
        ? const _ServiceEditor()
        : ref
            .watch(serviceDetailProvider(serviceId!))
            .when(
              loading: () =>
                  const Scaffold(body: Center(child: CircularProgressIndicator())),
              error: (error, _) =>
                  Scaffold(body: Center(child: Text(authErrorMessage(error)))),
              data: (service) =>
                  _ServiceEditor(key: ValueKey(service.id), initial: service),
            );
    return SubscriptionWriteGate(child: editor);
  }
}

class _ServiceEditor extends ConsumerStatefulWidget {
  const _ServiceEditor({super.key, this.initial});
  final ServiceProfile? initial;

  @override
  ConsumerState<_ServiceEditor> createState() => _ServiceEditorState();
}

class _ServiceEditorState extends ConsumerState<_ServiceEditor> {
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final TextEditingController _duration;
  late final TextEditingController _price;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.initial?.name ?? '');
    _description = TextEditingController(
      text: widget.initial?.description ?? '',
    );
    _duration = TextEditingController(
      text: widget.initial == null ? '' : '${widget.initial!.durationMinutes}',
    );
    _price = TextEditingController(text: widget.initial?.price ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _duration.dispose();
    _price.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final price = normalizeServicePrice(_price.text);
    final input = ServiceInput(
      name: _name.text,
      description: _description.text,
      durationMinutes: int.tryParse(_duration.text) ?? 0,
      price: price ?? _price.text,
    );
    final error = validateServiceInput(input);
    if (error != null) {
      _show(error);
      return;
    }
    setState(() => _saving = true);
    try {
      final repository = ref.read(serviceRepositoryProvider);
      final result = widget.initial == null
          ? await repository.create(input)
          : await repository.update(widget.initial!.id, input);
      ref.invalidate(serviceListProvider);
      ref.invalidate(serviceDetailProvider(result.id));
      if (mounted) context.go('/services/${result.id}');
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
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.initial == null ? 'Yeni hizmet' : 'Hizmeti düzenle'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _field('Hizmet adı', _name),
          _field('Süre (dakika)', _duration, keyboard: TextInputType.number),
          _field(
            'Fiyat',
            _price,
            keyboard: const TextInputType.numberWithOptions(decimal: true),
          ),
          _field('Açıklama', _description, maxLines: 4),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Kaydediliyor…' : 'Kaydet'),
          ),
        ],
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
