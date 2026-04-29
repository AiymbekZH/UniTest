import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../models/test_models.dart';
import 'test_cover_artwork.dart';

/// Browse-grid card for a [TestSummary]. The cover is loaded lazily by
/// the feed controller (covers stream in after the list paint), so this
/// widget falls back to the gradient placeholder until then.
///
/// Layout matches the web `<TestCard>` component: 16:9 cover on top,
/// metadata block below (privacy chip + question count, title in 2
/// lines, footer with rating + attempts).
class TestCard extends StatelessWidget {
  const TestCard({
    super.key,
    required this.summary,
    required this.coverImage,
    required this.onTap,
  });

  final TestSummary summary;
  final String? coverImage;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final borderColor =
        isDark ? Colors.white.withValues(alpha: 0.16) : AppColors.textLightPrimary;

    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: borderColor.withValues(alpha: 0.35),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.textLightPrimary.withValues(alpha: 0.08),
                offset: const Offset(0, 2),
                blurRadius: 6,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 16 / 9,
                child: TestCoverArtwork(
                  title: summary.title,
                  coverImage: coverImage,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(15),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        _Chip(
                          label: summary.isPublic ? 'Публичный' : 'Приватный',
                          icon: summary.isPublic
                              ? Icons.visibility_outlined
                              : Icons.lock_outline_rounded,
                          tone:
                              summary.isPublic ? _Tone.primary : _Tone.neutral,
                        ),
                        const SizedBox(width: 6),
                        if (summary.questionCount > 0)
                          Text(
                            '${summary.questionCount} вопр.',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      summary.title.isEmpty ? 'Без названия' : summary.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        height: 1.18,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 13, color: AppColors.warning500),
                        const SizedBox(width: 2),
                        Text(
                          summary.rating > 0
                              ? summary.rating.toStringAsFixed(1)
                              : '—',
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Icon(Icons.people_outline_rounded,
                            size: 13, color: scheme.onSurfaceVariant),
                        const SizedBox(width: 2),
                        Text(
                          '${summary.attemptCount}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        if (summary.timeLimit > 0) ...[
                          const SizedBox(width: 10),
                          Icon(Icons.timer_outlined,
                              size: 13, color: scheme.onSurfaceVariant),
                          const SizedBox(width: 2),
                          Text(
                            '${summary.timeLimit}м',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _Tone { primary, neutral }

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.icon, required this.tone});

  final String label;
  final IconData icon;
  final _Tone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bg = switch (tone) {
      _Tone.primary => isDark
          ? AppColors.primary500.withValues(alpha: 0.18)
          : AppColors.primary50,
      _Tone.neutral => isDark
          ? Colors.white.withValues(alpha: 0.07)
          : const Color(0xFFF1F5F9),
    };
    final fg = switch (tone) {
      _Tone.primary =>
        isDark ? AppColors.primary300 : AppColors.primary600,
      _Tone.neutral =>
        isDark ? Colors.white.withValues(alpha: 0.7) : const Color(0xFF475569),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: fg),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
