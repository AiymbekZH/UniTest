const jwt = require('jsonwebtoken');

const ARENA_ALLOWED_TYPES = ['single-choice', 'multiple-choice', 'true-false', 'matching', 'fill-blank'];

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
  return {
    countdownSeconds: clampNumber(settings.countdownSeconds ?? fallback.countdownSeconds, 5, 3, 15),
    questionIntroSec: clampNumber(settings.questionIntroSec ?? fallback.questionIntroSec, 3, 1, 10),
    answerTimeSec: clampNumber(settings.answerTimeSec ?? fallback.answerTimeSec, 20, 5, 120),
    answerRevealSec: clampNumber(settings.answerRevealSec ?? fallback.answerRevealSec, 5, 2, 20),
    leaderboardSec: clampNumber(settings.leaderboardSec ?? fallback.leaderboardSec, 6, 2, 30),
    allowGuests: Boolean(settings.allowGuests ?? fallback.allowGuests ?? false),
    maxPlayers: clampNumber(settings.maxPlayers ?? fallback.maxPlayers, 100, 2, 500)
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
    points: Math.max(1, Number(question.points) || 1),
    timeLimitSec: clampNumber(settings.answerTimeSec, getArenaQuestionDuration(question.type), 5, 120),
    options: [],
    matchingRightSide: [],
    grading: {
      correctOptionIds: [],
      acceptedAnswers: [],
      correctPairs: {}
    }
  };

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

  return {
    questionId: question.questionId,
    type: question.type,
    questionText: question.questionText,
    passage: question.passage || '',
    points: question.points,
    timeLimitSec: question.timeLimitSec,
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
  const multiplier = streakMultiplier * doubleMultiplier;
  const basePoints = isCorrect ? (question.points || 1) * 100 : 0;
  const speedBonus = isCorrect ? Math.round((question.points || 1) * 50 * remainingRatio) : 0;
  const pointsAwarded = isCorrect ? Math.round((basePoints + speedBonus) * multiplier) : 0;
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
      fiftyFifty: participant.powerUps?.fiftyFifty ?? 0,
      doublePoints: participant.powerUps?.doublePoints ?? 0,
      shield: participant.powerUps?.shield ?? 0
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
  buildArenaParticipantSummary,
  generateJoinCode,
  gradeArenaAnswer,
  normalizeArenaSettings,
  sanitizeArenaQuestion,
  signArenaGuestToken,
  sortArenaParticipants,
  verifyArenaGuestToken
};
