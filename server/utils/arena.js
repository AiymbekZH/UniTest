const jwt = require('jsonwebtoken');

const ARENA_ALLOWED_TYPES = ['single-choice', 'multiple-choice', 'true-false', 'matching', 'fill-blank'];
const ARENA_STATUS = {
  PENDING: 'pending_acceptance',
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  LIVE: 'live_question',
  ROUND_RESULT: 'round_result',
  PAUSED: 'paused',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  FINAL: 'final'
};

function normalizeFreeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
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

function buildArenaQuestionSnapshot(question) {
  if (!ARENA_ALLOWED_TYPES.includes(question.type)) return null;

  const base = {
    questionId: question.id,
    type: question.type,
    questionText: question.questionText,
    passage: question.passage || '',
    points: Math.max(1, Number(question.points) || 1),
    timeLimitSec: getArenaQuestionDuration(question.type),
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

    question.options.forEach((option) => {
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

function buildArenaSnapshotFromTest(test) {
  return (test.questions || [])
    .map(buildArenaQuestionSnapshot)
    .filter(Boolean);
}

function sanitizeArenaQuestion(question, questionIndex = 0, totalQuestions = 0) {
  if (!question) return null;
  return {
    questionId: question.questionId,
    type: question.type,
    questionText: question.questionText,
    passage: question.passage || '',
    points: question.points,
    timeLimitSec: question.timeLimitSec,
    options: question.options || [],
    matchingRightSide: question.matchingRightSide || [],
    questionNumber: questionIndex + 1,
    totalQuestions
  };
}

function gradeArenaAnswer(question, payload = {}, currentStreak = 0, responseTimeMs = 0) {
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

    const expectedEntries = Object.entries(question.grading.correctPairs || {});
    isCorrect = expectedEntries.length > 0 && expectedEntries.every(([left, right]) => actualMap[left] === right);
  }

  const totalTimeMs = Math.max(1000, (question.timeLimitSec || 20) * 1000);
  const clampedResponseTimeMs = Math.max(0, Math.min(responseTimeMs, totalTimeMs));
  const remainingRatio = Math.max(0, (totalTimeMs - clampedResponseTimeMs) / totalTimeMs);
  const nextStreak = isCorrect ? currentStreak + 1 : 0;
  const multiplier = isCorrect ? 1 + (Math.min(Math.max(nextStreak - 1, 0), 5) * 0.1) : 1;
  const basePoints = isCorrect ? (question.points || 1) * 100 : 0;
  const speedBonus = isCorrect ? Math.round((question.points || 1) * 50 * remainingRatio) : 0;
  const pointsAwarded = isCorrect ? Math.round((basePoints + speedBonus) * multiplier) : 0;

  return {
    isCorrect,
    selectedOptions,
    textAnswer: payload.textAnswer || '',
    matchingPairs,
    responseTimeMs: clampedResponseTimeMs,
    nextStreak,
    multiplier,
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

function buildArenaParticipantSummary(participant) {
  return {
    _id: participant._id,
    user: participant.user ? {
      _id: participant.user._id,
      firstName: participant.user.firstName,
      lastName: participant.user.lastName,
      avatar: participant.user.avatar,
      uniqueId: participant.user.uniqueId
    } : null,
    guestName: participant.guestName || '',
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
    totalResponseTimeMs: participant.totalResponseTimeMs || 0
  };
}

function buildArenaRoomState(room, participants = []) {
  const orderedParticipants = sortArenaParticipants(participants).map(buildArenaParticipantSummary);
  const currentQuestion = room.status === ARENA_STATUS.LIVE
    ? sanitizeArenaQuestion(
        room.questionSnapshot?.[room.currentQuestionIndex],
        room.currentQuestionIndex,
        room.questionSnapshot?.length || 0
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
      avatar: room.hostUser.avatar
    } : null,
    groupId: room.group?._id || room.group || null,
    conversationId: room.conversation?._id || room.conversation || null,
    invitedUserId: room.invitedUser?._id || room.invitedUser || null,
    settings: room.settings,
    questionCount: room.questionSnapshot?.length || 0,
    currentQuestionIndex: room.currentQuestionIndex,
    countdownEndsAt: room.countdownEndsAt,
    questionStartedAt: room.questionStartedAt,
    questionEndsAt: room.questionEndsAt,
    roundResolvedAt: room.roundResolvedAt,
    finalizedAt: room.finalizedAt,
    cancelledAt: room.cancelledAt,
    pauseEndsAt: room.pauseEndsAt,
    currentQuestion,
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
  sanitizeArenaQuestion,
  signArenaGuestToken,
  sortArenaParticipants,
  verifyArenaGuestToken
};
