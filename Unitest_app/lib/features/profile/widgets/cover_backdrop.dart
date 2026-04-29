import 'package:flutter/material.dart';

/// Renders one of the four cover presets used as a fallback when the user
/// hasn't uploaded a custom banner. Mirrors `PresetBackdrop` in the React
/// `ProfileHeroBanner.jsx` — same colours, simplified animation (Flutter's
/// `AnimatedContainer` would chew battery for a static-feeling header).
///
/// The preset name comes from the backend (`coverPreset` enum) and is
/// validated server-side, but we still gracefully fall back to `aurora`.
class CoverBackdrop extends StatelessWidget {
  const CoverBackdrop({super.key, required this.preset});

  final String preset;

  static const Set<String> validPresets = {'aurora', 'mesh', 'wave', 'grid'};

  @override
  Widget build(BuildContext context) {
    switch (preset) {
      case 'mesh':
        return _MeshBackdrop();
      case 'wave':
        return _WaveBackdrop();
      case 'grid':
        return _GridBackdrop();
      case 'aurora':
      default:
        return _AuroraBackdrop();
    }
  }
}

class _AuroraBackdrop extends StatelessWidget {
  const _AuroraBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFF7ED),
            Color(0xFFFDBA74),
            Color(0xFFFB923C),
            Color(0xFFFEF3C7),
          ],
          stops: [0, 0.28, 0.58, 1],
        ),
      ),
      child: Stack(
        children: [
          _BlurDot(color: Colors.white.withValues(alpha: 0.35), size: 200, top: 30, left: -60),
          _BlurDot(
            color: const Color(0xFFFDBA74).withValues(alpha: 0.40),
            size: 220,
            top: 30,
            right: 16,
          ),
        ],
      ),
    );
  }
}

class _MeshBackdrop extends StatelessWidget {
  const _MeshBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFFAF2),
            Color(0xFFFFEDD5),
            Color(0xFFFDE68A),
          ],
          stops: [0, 0.38, 1],
        ),
      ),
      child: Stack(
        children: [
          _BlurDot(color: Colors.white.withValues(alpha: 0.30), size: 190, top: 24, left: -40),
          _BlurDot(
            color: const Color(0xFFFDBA74).withValues(alpha: 0.25),
            size: 210,
            top: 28,
            right: 0,
          ),
        ],
      ),
    );
  }
}

class _WaveBackdrop extends StatelessWidget {
  const _WaveBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFF7ED),
            Color(0xFFFFEDD5),
            Color(0xFFFDE68A),
            Color(0xFFFFFAF0),
          ],
          stops: [0, 0.28, 0.58, 1],
        ),
      ),
      child: CustomPaint(
        painter: _WavePainter(),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final orange = Paint()
      ..color = const Color(0xFFF97316).withValues(alpha: 0.28)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6;
    final white = Paint()
      ..color = Colors.white.withValues(alpha: 0.68)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final w = size.width;
    final h = size.height;

    final p1 = Path()
      ..moveTo(0, h * 0.6)
      ..cubicTo(w * 0.15, h * 0.45, w * 0.23, h * 0.75, w * 0.38, h * 0.6)
      ..cubicTo(w * 0.53, h * 0.45, w * 0.63, h * 0.2, w * 0.77, h * 0.38)
      ..cubicTo(w * 0.85, h * 0.49, w * 0.92, h * 0.58, w, h * 0.53);

    final p2 = Path()
      ..moveTo(0, h * 0.75)
      ..cubicTo(w * 0.18, h * 0.68, w * 0.26, h * 0.43, w * 0.39, h * 0.51)
      ..cubicTo(w * 0.52, h * 0.6, w * 0.63, h * 0.83, w * 0.77, h * 0.78)
      ..cubicTo(w * 0.88, h * 0.73, w * 0.92, h * 0.6, w, h * 0.63);

    canvas.drawPath(p1, orange);
    canvas.drawPath(p2, white);
  }

  @override
  bool shouldRepaint(_WavePainter oldDelegate) => false;
}

class _GridBackdrop extends StatelessWidget {
  const _GridBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFFAF4),
            Color(0xFFFFEDD5),
            Color(0xFFFDE68A),
          ],
          stops: [0, 0.42, 1],
        ),
      ),
      child: CustomPaint(
        painter: _GridPainter(),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.34)
      ..strokeWidth = 1;
    const step = 42.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_GridPainter oldDelegate) => false;
}

class _BlurDot extends StatelessWidget {
  const _BlurDot({
    required this.color,
    required this.size,
    this.top,
    this.left,
    this.right,
  });

  final Color color;
  final double size;
  final double? top;
  final double? left;
  final double? right;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: top,
      left: left,
      right: right,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          boxShadow: [
            BoxShadow(
              color: color,
              blurRadius: 60,
              spreadRadius: 30,
            ),
          ],
        ),
      ),
    );
  }
}
