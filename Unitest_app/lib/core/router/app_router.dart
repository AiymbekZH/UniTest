import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_state.dart';
import '../../features/auth/login_page.dart';
import '../../features/auth/register_page.dart';
import '../../features/auth/forgot_password_page.dart';
import '../../features/auth/reset_password_page.dart';
import '../../features/auth/splash_page.dart';
import '../../features/dashboard/dashboard_page.dart';
import '../../features/profile/change_password_page.dart';
import '../../features/profile/edit_profile_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/profile/user_profile_page.dart';
import '../../features/main_shell.dart';
import '../../features/messages/messages_page.dart';
import '../../features/arena/arena_hub_page.dart';
import '../../features/tests/test_detail_page.dart';
import '../../features/tests/tests_browse_page.dart';

/// Routes used across the app. String constants — type-safe routing libs
/// like `go_router_builder` were considered but add code-gen overhead for
/// little win on a single-developer project.
abstract class AppRoute {
  // ── Public auth flow ─────────────────────────────────────────────────
  static const splash         = '/';
  static const login          = '/login';
  static const register       = '/register';
  static const forgotPassword = '/forgot-password';

  /// Reset password is a *path-parameter* route so the deep link
  /// `unitest://reset/<token>` and the web URL
  /// `https://unitest.page/reset-password/<token>` share the same shape.
  static const resetPasswordPattern = '/reset-password/:token';
  static String resetPasswordTo(String token) => '/reset-password/$token';

  // ── Tabbed shell ────────────────────────────────────────────────────
  static const dashboard      = '/dashboard';
  static const tests          = '/tests';
  static const arena          = '/arena';
  static const messages       = '/messages';
  static const profile        = '/profile';

  // ── Profile sub-pages (pushed on top of the shell) ───────────────────
  static const profileEdit           = '/profile/edit';
  static const profileChangePassword = '/profile/change-password';

  /// Public profile of any user, by Mongo `_id` or `@username`.
  /// Path: `/u/<idOrUsername>`.
  static const userProfilePattern = '/u/:idOrUsername';
  static String userProfileTo(String idOrUsername) => '/u/$idOrUsername';

  /// Test detail page (cover, meta, leaderboard, ratings, start CTA).
  /// Pushed on top of the shell so the bottom nav stays visible.
  /// Pattern mirrors web: `/test-profile/<shareLink>`.
  static const testDetailPattern = '/test-profile/:shareLink';
  static String testDetailTo(String shareLink) => '/test-profile/$shareLink';
}

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

final goRouterProvider = Provider<GoRouter>((ref) {
  // Re-evaluate redirects whenever auth state flips.
  final authListenable = _AuthChangeNotifier(ref);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoute.splash,
    refreshListenable: authListenable,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final loc = state.matchedLocation;

      final isOnAuthPage = loc == AppRoute.login ||
          loc == AppRoute.register ||
          loc == AppRoute.forgotPassword;
      // Reset password is reachable while signed-out (deep link from
      // an email) AND while signed-in (oversight protection — we don't
      // boot you out of the form just because the email opened later).
      final isOnResetPassword = loc.startsWith('/reset-password/');
      final isOnSplash = loc == AppRoute.splash;

      switch (auth) {
        case AuthBootstrapping():
          // Stay on splash until we know — except for reset password
          // deep links, which work without a session.
          if (isOnSplash || isOnResetPassword) return null;
          return AppRoute.splash;
        case AuthSignedOut():
          if (isOnAuthPage || isOnResetPassword) return null;
          return AppRoute.login;
        case AuthSignedIn():
          if (isOnAuthPage || isOnSplash) return AppRoute.dashboard;
          return null;
      }
    },
    routes: [
      GoRoute(
        path: AppRoute.splash,
        builder: (_, __) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoute.login,
        builder: (_, __) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoute.register,
        builder: (_, __) => const RegisterPage(),
      ),
      GoRoute(
        path: AppRoute.forgotPassword,
        builder: (_, __) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppRoute.resetPasswordPattern,
        builder: (_, state) => ResetPasswordPage(
          token: state.pathParameters['token'] ?? '',
        ),
      ),

      // Edit / change-password / public-user routes are pushed on top of
      // the root navigator so they slide over the bottom-nav shell. Same
      // pattern as native iOS / Material You "details" screens.
      GoRoute(
        path: AppRoute.profileEdit,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const EditProfilePage(),
      ),
      GoRoute(
        path: AppRoute.profileChangePassword,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: AppRoute.userProfilePattern,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => UserProfilePage(
          idOrUsername: state.pathParameters['idOrUsername'] ?? '',
        ),
      ),
      GoRoute(
        path: AppRoute.testDetailPattern,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => TestDetailPage(
          shareLink: state.pathParameters['shareLink'] ?? '',
        ),
      ),

      // Tabbed shell containing the 5 main destinations.
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoute.dashboard,
            pageBuilder: (_, __) => const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: AppRoute.tests,
            pageBuilder: (_, __) => const NoTransitionPage(child: TestsBrowsePage()),
          ),
          GoRoute(
            path: AppRoute.arena,
            pageBuilder: (_, __) => const NoTransitionPage(child: ArenaHubPage()),
          ),
          GoRoute(
            path: AppRoute.messages,
            pageBuilder: (_, __) => const NoTransitionPage(child: MessagesPage()),
          ),
          GoRoute(
            path: AppRoute.profile,
            pageBuilder: (_, __) => const NoTransitionPage(child: ProfilePage()),
          ),
        ],
      ),
    ],
  );
});

/// Bridge between Riverpod and `GoRouter.refreshListenable`. Without it
/// the router doesn't know to re-evaluate `redirect` after a sign-in.
class _AuthChangeNotifier extends ChangeNotifier {
  _AuthChangeNotifier(this._ref) {
    _ref.listen<AuthState>(
      authControllerProvider,
      (_, __) => notifyListeners(),
      fireImmediately: false,
    );
  }

  // Kept as a field so the listener subscription survives.
  // ignore: unused_field
  final Ref _ref;
}
