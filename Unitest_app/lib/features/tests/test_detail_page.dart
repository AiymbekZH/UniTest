import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/chunky_button.dart';
import '../../core/widgets/skeleton.dart';
import 'models/test_models.dart';
import 'tests_controllers.dart';
import 'widgets/test_cover_artwork.dart';

/// Read-only test details page (no take-test flow yet — Phase 2b).
///
/// Mirrors the React `TestProfile.jsx` page on web: cover, title,
/// metadata, ratings, leaderboard preview, my-attempts history, and a
/// large "Start" CTA. The Start button is disabled with a label
/// showing why if attempts are exhausted or the user must log in.
///
/// Special-case rendering for 403 deadline errors — same UI as the
/// fixed web TestProfile.jsx to keep behaviour consistent across
/// platforms.
class TestDetailPage extends ConsumerWidget {
  const TestDetailPage({super.key, required this.shareLink});

  final String shareLink;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncDetail = ref.watch(testDetailProvider(shareLink));
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('О тесте'),
        actions: [
          IconButton(
            tooltip: 'Поделиться',
            icon: const Icon(Icons.copy_rounded),
            onPressed: () {
              final url = 'https://unitest.page/test-profile/$shareLink';
              Clipboard.setData(ClipboardData(text: url));
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(const SnackBar(
                    content: Text('Ссылка скопирована')));
            },
          ),
        ],
      ),
      body: asyncDetail.when(
        loading: () => const _DetailSkeleton(),
        error: (err, _) => _DetailError(
          message: err is ApiException ? err.message : '$err',
          onRetry: () =>
              ref.read(testDetailProvider(shareLink).notifier).refresh(),
        ),
        data: (state) {
          switch (state) {
            case TestDetailDeadline d:
              return _DeadlineCard(state: d);
            case TestDetailLoaded l:
              return RefreshIndicator(
                onRefresh: () => ref
                    .read(testDetailProvider(shareLink).notifier)
                    .refresh(),
                child: _DetailBody(
                  detail: l.detail,
                  isAuthenticated: user != null,
                  onRate: (s) => ref
                      .read(testDetailProvider(shareLink).notifier)
                      .rate(s),
                  onRateDifficulty: (s) => ref
                      .read(testDetailProvider(shareLink).notifier)
                      .rateDifficulty(s),
                ),
              );
          }
        },
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({
    required this.detail,
    required this.isAuthenticated,
    required this.onRate,
    required this.onRateDifficulty,
  });

  final TestDetail detail;
  final bool isAuthenticated;
  final ValueChanged<int> onRate;
  final ValueChanged<int> onRateDifficulty;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = detail.test;

    final canTake = !(t.settings.maxAttempts > 0 &&
        detail.attempts >= t.settings.maxAttempts);
    final maxAttempts = t.settings.maxAttempts;
    final ctaLabel = !canTake
        ? 'Лимит попыток исчерпан'
        : (t.settings.practiceMode
            ? 'Тренировка'
            : (detail.attempts > 0 ? 'Пройти ещё раз' : 'Начать тест'));

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        AspectRatio(
          aspectRatio: 16 / 9,
          child: TestCoverArtwork(
            title: t.title,
            coverImage: t.coverImage,
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          t.title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w900,
            letterSpacing: -0.4,
          ),
        ),
        if (t.description.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            t.description,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 14),
        _MetaRow(test: t, theme: theme),
        const SizedBox(height: 18),
        _StatsGrid(test: t, theme: theme),
        const SizedBox(height: 18),
        if (t.tags.isNotEmpty) ...[
          _TagsRow(tags: t.tags),
          const SizedBox(height: 18),
        ],
        ChunkyButton(
          label: ctaLabel,
          icon: Icons.play_arrow_rounded,
          fullWidth: true,
          onPressed: canTake ? () => _onStart(context) : null,
        ),
        if (maxAttempts > 0) ...[
          const SizedBox(height: 6),
          Center(
            child: Text(
              'Попыток: ${detail.attempts} / $maxAttempts',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),
        if (detail.leaderboard.entries.isNotEmpty) ...[
          _SectionTitle(label: 'Лидерборд', subtitle: 'Топ-5 участников'),
          const SizedBox(height: 8),
          _LeaderboardPreview(data: detail.leaderboard),
          const SizedBox(height: 22),
        ],
        if (detail.attemptHistory.attempts.isNotEmpty) ...[
          _SectionTitle(
            label: 'Мои попытки',
            subtitle:
                'Лучший результат: ${detail.attemptHistory.best.toStringAsFixed(0)}%',
          ),
          const SizedBox(height: 8),
          _MyAttempts(history: detail.attemptHistory),
          const SizedBox(height: 22),
        ],
        if (isAuthenticated && t.settings.allowComments) ...[
          _SectionTitle(label: 'Оценки', subtitle: 'Качество и сложность'),
          const SizedBox(height: 8),
          _RatingsPanel(
            currentRating: detail.myRating,
            currentDifficulty: detail.myDifficulty,
            onRate: onRate,
            onRateDifficulty: onRateDifficulty,
            test: t,
          ),
        ],
      ],
    );
  }

  void _onStart(BuildContext context) {
    // Phase 2b lands the actual TakeTest engine; until then we surface
    // a friendly "coming soon" snackbar so testers don't think the
    // button is dead.
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(
        content: Text(
          'Прохождение появится в следующем апдейте (Phase 2b).',
        ),
      ));
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.test, required this.theme});
  final TestFull test;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final author = test.author;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        _MetaChip(
          icon: test.settings.isPublic
              ? Icons.visibility_outlined
              : Icons.lock_outline_rounded,
          label: test.settings.isPublic ? 'Публичный' : 'Приватный',
          tone: test.settings.isPublic
              ? _MetaTone.primary
              : _MetaTone.neutral,
        ),
        if (test.settings.timeLimit > 0)
          _MetaChip(
            icon: Icons.timer_outlined,
            label: '${test.settings.timeLimit} мин',
            tone: _MetaTone.neutral,
          ),
        _MetaChip(
          icon: Icons.help_outline_rounded,
          label: '${test.questions.length} вопр.',
          tone: _MetaTone.neutral,
        ),
        if (test.settings.maxAttempts > 0)
          _MetaChip(
            icon: Icons.replay_rounded,
            label: 'до ${test.settings.maxAttempts}',
            tone: _MetaTone.neutral,
          ),
        if (author != null && author.fullName.isNotEmpty)
          _MetaChip(
            icon: Icons.person_outline_rounded,
            label: author.fullName,
            tone: _MetaTone.neutral,
          ),
      ],
    );
  }
}

enum _MetaTone { primary, neutral }

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
    required this.tone,
  });

  final IconData icon;
  final String label;
  final _MetaTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bg = switch (tone) {
      _MetaTone.primary => isDark
          ? AppColors.primary500.withValues(alpha: 0.18)
          : AppColors.primary50,
      _MetaTone.neutral => isDark
          ? Colors.white.withValues(alpha: 0.07)
          : const Color(0xFFF1F5F9),
    };
    final fg = switch (tone) {
      _MetaTone.primary =>
        isDark ? AppColors.primary300 : AppColors.primary600,
      _MetaTone.neutral =>
        isDark ? Colors.white.withValues(alpha: 0.7) : const Color(0xFF475569),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.test, required this.theme});
  final TestFull test;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final tiles = <_StatTile>[
      _StatTile(
        label: 'Рейтинг',
        value: test.rating > 0 ? test.rating.toStringAsFixed(1) : '—',
        icon: Icons.star_rounded,
        tint: AppColors.warning500,
      ),
      _StatTile(
        label: 'Прошли',
        value: '${test.attemptCount}',
        icon: Icons.people_outline_rounded,
        tint: theme.colorScheme.primary,
      ),
      _StatTile(
        label: 'Средний балл',
        value: test.attemptCount > 0
            ? '${test.averageScore.toStringAsFixed(0)}%'
            : '—',
        icon: Icons.trending_up_rounded,
        tint: AppColors.success500,
      ),
      _StatTile(
        label: 'Сложность',
        value: test.difficultyScore > 0
            ? test.difficultyScore.toStringAsFixed(1)
            : '—',
        icon: Icons.bolt_rounded,
        tint: AppColors.danger500,
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 2.4,
      children: [
        for (final t in tiles)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                Icon(t.icon, color: t.tint, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        t.value,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        t.label,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StatTile {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.tint,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color tint;
}

class _TagsRow extends StatelessWidget {
  const _TagsRow({required this.tags});
  final List<String> tags;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final t in tags.take(8))
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '#$t',
              style: const TextStyle(
                color: AppColors.primary600,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label, this.subtitle});
  final String label;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w900,
            letterSpacing: 1.4,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        if (subtitle != null)
          Text(
            subtitle!,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
      ],
    );
  }
}

class _LeaderboardPreview extends StatelessWidget {
  const _LeaderboardPreview({required this.data});
  final LeaderboardData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final top = data.entries.take(5).toList();
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        children: [
          for (var i = 0; i < top.length; i++) ...[
            if (i > 0)
              Divider(
                height: 1,
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
              ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 22,
                    child: Text(
                      '#${top[i].rank}',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: top[i].rank <= 3
                            ? AppColors.warning600
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      top[i].userName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '${top[i].percentage.toStringAsFixed(0)}%',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MyAttempts extends StatelessWidget {
  const _MyAttempts({required this.history});
  final AttemptHistory history;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        for (final a in history.attempts.take(3))
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  a.percentage >= 80
                      ? Icons.emoji_events_rounded
                      : Icons.history_rounded,
                  color: a.percentage >= 80
                      ? AppColors.warning500
                      : theme.colorScheme.onSurfaceVariant,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    a.completedAt != null
                        ? _formatDate(a.completedAt!)
                        : 'Без даты',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                Text(
                  '${a.score} / ${a.totalPoints}  ·  ${a.percentage.toStringAsFixed(0)}%',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  String _formatDate(DateTime d) {
    final l = d.toLocal();
    final dd = l.day.toString().padLeft(2, '0');
    final mm = l.month.toString().padLeft(2, '0');
    final hh = l.hour.toString().padLeft(2, '0');
    final mn = l.minute.toString().padLeft(2, '0');
    return '$dd.$mm.${l.year} · $hh:$mn';
  }
}

class _RatingsPanel extends StatelessWidget {
  const _RatingsPanel({
    required this.currentRating,
    required this.currentDifficulty,
    required this.onRate,
    required this.onRateDifficulty,
    required this.test,
  });

  final int currentRating;
  final int currentDifficulty;
  final ValueChanged<int> onRate;
  final ValueChanged<int> onRateDifficulty;
  final TestFull test;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RatingRow(
            label: 'Качество',
            value: currentRating,
            onChanged: onRate,
            color: AppColors.warning500,
          ),
          const SizedBox(height: 10),
          _RatingRow(
            label: 'Сложность',
            value: currentDifficulty,
            onChanged: onRateDifficulty,
            color: AppColors.danger500,
          ),
        ],
      ),
    );
  }
}

class _RatingRow extends StatelessWidget {
  const _RatingRow({
    required this.label,
    required this.value,
    required this.onChanged,
    required this.color,
  });
  final String label;
  final int value;
  final ValueChanged<int> onChanged;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        ...List.generate(5, (i) {
          final filled = i < value;
          return IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: () => onChanged(i + 1),
            icon: Icon(
              filled ? Icons.star_rounded : Icons.star_outline_rounded,
              color: filled ? color : theme.colorScheme.onSurfaceVariant,
              size: 26,
            ),
          );
        }),
      ],
    );
  }
}

class _DeadlineCard extends StatelessWidget {
  const _DeadlineCard({required this.state});
  final TestDetailDeadline state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isNotStarted = state.code == 'NOT_STARTED';
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isNotStarted
                      ? AppColors.warning500
                      : AppColors.danger500,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: (isNotStarted
                              ? AppColors.warning500
                              : AppColors.danger500)
                          .withValues(alpha: 0.45),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(
                  isNotStarted
                      ? Icons.event_available_rounded
                      : Icons.event_busy_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isNotStarted ? 'Тест ещё не открыт' : 'Тест уже закрыт',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                state.message,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              ChunkyButton(
                label: 'Назад',
                icon: Icons.arrow_back_rounded,
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const AspectRatio(
          aspectRatio: 16 / 9,
          child: Skeleton(borderRadius: 20),
        ),
        const SizedBox(height: 16),
        const Skeleton(height: 28, borderRadius: 8),
        const SizedBox(height: 8),
        const Skeleton(height: 16, borderRadius: 8),
        const SizedBox(height: 24),
        const Skeleton(height: 56, borderRadius: 14),
        const SizedBox(height: 16),
        const Skeleton(height: 120, borderRadius: 14),
      ],
    );
  }
}

class _DetailError extends StatelessWidget {
  const _DetailError({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 56),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ChunkyButton(
              label: 'Повторить',
              icon: Icons.refresh_rounded,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
