import 'dart:convert';
import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Avatar with a graceful initials fallback (`AI` for "Andez Ivanov").
///
/// Backend serves `data:image/...` base64 strings AND occasionally http
/// URLs (Google profile pictures), so we handle both via the same widget.
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    required this.firstName,
    required this.lastName,
    this.imageUrl,
    this.size = 40,
    this.onTap,
  });

  final String firstName;
  final String lastName;
  final String? imageUrl;
  final double size;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final initials = _initials();
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;

    final fallback = Container(
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: AppColors.primary100,
        shape: BoxShape.circle,
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: AppColors.primary700,
          fontSize: size * 0.4,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
    );

    Widget child = hasImage
        ? ClipOval(
            child: imageUrl!.startsWith('data:')
                ? Image.memory(
                    _decodeBase64(imageUrl!),
                    width: size,
                    height: size,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => fallback,
                  )
                : CachedNetworkImage(
                    imageUrl: imageUrl!,
                    width: size,
                    height: size,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => fallback,
                    errorWidget: (_, __, ___) => fallback,
                  ),
          )
        : fallback;

    child = SizedBox(width: size, height: size, child: child);

    if (onTap != null) {
      child = InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: child,
      );
    }

    return child;
  }

  String _initials() {
    final f = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final l = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    final combined = '$f$l';
    return combined.isEmpty ? '?' : combined;
  }
}

/// Strip the `data:image/png;base64,` prefix and decode the rest.
/// Returns an empty Uint8List on malformed input so the widget falls
/// back to the initials placeholder.
Uint8List _decodeBase64(String dataUri) {
  try {
    final commaIdx = dataUri.indexOf(',');
    if (commaIdx == -1) return Uint8List(0);
    return base64.decode(dataUri.substring(commaIdx + 1));
  } catch (_) {
    return Uint8List(0);
  }
}
