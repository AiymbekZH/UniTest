import 'package:flutter/material.dart';

/// Typography scale matching the web client.
///
/// Web uses Inter via Tailwind defaults. On mobile we initially fall back to
/// the platform sans-serif (San Francisco on iOS, Roboto on Android) — this
/// removes the need to ship the font with the app and reduces APK size.
/// To switch to Inter later: drop ttf files into `assets/fonts/`,
/// uncomment the `fonts:` block in `pubspec.yaml`, and set
/// `fontFamily: 'Inter'` here.
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  /// Returns a TextTheme tuned for `colorScheme.brightness`.
  ///
  /// Sizes mirror Tailwind: `text-xs (12) / sm (14) / base (16) / lg (18) /
  /// xl (20) / 2xl (24) / 3xl (30)` etc. Weights: 400 / 600 / 700 / 800 / 900.
  static TextTheme buildTextTheme({required Color primary, required Color muted}) {
    return TextTheme(
      // ── Display / hero (rarely used outside marketing screens) ────────
      displayLarge:  _t(57, FontWeight.w900, primary, height: 1.05),
      displayMedium: _t(45, FontWeight.w900, primary, height: 1.1),
      displaySmall:  _t(36, FontWeight.w800, primary, height: 1.15),

      // ── Headlines (page titles) ──────────────────────────────────────
      headlineLarge:  _t(30, FontWeight.w800, primary, height: 1.2),
      headlineMedium: _t(24, FontWeight.w800, primary, height: 1.25),
      headlineSmall:  _t(20, FontWeight.w700, primary, height: 1.3),

      // ── Titles (cards, dialogs) ──────────────────────────────────────
      titleLarge:  _t(18, FontWeight.w700, primary, height: 1.35),
      titleMedium: _t(16, FontWeight.w600, primary, height: 1.4),
      titleSmall:  _t(14, FontWeight.w600, primary, height: 1.4),

      // ── Body ──────────────────────────────────────────────────────────
      bodyLarge:  _t(16, FontWeight.w400, primary, height: 1.5),
      bodyMedium: _t(14, FontWeight.w400, primary, height: 1.5),
      bodySmall:  _t(12, FontWeight.w400, muted,   height: 1.4),

      // ── Labels (buttons, badges, captions) ───────────────────────────
      labelLarge:  _t(14, FontWeight.w600, primary, height: 1.3),
      labelMedium: _t(12, FontWeight.w600, primary, height: 1.3),
      labelSmall:  _t(11, FontWeight.w500, muted,   height: 1.3),
    );
  }

  static TextStyle _t(double size, FontWeight weight, Color color, {required double height}) {
    return TextStyle(
      fontFamily: fontFamily,
      fontFamilyFallback: const ['SF Pro Text', 'Roboto', 'sans-serif'],
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: height,
      letterSpacing: weight.index >= FontWeight.w700.index ? -0.2 : 0,
    );
  }
}
