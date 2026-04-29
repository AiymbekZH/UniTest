import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/auth/auth_state.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/chunky_button.dart';
import '../../core/widgets/skeleton.dart';
import 'models/profile_models.dart';
import 'profile_controllers.dart';
import 'widgets/profile_hero_banner.dart';
import 'widgets/stat_tile.dart';

/// OWN profile page (the 5th tab in the bottom nav).
///
/// Sections (top to bottom):
/// 1. Hero banner (cover + avatar + name + role + bio + meta).
/// 2. Footer stat tiles: uniqueId · followers · following · publishedTests.
/// 3. Action row: "Редактировать профиль" + "Сменить пароль" + "Выйти".
/// 4. Big stat row: уровень · XP · стрик · завершено.
/// 5. Творческая статистика (testsCreated, publicRating, ...).
/// 6. Бейджи (горизонтальный скролл).
/// 7. Опубликованные тесты (2-col grid).
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _imagePicker = ImagePicker();
  bool _uploadingAvatar = false;
  bool _uploadingBanner = false;

  Future<void> _pickAndUploadAvatar() async {
    if (_uploadingAvatar) return;
    final source = await _showImageSourceSheet();
    if (source == null) return;
    final picked = await _imagePicker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked == null) return;
    final file = File(picked.path);
    if (await _isTooLarge(file)) {
      _toast('Слишком большой файл (макс. 5 МБ).');
      return;
    }
    setState(() => _uploadingAvatar = true);
    try {
      await ref.read(myProfileProvider.notifier).uploadAvatar(file);
      _toast('Аватар обновлён');
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _pickAndUploadBanner() async {
    if (_uploadingBanner) return;
    final source = await _showImageSourceSheet();
    if (source == null) return;
    final picked = await _imagePicker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 720,
      imageQuality: 80,
    );
    if (picked == null) return;
    final file = File(picked.path);
    if (await _isTooLarge(file)) {
      _toast('Слишком большой файл (макс. 5 МБ).');
      return;
    }
    setState(() => _uploadingBanner = true);
    try {
      await ref.read(myProfileProvider.notifier).uploadBanner(file);
      _toast('Обложка обновлена');
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _uploadingBanner = false);
    }
  }

  Future<void> _removeBanner() async {
    final confirm = await _confirm(
      'Удалить обложку?',
      'На профиле останется выбранный градиент.',
    );
    if (confirm != true) return;
    try {
      await ref.read(myProfileProvider.notifier).removeBanner();
      _toast('Обложка удалена');
    } on ApiException catch (e) {
      _toast(e.message);
    }
  }

  Future<bool> _isTooLarge(File file) async {
    final size = await file.length();
    return size > 5 * 1024 * 1024;
  }

  Future<ImageSource?> _showImageSourceSheet() async {
    if (!mounted) return null;
    return showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Из галереи'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined),
                title: const Text('Сделать фото'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<bool?> _confirm(String title, String body) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Отмена'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger500),
            child: const Text('Подтвердить'),
          ),
        ],
      ),
    );
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _logout() async {
    final ok = await _confirm('Выйти из аккаунта?', 'Сессия будет завершена.');
    if (ok != true) return;
    await ref.read(authControllerProvider.notifier).logout();
  }

  void _copyId(String id) {
    Clipboard.setData(ClipboardData(text: id));
    _toast('ID скопирован');
  }

  /// Slide-up sheet that hosts the secondary profile actions
  /// (change password / logout / refresh). The primary "Edit profile"
  /// action stays inline on the hero banner because it's by far the
  /// most-used button — burying it would cost a click on every visit.
  Future<void> _openActionsSheet() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.edit_rounded),
                title: const Text('Редактировать профиль'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(AppRoute.profileEdit);
                },
              ),
              ListTile(
                leading: const Icon(Icons.lock_outline_rounded),
                title: const Text('Сменить пароль'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(AppRoute.profileChangePassword);
                },
              ),
              ListTile(
                leading: const Icon(Icons.refresh_rounded),
                title: const Text('Обновить данные'),
                onTap: () {
                  Navigator.pop(ctx);
                  ref.read(myProfileProvider.notifier).refresh();
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout_rounded,
                    color: AppColors.danger500),
                title: const Text(
                  'Выйти',
                  style: TextStyle(color: AppColors.danger500),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _logout();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final asyncProfile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Профиль'),
        actions: [
          IconButton(
            tooltip: 'Действия',
            icon: const Icon(Icons.more_vert_rounded),
            onPressed: _openActionsSheet,
          ),
        ],
      ),
      body: asyncProfile.when(
        loading: () => const _ProfileSkeleton(),
        error: (err, _) => _ProfileError(
          message: err is ApiException ? err.message : '$err',
          onRetry: () => ref.read(myProfileProvider.notifier).refresh(),
        ),
        data: (profile) => RefreshIndicator(
          onRefresh: () => ref.read(myProfileProvider.notifier).refresh(),
          child: _ProfileBody(
            profile: profile,
            uploadingAvatar: _uploadingAvatar,
            uploadingBanner: _uploadingBanner,
            onPickAvatar: _pickAndUploadAvatar,
            onPickBanner: _pickAndUploadBanner,
            onRemoveBanner: _removeBanner,
            onEdit: () => context.push(AppRoute.profileEdit),
            onCopyId: _copyId,
          ),
        ),
      ),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({
    required this.profile,
    required this.uploadingAvatar,
    required this.uploadingBanner,
    required this.onPickAvatar,
    required this.onPickBanner,
    required this.onRemoveBanner,
    required this.onEdit,
    required this.onCopyId,
  });

  final ProfileResponse profile;
  final bool uploadingAvatar;
  final bool uploadingBanner;
  final VoidCallback onPickAvatar;
  final VoidCallback onPickBanner;
  final VoidCallback onRemoveBanner;
  final VoidCallback onEdit;
  final void Function(String) onCopyId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Stack(
          children: [
            ProfileHeroBanner(
              user: profile.user,
              editable: true,
              onPickAvatar: onPickAvatar,
              onPickBanner: onPickBanner,
              onRemoveBanner: profile.user.coverImage.isNotEmpty
                  ? onRemoveBanner
                  : null,
              actions: SizedBox(
                width: double.infinity,
                child: ChunkyButton(
                  label: 'Редактировать профиль',
                  icon: Icons.edit_rounded,
                  variant: ChunkyVariant.ghost,
                  fullWidth: true,
                  onPressed: onEdit,
                ),
              ),
              footer: _heroFooter(),
            ),
            if (uploadingAvatar || uploadingBanner)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x55000000),
                  child: Center(
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),
        const _SectionTitle(
          label: 'Прогресс',
          subtitle: 'XP, серия, завершённые тесты',
        ),
        const SizedBox(height: 10),
        _ProgressGrid(progress: profile.progress),
        const SizedBox(height: 20),
        const _SectionTitle(
          label: 'Творчество',
          subtitle: 'Опубликованные тесты и их рейтинг',
        ),
        const SizedBox(height: 10),
        _CreatorCard(stats: profile.creatorStats),
        if (profile.progress.badges.isNotEmpty) ...[
          const SizedBox(height: 20),
          _SectionTitle(
            label: 'Достижения',
            subtitle: '${profile.progress.badges.length} разблокировано',
          ),
          const SizedBox(height: 10),
          _BadgesRow(badges: profile.progress.badges),
        ],
        if (profile.publicTests.isNotEmpty) ...[
          const SizedBox(height: 20),
          const _SectionTitle(
            label: 'Опубликованные тесты',
            subtitle: 'Доступны другим игрокам',
          ),
          const SizedBox(height: 10),
          _PublicTestsGrid(tests: profile.publicTests),
        ],
        const SizedBox(height: 24),
        Center(
          child: Text(
            'ID • ${profile.user.uniqueId ?? '—'}',
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontFamily: 'monospace',
            ),
          ),
        ),
      ],
    );
  }

  Widget _heroFooter() {
    final user = profile.user;
    return Row(
      children: [
        Expanded(
          child: StatTile(
            label: 'ID',
            value: user.uniqueId ?? '—',
            compact: true,
            onTap:
                user.uniqueId == null ? null : () => onCopyId(user.uniqueId!),
          ),
        ),
        const SizedBox(width: 8),
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
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}

class _ProgressGrid extends StatelessWidget {
  const _ProgressGrid({required this.progress});
  final ProgressSummary progress;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.6,
      children: [
        StatTile(
          label: 'Уровень',
          value: '${progress.level}',
          tone: StatTileTone.primary,
        ),
        StatTile(
          label: 'XP',
          value: '${progress.xp}',
          tone: StatTileTone.blue,
        ),
        StatTile(
          label: 'Стрик',
          value: '${progress.currentStreakDays} дн.',
          tone: StatTileTone.amber,
        ),
        StatTile(
          label: 'Лучший стрик',
          value: '${progress.longestStreakDays}',
          tone: StatTileTone.emerald,
        ),
        StatTile(
          label: 'Завершено',
          value: '${progress.totalCompleted}',
          tone: StatTileTone.blue,
        ),
        StatTile(
          label: '100% сдано',
          value: '${progress.perfectScores}',
          tone: StatTileTone.amber,
        ),
      ],
    );
  }
}

class _CreatorCard extends StatelessWidget {
  const _CreatorCard({required this.stats});
  final CreatorStats stats;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.6,
      children: [
        StatTile(label: 'Создано', value: '${stats.testsCreated}'),
        StatTile(
          label: 'Рейтинг',
          value: stats.publicAverageRating.toStringAsFixed(1),
          tone: StatTileTone.amber,
        ),
        StatTile(label: 'Запусков', value: '${stats.publicPlays}'),
        StatTile(
          label: 'Опубликовано',
          value: '${stats.publicTestsCount}',
          tone: StatTileTone.primary,
        ),
      ],
    );
  }
}

class _BadgesRow extends StatelessWidget {
  const _BadgesRow({required this.badges});
  final List<ProfileBadge> badges;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: badges.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final b = badges[i];
          return Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: theme.colorScheme.tertiaryContainer
                  .withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: AppColors.warning500.withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.workspace_premium_rounded,
                    size: 14, color: AppColors.warning600),
                const SizedBox(width: 6),
                Text(
                  _badgeLabel(b.key),
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppColors.warning600,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _badgeLabel(String key) {
    return switch (key) {
      'first_completion' => 'Первое завершение',
      'three_day_streak' => 'Серия 3 дня',
      'ten_completed' => '10 тестов',
      'fifty_completed' => '50 тестов',
      'perfect_score' => '100%',
      'arena_winner' => 'Победитель арены',
      _ => key,
    };
  }
}

class _PublicTestsGrid extends StatelessWidget {
  const _PublicTestsGrid({required this.tests});
  final List<PublicTestPreview> tests;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        for (final t in tests.take(6))
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.25),
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    Icon(Icons.help_outline_rounded,
                        size: 12,
                        color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text('${t.questionCount}',
                        style: theme.textTheme.labelSmall),
                    const SizedBox(width: 8),
                    Icon(Icons.people_outline_rounded,
                        size: 12,
                        color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text('${t.attemptCount}',
                        style: theme.textTheme.labelSmall),
                    const SizedBox(width: 8),
                    const Icon(Icons.star_rounded,
                        size: 12, color: AppColors.warning500),
                    const SizedBox(width: 2),
                    Text(t.rating.toStringAsFixed(1),
                        style: theme.textTheme.labelSmall),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _ProfileSkeleton extends StatelessWidget {
  const _ProfileSkeleton();

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
        SizedBox(height: 16),
        Skeleton(height: 120, borderRadius: 14),
      ],
    );
  }
}

class _ProfileError extends StatelessWidget {
  const _ProfileError({required this.message, required this.onRetry});

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
