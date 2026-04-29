import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/widgets/chunky_button.dart';
import '../../core/widgets/skeleton.dart';
import 'models/profile_models.dart';
import 'profile_controllers.dart';
import 'widgets/profile_hero_banner.dart';
import 'widgets/stat_tile.dart';

/// Public profile of another user. Reached from:
/// - `/u/<userId>` deep link (Mongo `_id`)
/// - `/u/@<username>` deep link (URL handle, with `@`)
/// - tapping any user pill anywhere in the app.
///
/// Behavior:
/// - The Follow / Unfollow button toggles state optimistically.
/// - If the user views their own profile by id, the router rewrites
///   the destination to `/profile`.
class UserProfilePage extends ConsumerWidget {
  const UserProfilePage({super.key, required this.idOrUsername});

  /// Either a Mongo ObjectId or `@<username>`. The repository routes to
  /// the correct backend endpoint accordingly.
  final String idOrUsername;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncProfile = ref.watch(userProfileProvider(idOrUsername));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Профиль'),
        actions: [
          IconButton(
            tooltip: 'Обновить',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref
                .read(userProfileProvider(idOrUsername).notifier)
                .refresh(),
          ),
        ],
      ),
      body: asyncProfile.when(
        loading: () => const _Loading(),
        error: (err, _) => _Error(
          message: err is ApiException ? err.message : '$err',
          onRetry: () => ref
              .read(userProfileProvider(idOrUsername).notifier)
              .refresh(),
        ),
        data: (profile) => RefreshIndicator(
          onRefresh: () => ref
              .read(userProfileProvider(idOrUsername).notifier)
              .refresh(),
          child: _Body(profile: profile, idOrUsername: idOrUsername),
        ),
      ),
    );
  }
}

class _Body extends ConsumerStatefulWidget {
  const _Body({required this.profile, required this.idOrUsername});
  final ProfileResponse profile;
  final String idOrUsername;

  @override
  ConsumerState<_Body> createState() => _BodyState();
}

class _BodyState extends ConsumerState<_Body> {
  bool _toggling = false;

  Future<void> _toggleFollow() async {
    if (_toggling) return;
    setState(() => _toggling = true);
    try {
      await ref
          .read(userProfileProvider(widget.idOrUsername).notifier)
          .toggleFollow();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profile = widget.profile;
    final isFollowing = profile.followState.isFollowing;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        ProfileHeroBanner(
          user: profile.user,
          editable: false,
          footer: _heroFooter(profile),
          actions: SizedBox(
            width: double.infinity,
            child: ChunkyButton(
              label: isFollowing ? 'Отписаться' : 'Подписаться',
              icon: isFollowing
                  ? Icons.person_remove_rounded
                  : Icons.person_add_rounded,
              variant: isFollowing ? ChunkyVariant.ghost : ChunkyVariant.primary,
              fullWidth: true,
              loading: _toggling,
              onPressed: _toggling ? null : _toggleFollow,
            ),
          ),
        ),
        const SizedBox(height: 20),
        if (profile.user.bio.isNotEmpty || profile.user.headline.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Text(
              profile.user.bio.isNotEmpty
                  ? profile.user.bio
                  : profile.user.headline,
              style: theme.textTheme.bodyMedium,
            ),
          ),
        _SectionTitle(label: 'Прогресс'),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.6,
          children: [
            StatTile(
              label: 'Уровень',
              value: '${profile.progress.level}',
              tone: StatTileTone.primary,
            ),
            StatTile(
              label: 'XP',
              value: '${profile.progress.xp}',
              tone: StatTileTone.blue,
            ),
            StatTile(
              label: 'Стрик',
              value: '${profile.progress.currentStreakDays} дн.',
              tone: StatTileTone.amber,
            ),
            StatTile(
              label: 'Завершено',
              value: '${profile.progress.totalCompleted}',
              tone: StatTileTone.emerald,
            ),
          ],
        ),
        if (profile.publicTests.isNotEmpty) ...[
          const SizedBox(height: 20),
          _SectionTitle(label: 'Опубликованные тесты'),
          const SizedBox(height: 10),
          for (final t in profile.publicTests.take(8))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color:
                        theme.colorScheme.outline.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        t.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '⭐ ${t.rating.toStringAsFixed(1)}',
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ],
    );
  }

  Widget _heroFooter(ProfileResponse profile) {
    return Row(
      children: [
        Expanded(
          child: StatTile(
            label: 'Подписчики',
            value: '${profile.followCounts.followersCount}',
            compact: true,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: StatTile(
            label: 'Подписки',
            value: '${profile.followCounts.followingCount}',
            compact: true,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: StatTile(
            label: 'Тесты',
            value: '${profile.creatorStats.publicTestsCount}',
            compact: true,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: StatTile(
            label: 'Уровень',
            value: '${profile.progress.level}',
            compact: true,
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      label.toUpperCase(),
      style: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w900,
        letterSpacing: 1.4,
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Skeleton(height: 220, borderRadius: 20),
        SizedBox(height: 16),
        Skeleton(height: 48, borderRadius: 14),
        SizedBox(height: 20),
        Skeleton(height: 120, borderRadius: 14),
      ],
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message, required this.onRetry});
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
              label: 'Назад',
              onPressed: () => Navigator.of(context).maybePop(),
            ),
            const SizedBox(height: 8),
            ChunkyButton(
              label: 'Повторить',
              icon: Icons.refresh_rounded,
              variant: ChunkyVariant.ghost,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}

/// Helper used by the router to decide whether to push UserProfilePage
/// or rewrite to /profile when the user opens their own page by id.
bool isOwnProfile(String idOrUsername, String? myId, String? myUsername) {
  if (myId != null && myId == idOrUsername) return true;
  if (myUsername != null &&
      idOrUsername.toLowerCase() == '@${myUsername.toLowerCase()}') {
    return true;
  }
  return false;
}
