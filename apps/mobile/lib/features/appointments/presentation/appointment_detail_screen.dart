import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_status.dart';
import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/shared/widgets/confirm_action.dart';

class AppointmentDetailScreen extends ConsumerWidget {
  const AppointmentDetailScreen({super.key, required this.appointmentId});

  final String appointmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appointment = ref.watch(appointmentDetailProvider(appointmentId));
    return appointment.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) =>
          Scaffold(body: Center(child: Text(authErrorMessage(error)))),
      data: (item) => Scaffold(
        appBar: AppBar(
          title: Text(item.customer.fullName),
          actions: [
            if (item.isConfirmed)
              IconButton(
                tooltip: 'Yeniden planla',
                onPressed: () =>
                    context.push('/appointments/$appointmentId/edit'),
                icon: const Icon(Icons.event_repeat),
              ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () =>
              ref.refresh(appointmentDetailProvider(appointmentId).future),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Personel'),
                subtitle: Text(item.staff.fullName),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Hizmet'),
                subtitle: Text(item.serviceName),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Zaman'),
                subtitle: Text(formatAppointmentTime(item.startAt, item.endAt)),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Durum'),
                subtitle: Align(
                  alignment: Alignment.centerLeft,
                  child: AppointmentStatusChip(status: item.status),
                ),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Ödeme'),
                subtitle: Text(
                  '${item.paymentPlan == 'DEPOSIT' ? 'Kapora' : item.paymentPlan == 'FULL' ? 'Tamamı peşin' : 'Gününde'} · ${item.paymentStatus == 'PAID' ? 'Ödendi' : item.paymentStatus == 'PARTIAL' ? 'Kısmi' : 'Ödenmedi'}${item.remainingAmount != null && item.remainingAmount != '0.00' ? ' · kalan ${item.remainingAmount} ${item.currency}' : ''}',
                ),
              ),
              if (item.paymentPlan == 'ON_DAY' &&
                  item.remainingAmount != null &&
                  item.remainingAmount != '0.00')
                Card(
                  child: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text(
                      'Gününde tahsilat: kalan tutar randevu gününde alınır. POS veya ödeme linki ile kapatın.',
                    ),
                  ),
                ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Ücret'),
                subtitle: Text(
                  item.hasCampaignDiscount
                      ? '${item.servicePriceSnapshot} ${item.currency} · liste ${item.listPriceSnapshot ?? item.servicePriceSnapshot}, indirim ${item.discountAmountSnapshot}${item.campaignNameSnapshot != null ? ' (${item.campaignNameSnapshot})' : ''}'
                      : '${item.servicePriceSnapshot} ${item.currency}',
                ),
              ),
              if (item.isConfirmed) ...[
                if (item.remainingAmount != null &&
                    item.remainingAmount != '0.00') ...[
                  FilledButton(
                    onPressed: () => _run(
                      context,
                      ref,
                      title: 'Ödeme linki gönder',
                      message:
                          'Müşteriye kapora veya kalan tutar için ödeme bağlantısı gönderilecek.',
                      action: () async {
                        await ref
                            .read(appointmentRepositoryProvider)
                            .createPaymentLink(appointmentId);
                      },
                    ),
                    child: const Text('Ödeme linki gönder'),
                  ),
                  const SizedBox(height: 8),
                ],
                FilledButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    title: 'Randevuyu tamamla',
                    message:
                        item.remainingAmount != null &&
                            item.remainingAmount != '0.00'
                        ? 'Kalan ${item.remainingAmount} ${item.currency} var. Yine de tamamlanacak.'
                        : 'Randevu tamamlandı olarak işaretlenecek.',
                    action: () => ref
                        .read(appointmentRepositoryProvider)
                        .complete(appointmentId),
                  ),
                  child: const Text('Tamamla'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    title: 'Gelmedi olarak işaretle',
                    message: 'Müşteri gelmedi olarak kaydedilecek.',
                    action: () => ref
                        .read(appointmentRepositoryProvider)
                        .markNoShow(appointmentId),
                  ),
                  child: const Text('Gelmedi'),
                ),
                TextButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    title: 'Randevuyu iptal et',
                    message: 'İptal işlemi sunucuda kaydedilir ve geri alınamaz.',
                    action: () => ref
                        .read(appointmentRepositoryProvider)
                        .cancel(appointmentId),
                  ),
                  child: const Text('İptal et'),
                ),
              ],
              const Divider(height: 32),
              const Text(
                'Geçmiş',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              for (final event in item.events) Text(event),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _run(
    BuildContext context,
    WidgetRef ref, {
    required String title,
    required String message,
    required Future<void> Function() action,
  }) async {
    final confirmed = await confirmAction(
      context,
      title: title,
      message: message,
    );
    if (!confirmed) return;
    try {
      await action();
      ref.invalidate(appointmentListProvider);
      ref.invalidate(appointmentDetailProvider(appointmentId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('İşlem kaydedildi.')),
        );
      }
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(authErrorMessage(error))));
      }
    }
  }
}
