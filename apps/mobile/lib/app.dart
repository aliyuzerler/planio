import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:xenior_mobile/core/routing/app_router.dart';
import 'package:xenior_mobile/core/theme/app_theme.dart';
import 'package:xenior_mobile/features/notifications/application/push_registrar.dart';

class XeniorApp extends ConsumerWidget {
  const XeniorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(pushRegistrarProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Planio',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
