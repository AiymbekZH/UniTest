import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/router/app_router.dart';
import '../../core/widgets/chunky_button.dart';
import '../../core/widgets/skeleton.dart';
import 'tests_controllers.dart';
import 'tests_repository.dart';
import 'widgets/test_card.dart';

/// Browse / search the public test catalogue.
///
/// Mirrors the React `<Browse>` + bottom-of-`<Dashboard>` listing pages,
/// folded into a single mobile screen because there's only one
/// browsing surface on phone.
///
/// Surfaces three controls:
///   1. Live-debounced search field.
///   2. Sort chips (Новые / Популярные / Рейтинг / А — Я).
///   3. 2-column grid that grows infinitely as you scroll.
class TestsBrowsePage extends ConsumerStatefulWidget {
  const TestsBrowsePage({super.key});

  @override
  ConsumerState<TestsBrowsePage> createState() => _TestsBrowsePageState();
}

class _TestsBrowsePageState extends ConsumerState<TestsBrowsePage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;
    // Trigger a load when within 600 pixels of the bottom — that's
    // ~3 rows of cards, enough to make scroll feel continuous on a
    // 60 Hz device without over-fetching.
    if (pos.pixels > pos.maxScrollExtent - 600) {
      ref.read(feedProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncFeed = ref.watch(feedProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Тесты'),
        actions: [
          IconButton(
            tooltip: 'Обновить',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(feedProvider.notifier).refresh(),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(108),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _SearchField(
                  controller: _searchController,
                  onChanged: (v) =>
                      ref.read(feedProvider.notifier).setSearch(v),
                ),
                const SizedBox(height: 8),
                _SortChips(
                  active: asyncFeed.valueOrNull?.filters.sort ??
                      TestSort.newest,
                  onChanged: (s) =>
                      ref.read(feedProvider.notifier).setSort(s),
                ),
              ],
            ),
          ),
        ),
      ),
      body: asyncFeed.when(
        loading: () => const _GridSkeleton(),
        error: (err, _) => _BrowseError(
          message: err is ApiException ? err.message : '$err',
          onRetry: () => ref.read(feedProvider.notifier).refresh(),
        ),
        data: (feed) {
          if (feed.tests.isEmpty) {
            return _EmptyState(
              search: feed.filters.search,
              theme: theme,
              onRetry: () => ref.read(feedProvider.notifier).refresh(),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(feedProvider.notifier).refresh(),
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: feed.tests.length,
                    itemBuilder: (_, i) {
                      final t = feed.tests[i];
                      return TestCard(
                        summary: t,
                        coverImage: feed.coverImages[t.id],
                        onTap: () => context.push(
                          AppRoute.testDetailTo(t.shareLink),
                        ),
                      );
                    },
                  ),
                ),
                if (feed.loadingMore)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        ),
                      ),
                    ),
                  )
                else if (!feed.hasMore && feed.tests.length > 6)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'Это всё на сегодня',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'Поиск тестов…',
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: ValueListenableBuilder<TextEditingValue>(
          valueListenable: controller,
          builder: (_, value, __) {
            if (value.text.isEmpty) return const SizedBox.shrink();
            return IconButton(
              icon: const Icon(Icons.close_rounded, size: 20),
              onPressed: () {
                controller.clear();
                onChanged('');
              },
            );
          },
        ),
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }
}

class _SortChips extends StatelessWidget {
  const _SortChips({required this.active, required this.onChanged});

  final TestSort active;
  final ValueChanged<TestSort> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: TestSort.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (_, i) {
          final s = TestSort.values[i];
          return ChoiceChip(
            label: Text(s.label()),
            selected: s == active,
            onSelected: (_) => onChanged(s),
          );
        },
      ),
    );
  }
}

class _GridSkeleton extends StatelessWidget {
  const _GridSkeleton();

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      padding: const EdgeInsets.all(12),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 0.72,
      children: List.generate(
        6,
        (_) => const Skeleton(borderRadius: 16),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.search,
    required this.theme,
    required this.onRetry,
  });

  final String search;
  final ThemeData theme;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 64),
      children: [
        Icon(
          Icons.menu_book_outlined,
          size: 80,
          color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
        ),
        const SizedBox(height: 12),
        Text(
          search.trim().isEmpty
              ? 'Пока нет публичных тестов'
              : 'Ничего не нашли по «${search.trim()}»',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          search.trim().isEmpty
              ? 'Когда появятся, они засветятся здесь.'
              : 'Попробуйте другие слова или сбросьте фильтр.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: ChunkyButton(
            label: 'Обновить',
            icon: Icons.refresh_rounded,
            variant: ChunkyVariant.ghost,
            onPressed: onRetry,
          ),
        ),
      ],
    );
  }
}

class _BrowseError extends StatelessWidget {
  const _BrowseError({required this.message, required this.onRetry});

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
            const Icon(Icons.cloud_off_rounded, size: 56),
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
