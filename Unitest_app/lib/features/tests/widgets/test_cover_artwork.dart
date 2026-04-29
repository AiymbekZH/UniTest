import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

/// Renders a test cover image OR a generated placeholder based on the
/// test's title. Mirrors the React `TestCoverArtwork` component on the
/// web client: a deterministic gradient seeded from the title with a
/// large monogram letter and a subtle overlay sheen.
///
/// `coverImage` is expected to be a base64 data URL
/// (`data:image/png;base64,...`). Empty string ⇒ fallback to gradient.
class TestCoverArtwork extends StatelessWidget {
  const TestCoverArtwork({
    super.key,
    required this.title,
    this.coverImage,
    this.borderRadius,
    this.fit = BoxFit.cover,
  });

  final String title;
  final String? coverImage;
  final BorderRadius? borderRadius;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final shape = borderRadius ?? BorderRadius.circular(14);
    final cover = coverImage;
    if (cover != null && cover.isNotEmpty) {
      final bytes = _decodeBase64DataUrl(cover);
      if (bytes != null) {
        return ClipRRect(
          borderRadius: shape,
          child: Image.memory(
            bytes,
            fit: fit,
            // Keep the in-memory cache hot so we don't decode this
            // 600 KB blob on every scroll frame.
            gaplessPlayback: true,
            errorBuilder: (_, __, ___) =>
                _AnimatedPlaceholder(title: title, borderRadius: shape),
          ),
        );
      }
    }
    return _AnimatedPlaceholder(title: title, borderRadius: shape);
  }
}

/// Gradient-filled placeholder shown when no cover is uploaded. The
/// gradient hue is derived deterministically from the title so the
/// same test always gets the same colour.
class _AnimatedPlaceholder extends StatelessWidget {
  const _AnimatedPlaceholder({required this.title, required this.borderRadius});

  final String title;
  final BorderRadius borderRadius;

  @override
  Widget build(BuildContext context) {
    final scheme = _gradientFor(title);
    final letter = _firstLetter(title);
    return ClipRRect(
      borderRadius: borderRadius,
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: scheme,
              ),
            ),
          ),
          // Subtle noise: a few translucent circles add depth without
          // depending on shaders/images.
          Positioned(
            top: -20,
            right: -20,
            child: _Bubble(color: Colors.white.withValues(alpha: 0.18), size: 80),
          ),
          Positioned(
            bottom: -30,
            left: -30,
            child: _Bubble(color: Colors.white.withValues(alpha: 0.12), size: 110),
          ),
          Center(
            child: Text(
              letter,
              style: TextStyle(
                fontSize: 56,
                fontWeight: FontWeight.w900,
                color: Colors.white.withValues(alpha: 0.85),
                letterSpacing: -2,
                shadows: const [
                  Shadow(
                    color: Color(0x55000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _firstLetter(String title) {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return 'U';
    return trimmed.characters.first.toUpperCase();
  }

  /// Hashes the title to a stable colour pair pulled from the brand
  /// palette. We pick PAIRS (not random hues) so the gradient always
  /// looks intentional.
  List<Color> _gradientFor(String title) {
    final palette = <List<Color>>[
      [const Color(0xFFFF7E37), const Color(0xFFFF5151)], // primary orange
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)], // indigo / violet
      [const Color(0xFF06B6D4), const Color(0xFF3B82F6)], // cyan / blue
      [const Color(0xFF10B981), const Color(0xFF059669)], // emerald
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)], // amber → red
      [const Color(0xFFEC4899), const Color(0xFFA855F7)], // pink → violet
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)], // teal → sky
    ];
    if (title.isEmpty) return palette[0];
    var hash = 0;
    for (final code in title.codeUnits) {
      hash = (hash * 31 + code) & 0x7FFFFFFF;
    }
    return palette[hash % palette.length];
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.color, required this.size});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }
}

/// Decodes `data:image/...;base64,XXXX` into bytes. Returns null if the
/// payload isn't a recognised data URL — caller should fall back to
/// the placeholder in that case.
Uint8List? _decodeBase64DataUrl(String src) {
  try {
    final commaIdx = src.indexOf(',');
    if (commaIdx == -1) return null;
    final header = src.substring(0, commaIdx);
    if (!header.contains('base64')) return null;
    final b64 = src.substring(commaIdx + 1);
    return base64Decode(b64);
  } catch (_) {
    return null;
  }
}
