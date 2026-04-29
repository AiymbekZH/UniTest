import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';

/// Handles `unitest://` and `https://unitest.page/...` deep links the OS
/// passes to the app. Translates them into in-app routes via [GoRouter].
///
/// Supported URLs:
///   - `unitest://reset/<token>`               → `/reset-password/<token>`
///   - `https://unitest.page/reset-password/<token>` (universal link, optional)
///                                              → `/reset-password/<token>`
///   - `unitest://u/<idOrUsername>`            → `/u/<idOrUsername>`
///   - `https://unitest.page/u/<idOrUsername>`  → same
///
/// Both the "cold start" link (app launched by the URL) and "warm" links
/// (app already running, OS reactivates it) are wired up.
class DeepLinkService {
  DeepLinkService(this._router);

  final GoRouter _router;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  /// Call once during app startup, after the router is created.
  /// Idempotent — safe to invoke multiple times in dev hot-restart.
  Future<void> init() async {
    await _consumeInitialLink();
    _sub?.cancel();
    _sub = _appLinks.uriLinkStream.listen(
      _handleUri,
      onError: (Object e, StackTrace s) {
        debugPrint('Deep link stream error: $e');
      },
    );
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
  }

  Future<void> _consumeInitialLink() async {
    try {
      final uri = await _appLinks.getInitialLink();
      if (uri != null) _handleUri(uri);
    } catch (e) {
      debugPrint('Failed to read initial deep link: $e');
    }
  }

  void _handleUri(Uri uri) {
    final route = _toRoute(uri);
    if (route == null) {
      debugPrint('Ignoring unknown deep link: $uri');
      return;
    }
    debugPrint('Deep link → $route');
    _router.go(route);
  }

  /// Pure function: convert a [Uri] to an in-app path or null if it's
  /// nothing we know how to handle.
  ///
  /// Strategy: drop scheme + host + leading slashes, then match on path
  /// segments so both `unitest://` and `https://unitest.page` work the
  /// same way.
  String? _toRoute(Uri uri) {
    final segments =
        uri.pathSegments.where((s) => s.isNotEmpty).toList(growable: false);

    // Custom scheme uses host as the first segment too: `unitest://reset/abc`
    // arrives with host=reset, pathSegments=[abc]. Normalise.
    final host = uri.host.isNotEmpty ? uri.host : '';
    final allSegments = host.isNotEmpty && _knownHostPrefix.contains(host)
        ? [host, ...segments]
        : segments;

    if (allSegments.isEmpty) return null;

    if (allSegments[0] == 'reset' || allSegments[0] == 'reset-password') {
      // unitest://reset/<token>   OR   https://unitest.page/reset-password/<token>
      final token = allSegments.length > 1 ? allSegments[1] : null;
      // Some web URLs append `?token=<token>` as well — fall through to that.
      final tokenFromQuery = uri.queryParameters['token'];
      final finalToken = (token != null && token.isNotEmpty)
          ? token
          : (tokenFromQuery ?? '');
      if (finalToken.isEmpty) return null;
      return AppRoute.resetPasswordTo(finalToken);
    }

    if (allSegments[0] == 'u' && allSegments.length > 1) {
      return AppRoute.userProfileTo(allSegments[1]);
    }

    if (allSegments[0] == 'test-profile' && allSegments.length > 1) {
      // unitest://test-profile/<shareLink>  /  https://unitest.page/test-profile/<shareLink>
      return AppRoute.testDetailTo(allSegments[1]);
    }

    return null;
  }

  static const _knownHostPrefix = {
    'reset',
    'reset-password',
    'u',
    'test-profile',
  };
}

final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  final router = ref.read(goRouterProvider);
  final service = DeepLinkService(router);
  ref.onDispose(service.dispose);
  return service;
});
