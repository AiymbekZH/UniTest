import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/theme/app_theme.dart';

/// App entry point.
///
/// 1. Lock orientation to portrait (most pages are tall scrolling lists; an
///    accidental landscape layout breaks the chunky-card geometry).
/// 2. Make the system status bar transparent so the page background bleeds
///    behind it (cleaner look on both iOS and Android).
/// 3. Wrap the app in `ProviderScope` so any widget can read providers.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Use the platform brightness as the initial guess so the splash screen
  // matches the user's preference instead of flashing the wrong theme.
  AppTheme.applySystemOverlay(
    WidgetsBinding.instance.platformDispatcher.platformBrightness,
  );

  runApp(const ProviderScope(child: UniTestApp()));
}
