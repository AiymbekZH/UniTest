import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/router/app_router.dart';

/// Bottom-tab shell that wraps the 5 main destinations. The active tab is
/// derived from `GoRouterState.matchedLocation` so the nav stays in sync
/// when navigation happens via deep link or back button.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  static const _tabs = <_Tab>[
    _Tab(label: 'Главная', icon: Icons.home_outlined, activeIcon: Icons.home, route: AppRoute.dashboard),
    _Tab(label: 'Тесты',   icon: Icons.menu_book_outlined, activeIcon: Icons.menu_book, route: AppRoute.tests),
    _Tab(label: 'Арена',   icon: Icons.sports_esports_outlined, activeIcon: Icons.sports_esports, route: AppRoute.arena),
    _Tab(label: 'Чаты',    icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble, route: AppRoute.messages),
    _Tab(label: 'Профиль', icon: Icons.person_outline, activeIcon: Icons.person, route: AppRoute.profile),
  ];

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final activeIndex =
        _tabs.indexWhere((t) => loc.startsWith(t.route)).clamp(0, _tabs.length - 1);

    return Scaffold(
      body: child,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              top: BorderSide(
                color: Theme.of(context).colorScheme.outline,
                width: 1,
              ),
            ),
          ),
          child: BottomNavigationBar(
            currentIndex: activeIndex,
            onTap: (i) {
              final target = _tabs[i].route;
              if (loc != target) context.go(target);
            },
            items: [
              for (final t in _tabs)
                BottomNavigationBarItem(
                  icon: Icon(t.icon),
                  activeIcon: Icon(t.activeIcon),
                  label: t.label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab {
  const _Tab({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.route,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String route;
}
