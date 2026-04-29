/// Models for the `/api/tests/*` and `/api/results/*` endpoints.
///
/// Mirrors the schemas declared in `server/models/Test.js` and
/// `server/models/Result.js`. Mobile only consumes a *subset* of the
/// server fields — anything unused in the UI is intentionally dropped to
/// keep the deserialisers small and the dart objects light.
///
/// Convention: every `fromJson` factory is forgiving — missing fields
/// fall back to safe defaults so a partial backend payload (e.g. an
/// older test missing `difficultyScore`) won't crash the page.
library;

import 'package:flutter/foundation.dart';

/// Author of a test (a slim populated `creator` field).
@immutable
class TestAuthor {
  const TestAuthor({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.username,
    this.uniqueId,
    this.avatar,
    this.role = 'student',
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? username;
  final String? uniqueId;
  final String? avatar;
  final String role;

  String get fullName {
    final l = lastName.trim();
    final f = firstName.trim();
    return [l, f].where((s) => s.isNotEmpty).join(' ');
  }

  factory TestAuthor.fromJson(Map<String, dynamic> json) {
    return TestAuthor(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      username: json['username']?.toString(),
      uniqueId: json['uniqueId']?.toString(),
      avatar: json['avatar']?.toString(),
      role: (json['role'] ?? 'student').toString(),
    );
  }
}

/// Summary card shown on the Browse / Dashboard grids. Deliberately
/// missing `coverImage` and `questions` — those are heavy and lazy
/// loaded via `/api/tests/covers` and `/api/tests/share/:link`.
@immutable
class TestSummary {
  const TestSummary({
    required this.id,
    required this.title,
    required this.shareLink,
    required this.questionCount,
    required this.totalPoints,
    required this.attemptCount,
    required this.averageScore,
    required this.rating,
    required this.ratingCount,
    required this.isPublic,
    required this.tags,
    required this.timeLimit,
    required this.maxAttempts,
    this.description = '',
    this.difficultyScore = 0,
    this.difficultyCount = 0,
    this.firstPublishedAt,
    this.startDate,
    this.endDate,
    this.author,
  });

  final String id;
  final String title;
  final String description;
  final String shareLink;
  final int questionCount;
  final int totalPoints;
  final int attemptCount;
  final double averageScore;
  final double rating;
  final int ratingCount;
  final double difficultyScore;
  final int difficultyCount;
  final bool isPublic;
  final List<String> tags;
  final int timeLimit; // minutes; 0 = unlimited
  final int maxAttempts;
  final DateTime? firstPublishedAt;
  final DateTime? startDate;
  final DateTime? endDate;
  final TestAuthor? author;

  factory TestSummary.fromJson(Map<String, dynamic> json) {
    final settingsRaw = json['settings'];
    final settings = (settingsRaw is Map)
        ? settingsRaw.cast<String, dynamic>()
        : const <String, dynamic>{};
    final questionsRaw = json['questions'];
    final qCount = questionsRaw is List ? questionsRaw.length : 0;
    final tagsRaw = json['tags'];
    final tags = tagsRaw is List
        ? tagsRaw.map((e) => e.toString()).toList(growable: false)
        : const <String>[];
    final creatorRaw = json['creator'];
    return TestSummary(
      id: (json['_id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      shareLink: (json['shareLink'] ?? '').toString(),
      questionCount: qCount,
      totalPoints: _toInt(json['totalPoints']),
      attemptCount: _toInt(json['attemptCount']),
      averageScore: _toDouble(json['averageScore']),
      rating: _toDouble(json['rating']),
      ratingCount: _toInt(json['ratingCount']),
      difficultyScore: _toDouble(json['difficultyScore']),
      difficultyCount: _toInt(json['difficultyCount']),
      isPublic: settings['isPublic'] == true,
      tags: tags,
      timeLimit: _toInt(settings['timeLimit']),
      maxAttempts: _toInt(settings['maxAttempts']),
      firstPublishedAt: _parseDate(json['firstPublishedAt']),
      startDate: _parseDate(settings['startDate']),
      endDate: _parseDate(settings['endDate']),
      author: creatorRaw is Map
          ? TestAuthor.fromJson(creatorRaw.cast<String, dynamic>())
          : null,
    );
  }
}

/// Single answer option for choice / matching questions. The "left
/// side" of a matching question carries `text`; the "right side" pair
/// is exposed separately by the server in `matchingRightSide`.
@immutable
class QuestionOption {
  const QuestionOption({
    required this.id,
    required this.text,
    this.image,
  });

  final String id;
  final String text;

  /// Optional image URL for option-level visuals (rare; mostly used in
  /// matching pairs where both sides can have a picture).
  final String? image;

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      text: (json['text'] ?? '').toString(),
      image: json['image']?.toString(),
    );
  }
}

/// Per-language overrides bundled with each question. The server
/// returns translations in `Map<lang, {questionText, options[], ...}>`
/// shape. We keep them as plain maps and resolve at render time —
/// trying to model 4 language variants × 6 fields × 6 question types
/// in a typed Dart class would balloon for very little win.
@immutable
class QuestionTranslations {
  const QuestionTranslations(this._byLang);

  final Map<String, Map<String, dynamic>> _byLang;

  String questionText(String lang, String fallback) {
    final t = _byLang[lang];
    if (t == null) return fallback;
    final v = t['questionText'];
    return (v is String && v.isNotEmpty) ? v : fallback;
  }

  String passage(String lang, String fallback) {
    final t = _byLang[lang];
    if (t == null) return fallback;
    final v = t['passage'];
    return (v is String && v.isNotEmpty) ? v : fallback;
  }

  String explanation(String lang, String fallback) {
    final t = _byLang[lang];
    if (t == null) return fallback;
    final v = t['explanation'];
    return (v is String && v.isNotEmpty) ? v : fallback;
  }

  String optionText(String lang, int index, String fallback) {
    final t = _byLang[lang];
    if (t == null) return fallback;
    final list = t['options'];
    if (list is List && index < list.length) {
      final v = list[index];
      if (v is String && v.isNotEmpty) return v;
    }
    return fallback;
  }

  String matchPair(String lang, int index, String fallback) {
    final t = _byLang[lang];
    if (t == null) return fallback;
    final list = t['matchPairs'];
    if (list is List && index < list.length) {
      final v = list[index];
      if (v is String && v.isNotEmpty) return v;
    }
    return fallback;
  }

  factory QuestionTranslations.fromJson(dynamic json) {
    if (json is! Map) return const QuestionTranslations({});
    final byLang = <String, Map<String, dynamic>>{};
    json.forEach((key, value) {
      if (value is Map) {
        byLang[key.toString()] = value.cast<String, dynamic>();
      }
    });
    return QuestionTranslations(byLang);
  }
}

/// One question of a test, AS DELIVERED TO THE TAKER. The server
/// strips `correctAnswer` and `option.isCorrect` before sending — so
/// scoring is server-authoritative.
@immutable
class Question {
  const Question({
    required this.id,
    required this.type,
    required this.questionText,
    required this.options,
    required this.points,
    required this.translations,
    this.passage = '',
    this.explanation = '',
    this.mediaType = '',
    this.mediaUrl = '',
    this.matchingRightSide = const [],
    this.matchingRightSideTranslations = const {},
  });

  final String id;
  final QuestionType type;
  final String questionText;

  /// Optional reading passage / context shown above the question.
  final String passage;
  final String explanation;
  final String mediaType; // image | video | audio | ''
  final String mediaUrl;
  final int points;
  final List<QuestionOption> options;

  /// For matching questions only: the shuffled "right side" labels the
  /// taker can drag/snap to. Indices align with [options]'s "left side"
  /// after the server's seed-deterministic shuffle.
  final List<String> matchingRightSide;
  final Map<String, List<String>> matchingRightSideTranslations;

  final QuestionTranslations translations;

  factory Question.fromJson(Map<String, dynamic> json) {
    final optsRaw = json['options'];
    final options = optsRaw is List
        ? optsRaw
            .whereType<Map<dynamic, dynamic>>()
            .map((e) => QuestionOption.fromJson(e.cast<String, dynamic>()))
            .toList(growable: false)
        : const <QuestionOption>[];

    final mediaRaw = json['media'];
    String mediaType = '';
    String mediaUrl = '';
    if (mediaRaw is Map) {
      mediaType = (mediaRaw['type'] ?? '').toString();
      mediaUrl = (mediaRaw['url'] ?? '').toString();
    }

    final rightRaw = json['matchingRightSide'];
    final right = rightRaw is List
        ? rightRaw.map((e) => e.toString()).toList(growable: false)
        : const <String>[];

    final rightTransRaw = json['matchingRightSideTranslations'];
    final rightTrans = <String, List<String>>{};
    if (rightTransRaw is Map) {
      rightTransRaw.forEach((key, value) {
        if (value is List) {
          rightTrans[key.toString()] =
              value.map((e) => e.toString()).toList(growable: false);
        }
      });
    }

    return Question(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      type: QuestionTypeX.fromJson((json['type'] ?? '').toString()),
      questionText: (json['questionText'] ?? '').toString(),
      passage: (json['passage'] ?? '').toString(),
      explanation: (json['explanation'] ?? '').toString(),
      mediaType: mediaType,
      mediaUrl: mediaUrl,
      points: _toInt(json['points'], fallback: 1),
      options: options,
      matchingRightSide: right,
      matchingRightSideTranslations: rightTrans,
      translations: QuestionTranslations.fromJson(json['translations']),
    );
  }
}

/// Six supported question types (mirrors server enum). Encoded as the
/// kebab-case strings the API uses; all parsing/serialisation goes
/// through `QuestionTypeX`.
enum QuestionType {
  singleChoice,
  multipleChoice,
  trueFalse,
  essay,
  matching,
  fillBlank,
  unknown,
}

extension QuestionTypeX on QuestionType {
  String toJson() {
    switch (this) {
      case QuestionType.singleChoice:
        return 'single-choice';
      case QuestionType.multipleChoice:
        return 'multiple-choice';
      case QuestionType.trueFalse:
        return 'true-false';
      case QuestionType.essay:
        return 'essay';
      case QuestionType.matching:
        return 'matching';
      case QuestionType.fillBlank:
        return 'fill-blank';
      case QuestionType.unknown:
        return '';
    }
  }

  static QuestionType fromJson(String value) {
    switch (value) {
      case 'single-choice':
        return QuestionType.singleChoice;
      case 'multiple-choice':
        return QuestionType.multipleChoice;
      case 'true-false':
        return QuestionType.trueFalse;
      case 'essay':
        return QuestionType.essay;
      case 'matching':
        return QuestionType.matching;
      case 'fill-blank':
        return QuestionType.fillBlank;
      default:
        return QuestionType.unknown;
    }
  }

  /// Whether this type is automatically graded by the server. `essay`
  /// is the only one that needs human review.
  bool get isAutoGraded => this != QuestionType.essay;
}

/// Anti-cheat configuration shipped with the test. Mobile uses a
/// reduced subset (tab-switch detection only — copy/paste blocking
/// doesn't translate to mobile, no DevTools/screenshot detection
/// available without OS permissions).
@immutable
class AntiCheatSettings {
  const AntiCheatSettings({
    this.blockTabSwitch = true,
    this.warnOnLeave = true,
    this.finishOnLeave = false,
    this.blockCopyPaste = true,
    this.blockScreenshot = true,
    this.maxViolations = 5,
  });

  final bool blockTabSwitch;
  final bool warnOnLeave;
  final bool finishOnLeave;
  final bool blockCopyPaste;
  final bool blockScreenshot;
  final int maxViolations;

  factory AntiCheatSettings.fromJson(Map<String, dynamic> json) {
    return AntiCheatSettings(
      blockTabSwitch: json['blockTabSwitch'] != false,
      warnOnLeave: json['warnOnLeave'] != false,
      finishOnLeave: json['finishOnLeave'] == true,
      blockCopyPaste: json['blockCopyPaste'] != false,
      blockScreenshot: json['blockScreenshot'] != false,
      maxViolations: _toInt(json['maxViolations'], fallback: 5),
    );
  }
}

/// Variant configuration. When `enabled`, tickets are claimed before
/// the test starts (1 ticket = 1 random shuffled variant), and the
/// shuffle becomes seed-deterministic.
@immutable
class VariantSettings {
  const VariantSettings({this.enabled = false, this.count = 0});

  final bool enabled;
  final int count;

  factory VariantSettings.fromJson(Map<String, dynamic> json) {
    return VariantSettings(
      enabled: json['enabled'] == true,
      count: _toInt(json['count']),
    );
  }
}

@immutable
class MultiLanguageSettings {
  const MultiLanguageSettings({
    this.enabled = false,
    this.languages = const [],
  });

  final bool enabled;
  final List<String> languages;

  factory MultiLanguageSettings.fromJson(Map<String, dynamic> json) {
    final raw = json['languages'];
    return MultiLanguageSettings(
      enabled: json['enabled'] == true,
      languages: raw is List
          ? raw.map((e) => e.toString()).toList(growable: false)
          : const <String>[],
    );
  }
}

/// Full test settings sub-object. All fields default to safe values so
/// missing payload bits never break the renderer.
@immutable
class TestSettings {
  const TestSettings({
    this.timeLimit = 0,
    this.shuffleQuestions = false,
    this.shuffleOptions = false,
    this.showResults = true,
    this.allowReview = true,
    this.maxAttempts = 1,
    this.isPublic = false,
    this.antiCheat = const AntiCheatSettings(),
    this.instantFeedback = true,
    this.questionPoolSize = 0,
    this.inactivityTimeout = 0,
    this.practiceMode = false,
    this.partialCredit = false,
    this.variants = const VariantSettings(),
    this.startDate,
    this.endDate,
    this.allowComments = true,
    this.multiLanguage = const MultiLanguageSettings(),
  });

  final int timeLimit; // minutes
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool showResults;
  final bool allowReview;
  final int maxAttempts;
  final bool isPublic;
  final AntiCheatSettings antiCheat;
  final bool instantFeedback;
  final int questionPoolSize;
  final int inactivityTimeout; // minutes
  final bool practiceMode;
  final bool partialCredit;
  final VariantSettings variants;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool allowComments;
  final MultiLanguageSettings multiLanguage;

  factory TestSettings.fromJson(Map<String, dynamic> json) {
    return TestSettings(
      timeLimit: _toInt(json['timeLimit']),
      shuffleQuestions: json['shuffleQuestions'] == true,
      shuffleOptions: json['shuffleOptions'] == true,
      showResults: json['showResults'] != false,
      allowReview: json['allowReview'] != false,
      maxAttempts: _toInt(json['maxAttempts'], fallback: 1),
      isPublic: json['isPublic'] == true,
      antiCheat: json['antiCheat'] is Map
          ? AntiCheatSettings.fromJson(
              (json['antiCheat'] as Map).cast<String, dynamic>())
          : const AntiCheatSettings(),
      instantFeedback: json['instantFeedback'] != false,
      questionPoolSize: _toInt(json['questionPoolSize']),
      inactivityTimeout: _toInt(json['inactivityTimeout']),
      practiceMode: json['practiceMode'] == true,
      partialCredit: json['partialCredit'] == true,
      variants: json['variants'] is Map
          ? VariantSettings.fromJson(
              (json['variants'] as Map).cast<String, dynamic>())
          : const VariantSettings(),
      startDate: _parseDate(json['startDate']),
      endDate: _parseDate(json['endDate']),
      allowComments: json['allowComments'] != false,
      multiLanguage: json['multiLanguage'] is Map
          ? MultiLanguageSettings.fromJson(
              (json['multiLanguage'] as Map).cast<String, dynamic>())
          : const MultiLanguageSettings(),
    );
  }
}

/// Full test, as returned by `GET /tests/share/:shareLink`. Carries
/// everything needed to render the take-test flow.
@immutable
class TestFull {
  const TestFull({
    required this.id,
    required this.title,
    required this.description,
    required this.shareLink,
    required this.questions,
    required this.settings,
    required this.totalPoints,
    required this.attemptCount,
    required this.averageScore,
    required this.rating,
    required this.ratingCount,
    required this.tags,
    this.coverImage = '',
    this.difficultyScore = 0,
    this.difficultyCount = 0,
    this.firstPublishedAt,
    this.author,
  });

  final String id;
  final String title;
  final String description;
  final String shareLink;
  final List<Question> questions;
  final TestSettings settings;
  final int totalPoints;
  final int attemptCount;
  final double averageScore;
  final double rating;
  final int ratingCount;
  final double difficultyScore;
  final int difficultyCount;
  final List<String> tags;
  final String coverImage; // base64 data url, may be empty
  final DateTime? firstPublishedAt;
  final TestAuthor? author;

  factory TestFull.fromJson(Map<String, dynamic> json) {
    final questionsRaw = json['questions'];
    final questions = questionsRaw is List
        ? questionsRaw
            .whereType<Map<dynamic, dynamic>>()
            .map((q) => Question.fromJson(q.cast<String, dynamic>()))
            .toList(growable: false)
        : const <Question>[];
    final settingsRaw = json['settings'];
    final tagsRaw = json['tags'];
    final creatorRaw = json['creator'];
    return TestFull(
      id: (json['_id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      shareLink: (json['shareLink'] ?? '').toString(),
      questions: questions,
      settings: settingsRaw is Map
          ? TestSettings.fromJson(settingsRaw.cast<String, dynamic>())
          : const TestSettings(),
      totalPoints: _toInt(json['totalPoints']),
      attemptCount: _toInt(json['attemptCount']),
      averageScore: _toDouble(json['averageScore']),
      rating: _toDouble(json['rating']),
      ratingCount: _toInt(json['ratingCount']),
      difficultyScore: _toDouble(json['difficultyScore']),
      difficultyCount: _toInt(json['difficultyCount']),
      tags: tagsRaw is List
          ? tagsRaw.map((e) => e.toString()).toList(growable: false)
          : const <String>[],
      coverImage: (json['coverImage'] ?? '').toString(),
      firstPublishedAt: _parseDate(json['firstPublishedAt']),
      author: creatorRaw is Map
          ? TestAuthor.fromJson(creatorRaw.cast<String, dynamic>())
          : null,
    );
  }
}

/// Paged `/api/tests` response.
@immutable
class TestListPage {
  const TestListPage({
    required this.tests,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  final List<TestSummary> tests;
  final int total;
  final int page;
  final int totalPages;

  bool get hasMore => page < totalPages;

  factory TestListPage.fromJson(Map<String, dynamic> json) {
    final raw = json['tests'];
    return TestListPage(
      tests: raw is List
          ? raw
              .whereType<Map<dynamic, dynamic>>()
              .map((e) => TestSummary.fromJson(e.cast<String, dynamic>()))
              .toList(growable: false)
          : const <TestSummary>[],
      total: _toInt(json['total']),
      page: _toInt(json['page'], fallback: 1),
      totalPages: _toInt(json['totalPages'], fallback: 1),
    );
  }
}

/// One row in the leaderboard. `userId` is null for guests; show
/// `userName` (already populated server-side as "lastName firstName").
@immutable
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.userName,
    required this.score,
    required this.maxScore,
    required this.percentage,
    required this.timeSpent,
    this.userId,
    this.avatar,
    this.completedAt,
  });

  final int rank;
  final String userName;
  final String? userId;
  final String? avatar;
  final int score;
  final int maxScore;
  final double percentage;
  final int timeSpent; // seconds
  final DateTime? completedAt;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: _toInt(json['rank']),
      userName: (json['userName'] ?? 'Гость').toString(),
      userId: json['userId']?.toString(),
      avatar: json['avatar']?.toString(),
      score: _toInt(json['score']),
      maxScore: _toInt(json['maxScore']),
      percentage: _toDouble(json['percentage']),
      timeSpent: _toInt(json['timeSpent']),
      completedAt: _parseDate(json['completedAt']),
    );
  }
}

@immutable
class LeaderboardData {
  const LeaderboardData({required this.testTitle, required this.entries});

  final String testTitle;
  final List<LeaderboardEntry> entries;

  factory LeaderboardData.fromJson(Map<String, dynamic> json) {
    final raw = json['leaderboard'];
    return LeaderboardData(
      testTitle: (json['testTitle'] ?? '').toString(),
      entries: raw is List
          ? raw
              .whereType<Map<dynamic, dynamic>>()
              .map((e) => LeaderboardEntry.fromJson(e.cast<String, dynamic>()))
              .toList(growable: false)
          : const <LeaderboardEntry>[],
    );
  }
}

/// One row of the "my last 5 attempts" history block.
@immutable
class AttemptHistoryItem {
  const AttemptHistoryItem({
    required this.id,
    required this.score,
    required this.totalPoints,
    required this.percentage,
    required this.completedAt,
  });

  final String id;
  final int score;
  final int totalPoints;
  final double percentage;
  final DateTime? completedAt;

  factory AttemptHistoryItem.fromJson(Map<String, dynamic> json) {
    return AttemptHistoryItem(
      id: (json['_id'] ?? '').toString(),
      score: _toInt(json['score']),
      totalPoints: _toInt(json['totalPoints']),
      percentage: _toDouble(json['percentage']),
      completedAt: _parseDate(json['completedAt']),
    );
  }
}

@immutable
class AttemptHistory {
  const AttemptHistory({
    required this.attempts,
    required this.count,
    required this.best,
  });

  final List<AttemptHistoryItem> attempts;
  final int count;
  final double best;

  factory AttemptHistory.fromJson(Map<String, dynamic> json) {
    final raw = json['attempts'];
    return AttemptHistory(
      attempts: raw is List
          ? raw
              .whereType<Map<dynamic, dynamic>>()
              .map((e) =>
                  AttemptHistoryItem.fromJson(e.cast<String, dynamic>()))
              .toList(growable: false)
          : const <AttemptHistoryItem>[],
      count: _toInt(json['count']),
      best: _toDouble(json['best']),
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

int _toInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is num) return value.toInt();
  if (value is String) {
    final parsed = int.tryParse(value);
    if (parsed != null) return parsed;
    final asDouble = double.tryParse(value);
    if (asDouble != null) return asDouble.round();
  }
  return fallback;
}

double _toDouble(Object? value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  if (value is String) {
    final parsed = double.tryParse(value);
    if (parsed != null) return parsed;
  }
  return fallback;
}

DateTime? _parseDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
  return null;
}
