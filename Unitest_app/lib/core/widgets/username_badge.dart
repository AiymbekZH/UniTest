import 'package:flutter/material.dart';

/// Renders a `@username` handle with smart fallbacks. Mirrors
/// `client/src/components/UsernameBadge.jsx`.
///
/// Order of preference:
///   1. `username` ("@andez")
///   2. `uniqueId.toLowerCase()` ("@a1b2c3...")
///   3. literal `@user`
class UsernameBadge extends StatelessWidget {
  const UsernameBadge({
    super.key,
    this.username,
    this.uniqueId,
    this.style,
    this.color,
  });

  /// Public handle. Optional — older accounts may not have it.
  final String? username;

  /// Internal 12-char id, used as a stable fallback before users pick a name.
  final String? uniqueId;

  final TextStyle? style;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final base = style ?? Theme.of(context).textTheme.labelMedium;
    final c = color ?? scheme.onSurface.withValues(alpha: 0.6);

    return Text(
      _format(),
      style: base?.copyWith(color: c),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  String _format() {
    if (username != null && username!.isNotEmpty) return '@$username';
    if (uniqueId != null && uniqueId!.isNotEmpty) {
      return '@${uniqueId!.toLowerCase()}';
    }
    return '@user';
  }
}
