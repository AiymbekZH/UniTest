import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// A button with the chunky 6-pixel hard-shadow + press-down animation
/// used across the web client (`.chunky-btn-*` in `client/src/index.css`).
///
/// On press the button slides down by [pressOffset] pixels and the
/// shadow disappears — like a physical key.
///
/// Usage:
/// ```dart
/// ChunkyButton(
///   label: 'Войти',
///   onPressed: () => ref.read(authControllerProvider.notifier).login(...),
///   variant: ChunkyVariant.primary,
/// )
/// ```
class ChunkyButton extends StatefulWidget {
  const ChunkyButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = ChunkyVariant.primary,
    this.icon,
    this.trailing,
    this.fullWidth = false,
    this.compact = false,
    this.loading = false,
    this.pressOffset = 6,
  });

  final String label;
  final VoidCallback? onPressed;
  final ChunkyVariant variant;
  final IconData? icon;
  final Widget? trailing;
  final bool fullWidth;
  final bool compact;
  final bool loading;
  final double pressOffset;

  @override
  State<ChunkyButton> createState() => _ChunkyButtonState();
}

class _ChunkyButtonState extends State<ChunkyButton> {
  bool _pressed = false;

  bool get _enabled => widget.onPressed != null && !widget.loading;

  void _setPressed(bool value) {
    if (!_enabled) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final palette = _palette(widget.variant, scheme);

    final translateY = _pressed ? widget.pressOffset : 0.0;
    final shadowOffset = _pressed ? 0.0 : widget.pressOffset;

    final padH = widget.compact ? 16.0 : 22.0;
    final padV = widget.compact ? 10.0 : 14.0;

    final body = AnimatedContainer(
      duration: const Duration(milliseconds: 80),
      curve: Curves.easeOut,
      transform: Matrix4.translationValues(0, translateY, 0),
      decoration: BoxDecoration(
        color: _enabled ? palette.bg : palette.bg.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(22),
        border: palette.border != null
            ? Border.all(color: palette.border!, width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: palette.shadow,
            offset: Offset(0, shadowOffset),
            blurRadius: 0,
            spreadRadius: 0,
          ),
        ],
      ),
      padding: EdgeInsets.symmetric(horizontal: padH, vertical: padV),
      child: _buildContent(palette.fg),
    );

    final wrapped = widget.fullWidth
        ? SizedBox(width: double.infinity, child: body)
        : body;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      onTap: _enabled ? widget.onPressed : null,
      child: Padding(
        // Reserve room below for the shadow so the button doesn't overlap
        // adjacent UI when in its raised position.
        padding: EdgeInsets.only(bottom: widget.pressOffset),
        child: wrapped,
      ),
    );
  }

  Widget _buildContent(Color fg) {
    if (widget.loading) {
      return SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: fg,
        ),
      );
    }

    final children = <Widget>[
      if (widget.icon != null) ...[
        Icon(widget.icon, size: 18, color: fg),
        const SizedBox(width: 8),
      ],
      Flexible(
        child: Text(
          widget.label,
          style: TextStyle(
            color: fg,
            fontSize: widget.compact ? 13 : 15,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.2,
          ),
          textAlign: TextAlign.center,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      if (widget.trailing != null) ...[
        const SizedBox(width: 8),
        widget.trailing!,
      ],
    ];

    return Row(
      mainAxisSize: widget.fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: children,
    );
  }

  _ChunkyPalette _palette(ChunkyVariant variant, ColorScheme scheme) {
    final isDark = scheme.brightness == Brightness.dark;
    switch (variant) {
      case ChunkyVariant.primary:
        return _ChunkyPalette(
          bg: AppColors.primary500,
          fg: Colors.white,
          shadow: AppColors.chunkyShadowPrimary,
        );
      case ChunkyVariant.dark:
        return _ChunkyPalette(
          bg: const Color(0xFF0F172A),
          fg: Colors.white,
          shadow: const Color(0xFF020617),
        );
      case ChunkyVariant.ghost:
        return _ChunkyPalette(
          bg: isDark ? AppColors.surfaceDarkElev2 : Colors.white,
          fg: scheme.onSurface,
          shadow: isDark
              ? AppColors.chunkyShadowDark
              : AppColors.chunkyShadowLight,
          border: scheme.outline,
        );
      case ChunkyVariant.danger:
        return _ChunkyPalette(
          bg: AppColors.danger500,
          fg: Colors.white,
          shadow: const Color(0xFF7F1D1D),
        );
      case ChunkyVariant.success:
        return _ChunkyPalette(
          bg: AppColors.success500,
          fg: Colors.white,
          shadow: const Color(0xFF065F46),
        );
      case ChunkyVariant.amber:
        return const _ChunkyPalette(
          bg: Color(0xFFFBBF24),
          fg: Color(0xFF0F172A),
          shadow: Color(0xFF92400E),
        );
    }
  }
}

enum ChunkyVariant { primary, dark, ghost, danger, success, amber }

class _ChunkyPalette {
  const _ChunkyPalette({
    required this.bg,
    required this.fg,
    required this.shadow,
    this.border,
  });

  final Color bg;
  final Color fg;
  final Color shadow;
  final Color? border;
}
