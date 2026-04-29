/// Authenticated user payload returned by `/api/auth/login`,
/// `/api/auth/register`, and `/api/auth/me`.
///
/// Mirrors `buildAuthPayload(user)` in `server/routes/auth.js`. Only fields
/// useful to the mobile UI are decoded here — fields like `loginAttempts`,
/// `passwordResetTokenHash`, etc. are intentionally ignored.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.middleName = '',
    this.username,
    this.uniqueId,
    this.headline = '',
    this.bio = '',
    this.coverPreset = 'aurora',
    this.language = 'en',
    this.aiAccess = false,
    this.avatar,
    this.coverImage,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      middleName: (json['middleName'] ?? '').toString(),
      role: (json['role'] ?? 'student').toString(),
      username: json['username'] as String?,
      uniqueId: json['uniqueId'] as String?,
      headline: (json['headline'] ?? '').toString(),
      bio: (json['bio'] ?? '').toString(),
      coverPreset: (json['coverPreset'] ?? 'aurora').toString(),
      language: (json['language'] ?? 'en').toString(),
      aiAccess: json['aiAccess'] == true,
      avatar: json['avatar'] as String?,
      coverImage: json['coverImage'] as String?,
    );
  }

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String middleName;

  /// `student`, `teacher`, or `admin`.
  final String role;

  /// Public handle, e.g. `@andez`. Optional — older accounts may not have it.
  final String? username;

  /// Internal 12-character unique identifier (used for admin activation).
  final String? uniqueId;

  final String headline;
  final String bio;
  final String coverPreset;
  final String language;
  final bool aiAccess;

  /// Lazy-loaded — `/auth/me` excludes these for performance, fetch via
  /// `/auth/me/profile-image` and merge with `copyWith`.
  final String? avatar;
  final String? coverImage;

  bool get isAdmin => role == 'admin';

  String get fullName {
    final parts = [lastName, firstName, if (middleName.isNotEmpty) middleName];
    return parts.where((p) => p.isNotEmpty).join(' ');
  }

  /// Display handle: `@<username>` if set, else `@<uniqueId>`,
  /// else `@user` as a last resort fallback.
  String get displayHandle {
    if (username != null && username!.isNotEmpty) return '@$username';
    if (uniqueId != null && uniqueId!.isNotEmpty) {
      return '@${uniqueId!.toLowerCase()}';
    }
    return '@user';
  }

  AuthUser copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? middleName,
    String? role,
    String? username,
    String? uniqueId,
    String? headline,
    String? bio,
    String? coverPreset,
    String? language,
    bool? aiAccess,
    String? avatar,
    String? coverImage,
  }) {
    return AuthUser(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      middleName: middleName ?? this.middleName,
      role: role ?? this.role,
      username: username ?? this.username,
      uniqueId: uniqueId ?? this.uniqueId,
      headline: headline ?? this.headline,
      bio: bio ?? this.bio,
      coverPreset: coverPreset ?? this.coverPreset,
      language: language ?? this.language,
      aiAccess: aiAccess ?? this.aiAccess,
      avatar: avatar ?? this.avatar,
      coverImage: coverImage ?? this.coverImage,
    );
  }
}
