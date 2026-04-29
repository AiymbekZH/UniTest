import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Compact "chunky" tile used in the hero footer (followers / following /
/// uniqueId / publicTests) and the larger overview stat row (level / xp /
/// streak / completed). Mirrors `StatTile` on the web.
///
/// The tile has a 2px border, 2px hard shadow on the bottom-right edge,
/// and presses down 1px on tap when [onTap] is non-null. Pure visual —
/// no state of its own.
class StatTile extends StatefulWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.tone = StatTileTone.neutral,
    this.onTap,
    this.compact = false,
  });

  final String label;

  /// Pre-formatted value, e.g. `"42"` or `"3.5"`. We don't auto-format
  /// because the caller often wants control over precision.
  final String value;

  /// Optional leading icon (drawn as a small rounded badge in the corner).
  final IconData? icon;

  final StatTileTone tone;

  /// If non-null the tile is interactive (cursor / press effect).
  final VoidCallback? onTap;

  /// Half-height variant for hero footer where vertical space is tight.
  final bool compact;

  @override
  State<StatTile> createState() => _StatTileState();
}

class _StatTileState extends State<StatTile> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (widget.onTap == null) return;
    if (value != _pressed) {
      setState(() => _pressed = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final shadowColor = isDark ? Colors.white24 : AppColors.textLightPrimary;
    final translation = _pressed
        ? const Offset(0, 2)
        : const Offset(0, 0);

    return GestureDetector(
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        curve: Curves.easeOut,
        transform: Matrix4.translationValues(translation.dx, translation.dy, 0),
        padding: EdgeInsets.symmetric(
          horizontal: widget.compact ? 10 : 12,
          vertical: widget.compact ? 8 : 12,
        ),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.white : AppColors.textLightPrimary,
            width: 2,
          ),
          boxShadow: _pressed
              ? const []
              : [
                  BoxShadow(
                    color: shadowColor,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.label.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: widget.compact ? 9 : 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium?.copyWith(
                fontFamily: 'monospace',
                fontWeight: FontWeight.w900,
                fontSize: widget.compact ? 14 : 16,
                color: _toneColor(widget.tone, theme),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _toneColor(StatTileTone tone, ThemeData theme) {
    switch (tone) {
      case StatTileTone.primary:
        return theme.colorScheme.primary;
      case StatTileTone.amber:
        return const Color(0xFFD97706);
      case StatTileTone.emerald:
        return const Color(0xFF059669);
      case StatTileTone.blue:
        return const Color(0xFF2563EB);
      case StatTileTone.neutral:
        return theme.colorScheme.onSurface;
    }
  }
}

enum StatTileTone { neutral, primary, amber, emerald, blue }
