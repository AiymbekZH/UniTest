import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exceptions.dart';
import 'auth_repository.dart';
import 'auth_user.dart';
import 'token_storage.dart';

/// Three-state auth machine read by the router and most pages.
///
/// - `bootstrapping` — app just launched, we don't yet know if the saved
///   token is valid. Show splash; the router redirects nowhere.
/// - `signedOut`     — no token, or `/auth/me` returned 401. Router
///   sends to `/login`.
/// - `signedIn`      — `/auth/me` succeeded; `user` is populated.
sealed class AuthState {
  const AuthState();
}

class AuthBootstrapping extends AuthState {
  const AuthBootstrapping();
}

class AuthSignedOut extends AuthState {
  const AuthSignedOut({this.message});

  /// Optional message to surface on the auth screen (e.g. session expired).
  final String? message;
}

class AuthSignedIn extends AuthState {
  const AuthSignedIn(this.user);
  final AuthUser user;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository, this._tokenStorage)
      : super(const AuthBootstrapping());

  final AuthRepository _repository;
  final TokenStorage _tokenStorage;

  /// Called once on app startup. Reads the stored token; if present,
  /// asks `/auth/me` whether it's still valid. On 401 silently transitions
  /// to `signedOut`.
  Future<void> bootstrap() async {
    final token = await _tokenStorage.read();
    if (token == null || token.isEmpty) {
      state = const AuthSignedOut();
      return;
    }
    try {
      final user = await _repository.fetchCurrent();
      state = AuthSignedIn(user);
      _hydrateProfileImagesInBackground();
    } on UnauthorizedException {
      // Stored token expired or revoked.
      state = const AuthSignedOut();
    } on ForbiddenException catch (e) {
      // Banned user — show the reason on the login screen.
      await _tokenStorage.clear();
      state = AuthSignedOut(message: e.reason ?? e.message);
    } on ApiException {
      // Network error or server hiccup — we don't want to flush the
      // user out of the app over a flaky connection. Pretend we're still
      // signed in but with an empty profile image. The next request that
      // gets 401 will trigger the proper logout.
      state = AuthSignedOut(message: 'Не удалось проверить сессию. Попробуйте снова.');
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = const AuthBootstrapping();
    try {
      final user = await _repository.login(email: email, password: password);
      state = AuthSignedIn(user);
      _hydrateProfileImagesInBackground();
    } on ApiException catch (e) {
      state = AuthSignedOut(message: e.message);
      rethrow;
    }
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    required String middleName,
    required String email,
    required String password,
    required String role,
  }) async {
    state = const AuthBootstrapping();
    try {
      final user = await _repository.register(
        firstName: firstName,
        lastName: lastName,
        middleName: middleName,
        email: email,
        password: password,
        role: role,
      );
      state = AuthSignedIn(user);
      _hydrateProfileImagesInBackground();
    } on ApiException catch (e) {
      state = AuthSignedOut(message: e.message);
      rethrow;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthSignedOut();
  }

  /// Replace the cached user with new data (e.g. after profile edit).
  void updateUser(AuthUser user) {
    state = AuthSignedIn(user);
  }

  // ── helpers ─────────────────────────────────────────────────────────
  void _hydrateProfileImagesInBackground() {
    // /auth/me intentionally excludes avatar / coverImage (~600KB each).
    // We fetch them lazily so the splash screen unblocks fast.
    Future<void>(() async {
      try {
        final images = await _repository.fetchProfileImages();
        final current = state;
        if (current is AuthSignedIn) {
          state = AuthSignedIn(
            current.user.copyWith(
              avatar: images.avatar,
              coverImage: images.coverImage,
              coverPreset: images.coverPreset,
            ),
          );
        }
      } catch (_) {
        // Non-fatal — UI shows initials placeholder until next try.
      }
    });
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  final repository = ref.read(authRepositoryProvider);
  final tokenStorage = ref.read(tokenStorageProvider);
  return AuthController(repository, tokenStorage);
});

/// Convenience: `final user = ref.watch(currentUserProvider);` returns null
/// when not signed in.
final currentUserProvider = Provider<AuthUser?>((ref) {
  final state = ref.watch(authControllerProvider);
  return state is AuthSignedIn ? state.user : null;
});
