import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_validation.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/campaigns/application/price_quote.dart';
import 'package:xenior_mobile/features/campaigns/data/campaign_repository.dart';
import 'package:xenior_mobile/features/customers/application/customer_models.dart';
import 'package:xenior_mobile/features/customers/data/customer_repository.dart';
import 'package:xenior_mobile/features/resources/data/resource_repository.dart';
import 'package:xenior_mobile/features/services/data/service_repository.dart';
import 'package:xenior_mobile/features/staff/data/staff_repository.dart';

import 'package:xenior_mobile/features/subscriptions/presentation/subscription_write_gate.dart';

class AppointmentFormScreen extends ConsumerWidget {
  const AppointmentFormScreen({
    super.key,
    this.appointmentId,
    this.suggestedStartAt,
  });

  final String? appointmentId;
  final String? suggestedStartAt;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editor = appointmentId == null
        ? _AppointmentEditor(suggestedStartAt: suggestedStartAt)
        : ref
            .watch(appointmentDetailProvider(appointmentId!))
            .when(
              loading: () =>
                  const Scaffold(body: Center(child: CircularProgressIndicator())),
              error: (error, _) =>
                  Scaffold(body: Center(child: Text(authErrorMessage(error)))),
              data: (appointment) => _AppointmentEditor(
                key: ValueKey(appointment.id),
                initial: appointment,
                suggestedStartAt: suggestedStartAt,
              ),
            );
    return SubscriptionWriteGate(child: editor);
  }
}

class _AppointmentEditor extends ConsumerStatefulWidget {
  const _AppointmentEditor({super.key, this.initial, this.suggestedStartAt});

  final AppointmentRecord? initial;
  final String? suggestedStartAt;

  @override
  ConsumerState<_AppointmentEditor> createState() => _AppointmentEditorState();
}

class _AppointmentEditorState extends ConsumerState<_AppointmentEditor> {
  String? _customerId;
  String? _staffId;
  String? _serviceId;
  String? _resourceId;
  String _paymentPlan = 'ON_DAY';
  final TextEditingController _deposit = TextEditingController();
  DateTime _startAt = DateTime.now().add(const Duration(hours: 1));
  final TextEditingController _notes = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _customerId = widget.initial?.customer.id;
    _staffId = widget.initial?.staff.id;
    _serviceId = widget.initial?.serviceId;
    _resourceId = widget.initial?.resourceId;
    final suggested = widget.suggestedStartAt == null
        ? null
        : DateTime.tryParse(widget.suggestedStartAt!);
    _startAt =
        widget.initial?.startAt.toLocal() ?? suggested?.toLocal() ?? _startAt;
    _notes.text = widget.initial?.notes ?? '';
    _paymentPlan = widget.initial?.paymentPlan ?? 'ON_DAY';
    _deposit.text = widget.initial?.depositAmount ?? '';
  }

  @override
  void dispose() {
    _notes.dispose();
    _deposit.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final input = AppointmentInput(
      customerId: _customerId ?? '',
      staffId: _staffId ?? '',
      serviceId: _serviceId ?? '',
      startAt: _startAt.toUtc().toIso8601String(),
      notes: _notes.text,
      resourceId: _resourceId,
      paymentPlan: widget.initial == null ? _paymentPlan : 'ON_DAY',
      depositAmount: _paymentPlan == 'DEPOSIT' ? _deposit.text.trim() : null,
    );
    final validation = validateAppointmentInput(input);
    if (validation != null) {
      _show(validation);
      return;
    }
    setState(() => _saving = true);
    try {
      final repository = ref.read(appointmentRepositoryProvider);
      final result = widget.initial == null
          ? await repository.createAppointment(input)
          : await repository.rescheduleAppointment(widget.initial!.id, input);
      ref.invalidate(appointmentListProvider);
      ref.invalidate(appointmentDetailProvider(result.id));
      if (mounted) context.go('/appointments/${result.id}');
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
    final customers = ref.watch(
      customerListProvider(const CustomerListParams(isActive: true)),
    );
    final staff = ref.watch(staffListProvider);
    final services = ref.watch(serviceListProvider);
    final resources = ref.watch(resourceListProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.initial == null ? 'Yeni randevu' : 'Randevuyu yeniden planla',
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            customers.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(authErrorMessage(error)),
              data: (page) => DropdownButtonFormField<String>(
                initialValue: _customerId,
                decoration: const InputDecoration(labelText: 'Müşteri'),
                items: [
                  for (final item in page.items)
                    DropdownMenuItem(
                      value: item.id,
                      child: Text(item.fullName),
                    ),
                ],
                onChanged: (value) => setState(() => _customerId = value),
              ),
            ),
            const SizedBox(height: 12),
            staff.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(authErrorMessage(error)),
              data: (items) => DropdownButtonFormField<String>(
                initialValue: _staffId,
                decoration: const InputDecoration(labelText: 'Personel'),
                items: [
                  for (final item in items.where((item) => item.isActive))
                    DropdownMenuItem(
                      value: item.id,
                      child: Text(item.fullName),
                    ),
                ],
                onChanged: (value) => setState(() => _staffId = value),
              ),
            ),
            const SizedBox(height: 12),
            services.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(authErrorMessage(error)),
              data: (items) => DropdownButtonFormField<String>(
                initialValue: _serviceId,
                decoration: const InputDecoration(labelText: 'Hizmet'),
                items: [
                  for (final item in items.where((item) => item.isActive))
                    DropdownMenuItem(value: item.id, child: Text(item.name)),
                ],
                onChanged: (value) => setState(() => _serviceId = value),
              ),
            ),
            const SizedBox(height: 12),
            resources.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(authErrorMessage(error)),
              data: (items) => DropdownButtonFormField<String?>(
                initialValue: _resourceId,
                decoration: const InputDecoration(labelText: 'Kaynak (isteğe bağlı)'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Kaynak yok'),
                  ),
                  for (final item in items.where((item) => item.isActive))
                    DropdownMenuItem(
                      value: item.id,
                      child: Text(item.name),
                    ),
                ],
                onChanged: (value) => setState(() => _resourceId = value),
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Başlangıç'),
              subtitle: Text(_startAt.toString()),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _startAt,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2040),
                );
                if (date == null || !context.mounted) return;
                final time = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.fromDateTime(_startAt),
                );
                if (time == null) return;
                setState(() {
                  _startAt = DateTime(
                    date.year,
                    date.month,
                    date.day,
                    time.hour,
                    time.minute,
                  );
                });
              },
            ),
            if (_serviceId != null)
              ref
                  .watch(
                    priceQuoteProvider(
                      PriceQuoteParams(
                        serviceId: _serviceId!,
                        at: _startAt.toUtc().toIso8601String(),
                      ),
                    ),
                  )
                  .when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, _) => const SizedBox.shrink(),
                    data: (quote) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        quote.hasDiscount
                            ? 'Kampanya: ${quote.campaignName} · Liste ${quote.listPrice} ${quote.currency} · İndirim ${quote.discountAmount} · Ödenecek ${quote.payableAmount} ${quote.currency}'
                            : 'Ücret: ${quote.payableAmount} ${quote.currency}',
                      ),
                    ),
                  ),
            if (widget.initial == null) ...[
              const SizedBox(height: 12),
              const Text('Ödeme planı'),
              RadioListTile<String>(
                title: const Text('Gününde'),
                value: 'ON_DAY',
                groupValue: _paymentPlan,
                onChanged: (value) =>
                    setState(() => _paymentPlan = value ?? 'ON_DAY'),
              ),
              RadioListTile<String>(
                title: const Text('Kapora'),
                value: 'DEPOSIT',
                groupValue: _paymentPlan,
                onChanged: (value) =>
                    setState(() => _paymentPlan = value ?? 'DEPOSIT'),
              ),
              RadioListTile<String>(
                title: const Text('Tamamı peşin'),
                value: 'FULL',
                groupValue: _paymentPlan,
                onChanged: (value) =>
                    setState(() => _paymentPlan = value ?? 'FULL'),
              ),
              if (_paymentPlan == 'DEPOSIT')
                TextField(
                  controller: _deposit,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Kapora tutarı',
                    border: OutlineInputBorder(),
                  ),
                ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _notes,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notlar',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Kaydediliyor…' : 'Kaydet'),
            ),
          ],
        ),
      ),
    );
  }
}
