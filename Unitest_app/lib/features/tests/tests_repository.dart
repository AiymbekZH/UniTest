import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exceptions.dart';
import '../../core/api/dio_client.dart';
import 'models/test_models.dart';

/// HTTP layer for `/api/tests` and `/api/results` (read-side).
///
/// The repository is intentionally **stateless** — Riverpod controllers
/// own all caching/state. Each method either returns a typed model or
/// throws an `ApiException` subclass (the dio interceptor in
/// `dio_client.dart` translates raw HTTP failures into our taxonomy).
class TestsRepository {
  TestsRepository(this._dio);

  final Dio _dio;

  // ─── Browse / list ──────────────────────────────────────────────────

  /// `GET /api/tests` with search/sort/pagination.
  ///
  /// Backend caches per-user for 15s (private) so successive scrolls
  /// don't hammer Mongo. The response intentionally omits `coverImage`
  /// (≈600 KB each, would balloon to ~6 MB per page); use [fetchCovers]
  /// after the list arrives to lazy-load only what's on screen.
  Future<TestListPage> listTests({
    String? search,
    String? tag,
    TestSort sort = TestSort.newest,
    int page = 1,
    int limit = 12,
  }) async {
    return _safe(() async {
      final query = <String, dynamic>{
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (tag != null && tag.trim().isNotEmpty) 'tag': tag.trim(),
        if (sort != TestSort.newest) 'sort': sort.toJson(),
        'page': page,
        'limit': limit,
      };
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.tests,
        queryParameters: query,
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty tests response');
      }
      return TestListPage.fromJson(body);
    });
  }

  /// Batch-fetch base64 cover images for the given test IDs (max 24).
  /// Returns a `{testId: dataUrl}` map.
  ///
  /// Returns an EMPTY map on any error — covers are non-essential and a
  /// dropped network shouldn't break the browse grid.
  Future<Map<String, String>> fetchCovers(List<String> testIds) async {
    if (testIds.isEmpty) return const {};
    final ids = testIds.take(24).join(',');
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.testsCovers,
        queryParameters: {'ids': ids},
      );
      final body = res.data;
      if (body == null) return const {};
      return body.map(
        (k, v) => MapEntry(k.toString(), v?.toString() ?? ''),
      );
    } on DioException {
      return const {};
    }
  }

  /// `GET /api/tests/share/:shareLink`. Returns the full sanitized test
  /// (questions stripped of correctAnswer / option.isCorrect). Throws
  /// `ForbiddenException` for 403 deadline errors — the caller should
  /// distinguish via [fetchTest] when it needs the structured payload.
  Future<TestFull> getByShareLink(String shareLink, {int variant = 0}) async {
    return _safe(() async {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.testByShareLink(shareLink),
        queryParameters: variant > 0 ? {'variant': variant} : null,
      );
      final body = res.data;
      if (body == null) {
        throw const UnknownApiException('Empty test response');
      }
      return TestFull.fromJson(body);
    });
  }

  /// Variant of [getByShareLink] that returns a structured deadline
  /// error instead of throwing on 403, so the UI can render a friendly
  /// "opens at <date>" card.
  Future<TestFetchResult> fetchTest(String shareLink, {int variant = 0}) async {
    try {
      final test = await getByShareLink(shareLink, variant: variant);
      return TestFetchSuccess(test);
    } on ForbiddenException catch (e) {
      return TestFetchDeadline(
        message: e.message,
        code: _inferDeadlineCode(e.message),
      );
    }
  }

  // ─── Ratings ────────────────────────────────────────────────────────

  Future<({double rating, int ratingCount, bool alreadyRated})> rateTest(
    String testId,
    int stars,
  ) async {
    return _safe(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.testRate(testId),
        data: {'rating': stars},
      );
      final body = res.data ?? const {};
      return (
        rating: (body['rating'] as num?)?.toDouble() ?? 0,
        ratingCount: (body['ratingCount'] as num?)?.toInt() ?? 0,
        alreadyRated: body['alreadyRated'] == true,
      );
    });
  }

  Future<({double difficulty, int count, bool alreadyRated})>
      rateTestDifficulty(String testId, int difficulty) async {
    return _safe(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.testRateDifficulty(testId),
        data: {'difficulty': difficulty},
      );
      final body = res.data ?? const {};
      return (
        difficulty: (body['difficultyScore'] as num?)?.toDouble() ?? 0,
        count: (body['difficultyCount'] as num?)?.toInt() ?? 0,
        alreadyRated: body['alreadyRated'] == true,
      );
    });
  }

  /// Returns `0` if the user hasn't rated yet (or backend errors out).
  Future<int> getMyRating(String testId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.testMyRating(testId),
      );
      final v = res.data?['rating'];
      return v is num ? v.toInt() : 0;
    } on DioException {
      return 0;
    }
  }

  Future<int> getMyDifficultyRating(String testId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.testMyDifficultyRating(testId),
      );
      final v = res.data?['difficulty'];
      return v is num ? v.toInt() : 0;
    } on DioException {
      return 0;
    }
  }

  // ─── Leaderboard / attempts ─────────────────────────────────────────

  Future<LeaderboardData> getLeaderboard(String testId) async {
    return _safe(() async {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.resultsLeaderboard(testId),
      );
      final body = res.data;
      if (body == null) {
        return const LeaderboardData(testTitle: '', entries: []);
      }
      return LeaderboardData.fromJson(body);
    });
  }

  /// "How many attempts has the current user spent on this test?"
  /// Returns 0 on any failure to keep the UI graceful (it just gates
  /// the "Start" button when reached).
  Future<int> getMyAttemptCount(String testId, {String? guestId}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.resultsMyAttempts(testId),
        queryParameters:
            guestId != null && guestId.isNotEmpty ? {'guestId': guestId} : null,
      );
      final v = res.data?['attempts'];
      return v is num ? v.toInt() : 0;
    } on DioException {
      return 0;
    }
  }

  Future<AttemptHistory> getMyAttemptsList(
    String testId, {
    String? guestId,
  }) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.resultsMyAttemptsList(testId),
        queryParameters:
            guestId != null && guestId.isNotEmpty ? {'guestId': guestId} : null,
      );
      final body = res.data;
      if (body == null) {
        return const AttemptHistory(attempts: [], count: 0, best: 0);
      }
      return AttemptHistory.fromJson(body);
    } on DioException {
      return const AttemptHistory(attempts: [], count: 0, best: 0);
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────

  /// Wraps an HTTP call so dio's `DioException` (which carries the
  /// translated `ApiException` in its `.error` field) is unwrapped.
  Future<T> _safe<T>(Future<T> Function() op) async {
    try {
      return await op();
    } on DioException catch (e) {
      final err = e.error;
      if (err is ApiException) throw err;
      throw UnknownApiException(e.message ?? 'Unknown network error');
    }
  }

  static String _inferDeadlineCode(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('закрыт') || lower.contains('end')) return 'ENDED';
    return 'NOT_STARTED';
  }
}

/// Discriminated outcome for `fetchTest()`. Either we got the full
/// test, or the server told us it's outside its open window.
sealed class TestFetchResult {
  const TestFetchResult();
}

class TestFetchSuccess extends TestFetchResult {
  const TestFetchSuccess(this.test);
  final TestFull test;
}

class TestFetchDeadline extends TestFetchResult {
  const TestFetchDeadline({required this.message, required this.code});
  final String message;
  final String code; // NOT_STARTED | ENDED
}

/// Sort options for the browse list. Backend accepts `rating`,
/// `popular`, `title` and falls back to `createdAt: -1` (newest)
/// for anything else.
enum TestSort { newest, popular, rating, title }

extension TestSortX on TestSort {
  String toJson() {
    switch (this) {
      case TestSort.newest:
        return 'newest';
      case TestSort.popular:
        return 'popular';
      case TestSort.rating:
        return 'rating';
      case TestSort.title:
        return 'title';
    }
  }

  String label() {
    switch (this) {
      case TestSort.newest:
        return 'Новые';
      case TestSort.popular:
        return 'Популярные';
      case TestSort.rating:
        return 'Рейтинг';
      case TestSort.title:
        return 'А — Я';
    }
  }
}

final testsRepositoryProvider = Provider<TestsRepository>((ref) {
  final dio = ref.read(dioClientProvider).dio;
  return TestsRepository(dio);
});
