const ArenaRoom = require('../models/ArenaRoom');
const ArenaParticipant = require('../models/ArenaParticipant');
const ArenaResult = require('../models/ArenaResult');
const { awardArenaProgress } = require('./progress');
const {
  ARENA_STATUS,
  buildArenaRoomState,
  buildArenaSnapshotFromTest,
  generateJoinCode,
  gradeArenaAnswer,
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

async function loadArenaRoom(roomId) {
  return ArenaRoom.findById(roomId)
    .populate('hostUser', 'firstName lastName avatar uniqueId')
    .populate('invitedUser', 'firstName lastName avatar uniqueId')
    .populate('test', 'title shareLink')
    .populate('group', 'name')
    .populate('conversation', 'participants');
}

async function loadArenaParticipants(roomId) {
  return ArenaParticipant.find({ room: roomId })
    .populate('user', 'firstName lastName avatar uniqueId')
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
    .populate('user', 'firstName lastName avatar uniqueId');
}

async function emitArenaState(io, roomId, eventName = 'arena:lobbyState') {
  const [room, participants] = await Promise.all([
    loadArenaRoom(roomId),
    loadArenaParticipants(roomId)
  ]);

  if (!room) return null;
  const state = buildArenaRoomState(room, participants);
  io.to(`arena:${roomId}`).emit(eventName, state);
  return state;
}

function createArenaSnapshotOrThrow(test) {
  const snapshot = buildArenaSnapshotFromTest(test);
  if (!snapshot.length) {
    const error = new Error('В тесте нет поддерживаемых вопросов для арены');
    error.status = 400;
    throw error;
  }
  return snapshot;
}

async function startNextArenaQuestion(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || [ARENA_STATUS.CANCELLED, ARENA_STATUS.FINAL, ARENA_STATUS.DECLINED].includes(room.status)) return null;

  const nextQuestionIndex = room.currentQuestionIndex + 1;
  if (nextQuestionIndex >= room.questionSnapshot.length) {
    return finalizeArenaRoom(roomId, io);
  }

  clearArenaTimers(roomId);
  const currentQuestion = room.questionSnapshot[nextQuestionIndex];
  const now = new Date();
  room.status = ARENA_STATUS.LIVE;
  room.currentQuestionIndex = nextQuestionIndex;
  room.countdownEndsAt = null;
  room.roundResolvedAt = null;
  room.questionStartedAt = now;
  room.questionEndsAt = new Date(now.getTime() + currentQuestion.timeLimitSec * 1000);
  await room.save();

  await emitArenaState(io, roomId, 'arena:question');
  setArenaTimer(roomId, 'question', () => {
    finalizeCurrentArenaQuestion(roomId, io).catch((error) => {
      console.error('finalizeCurrentArenaQuestion timer error:', error.message);
    });
  }, currentQuestion.timeLimitSec * 1000 + 100);

  return room;
}

async function startArenaCountdown(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || room.status !== ARENA_STATUS.LOBBY) return null;

  clearArenaTimers(roomId);
  room.status = ARENA_STATUS.COUNTDOWN;
  room.countdownEndsAt = new Date(Date.now() + room.settings.countdownSeconds * 1000);
  room.questionStartedAt = null;
  room.questionEndsAt = null;
  room.roundResolvedAt = null;
  await room.save();

  await emitArenaState(io, roomId, 'arena:countdown');
  setArenaTimer(roomId, 'countdown', () => {
    startNextArenaQuestion(roomId, io).catch((error) => {
      console.error('startNextArenaQuestion timer error:', error.message);
    });
  }, room.settings.countdownSeconds * 1000 + 100);

  return room;
}

async function finalizeCurrentArenaQuestion(roomId, io) {
  const room = await ArenaRoom.findById(roomId);
  if (!room || room.status !== ARENA_STATUS.LIVE) return null;

  clearArenaTimers(roomId);
  room.status = ARENA_STATUS.ROUND_RESULT;
  room.questionEndsAt = null;
  room.roundResolvedAt = new Date();
  await room.save();

  const participants = await ArenaParticipant.find({ room: roomId, state: { $ne: 'declined' } });
  if (participants.length > 0) {
    await ArenaParticipant.updateMany(
      { room: roomId, state: { $ne: 'declined' } },
      { $set: { state: 'joined' } }
    );
  }

  return emitArenaState(io, roomId, 'arena:roundResult');
}

async function finalizeArenaRoom(roomId, io) {
  const [room, participantsRaw] = await Promise.all([
    ArenaRoom.findById(roomId),
    ArenaParticipant.find({ room: roomId, state: { $ne: 'declined' } }).populate('user', 'firstName lastName avatar uniqueId')
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
  room.countdownEndsAt = null;
  room.questionStartedAt = null;
  room.questionEndsAt = null;
  room.roundResolvedAt = null;
  await room.save();

  return emitArenaState(io, roomId, 'arena:final');
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
  const graded = gradeArenaAnswer(currentQuestion, payload, participant.streak, responseTimeMs);

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
  const answeredCount = participants.filter(item =>
    item.answers.some(answer => answer.questionIndex === room.currentQuestionIndex)
  ).length;

  if (participants.length > 0 && answeredCount >= participants.length) {
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

async function setArenaParticipantPresence(roomId, actor, state = 'joined') {
  const query = getActorQuery(actor);
  if (!query) return null;
  return ArenaParticipant.findOneAndUpdate(
    { room: roomId, ...query },
    { state, lastSeenAt: new Date() },
    { new: true }
  );
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
  countdownSeconds = 5,
  status = ARENA_STATUS.LOBBY
}) {
  return ArenaRoom.create({
    sourceType,
    title,
    hostUser,
    invitedUser,
    test,
    group,
    conversation,
    joinCode: generateJoinCode(),
    questionSnapshot: createArenaSnapshotOrThrow(test),
    status,
    settings: {
      countdownSeconds,
      allowGuests,
      maxPlayers
    }
  });
}

module.exports = {
  ARENA_STATUS,
  clearArenaTimers,
  createArenaRoomDocument,
  createArenaSnapshotOrThrow,
  emitArenaState,
  finalizeArenaRoom,
  finalizeCurrentArenaQuestion,
  handleArenaAnswer,
  loadArenaParticipants,
  loadArenaRoom,
  resolveArenaParticipant,
  setArenaParticipantPresence,
  startArenaCountdown,
  startNextArenaQuestion
};
