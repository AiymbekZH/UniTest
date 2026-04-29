import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_state.dart';
import '../../core/auth/auth_user.dart';
import 'models/profile_models.dart';
import 'profile_repository.dart';

/// Riverpod plumbing for the profile feature.
///
/// Two notifier types:
/// - [MyProfileNotifier] — owns the *own* profile (`/profile/me`). Edits
///   (rename, avatar/banner upload, etc.) update local state AND broadcast
///   to `AuthController` so the rest of the app re-renders the new avatar.
/// - [UserProfileNotifier] — owns *another* user's profile, keyed by id
///   (or `@username`). Handles follow / unfollow with optimistic counts.

class MyProfileNotifier extends AsyncNotifier<ProfileResponse> {
  late final ProfileRepository _repo;

  @override
  Future<ProfileResponse> build() async {
    _repo = ref.read(profileRepositoryProvider);
    return _repo.fetchMyProfile();
  }

  /// Pull-to-refresh.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_repo.fetchMyProfile);
  }

  /// Save name / username / headline / bio / coverPreset / language.
  /// Returns the updated user so the screen can pop with success.
  Future<ProfileUser> save({
    String? firstName,
    String? lastName,
    String? middleName,
    String? username,
    String? headline,
    String? bio,
    String? coverPreset,
    String? language,
  }) async {
    final updated = await _repo.updateMyProfile(
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      username: username,
      headline: headline,
      bio: bio,
      coverPreset: coverPreset,
      language: language,
    );
    _patchUser(updated);
    return updated;
  }

  Future<void> uploadAvatar(File file) async {
    final updated = await _repo.uploadAvatar(file);
    _patchUser(updated);
  }

  Future<void> uploadBanner(File file) async {
    final updated = await _repo.uploadBanner(file);
    _patchUser(updated);
  }

  Future<void> removeBanner() async {
    final updated = await _repo.removeBanner();
    _patchUser(updated);
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _repo.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }

  /// Merge `updated` into both the local cache and the auth controller so
  /// every place that watches `currentUserProvider` (Navbar, drawer, etc.)
  /// reflects the change immediately.
  void _patchUser(ProfileUser updated) {
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncValue.data(current.copyWith(user: updated));
    }
    ref.read(authControllerProvider.notifier).updateUser(_toAuthUser(updated));
  }
}

/// Notifier for `/profile/:id` — another user's public profile.
class UserProfileNotifier
    extends FamilyAsyncNotifier<ProfileResponse, String> {
  late final ProfileRepository _repo;
  late String _idOrUsername;

  @override
  Future<ProfileResponse> build(String idOrUsername) async {
    _repo = ref.read(profileRepositoryProvider);
    _idOrUsername = idOrUsername;
    return _load();
  }

  Future<ProfileResponse> _load() {
    final value = _idOrUsername.startsWith('@')
        ? _repo.fetchUserProfileByUsername(_idOrUsername)
        : _repo.fetchUserProfile(_idOrUsername);
    return value;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_load);
  }

  /// Toggles the follow state with optimistic UI: the counts and button
  /// flip immediately, and snap back if the server rejects the request.
  Future<void> toggleFollow() async {
    final current = state.valueOrNull;
    if (current == null) return;
    final wasFollowing = current.followState.isFollowing;
    final delta = wasFollowing ? -1 : 1;

    state = AsyncValue.data(current.copyWith(
      followState: FollowState(isFollowing: !wasFollowing),
      followCounts: FollowCounts(
        followersCount:
            (current.followCounts.followersCount + delta).clamp(0, 1 << 30),
        followingCount: current.followCounts.followingCount,
      ),
    ));

    try {
      final result = wasFollowing
          ? await _repo.unfollow(current.user.id)
          : await _repo.follow(current.user.id);
      final latest = state.valueOrNull ?? current;
      state = AsyncValue.data(latest.copyWith(
        followState: result.followState,
        followCounts: result.counts,
      ));
    } catch (_) {
      // Roll back optimistic flip.
      state = AsyncValue.data(current);
      rethrow;
    }
  }
}

final myProfileProvider =
    AsyncNotifierProvider<MyProfileNotifier, ProfileResponse>(
  MyProfileNotifier.new,
);

final userProfileProvider = AsyncNotifierProvider.family<UserProfileNotifier,
    ProfileResponse, String>(
  UserProfileNotifier.new,
);

// ── Helpers ──────────────────────────────────────────────────────────

/// Converts a [ProfileUser] (returned by `/profile/me` endpoints) to an
/// [AuthUser] (used by `AuthController` and the rest of the app). Most
/// fields map 1:1; lazy-loaded image fields are preserved when missing.
AuthUser _toAuthUser(ProfileUser p) {
  return AuthUser(
    id: p.id,
    email: p.email ?? '',
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName,
    role: p.role,
    username: p.username,
    uniqueId: p.uniqueId,
    headline: p.headline,
    bio: p.bio,
    coverPreset: p.coverPreset,
    language: p.language ?? 'en',
    aiAccess: p.aiAccess,
    avatar: p.avatar.isNotEmpty ? p.avatar : null,
    coverImage: p.coverImage.isNotEmpty ? p.coverImage : null,
  );
}
