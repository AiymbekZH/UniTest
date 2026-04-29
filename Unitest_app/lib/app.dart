import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/router/deep_link_service.dart';
import 'core/theme/app_theme.dart';

/// Top-level widget. Owns the `MaterialApp.router`, themes, and
/// localization delegates. State and routing are pulled from Riverpod.
class UniTestApp extends ConsumerStatefulWidget {
  const UniTestApp({super.key});

  @override
  ConsumerState<UniTestApp> createState() => _UniTestAppState();
}

class _UniTestAppState extends ConsumerState<UniTestApp> {
  @override
  void initState() {
    super.initState();
    // Start listening for `unitest://` deep links AFTER the first frame
    // so the router is fully built and ready to receive `go()` calls.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(deepLinkServiceProvider).init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: 'UniTest',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: router,
      // Languages mirror the web client: en / ru / kk (Kazakh) and es.
      // ARB files live under `lib/l10n/` and will be filled in Phase 1.
      supportedLocales: const [
        Locale('ru'),
        Locale('kk'),
        Locale('en'),
        Locale('es'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        // Re-apply system overlay every theme change. Without this, switching
        // OS theme mid-session can leave a stale status-bar tint.
        AppTheme.applySystemOverlay(Theme.of(context).brightness);
        return child ?? const SizedBox.shrink();
      },
    );
  }
}
