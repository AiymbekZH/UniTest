import 'package:flutter/material.dart';

import '../_placeholder.dart';

class TestsBrowsePage extends StatelessWidget {
  const TestsBrowsePage({super.key});

  @override
  Widget build(BuildContext context) => const PlaceholderPage(
        title: 'Тесты',
        subtitle: 'Лента тестов появится в Phase 2 (Browse + Take Test).',
        icon: Icons.menu_book_outlined,
      );
}
