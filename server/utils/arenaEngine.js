const ArenaRoom = require('../models/ArenaRoom');
const ArenaParticipant = require('../models/ArenaParticipant');
const ArenaResult = require('../models/ArenaResult');
const { awardArenaProgress } = require('./progress');
const {
  ARENA_STATUS,
  buildArenaRoomState,
  buildArenaSnapshotFromTest,
  buildArenaSnapshotFromBank,
  generateJoinCode,
  gradeArenaAnswer,
  normalizeArenaSettings,
  sortArenaParticipants
} = require('./arena');

const runtimeTimers = new Map();

function getRoomTimerBag(roomId) {
  const key = String(roomId);
  if (!runtimeTimers.has(key)) {
    runtimeTimers.set(key, {});
  }
  return runtimeTimers.get(key);
}

function clearArenaTimers(roomId) {
  const timerBag = getRoomTimerBag(roomId);
  Object.values(timerBag).forEach((timerId) => {
    if (timerId) clearTimeout(timerId);
  });
  runtimeTimers.set(String(roomId), {});
}

function setArenaTimer(roomId, key, callback, delayMs) {
  const timerBag = getRoomTimerBag(roomId);
  if (timerBag[key]) clearTimeout(timerBag[key]);
  timerBag[key] = setTimeout(callback, Math.max(50, delayMs));
}

function getArenaEventName(status) {
  switch (status) {
    case ARENA_STATUS.COUNTDOWN:
    case ARENA_STATUS.LEGACY_COUNTDOWN:
      return 'arena:countdown';
    case ARENA_STATUS.QUESTION_INTRO:
      return 'arena:questionIntro';
    case ARENA_STATUS.LIVE:
      return 'arena:question';
    case ARENA_STATUS.ANSWER_REVEAL:
      return 'arena:answerReveal';
    case ARENA_STATUS.LEADERBOARD:
    case ARENA_STATUS.ROUND_RESULT:
      return 'arena:leaderboard';
    case ARENA_STATUS.FINAL:
    case ARENA_STATUS.CANCELLED:
    case ARENA_STATUS.DECLINED:
      return 'arena:final';
    default:
      return 'arena:lobbyState';
  }
}

function safeTimer(callback, label) {
  return () => {
    callback().catch((error) => {
      console.error(`${label} timer error:`, error.message);
    });
  };
}

// Lightweight activity bump for cleanup logic (does not trigger room save hooks).
async function bumpArenaActivity(roomId) {
  if (!roomId) return;
  try {
    await ArenaRoom.updateOne({ _id: roomId }, { $set: { lastActivityAt: new Date() } });
  } catch (error) {
    // Non-critical; cleanup loop will eventually act on stale rooms.
    console.error('bumpArenaActivity error:', error.message);
  }
}

// Per-room host disconnect grace timers (set when host socket disconnects from lobby).
const hostDisconnectTimers = new Map();
const HOST_DISCONNECT_GRACE_MS = 30 * 1000;

function clearHostDisconnectTimer(roomId) {
  const key = String(roomId);
  const timer = hostDisconnectTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    hostDisconnectTimers.delete(key);
  }
}

async function cancelArenaRoom(roomId, io, reason = 'cancelled') {
  const room = await ArenaRoom.findById(roomId);
  if (!room) return null;
  if ([ARENA_STATUS.FINAL, ARENA_STATUS.CANCELLED, ARENA_STATUS.DECLINED].includes(room.status)) return room;

  clearArenaTimers(roomId);
  clearHostDisconnectTimer(roomId);

  room.status = ARENA_STATUS.CANCELLED;
  room.cancelledAt = new Date();
  await room.save();

  if (io) {
    try {
      await emitArenaState(io, roomId, 'arena:final');
    } catch (_) {
      // ignore emit failures during cleanup
    }
  }
  console.log(`[arena cleanup] room ${roomId} cancelled (${reason})`);
  return room;
}

function scheduleHostDisconnectCancel(roomId, io) {
  if (!roomId) return;
  const key = String(roomId);
  clearHostDisconnectTimer(key);
  const timer = setTimeout(safeTimer(async () => {
    hostDisconnectTimers.delete(key);
    const fresh = await ArenaRoom.findById(roomId).lean();
    if (!fresh) return;
    // Only cancel if still in lobby; if game started, host re-grace doesn't apply.
    if (fresh.status === ARENA_STATUS.LOBBY) {
      await cancelArenaRoom(roomId, io, 'host disconnected');
    }
  }, 'hostDisconnectCancel'), HOST_DISCONNECT_GRACE_MS);
  hostDisconnectTimers.set(key, timer);
}

// Background loop: cancels lobbies inactive for `idleMs` ms.
function startArenaCleanupLoop(io, { intervalMs = 60 * 1000, idleMs = 15 * 60 * 1000 } = {}) {
  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - idleMs);
      const stale = await ArenaRoom.find({
        status: ARENA_STATUS.LOBBY,
        lastActivityAt: { $lt: cutoff }
      }).select('_id').lean();
      for (const row of stale) {
        await cancelArenaRoom(row._id, io, `idle > ${Math.round(idleMs / 60000)}min`);
      }
    } catch (error) {
      console.error('[arena cleanup] loop error:', error.message);
    }
  };
  // Run once on boot (after a short delay so DB is ready), then on interval.
  setTimeout(tick, 5000);
  return setInterval(tick, intervalMs);
}

async function loadArenaRoom(roomId) {
  return ArenaRoom.findById(roomId)
    .populate('hostUser', 'firstName lastName username avatar uniqueId')
    .populate('invitedUser', 'firstName lastName username avatar uniqueId')
    .populate('test', 'title shareLink')
    .populate('group', 'name')
    .populate('conversation', 'participants');
}

async function loadArenaParticipants(roomId) {
  return ArenaParticipant.find({ room: roomId })
    .populate('user', 'firstName lastName username avatar uniqueId')
    .sort({ createdAt: 1 });
}

function getActorQuery(actor = {}) {
  if (actor.userId) return { user: actor.userId };
  if (actor.guestTokenId) return { guestTokenId: actor.guestTokenId };
  return null;
}

async function resolveArenaParticipant(roomId, actor = {}) {
  const query = getActorQuery(actor);
  if (!query) return null;
  return ArenaParticipant.findOne({ room: roomId, ...query })
    .populate('user', 'firstName lastName username avatar uniqueId');
}

async function emitArenaState(io, roomId, eventName = null) {
  const [room, participants] = await Promise.all([
    loadArenaRoom(roomId),
    loadArenaParticipants(roomId)
  ]);

  if (!room) return null;
  const state = buildArenaRoomState(room, participants);
  const statusEvent = eventName || getArenaEventName(room.status);
  io.to(`arena:${roomId}`).emit('arena:state', state);
  if (statusEvent !== 'arena:state') {
    io.to(`arena:${roomId}`).emit(statusEvent, state);
  }
  return state;
}

function createArenaSnapshotOrThrow(test, settings = {}) {
  const snapshot = buildArenaSnapshotFromTest(test, settings);
  if (!snapshot.length) {
    const error = new Error('В тесте нет поддерживаемых вопросов для арены');
    error.status = 400;
    throw error;
  }
  return snapshot;
}

function clearPhaseDates(room) {
  room.countdownEndsAt = null;
  room.questionIntroEndsAt = null;
  room.questionStartedAt = null;
  room.questionEndsAt = null;
  room.answerRevealEndsAt = null;
  room.leaderboardEndsAt = null;
  room.phaseEndsAt = null;
}

function getCurrentQuestion(room) {
  return room.questionSnapshot?.[room.currentQuestionIndex] || null;
}

async function updateParticipantRanks(roomId) {
  const participants = sortArenaParticipants(
    await ArenaParticipant.find({ room: roomId, state: { $ne: 'declined' } })
  );

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];
    if (participant.rank !== index + 1) {
      participant.rank = index + 1;
      await participant.save();
    }
  }

  return participants;
}

async function startNextArenaQuestion(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || [ARENA_STATUS.CANCELLED, ARENA_STATUS.FINAL, ARENA_STATUS.DECLINED].includes(room.status)) return null;

  const nextQuestionIndex = room.currentQuestionIndex + 1;
  if (nextQuestionIndex >= room.questionSnapshot.length) {
    return finalizeArenaRoom(roomId, io);
  }

  clearArenaTimers(roomId);
  const settings = normalizeArenaSettings(room.settings);
  const now = new Date();
  const endsAt = new Date(now.getTime() + settings.questionIntroSec * 1000);

  room.settings = settings;
  room.status = ARENA_STATUS.QUESTION_INTRO;
  room.currentQuestionIndex = nextQuestionIndex;
  clearPhaseDates(room);
  room.questionIntroEndsAt = endsAt;
  room.phaseEndsAt = endsAt;
  room.roundResolvedAt = null;
  await room.save();

  await emitArenaState(io, roomId, 'arena:questionIntro');
  setArenaTimer(roomId, 'questionIntro', safeTimer(
    () => startCurrentArenaQuestion(roomId, io),
    'startCurrentArenaQuestion'
  ), settings.questionIntroSec * 1000 + 100);

  return room;
}

async function startCurrentArenaQuestion(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || ![ARENA_STATUS.QUESTION_INTRO, ARENA_STATUS.COUNTDOWN, ARENA_STATUS.LEGACY_COUNTDOWN].includes(room.status)) return null;

  const currentQuestion = getCurrentQuestion(room);
  if (!currentQuestion) return finalizeArenaRoom(roomId, io);

  clearArenaTimers(roomId);
  const settings = normalizeArenaSettings(room.settings);
  const now = new Date();
  const durationSec = Math.max(5, Number(currentQuestion.timeLimitSec) || settings.answerTimeSec);
  const endsAt = new Date(now.getTime() + durationSec * 1000);

  room.settings = settings;
  room.status = ARENA_STATUS.LIVE;
  room.questionIntroEndsAt = null;
  room.questionStartedAt = now;
  room.questionEndsAt = endsAt;
  room.answerRevealEndsAt = null;
  room.leaderboardEndsAt = null;
  room.phaseEndsAt = endsAt;
  await room.save();

  await emitArenaState(io, roomId, 'arena:question');
  setArenaTimer(roomId, 'question', safeTimer(
    () => finalizeCurrentArenaQuestion(roomId, io),
    'finalizeCurrentArenaQuestion'
  ), durationSec * 1000 + 100);

  return room;
}

async function startArenaCountdown(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || room.status !== ARENA_STATUS.LOBBY) return null;

  clearArenaTimers(roomId);
  const settings = normalizeArenaSettings(room.settings);
  const endsAt = new Date(Date.now() + settings.countdownSeconds * 1000);

  room.settings = settings;
  room.status = ARENA_STATUS.COUNTDOWN;
  clearPhaseDates(room);
  room.countdownEndsAt = endsAt;
  room.phaseEndsAt = endsAt;
  await room.save();

  await emitArenaState(io, roomId, 'arena:countdown');
  setArenaTimer(roomId, 'countdown', safeTimer(
    () => startNextArenaQuestion(roomId, io),
    'startNextArenaQuestion'
  ), settings.countdownSeconds * 1000 + 100);

  return room;
}

async function finalizeCurrentArenaQuestion(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || room.status !== ARENA_STATUS.LIVE) return null;

  clearArenaTimers(roomId);
  const settings = normalizeArenaSettings(room.settings);
  const endsAt = new Date(Date.now() + settings.answerRevealSec * 1000);

  room.settings = settings;
  room.status = ARENA_STATUS.ANSWER_REVEAL;
  room.questionEndsAt = null;
  room.answerRevealEndsAt = endsAt;
  room.leaderboardEndsAt = null;
  room.phaseEndsAt = endsAt;
  room.roundResolvedAt = new Date();
  await room.save();

  await emitArenaState(io, roomId, 'arena:answerReveal');
  setArenaTimer(roomId, 'answerReveal', safeTimer(
    () => startArenaLeaderboard(roomId, io),
    'startArenaLeaderboard'
  ), settings.answerRevealSec * 1000 + 100);

  return room;
}

async function startArenaLeaderboard(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || ![ARENA_STATUS.ANSWER_REVEAL, ARENA_STATUS.ROUND_RESULT].includes(room.status)) return null;

  clearArenaTimers(roomId);
  await updateParticipantRanks(roomId);
  const settings = normalizeArenaSettings(room.settings);
  const endsAt = new Date(Date.now() + settings.leaderboardSec * 1000);

  room.settings = settings;
  room.status = ARENA_STATUS.LEADERBOARD;
  room.answerRevealEndsAt = null;
  room.leaderboardEndsAt = endsAt;
  room.phaseEndsAt = endsAt;
  await room.save();

  await emitArenaState(io, roomId, 'arena:leaderboard');
  setArenaTimer(roomId, 'leaderboard', safeTimer(async () => {
    const latest = await ArenaRoom.findById(roomId);
    if (!latest || latest.status !== ARENA_STATUS.LEADERBOARD) return null;
    if (latest.currentQuestionIndex >= latest.questionSnapshot.length - 1) {
      return finalizeArenaRoom(roomId, io);
    }
    return startNextArenaQuestion(roomId, io);
  }, 'advanceAfterLeaderboard'), settings.leaderboardSec * 1000 + 100);

  return room;
}

async function finalizeArenaRoom(roomId, io) {
  const [room, participantsRaw] = await Promise.all([
    ArenaRoom.findById(roomId),
    ArenaParticipant.find({ room: roomId, state: { $ne: 'declined' } }).populate('user', 'firstName lastName username avatar uniqueId')
  ]);

  if (!room || room.status === ARENA_STATUS.FINAL) return null;

  clearArenaTimers(roomId);
  const participants = sortArenaParticipants(participantsRaw);
  const totalQuestions = room.questionSnapshot.length;

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];
    participant.rank = index + 1;
    await participant.save();
  }

  for (const participant of participants) {
    const perfect = totalQuestions > 0 && participant.correctCount === totalQuestions;
    const progressResult = participant.user
      ? await awardArenaProgress({
          userId: participant.user._id,
          placement: participant.rank,
          answeredCount: participant.answeredCount,
          totalQuestions,
          perfect,
          isDuel: room.sourceType === 'dm_duel',
          completedAt: new Date()
        })
      : null;

    const existing = await ArenaResult.findOne({
      room: room._id,
      user: participant.user?._id || null,
      guestName: participant.user ? '' : participant.guestName
    });

    if (!existing) {
      await ArenaResult.create({
        room: room._id,
        test: room.test,
        user: participant.user?._id || null,
        guestName: participant.user ? '' : participant.guestName,
        sourceType: room.sourceType,
        group: room.group || null,
        conversation: room.conversation || null,
        placement: participant.rank,
        score: participant.score,
        correctCount: participant.correctCount,
        answeredCount: participant.answeredCount,
        totalQuestions,
        bestStreak: participant.bestStreak,
        totalResponseTimeMs: participant.totalResponseTimeMs,
        xpAwarded: progressResult?.xpGain || 0,
        badgesAwarded: (progressResult?.newBadges || []).map(badge => badge.key),
        completedAt: new Date()
      });
    }
  }

  room.status = ARENA_STATUS.FINAL;
  room.finalizedAt = new Date();
  clearPhaseDates(room);
  await room.save();

  return emitArenaState(io, roomId, 'arena:final');
}

function hasAnswerForQuestion(participant, questionIndex) {
  return (participant.answers || []).some(answer => answer.questionIndex === questionIndex);
}

async function handleArenaAnswer(roomId, actor, payload, io) {
  const [room, participant] = await Promise.all([
    ArenaRoom.findById(roomId),
    resolveArenaParticipant(roomId, actor)
  ]);

  if (!room) {
    const error = new Error('Комната арены не найдена');
    error.status = 404;
    throw error;
  }
  if (!participant) {
    const error = new Error('Вы не подключены к этой арене');
    error.status = 403;
    throw error;
  }
  if (room.status !== ARENA_STATUS.LIVE) {
    const error = new Error('Сейчас нельзя отправить ответ');
    error.status = 400;
    throw error;
  }

  const currentQuestion = room.questionSnapshot[room.currentQuestionIndex];
  if (!currentQuestion) {
    const error = new Error('Текущий вопрос не найден');
    error.status = 400;
    throw error;
  }

  const existingAnswer = participant.answers.find(answer => answer.questionIndex === room.currentQuestionIndex);
  if (existingAnswer) {
    const error = new Error('Ответ на этот вопрос уже отправлен');
    error.status = 409;
    throw error;
  }

  const responseTimeMs = Date.now() - new Date(room.questionStartedAt).getTime();
  const activeForQuestion = participant.activePowerUps?.get?.(String(room.currentQuestionIndex))
    || (participant.activePowerUps?.[String(room.currentQuestionIndex)]);
  const modifiers = {
    doublePoints: activeForQuestion?.type === 'doublePoints',
    shield: activeForQuestion?.type === 'shield'
  };
  const graded = gradeArenaAnswer(currentQuestion, payload, participant.streak, responseTimeMs, modifiers);

  participant.answers.push({
    questionId: currentQuestion.questionId,
    questionIndex: room.currentQuestionIndex,
    type: currentQuestion.type,
    selectedOptions: graded.selectedOptions,
    textAnswer: graded.textAnswer,
    matchingPairs: graded.matchingPairs,
    isCorrect: graded.isCorrect,
    basePoints: graded.basePoints,
    speedBonus: graded.speedBonus,
    multiplier: graded.multiplier,
    pointsAwarded: graded.pointsAwarded,
    responseTimeMs: graded.responseTimeMs,
    answeredAt: new Date()
  });
  participant.score += graded.pointsAwarded;
  participant.streak = graded.nextStreak;
  participant.bestStreak = Math.max(participant.bestStreak || 0, graded.nextStreak || 0);
  participant.correctCount += graded.isCorrect ? 1 : 0;
  participant.answeredCount += 1;
  participant.totalResponseTimeMs += graded.responseTimeMs;
  participant.state = 'joined';
  participant.lastSeenAt = new Date();
  await participant.save();

  const participants = await ArenaParticipant.find({ room: roomId, state: { $ne: 'declined' } });
  const joinedPlayers = participants.filter(item => item.state === 'joined');
  const unansweredJoined = joinedPlayers.filter(item => !hasAnswerForQuestion(item, room.currentQuestionIndex));

  if (joinedPlayers.length > 0 && unansweredJoined.length === 0) {
    await finalizeCurrentArenaQuestion(roomId, io);
  } else {
    await emitArenaState(io, roomId, 'arena:question');
  }

  return {
    participant,
    graded,
    questionIndex: room.currentQuestionIndex
  };
}

/**
 * Apply a power-up for the current question. 50/50 returns which 2 wrong
 * option ids to hide from the player; doublePoints/shield mark modifiers
 * to be consumed at answer-grading time.
 */
async function applyArenaPowerUp(roomId, actor, type) {
  const allowed = new Set(['fiftyFifty', 'doublePoints', 'shield']);
  if (!allowed.has(type)) {
    const error = new Error('Неизвестный бустер');
    error.status = 400;
    throw error;
  }
  const [room, participant] = await Promise.all([
    ArenaRoom.findById(roomId),
    resolveArenaParticipant(roomId, actor)
  ]);
  if (!room) {
    const error = new Error('Комната арены не найдена');
    error.status = 404;
    throw error;
  }
  if (!participant) {
    const error = new Error('Вы не подключены к арене');
    error.status = 403;
    throw error;
  }
  if (room.status !== ARENA_STATUS.LIVE) {
    const error = new Error('Бустеры доступны только во время вопроса');
    error.status = 400;
    throw error;
  }

  const currentIndex = room.currentQuestionIndex;
  const currentQuestion = room.questionSnapshot[currentIndex];
  if (!currentQuestion) {
    const error = new Error('Текущий вопрос не найден');
    error.status = 400;
    throw error;
  }

  // Already answered? No power-ups after submission.
  if ((participant.answers || []).some(answer => answer.questionIndex === currentIndex)) {
    const error = new Error('Ответ уже отправлен');
    error.status = 409;
    throw error;
  }

  // Already used another power-up on this question?
  const existingActive = participant.activePowerUps?.get?.(String(currentIndex))
    || (participant.activePowerUps?.[String(currentIndex)]);
  if (existingActive) {
    const error = new Error('Бустер уже применён на этом вопросе');
    error.status = 409;
    throw error;
  }

  if ((participant.powerUps?.[type] ?? 0) <= 0) {
    const error = new Error('Бустер уже использован');
    error.status = 409;
    throw error;
  }

  if (type === 'fiftyFifty' && !['single-choice', 'multiple-choice', 'true-false'].includes(currentQuestion.type)) {
    const error = new Error('50/50 доступен только для вопросов с вариантами');
    error.status = 400;
    throw error;
  }

  // Compute 50/50 removed options
  let removedOptionIds = [];
  if (type === 'fiftyFifty') {
    const correctIds = new Set(currentQuestion.grading?.correctOptionIds || []);
    const wrongOptions = (currentQuestion.options || []).filter(opt => !correctIds.has(opt.id));
    // Shuffle and take 2
    const shuffled = [...wrongOptions].sort(() => Math.random() - 0.5);
    removedOptionIds = shuffled.slice(0, Math.min(2, Math.max(0, wrongOptions.length - 0))).map(o => o.id);
  }

  participant.powerUps[type] = Math.max(0, (participant.powerUps[type] || 0) - 1);
  participant.activePowerUps.set(String(currentIndex), {
    type,
    questionIndex: currentIndex,
    removedOptionIds
  });
  await participant.save();

  return {
    type,
    questionIndex: currentIndex,
    removedOptionIds,
    remaining: {
      fiftyFifty: participant.powerUps.fiftyFifty,
      doublePoints: participant.powerUps.doublePoints,
      shield: participant.powerUps.shield
    }
  };
}

async function setArenaParticipantPresence(roomId, actor, state = 'joined') {
  const query = getActorQuery(actor);
  if (!query) return null;
  return ArenaParticipant.findOneAndUpdate(
    { room: roomId, ...query },
    { state, lastSeenAt: new Date() },
    { new: true }
  );
}

/* ═════════════════════ HOST CONTROLS ═════════════════════ */

const RESUMABLE_FROM_STATUSES = new Set([
  ARENA_STATUS.COUNTDOWN,
  ARENA_STATUS.LEGACY_COUNTDOWN,
  ARENA_STATUS.QUESTION_INTRO,
  ARENA_STATUS.LIVE,
  ARENA_STATUS.ANSWER_REVEAL,
  ARENA_STATUS.LEADERBOARD,
  ARENA_STATUS.ROUND_RESULT
]);

/**
 * Pauses the room by clearing timers and recording remaining ms so we can
 * resume with the exact same phase duration.
 */
async function pauseArenaRoom(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room) return null;
  if (room.status === ARENA_STATUS.PAUSED) return room;
  if (!RESUMABLE_FROM_STATUSES.has(room.status)) {
    const error = new Error('Эту фазу нельзя поставить на паузу');
    error.status = 400;
    throw error;
  }

  const phaseEnd = (() => {
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
        return room.leaderboardEndsAt;
      default:
        return room.phaseEndsAt;
    }
  })();

  const remainingMs = phaseEnd ? Math.max(0, new Date(phaseEnd).getTime() - Date.now()) : 0;

  clearArenaTimers(roomId);
  room.pausedFromStatus = room.status;
  room.pauseEndsAt = new Date(Date.now() + remainingMs);
  room.status = ARENA_STATUS.PAUSED;
  await room.save();

  await emitArenaState(io, roomId, 'arena:lobbyState');
  return room;
}

/**
 * Resumes the room from a paused state, restoring the remaining phase time.
 */
async function resumeArenaRoom(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || room.status !== ARENA_STATUS.PAUSED) return null;

  const previousStatus = room.pausedFromStatus;
  const remainingMs = Math.max(1000, new Date(room.pauseEndsAt || Date.now()).getTime() - Date.now());
  const newEndsAt = new Date(Date.now() + remainingMs);

  room.status = previousStatus;
  room.pausedFromStatus = null;
  room.pauseEndsAt = null;
  room.phaseEndsAt = newEndsAt;

  switch (previousStatus) {
    case ARENA_STATUS.COUNTDOWN:
    case ARENA_STATUS.LEGACY_COUNTDOWN:
      room.countdownEndsAt = newEndsAt;
      break;
    case ARENA_STATUS.QUESTION_INTRO:
      room.questionIntroEndsAt = newEndsAt;
      break;
    case ARENA_STATUS.LIVE:
      room.questionEndsAt = newEndsAt;
      break;
    case ARENA_STATUS.ANSWER_REVEAL:
      room.answerRevealEndsAt = newEndsAt;
      break;
    case ARENA_STATUS.LEADERBOARD:
    case ARENA_STATUS.ROUND_RESULT:
      room.leaderboardEndsAt = newEndsAt;
      break;
    default:
      break;
  }

  await room.save();

  // Reschedule the appropriate timer
  switch (previousStatus) {
    case ARENA_STATUS.COUNTDOWN:
    case ARENA_STATUS.LEGACY_COUNTDOWN:
      setArenaTimer(roomId, 'countdown', safeTimer(
        () => startNextArenaQuestion(roomId, io),
        'startNextArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.QUESTION_INTRO:
      setArenaTimer(roomId, 'questionIntro', safeTimer(
        () => startCurrentArenaQuestion(roomId, io),
        'startCurrentArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.LIVE:
      setArenaTimer(roomId, 'question', safeTimer(
        () => finalizeCurrentArenaQuestion(roomId, io),
        'finalizeCurrentArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.ANSWER_REVEAL:
      setArenaTimer(roomId, 'answerReveal', safeTimer(
        () => startArenaLeaderboard(roomId, io),
        'startArenaLeaderboard'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.LEADERBOARD:
    case ARENA_STATUS.ROUND_RESULT:
      setArenaTimer(roomId, 'leaderboard', safeTimer(async () => {
        const latest = await ArenaRoom.findById(roomId);
        if (!latest || latest.status !== ARENA_STATUS.LEADERBOARD) return null;
        if (latest.currentQuestionIndex >= latest.questionSnapshot.length - 1) {
          return finalizeArenaRoom(roomId, io);
        }
        return startNextArenaQuestion(roomId, io);
      }, 'advanceAfterLeaderboard'), remainingMs + 100);
      break;
    default:
      break;
  }

  await emitArenaState(io, roomId);
  return room;
}

/**
 * Adds extraSec seconds to the current phase end. Only applicable during
 * timed phases.
 */
async function extendArenaTimer(roomId, extraSec, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room) return null;
  const seconds = Math.max(1, Math.min(60, Math.round(extraSec)));
  const extraMs = seconds * 1000;

  const statusFieldMap = {
    [ARENA_STATUS.COUNTDOWN]: 'countdownEndsAt',
    [ARENA_STATUS.LEGACY_COUNTDOWN]: 'countdownEndsAt',
    [ARENA_STATUS.QUESTION_INTRO]: 'questionIntroEndsAt',
    [ARENA_STATUS.LIVE]: 'questionEndsAt',
    [ARENA_STATUS.ANSWER_REVEAL]: 'answerRevealEndsAt',
    [ARENA_STATUS.LEADERBOARD]: 'leaderboardEndsAt',
    [ARENA_STATUS.ROUND_RESULT]: 'leaderboardEndsAt'
  };

  const field = statusFieldMap[room.status];
  if (!field) {
    const error = new Error('Сейчас нельзя продлить таймер');
    error.status = 400;
    throw error;
  }

  const currentEnd = room[field] ? new Date(room[field]).getTime() : Date.now();
  const newEnd = new Date(currentEnd + extraMs);
  room[field] = newEnd;
  room.phaseEndsAt = newEnd;
  await room.save();

  // Reschedule the phase timer with the new remaining ms
  const remainingMs = Math.max(500, newEnd.getTime() - Date.now());
  switch (room.status) {
    case ARENA_STATUS.COUNTDOWN:
    case ARENA_STATUS.LEGACY_COUNTDOWN:
      setArenaTimer(roomId, 'countdown', safeTimer(
        () => startNextArenaQuestion(roomId, io),
        'startNextArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.QUESTION_INTRO:
      setArenaTimer(roomId, 'questionIntro', safeTimer(
        () => startCurrentArenaQuestion(roomId, io),
        'startCurrentArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.LIVE:
      setArenaTimer(roomId, 'question', safeTimer(
        () => finalizeCurrentArenaQuestion(roomId, io),
        'finalizeCurrentArenaQuestion'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.ANSWER_REVEAL:
      setArenaTimer(roomId, 'answerReveal', safeTimer(
        () => startArenaLeaderboard(roomId, io),
        'startArenaLeaderboard'
      ), remainingMs + 100);
      break;
    case ARENA_STATUS.LEADERBOARD:
    case ARENA_STATUS.ROUND_RESULT:
      setArenaTimer(roomId, 'leaderboard', safeTimer(async () => {
        const latest = await ArenaRoom.findById(roomId);
        if (!latest || latest.status !== ARENA_STATUS.LEADERBOARD) return null;
        if (latest.currentQuestionIndex >= latest.questionSnapshot.length - 1) {
          return finalizeArenaRoom(roomId, io);
        }
        return startNextArenaQuestion(roomId, io);
      }, 'advanceAfterLeaderboard'), remainingMs + 100);
      break;
    default:
      break;
  }

  await emitArenaState(io, roomId);
  return room;
}

/**
 * Removes a participant from the arena. Marks them as declined so they are
 * excluded from scoring and notifies their socket with a kick event.
 */
async function kickArenaParticipant(roomId, participantId, io) {
  const participant = await ArenaParticipant.findOne({ _id: participantId, room: roomId });
  if (!participant) {
    const error = new Error('Участник не найден');
    error.status = 404;
    throw error;
  }
  participant.state = 'declined';
  participant.kickedAt = new Date();
  await participant.save();

  // Notify the kicked player explicitly
  if (io) {
    io.to(`arena:${roomId}`).emit('arena:kicked', {
      roomId: String(roomId),
      participantId: String(participantId),
      userId: participant.user ? String(participant.user) : null,
      guestTokenId: participant.guestTokenId || null
    });
    await emitArenaState(io, roomId);
  }
  return participant;
}

async function skipArenaPhase(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || [ARENA_STATUS.CANCELLED, ARENA_STATUS.DECLINED, ARENA_STATUS.FINAL].includes(room.status)) return null;

  if (room.status === ARENA_STATUS.LOBBY) return startArenaCountdown(roomId, io);
  if ([ARENA_STATUS.COUNTDOWN, ARENA_STATUS.LEGACY_COUNTDOWN].includes(room.status)) return startNextArenaQuestion(roomId, io);
  if (room.status === ARENA_STATUS.QUESTION_INTRO) return startCurrentArenaQuestion(roomId, io);
  if (room.status === ARENA_STATUS.LIVE) return finalizeCurrentArenaQuestion(roomId, io);
  if (room.status === ARENA_STATUS.ANSWER_REVEAL || room.status === ARENA_STATUS.ROUND_RESULT) return startArenaLeaderboard(roomId, io);
  if (room.status === ARENA_STATUS.LEADERBOARD) {
    if (room.currentQuestionIndex >= room.questionSnapshot.length - 1) return finalizeArenaRoom(roomId, io);
    return startNextArenaQuestion(roomId, io);
  }

  return null;
}

async function createArenaRoomDocument({
  sourceType,
  title,
  hostUser,
  invitedUser = null,
  test,
  group = null,
  conversation = null,
  allowGuests = false,
  maxPlayers = 100,
  countdownSeconds = undefined,
  settings = {},
  status = ARENA_STATUS.LOBBY
}) {
  const roomSettings = normalizeArenaSettings({
    ...settings,
    ...(countdownSeconds === undefined ? {} : { countdownSeconds }),
    allowGuests,
    maxPlayers
  });

  return ArenaRoom.create({
    sourceType,
    title,
    hostUser,
    invitedUser,
    test: test?._id || test || null,
    group,
    conversation,
    joinCode: generateJoinCode(),
    questionSnapshot: createArenaSnapshotOrThrow(test, roomSettings),
    status,
    settings: roomSettings
  });
}

/**
 * Variant of createArenaRoomDocument that builds the snapshot from a list of
 * BankQuestion docs (with optional per-question timer/points overrides) instead
 * of a Test. Used by the ArenaQuestionPicker / ArenaQuickStart flow.
 *
 * `bankEntries` shape: [{ bankQuestion, timerOverride?, pointsOverride? }, ...]
 */
async function createArenaRoomFromBank({
  sourceType = 'public',
  title,
  hostUser,
  bankEntries = [],
  allowGuests = true,
  maxPlayers = 100,
  countdownSeconds = undefined,
  settings = {},
  status = ARENA_STATUS.LOBBY
}) {
  const roomSettings = normalizeArenaSettings({
    ...settings,
    ...(countdownSeconds === undefined ? {} : { countdownSeconds }),
    allowGuests,
    maxPlayers
  });

  const snapshot = buildArenaSnapshotFromBank(bankEntries, roomSettings);
  if (!snapshot.length) {
    const error = new Error('Нет поддерживаемых вопросов для арены');
    error.status = 400;
    throw error;
  }

  return ArenaRoom.create({
    sourceType,
    title: title || 'Арена',
    hostUser,
    invitedUser: null,
    test: null,
    group: null,
    conversation: null,
    joinCode: generateJoinCode(),
    questionSnapshot: snapshot,
    status,
    settings: roomSettings
  });
}

module.exports = {
  ARENA_STATUS,
  bumpArenaActivity,
  cancelArenaRoom,
  clearArenaTimers,
  clearHostDisconnectTimer,
  createArenaRoomDocument,
  createArenaRoomFromBank,
  createArenaSnapshotOrThrow,
  emitArenaState,
  applyArenaPowerUp,
  extendArenaTimer,
  finalizeArenaRoom,
  finalizeCurrentArenaQuestion,
  handleArenaAnswer,
  kickArenaParticipant,
  loadArenaParticipants,
  loadArenaRoom,
  pauseArenaRoom,
  resolveArenaParticipant,
  resumeArenaRoom,
  scheduleHostDisconnectCancel,
  setArenaParticipantPresence,
  skipArenaPhase,
  startArenaCleanupLoop,
  startArenaCountdown,
  startArenaLeaderboard,
  startCurrentArenaQuestion,
  startNextArenaQuestion
};
