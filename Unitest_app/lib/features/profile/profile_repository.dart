import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_endpoints.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/api/dio_client.dart';
import 'models/profile_models.dart';

/// Talks to `/api/profile/*`. Stateless — caching lives in
/// `profile_controllers.dart` (Riverpod). Failures throw typed
/// `ApiException` so the UI can surface a friendly toast.
class ProfileRepository {
  ProfileRepository(this._dio);

  final Dio _dio;

  /// `GET /api/profile/me` — full self-profile aggregate.
  Future<ProfileResponse> fetchMyProfile() async {
    return _safe(() async {
      final res =
          await _dio.get<Map<String, dynamic>>(ApiEndpoints.profileMe);
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty profile response');
      }
      return ProfileResponse.fromJson(body);
    });
  }

  /// `GET /api/profile/:id` — public profile by Mongo `_id`.
  Future<ProfileResponse> fetchUserProfile(String userId) async {
    return _safe(() async {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.profileById(userId),
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty profile response');
      }
      return ProfileResponse.fromJson(body);
    });
  }

  /// `GET /api/profile/by-username/:username` — public profile by handle
  /// (without the `@`). 404 if the username doesn't exist.
  Future<ProfileResponse> fetchUserProfileByUsername(String username) async {
    return _safe(() async {
      final cleaned = username.trim().replaceFirst(RegExp(r'^@'), '');
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.profileByUsername(cleaned),
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty profile response');
      }
      return ProfileResponse.fromJson(body);
    });
  }

  /// `PUT /api/profile/me` — update editable fields. Pass `null` to skip.
  /// Returns the updated [ProfileUser] (own payload).
  Future<ProfileUser> updateMyProfile({
    String? firstName,
    String? lastName,
    String? middleName,
    String? username,
    String? headline,
    String? bio,
    String? coverPreset,
    String? language,
  }) async {
    return _safe(() async {
      final data = <String, dynamic>{};
      if (firstName != null) data['firstName'] = firstName;
      if (lastName != null) data['lastName'] = lastName;
      if (middleName != null) data['middleName'] = middleName;
      if (username != null) data['username'] = username;
      if (headline != null) data['headline'] = headline;
      if (bio != null) data['bio'] = bio;
      if (coverPreset != null) data['coverPreset'] = coverPreset;
      if (language != null) data['language'] = language;

      final res = await _dio.put<Map<String, dynamic>>(
        ApiEndpoints.profileMe,
        data: data,
      );
      final body = res.data;
      if (body == null || body['user'] is! Map<String, dynamic>) {
        throw const UnknownApiException('Malformed update response');
      }
      return ProfileUser.fromJson(body['user'] as Map<String, dynamic>);
    });
  }

  /// `POST /api/profile/avatar` — multipart upload. Backend stores as
  /// base64 data URL inside MongoDB (see `routes/profile.js`). Max 10 MB
  /// server-side; we additionally cap to 5 MB before upload.
  Future<ProfileUser> uploadAvatar(File file) async {
    return _safe(() async {
      final form = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(
          file.path,
          filename: file.uri.pathSegments.last,
        ),
      });
      final res = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.profileAvatar,
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      final body = res.data;
      if (body == null || body['user'] is! Map<String, dynamic>) {
        throw const UnknownApiException('Malformed avatar response');
      }
      return ProfileUser.fromJson(body['user'] as Map<String, dynamic>);
    });
  }

  /// `POST /api/profile/banner` — multipart upload (cover image).
  Future<ProfileUser> uploadBanner(File file) async {
    return _safe(() async {
      final form = FormData.fromMap({
        'banner': await MultipartFile.fromFile(
          file.path,
          filename: file.uri.pathSegments.last,
        ),
      });
      final res = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.profileBanner,
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      final body = res.data;
      if (body == null || body['user'] is! Map<String, dynamic>) {
        throw const UnknownApiException('Malformed banner response');
      }
      return ProfileUser.fromJson(body['user'] as Map<String, dynamic>);
    });
  }

  /// `DELETE /api/profile/banner` — clears `coverImage` (preset gradient
  /// becomes visible again).
  Future<ProfileUser> removeBanner() async {
    return _safe(() async {
      final res = await _dio.delete<Map<String, dynamic>>(
        ApiEndpoints.profileBanner,
      );
      final body = res.data;
      if (body == null || body['user'] is! Map<String, dynamic>) {
        throw const UnknownApiException('Malformed banner-remove response');
      }
      return ProfileUser.fromJson(body['user'] as Map<String, dynamic>);
    });
  }

  /// `PUT /api/profile/password` — verify current + set new.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _safe(() async {
      await _dio.put<Map<String, dynamic>>(
        ApiEndpoints.profilePassword,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    });
  }

  /// `POST /api/profile/:id/follow`. Returns updated counts + state.
  Future<({FollowState followState, FollowCounts counts})> follow(
    String userId,
  ) async {
    return _safe(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.profileFollow(userId),
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty follow response');
      }
      return (
        followState: FollowState.fromJson(
          (body['followState'] is Map<String, dynamic>)
              ? body['followState'] as Map<String, dynamic>
              : const {},
        ),
        counts: FollowCounts.fromJson(
          (body['followCounts'] is Map<String, dynamic>)
              ? body['followCounts'] as Map<String, dynamic>
              : const {},
        ),
      );
    });
  }

  /// `DELETE /api/profile/:id/follow`.
  Future<({FollowState followState, FollowCounts counts})> unfollow(
    String userId,
  ) async {
    return _safe(() async {
      final res = await _dio.delete<Map<String, dynamic>>(
        ApiEndpoints.profileFollow(userId),
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty unfollow response');
      }
      return (
        followState: FollowState.fromJson(
          (body['followState'] is Map<String, dynamic>)
              ? body['followState'] as Map<String, dynamic>
              : const {},
        ),
        counts: FollowCounts.fromJson(
          (body['followCounts'] is Map<String, dynamic>)
              ? body['followCounts'] as Map<String, dynamic>
              : const {},
        ),
      );
    });
  }

  /// `GET /api/profile/:id/followers` — light user list.
  Future<List<ProfileUser>> fetchFollowers(String userId) =>
      _fetchUserList(ApiEndpoints.profileFollowers(userId));

  /// `GET /api/profile/:id/following`.
  Future<List<ProfileUser>> fetchFollowing(String userId) =>
      _fetchUserList(ApiEndpoints.profileFollowing(userId));

  Future<List<ProfileUser>> _fetchUserList(String path) async {
    return _safe(() async {
      final res = await _dio.get<Map<String, dynamic>>(path);
      final body = res.data;
      final users = body?['users'];
      if (users is! List) return const <ProfileUser>[];
      return users
          .whereType<Map<String, dynamic>>()
          .map(ProfileUser.fromJson)
          .toList(growable: false);
    });
  }

  /// `GET /api/profile/check-username?value=…` — returns availability.
  /// Used while the user is typing in the edit form.
  Future<({bool available, String? reason})> checkUsername(
    String value,
  ) async {
    return _safe(() async {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.profileCheckUsername,
        queryParameters: {'value': value},
      );
      final body = res.data ?? const <String, dynamic>{};
      return (
        available: body['available'] == true,
        reason: body['reason'] as String?,
      );
    });
  }

  /// Wraps an HTTP call so dio's `DioException` (which carries the
  /// translated `ApiException` in its `.error` field) is unwrapped.
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

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return ProfileRepository(dio);
});
