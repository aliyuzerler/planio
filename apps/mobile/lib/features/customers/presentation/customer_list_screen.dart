import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:xenior_mobile/features/auth/application/auth_controller.dart';
import 'package:xenior_mobile/features/auth/presentation/auth_error.dart';
import 'package:xenior_mobile/features/customers/application/customer_models.dart';
import 'package:xenior_mobile/features/customers/data/customer_repository.dart';
import 'package:xenior_mobile/shared/widgets/workspace_scaffold.dart';

class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});

  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  final TextEditingController _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  bool _activeOnly = true;
  int _page = 1;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  CustomerListParams get _params => CustomerListParams(
    q: _query.trim().isEmpty ? null : _query.trim(),
    isActive: _activeOnly ? true : null,
    page: _page,
  );

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() {
        _query = value;
        _page = 1;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final role = ref
        .watch(authControllerProvider)
        .value
        ?.activeMembership
        ?.role;
    final canManage = role == 'BUSINESS_OWNER' || role == 'BUSINESS_ADMIN';
    final customers = ref.watch(customerListProvider(_params));

    return WorkspaceScaffold(
      selectedIndex: 2,
      appBar: AppBar(title: const Text('Müşteriler')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/customers/new'),
              icon: const Icon(Icons.person_add),
              label: const Text('Yeni müşteri'),
            )
          : null,
      body: SafeArea(
        child: customers.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text(authErrorMessage(error))),
          data: (page) {
            return RefreshIndicator(
              onRefresh: () =>
                  ref.refresh(customerListProvider(_params).future),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextField(
                    controller: _search,
                    decoration: const InputDecoration(
                      labelText: 'Müşteri ara',
                      hintText: 'Ad, telefon veya e-posta',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    textInputAction: TextInputAction.search,
                    onChanged: _onSearchChanged,
                    onSubmitted: (value) => setState(() {
                      _query = value;
                      _page = 1;
                    }),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Yalnızca aktif müşteriler'),
                    value: _activeOnly,
                    onChanged: (value) => setState(() {
                      _activeOnly = value;
                      _page = 1;
                    }),
                  ),
                  Text(
                    '${page.total} müşteri · sayfa ${page.page}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  for (final customer in page.items)
                    Card(
                      child: ListTile(
                        title: Text(customer.fullName),
                        subtitle: Text(
                          customer.phone ??
                              customer.email ??
                              'İletişim bilgisi yok',
                        ),
                        trailing: Chip(
                          label: Text(customer.isActive ? 'Aktif' : 'Pasif'),
                        ),
                        onTap: () => context.push('/customers/${customer.id}'),
                      ),
                    ),
                  if (page.items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('Müşteri bulunamadı.')),
                    ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: _page > 1
                            ? () => setState(() => _page -= 1)
                            : null,
                        child: const Text('Önceki'),
                      ),
                      TextButton(
                        onPressed: page.hasMore
                            ? () => setState(() => _page += 1)
                            : null,
                        child: const Text('Sonraki'),
                      ),
                    ],
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
