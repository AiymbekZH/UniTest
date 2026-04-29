// Smoke test: ensures the app boots into ProviderScope + UniTestApp
// without throwing during the first frame. Heavier widget / golden tests
// land alongside the features they exercise (Phase 1+).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unitest_app/app.dart';

void main() {
  testWidgets('UniTestApp builds without crashing',
      (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: UniTestApp()));
    // Drain pending tasks (router redirect tick, theme init).
    await tester.pump();
  });
}
