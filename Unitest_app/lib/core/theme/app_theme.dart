import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// Application-wide ThemeData factories.
///
/// Light and dark themes mirror the web client's warm-orange + warm-dark
/// palette (see `client/src/index.css` and `client/tailwind.config.js`).
/// Both themes share the same component shapes (rounded-2xl/3xl) and
/// typography scale to keep the design consistent across platforms.
class AppTheme {
  AppTheme._();

  /// Override system overlay colors so the status bar reads correctly on
  /// each theme. Call once from `main.dart` AFTER `WidgetsFlutterBinding
  /// .ensureInitialized()` and AFTER picking the theme mode.
  static void applySystemOverlay(Brightness brightness) {
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            brightness == Brightness.dark ? Brightness.light : Brightness.dark,
        statusBarBrightness:
            brightness == Brightness.dark ? Brightness.dark : Brightness.light,
        systemNavigationBarColor: brightness == Brightness.dark
            ? AppColors.surfaceDark
            : AppColors.surfaceLight,
        systemNavigationBarIconBrightness:
            brightness == Brightness.dark ? Brightness.light : Brightness.dark,
      ),
    );
  }

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary500,
      brightness: Brightness.light,
      primary: AppColors.primary500,
      onPrimary: Colors.white,
      surface: AppColors.surfaceLightElev1,
      onSurface: AppColors.textLightPrimary,
      surfaceContainerLowest: AppColors.surfaceLight,
      surfaceContainerLow: AppColors.surfaceLightElev1,
      surfaceContainer: AppColors.surfaceLightElev2,
      error: AppColors.danger500,
      outline: AppColors.borderLightSoft,
      outlineVariant: AppColors.borderLightStrong,
    );

    final textTheme = AppTypography.buildTextTheme(
      primary: AppColors.textLightPrimary,
      muted: AppColors.textLightMuted,
    );

    return _build(colorScheme, textTheme,
        scaffoldBackground: AppColors.surfaceLight);
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary500,
      brightness: Brightness.dark,
      primary: AppColors.primary500,
      onPrimary: Colors.white,
      surface: AppColors.surfaceDarkElev1,
      onSurface: AppColors.textDarkPrimary,
      surfaceContainerLowest: AppColors.surfaceDark,
      surfaceContainerLow: AppColors.surfaceDarkElev1,
      surfaceContainer: AppColors.surfaceDarkElev2,
      surfaceContainerHigh: AppColors.surfaceDarkElev3,
      error: AppColors.danger500,
      outline: AppColors.borderDarkSoft,
      outlineVariant: AppColors.borderDarkStrong,
    );

    final textTheme = AppTypography.buildTextTheme(
      primary: AppColors.textDarkPrimary,
      muted: AppColors.textDarkMuted,
    );

    return _build(colorScheme, textTheme,
        scaffoldBackground: AppColors.surfaceDark);
  }

  static ThemeData _build(
    ColorScheme colorScheme,
    TextTheme textTheme, {
    required Color scaffoldBackground,
  }) {
    return ThemeData(
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: scaffoldBackground,
      useMaterial3: true,
      fontFamily: AppTypography.fontFamily,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      splashFactory: InkSparkle.splashFactory,
      // ── Component themes ─────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: scaffoldBackground,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness:
              colorScheme.brightness == Brightness.dark ? Brightness.light : Brightness.dark,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: colorScheme.outline, width: 1),
        ),
        color: colorScheme.surface,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerLow,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.4),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outline, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outline, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 2),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        selectedItemColor: colorScheme.primary,
        unselectedItemColor: colorScheme.onSurface.withValues(alpha: 0.5),
        selectedLabelStyle: textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: textTheme.labelSmall,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surface,
        modalBackgroundColor: colorScheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        elevation: 0,
        showDragHandle: true,
      ),
      dividerTheme: DividerThemeData(
        color: colorScheme.outline,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.textLightPrimary,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}
