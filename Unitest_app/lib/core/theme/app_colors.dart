import 'package:flutter/material.dart';

/// UniTest brand palette — mirrors `client/tailwind.config.js` and
/// `client/src/index.css` so mobile/web feel like one product.
///
/// Light surfaces: cream, off-white, gray-50/100/200.
/// Dark surfaces: warm-dark (NOT pure slate) — `#0f0d0a` / `#181410` / `#1f1a14`.
class AppColors {
  AppColors._();

  // ── Brand orange (primary) ────────────────────────────────────────────
  static const Color primary50  = Color(0xFFFFF7ED);
  static const Color primary100 = Color(0xFFFFEDD5);
  static const Color primary200 = Color(0xFFFED7AA);
  static const Color primary300 = Color(0xFFFDBA74);
  static const Color primary400 = Color(0xFFFB923C);
  static const Color primary500 = Color(0xFFF97316);
  static const Color primary600 = Color(0xFFEA580C);
  static const Color primary700 = Color(0xFFC2410C);
  static const Color primary800 = Color(0xFF9A3412);
  static const Color primary900 = Color(0xFF7C2D12);

  // ── Light surfaces ───────────────────────────────────────────────────
  static const Color surfaceLight       = Color(0xFFFAFAFA);
  static const Color surfaceLightElev1  = Color(0xFFFFFFFF);
  static const Color surfaceLightElev2  = Color(0xFFF5F5F4);
  static const Color borderLightSoft    = Color(0xFFE5E7EB);
  static const Color borderLightStrong  = Color(0xFFCBD5E1);
  static const Color textLightPrimary   = Color(0xFF0F172A);
  static const Color textLightMuted     = Color(0xFF64748B);
  static const Color textLightDim       = Color(0xFF94A3B8);

  // ── Warm dark surfaces (Spotify / Apple Notes inspired) ──────────────
  static const Color surfaceDark        = Color(0xFF0F0D0A);
  static const Color surfaceDarkElev1   = Color(0xFF181410);
  static const Color surfaceDarkElev2   = Color(0xFF1F1A14);
  static const Color surfaceDarkElev3   = Color(0xFF28221A);
  static const Color borderDarkSoft     = Color(0xFF2A241C);
  static const Color borderDarkStrong   = Color(0xFF3A3226);
  static const Color textDarkPrimary    = Color(0xFFF5EFE6);
  static const Color textDarkMuted      = Color(0xFFA89E90);
  static const Color textDarkDim        = Color(0xFF766C5C);
  static const Color shadowDark         = Color(0xFF000000);

  // ── Arena stage (cream warm) ─────────────────────────────────────────
  static const Color arenaCream         = Color(0xFFFFF8EE);
  static const Color arenaCreamDark     = Color(0xFF1A1612);

  // ── Status ───────────────────────────────────────────────────────────
  static const Color success500         = Color(0xFF10B981);
  static const Color success600         = Color(0xFF059669);
  static const Color warning500         = Color(0xFFF59E0B);
  static const Color warning600         = Color(0xFFD97706);
  static const Color danger500          = Color(0xFFEF4444);
  static const Color danger600          = Color(0xFFDC2626);

  // ── Chunky shadows (used by ChunkyButton / ChunkyCard) ───────────────
  /// 6-pixel hard shadow under chunky elements in light mode.
  static const Color chunkyShadowLight  = Color(0xFFE2E8F0);

  /// Hard shadow under primary chunky button in light mode.
  static const Color chunkyShadowPrimary = Color(0xFF9A3412);

  /// Pure black for chunky shadows in dark mode.
  static const Color chunkyShadowDark = shadowDark;
}
