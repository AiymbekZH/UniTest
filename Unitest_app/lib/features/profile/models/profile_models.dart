/// Models for the `/api/profile/*` endpoints.
///
/// Mirrors `buildPublicUserPayload` / `buildOwnUserPayload` /
/// `buildProfileResponse` in `server/routes/profile.js`. Fields the mobile
/// UI never reads (e.g. internal flags) are intentionally omitted.
///
/// Convention: every `fromJson` factory is forgiving — missing fields fall
/// back to sensible defaults so a partial backend response (e.g. an old
/// account without `headline`) doesn't crash the page.
library;

import 'package:flutter/foundation.dart';

/// User snapshot displayed on a profile page. The OWN profile additionally
/// carries `email`, `language`, `aiAccess` — see [ProfileUser.isOwn].
@immutable
class ProfileUser {
  const ProfileUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.middleName = '',
    this.username,
    this.uniqueId,
    this.avatar = '',
    this.coverImage = '',
    this.coverPreset = 'aurora',
    this.headline = '',
    this.bio = '',
    this.email,
    this.language,
    this.aiAccess = false,
    this.createdAt,
  });

  factory ProfileUser.fromJson(Map<String, dynamic> json) {
    return ProfileUser(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      middleName: (json['middleName'] ?? '').toString(),
      role: (json['role'] ?? 'student').toString(),
      username: json['username'] as String?,
      uniqueId: json['uniqueId'] as String?,
      avatar: (json['avatar'] ?? '').toString(),
      coverImage: (json['coverImage'] ?? '').toString(),
      coverPreset: (json['coverPreset'] ?? 'aurora').toString(),
      headline: (json['headline'] ?? '').toString(),
      bio: (json['bio'] ?? '').toString(),
      email: json['email'] as String?,
      language: json['language'] as String?,
      aiAccess: json['aiAccess'] == true,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String middleName;
  final String role;
  final String? username;
  final String? uniqueId;
  final String avatar;
  final String coverImage;
  final String coverPreset;
  final String headline;
  final String bio;
  final DateTime? createdAt;

  // ── Own-profile-only fields ────────────────────────────────────────
  final String? email;
  final String? language;
  final bool aiAccess;

  bool get isOwn => email != null;

  String get fullName {
    final parts = [
      lastName,
      firstName,
      if (middleName.isNotEmpty) middleName,
    ];
    return parts.where((p) => p.isNotEmpty).join(' ');
  }

  /// Display handle: `@<username>` if set, else `@<uniqueId>` lowercased,
  /// else `@user` as a last-ditch fallback. Matches web `getDisplayHandle`.
  String get displayHandle {
    if (username != null && username!.isNotEmpty) return '@$username';
    if (uniqueId != null && uniqueId!.isNotEmpty) {
      return '@${uniqueId!.toLowerCase()}';
    }
    return '@user';
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    final value = '$f$l'.toUpperCase();
    return value.isEmpty ? 'U' : value;
  }

  ProfileUser copyWith({
    String? avatar,
    String? coverImage,
    String? coverPreset,
    String? firstName,
    String? lastName,
    String? middleName,
    String? username,
    String? headline,
    String? bio,
    String? language,
  }) {
    return ProfileUser(
      id: id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      middleName: middleName ?? this.middleName,
      role: role,
      username: username ?? this.username,
      uniqueId: uniqueId,
      avatar: avatar ?? this.avatar,
      coverImage: coverImage ?? this.coverImage,
      coverPreset: coverPreset ?? this.coverPreset,
      headline: headline ?? this.headline,
      bio: bio ?? this.bio,
      email: email,
      language: language ?? this.language,
      aiAccess: aiAccess,
      createdAt: createdAt,
    );
  }
}

/// One unlocked badge on a user's progress. Backend returns the raw key —
/// the UI looks up the localized label via `profileBadgeLabels` (mirrored
/// in our ARB files).
@immutable
class ProfileBadge {
  const ProfileBadge({required this.key, this.unlockedAt});

  factory ProfileBadge.fromJson(Map<String, dynamic> json) {
    return ProfileBadge(
      key: (json['key'] ?? '').toString(),
      unlockedAt: _parseDate(json['unlockedAt']),
    );
  }

  final String key;
  final DateTime? unlockedAt;
}

/// XP / level / streak / badges. Mirrors `getProgressSummary` server-side.
@immutable
class ProgressSummary {
  const ProgressSummary({
    this.xp = 0,
    this.level = 1,
    this.currentStreakDays = 0,
    this.longestStreakDays = 0,
    this.totalCompleted = 0,
    this.perfectScores = 0,
    this.lastActivityDate,
    this.badges = const [],
    this.levelProgress = 0,
    this.xpToNextLevel = 0,
  });

  factory ProgressSummary.fromJson(Map<String, dynamic> json) {
    final stats = (json['stats'] is Map)
        ? json['stats'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final levelMeta = (json['levelMeta'] is Map)
        ? json['levelMeta'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final badgesRaw = json['badges'];
    return ProgressSummary(
      xp: _toInt(json['xp']),
      level: _toInt(json['level'], fallback: 1),
      currentStreakDays: _toInt(json['currentStreakDays']),
      longestStreakDays: _toInt(json['longestStreakDays']),
      totalCompleted: _toInt(stats['totalCompleted']),
      perfectScores: _toInt(stats['perfectScores']),
      lastActivityDate: _parseDate(json['lastActivityDate']),
      badges: badgesRaw is List
          ? badgesRaw
              .whereType<Map<String, dynamic>>()
              .map(ProfileBadge.fromJson)
              .toList(growable: false)
          : const [],
      levelProgress: _toInt(levelMeta['progress']),
      xpToNextLevel: _toInt(levelMeta['xpToNext']),
    );
  }

  final int xp;
  final int level;
  final int currentStreakDays;
  final int longestStreakDays;
  final int totalCompleted;
  final int perfectScores;
  final DateTime? lastActivityDate;
  final List<ProfileBadge> badges;

  /// 0..100 — % towards next level. May be 0 if backend doesn't compute it.
  final int levelProgress;
  final int xpToNextLevel;
}

/// Statistics for users who create tests (teachers + students alike).
@immutable
class CreatorStats {
  const CreatorStats({
    this.testsCreated = 0,
    this.testsTaken = 0,
    this.totalScore = 0,
    this.publicTestsCount = 0,
    this.publicPlays = 0,
    this.publicAverageRating = 0,
  });

  factory CreatorStats.fromJson(Map<String, dynamic> json) {
    return CreatorStats(
      testsCreated: _toInt(json['testsCreated']),
      testsTaken: _toInt(json['testsTaken']),
      totalScore: _toInt(json['totalScore']),
      publicTestsCount: _toInt(json['publicTestsCount']),
      publicPlays: _toInt(json['publicPlays']),
      publicAverageRating: _toDouble(json['publicAverageRating']),
    );
  }

  final int testsCreated;
  final int testsTaken;
  final int totalScore;
  final int publicTestsCount;
  final int publicPlays;
  final double publicAverageRating;
}

@immutable
class FollowCounts {
  const FollowCounts({
    this.followersCount = 0,
    this.followingCount = 0,
  });

  factory FollowCounts.fromJson(Map<String, dynamic> json) => FollowCounts(
        followersCount: _toInt(json['followersCount']),
        followingCount: _toInt(json['followingCount']),
      );

  final int followersCount;
  final int followingCount;
}

@immutable
class FollowState {
  const FollowState({this.isFollowing = false});

  factory FollowState.fromJson(Map<String, dynamic> json) =>
      FollowState(isFollowing: json['isFollowing'] == true);

  final bool isFollowing;
}

/// Lightweight test card shown on the profile portfolio grid. Full test
/// payload is fetched separately when the user taps a card.
@immutable
class PublicTestPreview {
  const PublicTestPreview({
    required this.id,
    required this.title,
    this.shareLink = '',
    this.coverImage = '',
    this.rating = 0,
    this.ratingCount = 0,
    this.attemptCount = 0,
    this.questionCount = 0,
    this.tags = const [],
    this.createdAt,
  });

  factory PublicTestPreview.fromJson(Map<String, dynamic> json) {
    final questions = json['questions'];
    final tagsRaw = json['tags'];
    return PublicTestPreview(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      shareLink: (json['shareLink'] ?? '').toString(),
      coverImage: (json['coverImage'] ?? '').toString(),
      rating: _toDouble(json['rating']),
      ratingCount: _toInt(json['ratingCount']),
      attemptCount: _toInt(json['attemptCount']),
      questionCount: questions is List ? questions.length : 0,
      tags: tagsRaw is List
          ? tagsRaw.map((t) => t.toString()).toList(growable: false)
          : const [],
      createdAt: _parseDate(json['createdAt']),
    );
  }

  final String id;
  final String title;
  final String shareLink;
  final String coverImage;
  final double rating;
  final int ratingCount;
  final int attemptCount;
  final int questionCount;
  final List<String> tags;
  final DateTime? createdAt;
}

/// Aggregated payload returned by `/profile/me`, `/profile/:id`, or
/// `/profile/by-username/:username`.
@immutable
class ProfileResponse {
  const ProfileResponse({
    required this.user,
    required this.progress,
    required this.creatorStats,
    required this.followCounts,
    required this.publicTests,
    this.followState = const FollowState(),
  });

  factory ProfileResponse.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    if (userJson is! Map<String, dynamic>) {
      throw const FormatException('Profile response missing `user`');
    }
    final tests = json['publicTests'];
    return ProfileResponse(
      user: ProfileUser.fromJson(userJson),
      progress: ProgressSummary.fromJson(
        (json['progressSummary'] is Map<String, dynamic>)
            ? json['progressSummary'] as Map<String, dynamic>
            : const {},
      ),
      creatorStats: CreatorStats.fromJson(
        (json['creatorStats'] is Map<String, dynamic>)
            ? json['creatorStats'] as Map<String, dynamic>
            : const {},
      ),
      followCounts: FollowCounts.fromJson(
        (json['followCounts'] is Map<String, dynamic>)
            ? json['followCounts'] as Map<String, dynamic>
            : const {},
      ),
      followState: FollowState.fromJson(
        (json['followState'] is Map<String, dynamic>)
            ? json['followState'] as Map<String, dynamic>
            : const {},
      ),
      publicTests: tests is List
          ? tests
              .whereType<Map<String, dynamic>>()
              .map(PublicTestPreview.fromJson)
              .toList(growable: false)
          : const [],
    );
  }

  final ProfileUser user;
  final ProgressSummary progress;
  final CreatorStats creatorStats;
  final FollowCounts followCounts;
  final FollowState followState;
  final List<PublicTestPreview> publicTests;

  ProfileResponse copyWith({
    ProfileUser? user,
    FollowCounts? followCounts,
    FollowState? followState,
  }) {
    return ProfileResponse(
      user: user ?? this.user,
      progress: progress,
      creatorStats: creatorStats,
      followCounts: followCounts ?? this.followCounts,
      followState: followState ?? this.followState,
      publicTests: publicTests,
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

int _toInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

double _toDouble(Object? value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

DateTime? _parseDate(Object? value) {
  if (value is DateTime) return value;
  if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
  return null;
}
