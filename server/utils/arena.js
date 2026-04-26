const jwt = require('jsonwebtoken');

// Note: 'essay' is technically allowed in arena snapshots so embedded essay questions
// can reach the snapshot, but they are auto-graded as "incorrect" in gradeArenaAnswer
// (essay grading is out of scope for live arena). UI can still display them.
const ARENA_ALLOWED_TYPES = ['single-choice', 'multiple-choice', 'true-false', 'matching', 'fill-blank', 'essay'];

const ARENA_STATUS = {
  PENDING: 'pending_acceptance',
  LOBBY: 'lobby',
  LEGACY_COUNTDOWN: 'countdown',
  COUNTDOWN: 'starting_countdown',
  QUESTION_INTRO: 'question_intro',
  LIVE: 'live_question',
  ANSWER_REVEAL: 'answer_reveal',
  LEADERBOARD: 'leaderboard',
  ROUND_RESULT: 'round_result',
  PAUSED: 'paused',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  FINAL: 'final'
};

const QUESTION_VISIBLE_STATUSES = new Set([
  ARENA_STATUS.QUESTION_INTRO,
  ARENA_STATUS.LIVE,
  ARENA_STATUS.ANSWER_REVEAL,
  ARENA_STATUS.LEADERBOARD,
  ARENA_STATUS.ROUND_RESULT
]);

const ANSWER_VISIBLE_STATUSES = new Set([
  ARENA_STATUS.ANSWER_REVEAL,
  ARENA_STATUS.LEADERBOARD,
  ARENA_STATUS.ROUND_RESULT
]);

function normalizeFreeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeArenaSettings(settings = {}, fallback = {}) {
  const VIBES = ['default', 'quizshow', '8bit', 'cinematic', 'chill'];
  const audioVibe = settings.audioVibe ?? fallback.audioVibe ?? 'default';
  const powerUpPool = Array.isArray(settings.powerUpPool)
    ? settings.powerUpPool
    : (Array.isArray(fallback.powerUpPool) ? fallback.powerUpPool : ['fiftyFifty', 'doublePoints', 'shield']);

  return {
    countdownSeconds: clampNumber(settings.countdownSeconds ?? fallback.countdownSeconds, 5, 3, 15),
    questionIntroSec: clampNumber(settings.questionIntroSec ?? fallback.questionIntroSec, 3, 1, 10),
    answerTimeSec: clampNumber(settings.answerTimeSec ?? fallback.answerTimeSec, 20, 5, 120),
    answerRevealSec: clampNumber(settings.answerRevealSec ?? fallback.answerRevealSec, 5, 2, 20),
    leaderboardSec: clampNumber(settings.leaderboardSec ?? fallback.leaderboardSec, 6, 2, 30),
    allowGuests: Boolean(settings.allowGuests ?? fallback.allowGuests ?? false),
    maxPlayers: clampNumber(settings.maxPlayers ?? fallback.maxPlayers, 100, 2, 500),
    // ── Extended (Phase-2 / Phase-3) settings — passed through, not stripped ──
    powerUpPool,
    streaksEnabled:    Boolean(settings.streaksEnabled    ?? fallback.streaksEnabled    ?? false),
    underdogBonus:     Boolean(settings.underdogBonus     ?? fallback.underdogBonus     ?? false),
    shuffleQuestions:  Boolean(settings.shuffleQuestions  ?? fallback.shuffleQuestions  ?? false),
    bossRoundEnabled:  Boolean(settings.bossRoundEnabled  ?? fallback.bossRoundEnabled  ?? false),
    crownCarryEnabled: Boolean(settings.crownCarryEnabled ?? fallback.crownCarryEnabled ?? false),
    audioVibe: VIBES.includes(audioVibe) ? audioVibe : 'default'
  };
}

function getArenaQuestionDuration(type) {
  switch (type) {
    case 'true-false':
      return 12;
    case 'single-choice':
      return 15;
    case 'multiple-choice':
      return 20;
    case 'fill-blank':
      return 20;
    case 'matching':
      return 30;
    default:
      return 20;
  }
}

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function buildArenaQuestionSnapshot(question, settings = {}) {
  if (!ARENA_ALLOWED_TYPES.includes(question.type)) return null;

  const base = {
    questionId: question.id,
    type: question.type,
    questionText: question.questionText,
    passage: question.passage || '',
    explanation: question.explanation || '',
    media: question.media && typeof question.media === 'object' ? {
      type:     question.media.type || '',
      url:      question.media.url || '',
      fileName: question.media.fileName || ''
    } : { type: '', url: '', fileName: '' },
    points: Math.max(0, Number(question.points) || 1),
    timeLimitSec: clampNumber(settings.answerTimeSec, getArenaQuestionDuration(question.type), 5, 300),
    options: [],
    matchingRightSide: [],
    tag: ['normal', 'blitz', 'think', 'jackpot', 'boss'].includes(question.tag)
      ? question.tag : 'normal',
    translations: question.translations || {},
    grading: {
      correctOptionIds: [],
      acceptedAnswers: [],
      correctPairs: {}
    }
  };

  // Tag-based timer override: blitz forces 5s, think forces 60s.
  if (base.tag === 'blitz') base.timeLimitSec = 5;
  else if (base.tag === 'think') base.timeLimitSec = 60;

  if (question.type === 'matching') {
    const leftOptions = [];
    const rightOptions = [];

    (question.options || []).forEach((option) => {
      leftOptions.push({ id: option.id, text: option.text });
      if (option.matchPair) {
        rightOptions.push({ id: option.id, text: option.matchPair });
        base.grading.correctPairs[option.id] = option.matchPair;
      }
    });

    base.options = leftOptions;
    base.matchingRightSide = rightOptions.sort(() => Math.random() - 0.5);
    return base;
  }

  base.options = (question.options || []).map(option => ({ id: option.id, text: option.text }));
  base.grading.correctOptionIds = (question.options || [])
    .filter(option => option.isCorrect)
    .map(option => option.id);

  if (question.type === 'fill-blank') {
    const accepted = new Set();
    accepted.add(normalizeFreeText(question.correctAnswer));
    ['en', 'ru', 'kz', 'es'].forEach((lang) => {
      accepted.add(normalizeFreeText(question.translations?.[lang]?.correctAnswer));
    });
    base.grading.acceptedAnswers = [...accepted].filter(Boolean);
  }

  return base;
}

function buildArenaSnapshotFromTest(test, settings = {}) {
  const normalizedSettings = normalizeArenaSettings(settings);
  return (test.questions || [])
    .map(question => buildArenaQuestionSnapshot(question, normalizedSettings))
    .filter(Boolean);
}

/**
 * Build an arena question snapshot from a list of BankQuestion documents.
 * `entries` may be plain bank docs or override objects of shape:
 *   { bankQuestion, timerOverride?, pointsOverride?, tag? }
 * Per-question overrides win over the room default.
 */
function buildArenaSnapshotFromBank(entries, settings = {}) {
  const normalizedSettings = normalizeArenaSettings(settings);
  return (entries || [])
    .map((entry, idx) => {
      const bq = entry.bankQuestion || entry;
      if (!bq || !ARENA_ALLOWED_TYPES.includes(bq.type)) return null;
      // BankQuestion has no question-level `id`. Use _id (or synth) for questionId.
      const questionLike = {
        id: String(bq._id || `bank-${idx}-${Date.now()}`),
        type: bq.type,
        questionText: bq.questionText,
        passage: bq.passage || '',
        explanation: bq.explanation || '',
        points: Math.max(1, Number(entry.pointsOverride ?? bq.points) || 1),
        options: (bq.options || []).map(o => ({
          id: o.id || String(o._id || ''),
          text: o.text,
          isCorrect: !!o.isCorrect,
          matchPair: o.matchPair || ''
        })),
        correctAnswer: bq.correctAnswer || '',
        translations: bq.translations || {},
        tag: entry.tag || 'normal'
      };
      const perQuestionSettings = entry.timerOverride
        ? { ...normalizedSettings, answerTimeSec: entry.timerOverride }
        : normalizedSettings;
      return buildArenaQuestionSnapshot(questionLike, perQuestionSettings);
    })
    .filter(Boolean);
}

/**
 * Build an arena snapshot from ArenaTest entries (mixed kinds: 'bank' + 'embedded').
 * Bank entries must have `bankQuestion` populated as a full doc.
 * Embedded entries use entry.embedded directly.
 *
 * If `bossRoundEnabled` is true, the LAST snapshot entry is forced to tag 'boss'.
 */
function buildArenaSnapshotFromArenaTestEntries(entries, settings = {}, opts = {}) {
  const normalizedSettings = normalizeArenaSettings(settings);
  const bossRound = !!opts.bossRoundEnabled;
  const result = (entries || [])
    .map((entry, idx) => {
      const tag = entry.tag || 'normal';
      const perQuestionSettings = entry.timerOverride
        ? { ...normalizedSettings, answerTimeSec: entry.timerOverride }
        : normalizedSettings;

      if (entry.kind === 'embedded' && entry.embedded) {
        const e = entry.embedded;
        const questionLike = {
          id: `emb-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: e.type,
          questionText: e.questionText,
          passage: e.passage || '',
          explanation: e.explanation || '',
          media: e.media || { type: '', url: '', fileName: '' },
          points: Math.max(0, Number(entry.pointsOverride ?? e.points) || 1),
          options: (e.options || []).map(o => ({
            id: o.id,
            text: o.text,
            isCorrect: !!o.isCorrect,
            matchPair: o.matchPair || ''
          })),
          correctAnswer: e.correctAnswer || '',
          translations: e.translations instanceof Map
            ? Object.fromEntries(e.translations) : (e.translations || {}),
          tag
        };
        return buildArenaQuestionSnapshot(questionLike, perQuestionSettings);
      }

      // bank-kind
      const bq = entry.bankQuestion;
      if (!bq || !ARENA_ALLOWED_TYPES.includes(bq.type)) return null;
      const questionLike = {
        id: String(bq._id || `bank-${idx}-${Date.now()}`),
        type: bq.type,
        questionText: bq.questionText,
        passage: bq.passage || '',
        explanation: bq.explanation || '',
        points: Math.max(1, Number(entry.pointsOverride ?? bq.points) || 1),
        options: (bq.options || []).map(o => ({
          id: o.id || String(o._id || ''),
          text: o.text,
          isCorrect: !!o.isCorrect,
          matchPair: o.matchPair || ''
        })),
        correctAnswer: bq.correctAnswer || '',
        translations: bq.translations || {},
        tag
      };
      return buildArenaQuestionSnapshot(questionLike, perQuestionSettings);
    })
    .filter(Boolean);

  // Boss Round: force last question to 'boss' tag.
  if (bossRound && result.length > 0) {
    result[result.length - 1].tag = 'boss';
  }
  return result;
}

function mapLikeToObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value.toObject === 'function') {
    const objectValue = value.toObject({ flattenMaps: true });
    if (objectValue instanceof Map) return Object.fromEntries(objectValue);
    return objectValue || {};
  }
  return { ...value };
}

function buildAnswerSummary(question) {
  if (!question) return null;
  const correctPairs = mapLikeToObject(question.grading?.correctPairs);
  return {
    correctOptionIds: question.grading?.correctOptionIds || [],
    acceptedAnswers: question.grading?.acceptedAnswers || [],
    correctPairs
  };
}

function sanitizeArenaQuestion(question, questionIndex = 0, totalQuestions = 0, options = {}) {
  if (!question) return null;
  const answerSummary = options.includeAnswer ? buildAnswerSummary(question) : null;
  const correctOptionIds = new Set(answerSummary?.correctOptionIds || []);

  // Translations may be a Mongoose Map — flatten before sending to client.
  const flatTranslations = question.translations instanceof Map
    ? Object.fromEntries(question.translations)
    : (question.translations || {});

  return {
    questionId: question.questionId,
    type: question.type,
    questionText: question.questionText,
    passage: question.passage || '',
    explanation: question.explanation || '',
    media: question.media || { type: '', url: '', fileName: '' },
    points: question.points,
    timeLimitSec: question.timeLimitSec,
    tag: question.tag || 'normal',
    translations: flatTranslations,
    options: (question.options || []).map(option => ({
      id: option.id,
      text: option.text,
      ...(options.includeAnswer ? { isCorrect: correctOptionIds.has(option.id) } : {})
    })),
    matchingRightSide: question.matchingRightSide || [],
    answerSummary,
    questionNumber: questionIndex + 1,
    totalQuestions
  };
}

function gradeArenaAnswer(question, payload = {}, currentStreak = 0, responseTimeMs = 0, modifiers = {}) {
  const selectedOptions = Array.isArray(payload.selectedOptions) ? payload.selectedOptions : [];
  const textAnswer = normalizeFreeText(payload.textAnswer);
  const matchingPairs = Array.isArray(payload.matchingPairs) ? payload.matchingPairs : [];

  let isCorrect = false;

  if (question.type === 'single-choice' || question.type === 'true-false') {
    isCorrect = selectedOptions.length === 1 && selectedOptions[0] === question.grading.correctOptionIds[0];
  } else if (question.type === 'multiple-choice') {
    const expected = [...question.grading.correctOptionIds].sort();
    const actual = [...selectedOptions].sort();
    isCorrect = expected.length === actual.length && expected.every((id, index) => id === actual[index]);
  } else if (question.type === 'fill-blank') {
    isCorrect = question.grading.acceptedAnswers.includes(textAnswer);
  } else if (question.type === 'matching') {
    const actualMap = matchingPairs.reduce((acc, pair) => {
      if (pair?.left) acc[pair.left] = pair.right;
      return acc;
    }, {});

    const expectedEntries = Object.entries(mapLikeToObject(question.grading.correctPairs));
    isCorrect = expectedEntries.length > 0 && expectedEntries.every(([left, right]) => actualMap[left] === right);
  }

  const totalTimeMs = Math.max(1000, (question.timeLimitSec || 20) * 1000);
  const clampedResponseTimeMs = Math.max(0, Math.min(responseTimeMs, totalTimeMs));
  const remainingRatio = Math.max(0, (totalTimeMs - clampedResponseTimeMs) / totalTimeMs);
  const nextStreak = isCorrect ? currentStreak + 1 : 0;
  const streakMultiplier = isCorrect ? 1 + (Math.min(Math.max(nextStreak - 1, 0), 5) * 0.1) : 1;
  const doubleMultiplier = modifiers.doublePoints && isCorrect ? 2 : 1;
  // Sudden Death: armed on previous question — ×2 if correct, −100 if wrong.
  const suddenDeathMultiplier = modifiers.suddenDeath && isCorrect ? 2 : 1;
  // Tag multiplier: jackpot ×2, boss ×3 (only on correct).
  const tag = question.tag || 'normal';
  const tagMultiplier = isCorrect && tag === 'boss' ? 3
    : isCorrect && tag === 'jackpot' ? 2 : 1;
  const multiplier = streakMultiplier * doubleMultiplier * suddenDeathMultiplier * tagMultiplier;
  const basePoints = isCorrect ? (question.points || 1) * 100 : 0;
  const speedBonus = isCorrect ? Math.round((question.points || 1) * 50 * remainingRatio) : 0;
  let pointsAwarded = isCorrect ? Math.round((basePoints + speedBonus) * multiplier) : 0;
  // Sudden Death penalty: -100 on wrong answer (modifier armed via the previous question).
  if (!isCorrect && modifiers.suddenDeath) {
    pointsAwarded = -100;
  }
  // Shield: keep streak alive when answered wrong.
  const resolvedNextStreak = !isCorrect && modifiers.shield ? currentStreak : nextStreak;

  return {
    isCorrect,
    selectedOptions,
    textAnswer: payload.textAnswer || '',
    matchingPairs,
    responseTimeMs: clampedResponseTimeMs,
    nextStreak: resolvedNextStreak,
    multiplier,
    doublePointsApplied: Boolean(modifiers.doublePoints && isCorrect),
    shieldApplied: Boolean(!isCorrect && modifiers.shield),
    basePoints,
    speedBonus,
    pointsAwarded
  };
}

function sortArenaParticipants(participants = []) {
  return [...participants].sort((left, right) => {
    if ((right.score || 0) !== (left.score || 0)) return (right.score || 0) - (left.score || 0);
    if ((left.totalResponseTimeMs || 0) !== (right.totalResponseTimeMs || 0)) {
      return (left.totalResponseTimeMs || 0) - (right.totalResponseTimeMs || 0);
    }
    return new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
  });
}

function findAnswerForQuestion(participant, questionIndex) {
  if (questionIndex < 0) return null;
  return (participant.answers || []).find(answer => answer.questionIndex === questionIndex) || null;
}

function buildArenaParticipantSummary(participant, options = {}) {
  const currentAnswer = findAnswerForQuestion(participant, options.currentQuestionIndex ?? -1);
  const includeLastAnswer = Boolean(options.includeLastAnswer && currentAnswer);

  return {
    _id: participant._id,
    user: participant.user ? {
      _id: participant.user._id,
      firstName: participant.user.firstName,
      lastName: participant.user.lastName,
      username: participant.user.username || null,
      avatar: participant.user.avatar,
      uniqueId: participant.user.uniqueId
    } : null,
    guestName: participant.guestName || '',
    powerUps: {
      fiftyFifty:   participant.powerUps?.fiftyFifty   ?? 0,
      doublePoints: participant.powerUps?.doublePoints ?? 0,
      shield:       participant.powerUps?.shield       ?? 0,
      timeFreeze:   participant.powerUps?.timeFreeze   ?? 0,
      steal:        participant.powerUps?.steal        ?? 0,
      mirror:       participant.powerUps?.mirror       ?? 0,
      suddenDeath:  participant.powerUps?.suddenDeath  ?? 0
    },
    displayName: participant.user
      ? `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim()
      : participant.guestName || 'Guest',
    role: participant.role,
    state: participant.state,
    score: participant.score || 0,
    rank: participant.rank || 0,
    streak: participant.streak || 0,
    bestStreak: participant.bestStreak || 0,
    crown: !!participant.crown,
    correctCount: participant.correctCount || 0,
    answeredCount: participant.answeredCount || 0,
    answeredCurrentQuestion: Boolean(currentAnswer),
    totalResponseTimeMs: participant.totalResponseTimeMs || 0,
    lastAnswer: includeLastAnswer ? {
      questionIndex: currentAnswer.questionIndex,
      isCorrect: currentAnswer.isCorrect,
      pointsAwarded: currentAnswer.pointsAwarded,
      responseTimeMs: currentAnswer.responseTimeMs
    } : null
  };
}

function getPhaseEndsAt(room) {
  switch (room.status) {
    case ARENA_STATUS.COUNTDOWN:
    case ARENA_STATUS.LEGACY_COUNTDOWN:
      return room.countdownEndsAt;
    case ARENA_STATUS.QUESTION_INTRO:
      return room.questionIntroEndsAt;
    case ARENA_STATUS.LIVE:
      return room.questionEndsAt;
    case ARENA_STATUS.ANSWER_REVEAL:
      return room.answerRevealEndsAt;
    case ARENA_STATUS.LEADERBOARD:
    case ARENA_STATUS.ROUND_RESULT:
      return room.leaderboardEndsAt || room.phaseEndsAt;
    default:
      return room.phaseEndsAt;
  }
}

function buildArenaAnswerStats(participants = [], currentQuestionIndex = -1) {
  const activeParticipants = participants.filter(participant => participant.state !== 'declined');
  const answers = activeParticipants
    .map(participant => findAnswerForQuestion(participant, currentQuestionIndex))
    .filter(Boolean);

  return {
    totalParticipants: activeParticipants.length,
    connectedParticipants: activeParticipants.filter(participant => participant.state === 'joined').length,
    answeredCount: answers.length,
    correctCount: answers.filter(answer => answer.isCorrect).length
  };
}

function buildArenaRoomState(room, participants = []) {
  const includeAnswer = ANSWER_VISIBLE_STATUSES.has(room.status);
  const visibleParticipants = participants.filter(participant => participant.state !== 'declined');
  const orderedParticipants = sortArenaParticipants(visibleParticipants).map((participant, index) => ({
    ...buildArenaParticipantSummary(participant, {
      currentQuestionIndex: room.currentQuestionIndex,
      includeLastAnswer: includeAnswer
    }),
    liveRank: index + 1
  }));
  const currentQuestion = QUESTION_VISIBLE_STATUSES.has(room.status)
    ? sanitizeArenaQuestion(
        room.questionSnapshot?.[room.currentQuestionIndex],
        room.currentQuestionIndex,
        room.questionSnapshot?.length || 0,
        { includeAnswer }
      )
    : null;

  return {
    _id: room._id,
    sourceType: room.sourceType,
    status: room.status,
    title: room.title,
    joinCode: room.joinCode,
    test: room.test ? {
      _id: room.test._id,
      title: room.test.title,
      shareLink: room.test.shareLink
    } : null,
    hostUser: room.hostUser ? {
      _id: room.hostUser._id,
      firstName: room.hostUser.firstName,
      lastName: room.hostUser.lastName,
      avatar: room.hostUser.avatar,
      uniqueId: room.hostUser.uniqueId
    } : null,
    groupId: room.group?._id || room.group || null,
    conversationId: room.conversation?._id || room.conversation || null,
    invitedUserId: room.invitedUser?._id || room.invitedUser || null,
    settings: normalizeArenaSettings(room.settings),
    questionCount: room.questionSnapshot?.length || 0,
    currentQuestionIndex: room.currentQuestionIndex,
    countdownEndsAt: room.countdownEndsAt,
    questionIntroEndsAt: room.questionIntroEndsAt,
    questionStartedAt: room.questionStartedAt,
    questionEndsAt: room.questionEndsAt,
    answerRevealEndsAt: room.answerRevealEndsAt,
    leaderboardEndsAt: room.leaderboardEndsAt,
    phaseEndsAt: getPhaseEndsAt(room),
    roundResolvedAt: room.roundResolvedAt,
    finalizedAt: room.finalizedAt,
    cancelledAt: room.cancelledAt,
    pauseEndsAt: room.pauseEndsAt,
    currentQuestion,
    answerStats: buildArenaAnswerStats(visibleParticipants, room.currentQuestionIndex),
    participants: orderedParticipants,
    createdAt: room.createdAt
  };
}

function signArenaGuestToken(payload) {
  return jwt.sign(
    { ...payload, kind: 'arena_guest' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyArenaGuestToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload?.kind !== 'arena_guest') {
    throw new Error('INVALID_ARENA_GUEST_TOKEN');
  }
  return payload;
}

module.exports = {
  ARENA_ALLOWED_TYPES,
  ARENA_STATUS,
  buildArenaRoomState,
  buildArenaSnapshotFromTest,
  buildArenaSnapshotFromBank,
  buildArenaSnapshotFromArenaTestEntries,
  buildArenaParticipantSummary,
  generateJoinCode,
  gradeArenaAnswer,
  normalizeArenaSettings,
  sanitizeArenaQuestion,
  signArenaGuestToken,
  sortArenaParticipants,
  verifyArenaGuestToken
};
