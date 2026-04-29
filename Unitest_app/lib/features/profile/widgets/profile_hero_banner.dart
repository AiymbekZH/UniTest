import 'dart:convert';
import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../models/profile_models.dart';
import 'cover_backdrop.dart';

/// "Twitter-style" header used on both the own profile (`editable: true`)
/// and other users' profiles (`editable: false`). Mirrors the React
/// `ProfileHeroBanner.jsx` layout, adapted for mobile where vertical
/// space is at a premium.
///
/// Anatomy (top to bottom):
/// - 110-130 px cover (custom image OR preset gradient backdrop).
/// - 80×80 avatar overlapping the bottom-left of the cover.
/// - Display name + role pill + `@handle`.
/// - Optional headline + bio.
/// - Joined date chip.
/// - [actions] (e.g. Follow / Unfollow buttons) when shown.
/// - [footer] — usually 4 stat tiles (followers / following / etc).
class ProfileHeroBanner extends StatelessWidget {
  const ProfileHeroBanner({
    super.key,
    required this.user,
    this.editable = false,
    this.onPickAvatar,
    this.onPickBanner,
    this.onRemoveBanner,
    this.actions,
    this.footer,
    this.heroBannerHeight = 130,
  });

  final ProfileUser user;

  /// When `true`, shows the camera-style overlays for changing the
  /// avatar and cover. Tapping them invokes the matching callback.
  final bool editable;
  final VoidCallback? onPickAvatar;
  final VoidCallback? onPickBanner;

  /// Only shown when [editable] is true *and* the user has a custom cover.
  final VoidCallback? onRemoveBanner;

  /// Inline action row (follow/unfollow, edit, etc) — placed below the bio
  /// on mobile (always full-width row).
  final Widget? actions;

  /// Footer row — the 4 chunky stat tiles. Layout decision is up to the
  /// caller because own/other profiles surface different metrics.
  final Widget? footer;

  /// Cover band height. 110 is a good mobile default; bump to 160 on tablets.
  final double heroBannerHeight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? Colors.white : AppColors.textLightPrimary;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: isDark ? Colors.black54 : AppColors.textLightPrimary,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _coverWithAvatar(context),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _nameRow(theme),
                  if (user.username != null && user.username!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '@${user.username}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  if (user.headline.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        user.headline,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  if (user.bio.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        user.bio,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          height: 1.45,
                        ),
                      ),
                    ),
                  if (user.createdAt != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: _MetaChip(
                        icon: Icons.calendar_today_rounded,
                        label: 'С нами с ${_formatJoinedDate(user.createdAt!)}',
                      ),
                    ),
                  if (actions != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: actions!,
                    ),
                ],
              ),
            ),
            if (footer != null)
              Container(
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: borderColor, width: 2),
                  ),
                  color: isDark
                      ? AppColors.surfaceDarkElev1
                      : AppColors.surfaceLightElev2,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                child: footer!,
              ),
          ],
        ),
      ),
    );
  }

  Widget _coverWithAvatar(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      // Avatar overlaps the cover by 32px so we extend the stack height to
      // accommodate it without clipping.
      height: heroBannerHeight + 36,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            top: 0,
            bottom: 36,
            child: _coverImage(),
          ),
          if (editable)
            Positioned(
              top: 8,
              right: 8,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _CornerButton(
                    icon: Icons.add_photo_alternate_rounded,
                    label: user.coverImage.isNotEmpty
                        ? 'Заменить'
                        : 'Обложка',
                    onTap: onPickBanner,
                  ),
                  if (user.coverImage.isNotEmpty &&
                      onRemoveBanner != null) ...[
                    const SizedBox(width: 6),
                    _CornerButton(
                      icon: Icons.delete_rounded,
                      tone: _CornerTone.danger,
                      onTap: onRemoveBanner,
                    ),
                  ],
                ],
              ),
            ),
          Positioned(
            left: 14,
            bottom: 0,
            child: _avatar(theme),
          ),
        ],
      ),
    );
  }

  Widget _coverImage() {
    if (user.coverImage.isNotEmpty) {
      return _CoverImage(source: user.coverImage);
    }
    final preset = CoverBackdrop.validPresets.contains(user.coverPreset)
        ? user.coverPreset
        : 'aurora';
    return CoverBackdrop(preset: preset);
  }

  Widget _avatar(ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? Colors.white : AppColors.textLightPrimary;
    final avatarChild = user.avatar.isNotEmpty
        ? _CoverImage.image(user.avatar)
        : Container(
            color: AppColors.primary100,
            alignment: Alignment.center,
            child: Text(
              user.initials,
              style: theme.textTheme.titleLarge?.copyWith(
                color: AppColors.primary700,
                fontWeight: FontWeight.w900,
                fontSize: 28,
              ),
            ),
          );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            border: Border.all(color: borderColor, width: 2),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.black54 : AppColors.textLightPrimary,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: SizedBox(
              width: 76,
              height: 76,
              child: avatarChild,
            ),
          ),
        ),
        if (editable)
          Positioned(
            right: -4,
            bottom: -4,
            child: _CornerButton(
              icon: Icons.camera_alt_rounded,
              tone: _CornerTone.primary,
              onTap: onPickAvatar,
              shape: BoxShape.circle,
            ),
          ),
      ],
    );
  }

  Widget _nameRow(ThemeData theme) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 6,
      children: [
        Text(
          user.fullName.isEmpty ? 'Пользователь' : user.fullName,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        _RoleBadge(role: user.role),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = switch (role) {
      'admin' => 'АДМИН',
      'teacher' => 'УЧИТЕЛЬ',
      _ => 'СТУДЕНТ',
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: theme.brightness == Brightness.dark
              ? Colors.white
              : AppColors.textLightPrimary,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary800,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontSize: 9,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}

enum _CornerTone { neutral, primary, danger }

class _CornerButton extends StatelessWidget {
  const _CornerButton({
    required this.icon,
    this.label,
    this.onTap,
    this.tone = _CornerTone.neutral,
    this.shape = BoxShape.rectangle,
  });

  final IconData icon;
  final String? label;
  final VoidCallback? onTap;
  final _CornerTone tone;
  final BoxShape shape;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bg = switch (tone) {
      _CornerTone.primary => theme.colorScheme.primary,
      _CornerTone.danger => AppColors.danger500,
      _CornerTone.neutral => theme.colorScheme.surface,
    };
    final fg = switch (tone) {
      _CornerTone.primary || _CornerTone.danger => Colors.white,
      _CornerTone.neutral =>
        isDark ? Colors.white : AppColors.textLightPrimary,
    };
    final shadow = switch (tone) {
      _CornerTone.primary => AppColors.primary800,
      _CornerTone.danger => const Color(0xFF7F1D1D),
      _CornerTone.neutral =>
        isDark ? Colors.black : AppColors.textLightPrimary,
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: label == null
            ? const EdgeInsets.all(8)
            : const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          shape: shape,
          borderRadius:
              shape == BoxShape.circle ? null : BorderRadius.circular(999),
          border: Border.all(
            color: isDark ? Colors.white : AppColors.textLightPrimary,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(color: shadow, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: fg),
            if (label != null) ...[
              const SizedBox(width: 6),
              Text(
                label!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: fg,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Renders an avatar / cover image. Accepts either a `data:image/...`
/// base64 URL (uploaded via mobile or web) OR a regular http(s) URL
/// (Google profile picture). Falls back to a transparent box on error.
class _CoverImage extends StatelessWidget {
  const _CoverImage({required this.source});

  factory _CoverImage.image(String src) => _CoverImage(source: src);

  final String source;

  @override
  Widget build(BuildContext context) {
    if (source.startsWith('data:')) {
      final bytes = _decodeBase64(source);
      return bytes.isEmpty
          ? const SizedBox.shrink()
          : Image.memory(bytes, fit: BoxFit.cover);
    }
    return CachedNetworkImage(
      imageUrl: source,
      fit: BoxFit.cover,
      placeholder: (_, __) => const ColoredBox(color: AppColors.primary100),
      errorWidget: (_, __, ___) => const ColoredBox(color: AppColors.primary100),
    );
  }
}

Uint8List _decodeBase64(String dataUri) {
  try {
    final commaIdx = dataUri.indexOf(',');
    if (commaIdx == -1) return Uint8List(0);
    return base64.decode(dataUri.substring(commaIdx + 1));
  } catch (_) {
    return Uint8List(0);
  }
}

/// Russian-style "26 апр. 2026 г." — minimal locale dependency.
String _formatJoinedDate(DateTime d) {
  const months = [
    'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
    'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.',
  ];
  final mIdx = (d.month - 1).clamp(0, 11);
  return '${d.day} ${months[mIdx]} ${d.year}';
}
