import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Card with the same hard-shadow vibe as `.chunky-card` on the web.
/// Use for test cards, profile sections, etc.
class ChunkyCard extends StatelessWidget {
  const ChunkyCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.shadowOffset = 6,
    this.borderRadius = 24,
    this.cream = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final double shadowOffset;
  final double borderRadius;

  /// Use the warm cream variant (`.chunky-card-cream`) for arena content.
  final bool cream;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    final bg = cream
        ? (isDark ? const Color(0xFF221C14) : const Color(0xFFFFF8EE))
        : scheme.surface;
    final border = cream
        ? (isDark ? const Color(0xFF3A2F1F) : const Color(0xFFFDE68A))
        : scheme.outline;
    final shadow = cream
        ? (isDark ? AppColors.shadowDark : const Color(0xFFFDE68A))
        : (isDark ? AppColors.shadowDark : AppColors.chunkyShadowLight);

    final card = Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: border, width: 2),
        boxShadow: [
          BoxShadow(
            color: shadow,
            offset: Offset(0, shadowOffset),
            blurRadius: 0,
          ),
        ],
      ),
      padding: padding,
      child: child,
    );

    final wrapped = onTap != null
        ? InkWell(
            borderRadius: BorderRadius.circular(borderRadius),
            onTap: onTap,
            child: card,
          )
        : card;

    return Padding(
      padding: EdgeInsets.only(bottom: shadowOffset),
      child: wrapped,
    );
  }
}
