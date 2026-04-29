import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_endpoints.dart';
import '../api/api_exceptions.dart';
import '../api/dio_client.dart';
import 'auth_user.dart';
import 'token_storage.dart';

/// Talks to `/api/auth/*`. Exposes pure functions: success returns data,
/// failure throws `ApiException`. The state controller (`AuthController`)
/// is responsible for translating those into UI state.
class AuthRepository {
  AuthRepository(this._dio, this._tokenStorage);

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /// Mirrors POST /api/auth/login.
  /// Backend returns `{ token, user: <buildAuthPayload> }`.
  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    return _safe(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.authLogin,
        data: {'email': email.trim().toLowerCase(), 'password': password},
      );
      return _persistAndReturn(response.data);
    });
  }

  /// POST /api/auth/register.
  Future<AuthUser> register({
    required String firstName,
    required String lastName,
    required String middleName,
    required String email,
    required String password,
    required String role, // 'student' | 'teacher'
  }) async {
    return _safe(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.authRegister,
        data: {
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'middleName': middleName.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
          'role': role,
        },
      );
      return _persistAndReturn(response.data);
    });
  }

  /// GET /api/auth/me. Used on app startup to hydrate the user without
  /// asking for credentials again. Throws `UnauthorizedException` if the
  /// token is invalid — caller should treat that as logged out.
  Future<AuthUser> fetchCurrent() async {
    return _safe(() async {
      final response =
          await _dio.get<Map<String, dynamic>>(ApiEndpoints.authMe);
      final body = response.data;
      if (body == null) {
        throw const UnknownApiException('Empty /auth/me payload');
      }
      final raw = body['user'];
      if (raw is! Map<String, dynamic>) {
        throw const UnknownApiException('Malformed /auth/me payload');
      }
      return AuthUser.fromJson(raw);
    });
  }

  /// GET /api/auth/me/profile-image — lazily loads avatar/cover after
  /// `/auth/me` returns the lightweight payload (~600KB image excluded).
  Future<({String avatar, String coverImage, String coverPreset})>
      fetchProfileImages() async {
    return _safe(() async {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.authMeProfileImage,
      );
      final body = response.data ?? const <String, dynamic>{};
      return (
        avatar: (body['avatar'] ?? '').toString(),
        coverImage: (body['coverImage'] ?? '').toString(),
        coverPreset: (body['coverPreset'] ?? 'aurora').toString(),
      );
    });
  }

  /// POST /api/auth/forgot-password. Always succeeds (backend returns
  /// the same generic message for unknown emails to prevent enumeration).
  Future<void> forgotPassword(String email) async {
    await _safe(() async {
      await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.authForgotPassword,
        data: {'email': email.trim().toLowerCase()},
      );
    });
  }

  /// POST /api/auth/reset-password.
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _safe(() async {
      await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.authResetPassword,
        data: {'token': token, 'password': newPassword},
      );
    });
  }

  /// POST /api/auth/logout — clears server cookie (no-op for mobile, but
  /// safe to call) AND drops the local token.
  Future<void> logout() async {
    try {
      await _dio.post<Map<String, dynamic>>(ApiEndpoints.authLogout);
    } catch (_) {
      // Logging out should never fail loud — even on network error we
      // still wipe the local token below.
    }
    await _tokenStorage.clear();
  }

  // ── helpers ────────────────────────────────────────────────
  Future<AuthUser> _persistAndReturn(Map<String, dynamic>? body) async {
    if (body == null) {
      throw const UnknownApiException('Empty auth payload');
    }
    final token = body['token'];
    final raw = body['user'];
    if (token is! String || token.isEmpty) {
      throw const UnknownApiException('Missing token in auth payload');
    }
    if (raw is! Map<String, dynamic>) {
      throw const UnknownApiException('Missing user in auth payload');
    }
    await _tokenStorage.write(token);
    return AuthUser.fromJson(raw);
  }

  /// Wraps an HTTP call so dio's `DioException` (which carries the
  /// translated `ApiException` in its `.error` field — see
  /// `_ErrorTranslatingInterceptor` in `dio_client.dart`) is unwrapped
  /// and re-thrown as the typed `ApiException` callers expect.
  Future<T> _safe<T>(Future<T> Function() op) async {
    try {
      return await op();
    } on DioException catch (e) {
      final err = e.error;
      if (err is ApiException) throw err;
      throw UnknownApiException(e.message ?? 'Unknown network error');
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  final tokenStorage = ref.read(tokenStorageProvider);
  return AuthRepository(dio, tokenStorage);
});
