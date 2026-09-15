import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/appointments/application/appointment_models.dart';
import 'package:xenior_mobile/features/appointments/application/calendar_date.dart';
import 'package:xenior_mobile/features/appointments/data/appointment_repository.dart';
import 'package:xenior_mobile/shared/widgets/appointment_tile.dart';
import 'package:xenior_mobile/shared/widgets/async_body.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class AppointmentListScreen extends ConsumerStatefulWidget {
  const AppointmentListScreen({super.key});

  @override
  ConsumerState<AppointmentListScreen> createState() =>
      _AppointmentListScreenState();
}

class _AppointmentListScreenState extends ConsumerState<AppointmentListScreen> {
  late String _date;

  @override
  void initState() {
    super.initState();
    _date = formatYmd(DateTime.now());
  }

  AppointmentListParams get _params => AppointmentListParams(date: _date);
  bool get _isToday => _date == formatYmd(DateTime.now());

  void _setDate(DateTime date) {
    setState(() => _date = formatYmd(date));
  }

  @override
  Widget build(BuildContext context) {
    final appointments = ref.watch(appointmentListProvider(_params));
    return WorkspaceScaffold(
      selectedIndex: 1,
      appBar: AppBar(
        title: const Text('Randevular'),
        actions: [
          TextButton(
            onPressed: _isToday ? null : () => _setDate(DateTime.now()),
            child: const Text('Bugün'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final start = suggestedStartForDate(_date).toUtc().toIso8601String();
          context.push(
            '/appointments/new?startAt=${Uri.encodeComponent(start)}',
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Yeni randevu'),
      ),
      body: SafeArea(
        child: AsyncBody(
          value: appointments,
          onRetry: () => ref.refresh(appointmentListProvider(_params).future),
          builder: (page) => RefreshIndicator(
            onRefresh: () =>
                ref.refresh(appointmentListProvider(_params).future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Önceki gün',
                      onPressed: () =>
                          _setDate(addCalendarDays(parseYmd(_date), -1)),
                      icon: const Icon(Icons.chevron_left),
                    ),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final selected = await showDatePicker(
                            context: context,
                            initialDate: parseYmd(_date),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2040),
                          );
                          if (selected == null) return;
                          _setDate(selected);
                        },
                        child: Text(_date),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Sonraki gün',
                      onPressed: () =>
                          _setDate(addCalendarDays(parseYmd(_date), 1)),
                      icon: const Icon(Icons.chevron_right),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _isToday ? 'Bugünün randevuları' : 'Seçilen gün',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                for (final item in page.items)
                  AppointmentTile(
                    appointment: item,
                    onTap: () => context.push('/appointments/${item.id}'),
                  ),
                if (page.items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('Bu günde randevu yok.')),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
