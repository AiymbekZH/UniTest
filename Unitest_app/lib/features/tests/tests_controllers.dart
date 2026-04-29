import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/test_models.dart';
import 'tests_repository.dart';

// ─── Feed (browse list) ───────────────────────────────────────────────

/// Filters used by the browse page. Lives at the top of the file because
/// it's the input to the feed notifier and most of the widgets read it.
@immutable
class FeedFilters {
  const FeedFilters({
    this.search = '',
    this.tag,
    this.sort = TestSort.newest,
  });

  final String search;
  final String? tag;
  final TestSort sort;

  FeedFilters copyWith({
    String? search,
    String? tag,
    bool clearTag = false,
    TestSort? sort,
  }) {
    return FeedFilters(
      search: search ?? this.search,
      tag: clearTag ? null : (tag ?? this.tag),
      sort: sort ?? this.sort,
    );
  }
}

/// Paged list of tests + accumulating cover map. Designed to support
/// infinite scroll: `tests` accumulates across pages, `coverImages` is
/// progressively populated by background fetches.
@immutable
class FeedState {
  const FeedState({
    required this.filters,
    required this.tests,
    required this.coverImages,
    required this.page,
    required this.totalPages,
    required this.total,
    required this.loadingMore,
  });

  const FeedState.initial({this.filters = const FeedFilters()})
      : tests = const [],
        coverImages = const {},
        page = 0,
        totalPages = 0,
        total = 0,
        loadingMore = false;

  final FeedFilters filters;
  final List<TestSummary> tests;
  final Map<String, String> coverImages;
  final int page;
  final int totalPages;
  final int total;
  final bool loadingMore;

  bool get hasMore => page < totalPages;

  FeedState copyWith({
    FeedFilters? filters,
    List<TestSummary>? tests,
    Map<String, String>? coverImages,
    int? page,
    int? totalPages,
    int? total,
    bool? loadingMore,
  }) {
    return FeedState(
      filters: filters ?? this.filters,
      tests: tests ?? this.tests,
      coverImages: coverImages ?? this.coverImages,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

/// Owns the browse / search / sort state for the Tests tab. The notifier
/// is async because the *initial* fetch is what populates it; subsequent
/// page loads run via [loadMore] and reuse the same state.
class FeedNotifier extends AsyncNotifier<FeedState> {
  Timer? _searchDebounce;
  int _searchSeq = 0; // monotonically rising; latest wins

  TestsRepository get _repo => ref.read(testsRepositoryProvider);

  @override
  Future<FeedState> build() async {
    ref.onDispose(() => _searchDebounce?.cancel());
    return _fetchFirstPage(const FeedFilters());
  }

  /// Convenience to refresh the feed (e.g. pull-to-refresh).
  Future<void> refresh() async {
    final current = state.valueOrNull?.filters ?? const FeedFilters();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchFirstPage(current));
  }

  /// Updates the search box. Debounces by 350 ms before re-querying so
  /// typing doesn't flood the network with 4-character → 5-character →
  /// 6-character requests.
  void setSearch(String value) {
    final filters = (state.valueOrNull?.filters ?? const FeedFilters())
        .copyWith(search: value);
    // Optimistic local state — keep showing the current list while
    // we re-query (less jarring than a spinner on every keystroke).
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(current.copyWith(filters: filters));
    }
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () async {
      final mySeq = ++_searchSeq;
      final newState = await AsyncValue.guard(() => _fetchFirstPage(filters));
      // Drop stale results — only the last fired query may write state.
      if (mySeq != _searchSeq) return;
      state = newState;
    });
  }

  Future<void> setSort(TestSort sort) async {
    final filters = (state.valueOrNull?.filters ?? const FeedFilters())
        .copyWith(sort: sort);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchFirstPage(filters));
  }

  Future<void> setTag(String? tag) async {
    final current = state.valueOrNull?.filters ?? const FeedFilters();
    final filters = current.copyWith(tag: tag, clearTag: tag == null);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchFirstPage(filters));
  }

  /// Append the next page to the current list. No-op if we're already
  /// at `totalPages` or a load is in flight. Cover fetches kick off in
  /// the background after each successful page.
  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null) return;
    if (!current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await _repo.listTests(
        search: current.filters.search,
        tag: current.filters.tag,
        sort: current.filters.sort,
        page: current.page + 1,
      );
      final merged = [...current.tests, ...next.tests];
      state = AsyncData(current.copyWith(
        tests: merged,
        page: next.page,
        totalPages: next.totalPages,
        total: next.total,
        loadingMore: false,
      ));
      _kickoffCoverFetch(next.tests);
    } catch (e, st) {
      // Surface the error but keep the existing list visible.
      state = AsyncError(e, st);
    }
  }

  Future<FeedState> _fetchFirstPage(FeedFilters filters) async {
    final res = await _repo.listTests(
      search: filters.search,
      tag: filters.tag,
      sort: filters.sort,
      page: 1,
    );
    final newState = FeedState(
      filters: filters,
      tests: res.tests,
      coverImages: const {},
      page: res.page,
      totalPages: res.totalPages,
      total: res.total,
      loadingMore: false,
    );
    _kickoffCoverFetch(res.tests);
    return newState;
  }

  /// Fires off a non-awaited cover fetch for the given page of tests
  /// and merges results into state when they arrive. Errors swallowed
  /// silently — covers are decorative.
  void _kickoffCoverFetch(List<TestSummary> tests) {
    if (tests.isEmpty) return;
    final ids = tests.map((t) => t.id).toList(growable: false);
    Future.microtask(() async {
      final covers = await _repo.fetchCovers(ids);
      if (covers.isEmpty) return;
      final current = state.valueOrNull;
      if (current == null) return;
      state = AsyncData(current.copyWith(
        coverImages: {...current.coverImages, ...covers},
      ));
    });
  }
}

final feedProvider = AsyncNotifierProvider<FeedNotifier, FeedState>(
  FeedNotifier.new,
);

// ─── Test detail (single test by share link) ──────────────────────────

/// Bundles everything the detail page renders: the test itself plus the
/// rolled-up auxiliary fetches (leaderboard, attempt count, my rating).
@immutable
class TestDetail {
  const TestDetail({
    required this.test,
    required this.leaderboard,
    required this.attempts,
    required this.attemptHistory,
    required this.myRating,
    required this.myDifficulty,
  });

  final TestFull test;
  final LeaderboardData leaderboard;
  final int attempts;
  final AttemptHistory attemptHistory;
  final int myRating;
  final int myDifficulty;

  TestDetail copyWith({
    TestFull? test,
    LeaderboardData? leaderboard,
    int? attempts,
    AttemptHistory? attemptHistory,
    int? myRating,
    int? myDifficulty,
  }) {
    return TestDetail(
      test: test ?? this.test,
      leaderboard: leaderboard ?? this.leaderboard,
      attempts: attempts ?? this.attempts,
      attemptHistory: attemptHistory ?? this.attemptHistory,
      myRating: myRating ?? this.myRating,
      myDifficulty: myDifficulty ?? this.myDifficulty,
    );
  }
}

/// Distinguishes "real" test data from the soft 403 deadline outcome.
sealed class TestDetailState {
  const TestDetailState();
}

class TestDetailLoaded extends TestDetailState {
  const TestDetailLoaded(this.detail);
  final TestDetail detail;
}

class TestDetailDeadline extends TestDetailState {
  const TestDetailDeadline({required this.code, required this.message});
  final String code; // NOT_STARTED | ENDED
  final String message;
}

/// Keyed by share-link so the same detail page can be opened multiple
/// times (e.g. via deep link) without thrashing state.
class TestDetailNotifier
    extends FamilyAsyncNotifier<TestDetailState, String> {
  late String _shareLink;

  TestsRepository get _repo => ref.read(testsRepositoryProvider);

  @override
  Future<TestDetailState> build(String arg) async {
    _shareLink = arg;
    return _load();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }

  Future<TestDetailState> _load() async {
    final fetched = await _repo.fetchTest(_shareLink);
    switch (fetched) {
      case TestFetchDeadline d:
        return TestDetailDeadline(code: d.code, message: d.message);
      case TestFetchSuccess s:
        // Fan out the supplementary fetches in parallel; failures fall
        // back to safe defaults inside the repository.
        final results = await Future.wait<Object>([
          _repo.getLeaderboard(s.test.id),
          _repo.getMyAttemptCount(s.test.id),
          _repo.getMyAttemptsList(s.test.id),
          _repo.getMyRating(s.test.id),
          _repo.getMyDifficultyRating(s.test.id),
        ]);
        return TestDetailLoaded(TestDetail(
          test: s.test,
          leaderboard: results[0] as LeaderboardData,
          attempts: results[1] as int,
          attemptHistory: results[2] as AttemptHistory,
          myRating: results[3] as int,
          myDifficulty: results[4] as int,
        ));
    }
  }

  Future<void> rate(int stars) async {
    final current = state.valueOrNull;
    if (current is! TestDetailLoaded) return;
    final detail = current.detail;
    final res = await _repo.rateTest(detail.test.id, stars);
    state = AsyncData(TestDetailLoaded(detail.copyWith(
      myRating: stars,
      // Refresh the global rating numbers so the stars panel updates.
      test: TestFull(
        id: detail.test.id,
        title: detail.test.title,
        description: detail.test.description,
        shareLink: detail.test.shareLink,
        questions: detail.test.questions,
        settings: detail.test.settings,
        totalPoints: detail.test.totalPoints,
        attemptCount: detail.test.attemptCount,
        averageScore: detail.test.averageScore,
        rating: res.rating,
        ratingCount: res.ratingCount,
        difficultyScore: detail.test.difficultyScore,
        difficultyCount: detail.test.difficultyCount,
        tags: detail.test.tags,
        coverImage: detail.test.coverImage,
        firstPublishedAt: detail.test.firstPublishedAt,
        author: detail.test.author,
      ),
    )));
  }

  Future<void> rateDifficulty(int difficulty) async {
    final current = state.valueOrNull;
    if (current is! TestDetailLoaded) return;
    final detail = current.detail;
    final res = await _repo.rateTestDifficulty(detail.test.id, difficulty);
    state = AsyncData(TestDetailLoaded(detail.copyWith(
      myDifficulty: difficulty,
      test: TestFull(
        id: detail.test.id,
        title: detail.test.title,
        description: detail.test.description,
        shareLink: detail.test.shareLink,
        questions: detail.test.questions,
        settings: detail.test.settings,
        totalPoints: detail.test.totalPoints,
        attemptCount: detail.test.attemptCount,
        averageScore: detail.test.averageScore,
        rating: detail.test.rating,
        ratingCount: detail.test.ratingCount,
        difficultyScore: res.difficulty,
        difficultyCount: res.count,
        tags: detail.test.tags,
        coverImage: detail.test.coverImage,
        firstPublishedAt: detail.test.firstPublishedAt,
        author: detail.test.author,
      ),
    )));
  }
}

final testDetailProvider = AsyncNotifierProvider.family<TestDetailNotifier,
    TestDetailState, String>(TestDetailNotifier.new);

// ─── Leaderboard (per-test, full) ─────────────────────────────────────

class LeaderboardNotifier
    extends FamilyAsyncNotifier<LeaderboardData, String> {
  TestsRepository get _repo => ref.read(testsRepositoryProvider);

  @override
  Future<LeaderboardData> build(String arg) {
    return _repo.getLeaderboard(arg);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.getLeaderboard(arg));
  }
}

final leaderboardProvider = AsyncNotifierProvider.family<LeaderboardNotifier,
    LeaderboardData, String>(LeaderboardNotifier.new);
