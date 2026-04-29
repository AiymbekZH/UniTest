/// All API endpoints used by the mobile client.
///
/// Mirrors `server/index.js` route mounting:
///
///   app.use('/api/auth',          authRoutes);
///   app.use('/api/tests',         testRoutes);
///   app.use('/api/results',       resultRoutes);
///   …
///
/// Keep these strings in ONE place so renaming a backend route updates
/// all callers in a single PR.
class ApiEndpoints {
  ApiEndpoints._();

  /// Base URL for the API. Override at build time:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api`
  ///
  /// Defaults to production. Android emulator uses `10.0.2.2` (NOT
  /// `localhost`) to reach the host machine.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://unitest.page/api',
  );

  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'https://unitest.page',
  );

  // ── Auth ────────────────────────────────────────────────────────────
  static const String authLogin            = '/auth/login';
  static const String authRegister         = '/auth/register';
  static const String authLogout           = '/auth/logout';
  static const String authMe               = '/auth/me';
  static const String authMeProfileImage   = '/auth/me/profile-image';
  static const String authForgotPassword   = '/auth/forgot-password';
  static const String authResetPassword    = '/auth/reset-password';
  static const String authActivateAdmin    = '/auth/activate-admin';
  static const String authGoogleStart      = '/auth/google/start';

  // ── Tests ────────────────────────────────────────────────────────────
  static const String tests                = '/tests';
  static const String testsMy              = '/tests/my';
  static String testByShareLink(String shareLink) => '/tests/share/$shareLink';
  static String testById(String id)            => '/tests/$id';

  // ── Results ─────────────────────────────────────────────────────────
  static const String results              = '/results';
  static String resultById(String id)      => '/results/$id';
  static String resultsByTest(String testId) => '/results/test/$testId';
  static const String resultsMy            = '/results/my';

  // ── Profile ─────────────────────────────────────────────────────────
  static const String profile              = '/profile';
  static const String profileMe            = '/profile/me';
  static const String profileMeWarnings    = '/profile/me/warnings';
  static const String profileMeComments    = '/profile/me/comments';
  static const String profileMeStats       = '/profile/me/stats';
  static const String profileAvatar        = '/profile/avatar';
  static const String profileBanner        = '/profile/banner';
  static const String profilePassword      = '/profile/password';
  static const String profileCheckUsername = '/profile/check-username';
  static String profileById(String id) => '/profile/$id';
  static String profileByUsername(String username) => '/profile/by-username/$username';
  static String profileFollow(String id) => '/profile/$id/follow';
  static String profileFollowers(String id) => '/profile/$id/followers';
  static String profileFollowing(String id) => '/profile/$id/following';

  // ── Comments ────────────────────────────────────────────────────────
  static String commentsByTest(String testId) => '/comments/test/$testId';
  static String commentById(String id)        => '/comments/$id';

  // ── Notifications ───────────────────────────────────────────────────
  static const String notifications        = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';

  // ── Reports ────────────────────────────────────────────────────────
  static const String reports              = '/reports';

  // ── Groups ──────────────────────────────────────────────────────────
  static const String groups               = '/groups';
  static const String groupsMy             = '/groups/my';
  static String groupById(String id)       => '/groups/$id';
  static String groupMembers(String id)    => '/groups/$id/members';
  static String groupBans(String id)       => '/groups/$id/bans';

  // ── Direct Messages ─────────────────────────────────────────────────
  static const String dm                   = '/dm';
  static String dmThread(String userId)    => '/dm/thread/$userId';

  // ── AI ─────────────────────────────────────────────────────────────
  static const String aiGenerate           = '/ai/generate';
  static const String aiTranslate          = '/ai/translate';

  // ── Progress / Leaderboard ─────────────────────────────────────────
  static const String progress             = '/progress';
  static const String progressLeaderboard  = '/progress/leaderboard';
  static String testLeaderboard(String testId) => '/progress/leaderboard/$testId';

  // ── Challenges ─────────────────────────────────────────────────────
  static const String challenges           = '/challenges';
  static const String challengeDaily       = '/challenges/daily';
  static const String challengeWeekly      = '/challenges/weekly';

  // ── Arena ──────────────────────────────────────────────────────────
  static const String arena                = '/arena';
  static const String arenaRooms           = '/arena/rooms';
  static String arenaByCode(String code)   => '/arena/code/$code';
  static String arenaRoomById(String id)   => '/arena/rooms/$id';
  static String arenaRoomJoin(String id)   => '/arena/rooms/$id/join';

  // ── Question Bank ──────────────────────────────────────────────────
  static const String questionBank         = '/question-bank';

  // ── Arena Tests ────────────────────────────────────────────────────
  static const String arenaTests           = '/arena-tests';

  // ── Admin ──────────────────────────────────────────────────────────
  static const String adminUsers           = '/admin/users';
  static const String adminTests           = '/admin/tests';
  static const String adminResults         = '/admin/results';
  static const String adminStats           = '/admin/stats';
}
