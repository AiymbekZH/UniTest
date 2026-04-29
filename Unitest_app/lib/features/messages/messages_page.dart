import 'package:flutter/material.dart';

import '../_placeholder.dart';

class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key});

  @override
  Widget build(BuildContext context) => const PlaceholderPage(
        title: 'Сообщения',
        subtitle: 'Личные сообщения и групповые чаты появятся в Phase 3.',
        icon: Icons.chat_bubble_outline,
      );
}
