const ArenaRoom = require('../models/ArenaRoom');
const { verifyArenaGuestToken } = require('../utils/arena');
const {
  applyArenaPowerUp,
  emitArenaState,
  handleArenaAnswer,
  resolveArenaParticipant,
  setArenaParticipantPresence
} = require('../utils/arenaEngine');

const ALLOWED_REACTIONS = new Set(['😂', '🔥', '😱', '💯', '👏', '😎', '💀', '🎉']);

module.exports = function attachArenaSocket(io) {
  io.on('connection', (socket) => {
    socket.data.arenaRooms = new Set();

    socket.on('arena:join', async ({ roomId, guestToken }) => {
      try {
        if (!roomId) return socket.emit('arena:error', { message: 'roomId required' });

        let actor = {};
        if (socket.user?._id) {
          actor.userId = socket.user._id;
        } else if (guestToken) {
          const payload = verifyArenaGuestToken(guestToken);
          if (payload.roomId !== roomId) {
            return socket.emit('arena:error', { message: 'Неверный гостевой токен' });
          }
          actor.guestTokenId = payload.guestTokenId;
        } else if (socket.arenaGuest?.guestTokenId) {
          actor.guestTokenId = socket.arenaGuest.guestTokenId;
        } else {
          return socket.emit('arena:error', { message: 'Нет доступа к арене' });
        }

        const room = await ArenaRoom.findById(roomId);
        if (!room) return socket.emit('arena:error', { message: 'Комната не найдена' });

        const participant = await resolveArenaParticipant(roomId, actor);
        const isHost = socket.user?._id && room.hostUser.toString() === socket.user._id.toString();
        if (!participant && !isHost) {
          return socket.emit('arena:error', { message: 'Сначала войдите в арену' });
        }

        socket.join(`arena:${roomId}`);
        socket.data.arenaRooms.add(String(roomId));

        if (participant) {
          await setArenaParticipantPresence(roomId, actor, 'joined');
        }

        const state = await emitArenaState(io, roomId, 'arena:lobbyState');
        socket.emit('arena:lobbyState', state);
      } catch (error) {
        socket.emit('arena:error', { message: error.message || 'Ошибка подключения к арене' });
      }
    });

    socket.on('arena:leave', async ({ roomId }) => {
      try {
        socket.leave(`arena:${roomId}`);
        socket.data.arenaRooms?.delete(String(roomId));

        if (socket.user?._id) {
          await setArenaParticipantPresence(roomId, { userId: socket.user._id }, 'disconnected');
        } else if (socket.arenaGuest?.guestTokenId) {
          await setArenaParticipantPresence(roomId, { guestTokenId: socket.arenaGuest.guestTokenId }, 'disconnected');
        }

        await emitArenaState(io, roomId, 'arena:lobbyState');
      } catch (error) {
        socket.emit('arena:error', { message: 'Ошибка выхода из арены' });
      }
    });

    socket.on('arena:submitAnswer', async ({ roomId, guestToken, ...payload }) => {
      try {
        let actor = {};
        if (socket.user?._id) {
          actor.userId = socket.user._id;
        } else if (guestToken) {
          const tokenPayload = verifyArenaGuestToken(guestToken);
          actor.guestTokenId = tokenPayload.guestTokenId;
        } else if (socket.arenaGuest?.guestTokenId) {
          actor.guestTokenId = socket.arenaGuest.guestTokenId;
        } else {
          return socket.emit('arena:error', { message: 'Нет доступа к отправке ответа' });
        }

        const result = await handleArenaAnswer(roomId, actor, payload, io);
        socket.emit('arena:answerAck', {
          roomId,
          questionIndex: result.questionIndex,
          isCorrect: result.graded.isCorrect,
          pointsAwarded: result.graded.pointsAwarded,
          streak: result.graded.nextStreak
        });
      } catch (error) {
        socket.emit('arena:error', { message: error.message || 'Ошибка отправки ответа' });
      }
    });

    socket.on('arena:usePowerUp', async ({ roomId, guestToken, type }) => {
      try {
        let actor = {};
        if (socket.user?._id) actor.userId = socket.user._id;
        else if (guestToken) actor.guestTokenId = verifyArenaGuestToken(guestToken).guestTokenId;
        else if (socket.arenaGuest?.guestTokenId) actor.guestTokenId = socket.arenaGuest.guestTokenId;
        else return socket.emit('arena:error', { message: 'Нет доступа к бустерам' });

        const result = await applyArenaPowerUp(roomId, actor, type);
        socket.emit('arena:powerUpApplied', { roomId, ...result });
        await emitArenaState(io, roomId, 'arena:question');
      } catch (error) {
        socket.emit('arena:error', { message: error.message || 'Ошибка применения бустера' });
      }
    });

    socket.on('arena:reaction', async ({ roomId, emoji, guestToken }) => {
      try {
        if (!roomId || !emoji || !ALLOWED_REACTIONS.has(emoji)) return;
        let actor = {};
        if (socket.user?._id) actor.userId = socket.user._id;
        else if (guestToken) actor.guestTokenId = verifyArenaGuestToken(guestToken).guestTokenId;
        else if (socket.arenaGuest?.guestTokenId) actor.guestTokenId = socket.arenaGuest.guestTokenId;

        const participant = actor.userId || actor.guestTokenId ? await resolveArenaParticipant(roomId, actor) : null;
        const displayName = participant?.user
          ? `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim()
          : (participant?.guestName || 'Guest');

        io.to(`arena:${roomId}`).emit('arena:reaction', {
          roomId: String(roomId),
          emoji,
          displayName,
          participantId: participant?._id ? String(participant._id) : null,
          at: Date.now()
        });
      } catch (_) {
        // silently ignore reaction failures
      }
    });

    socket.on('disconnect', async () => {
      const roomIds = [...(socket.data.arenaRooms || [])];
      for (const roomId of roomIds) {
        try {
          if (socket.user?._id) {
            await setArenaParticipantPresence(roomId, { userId: socket.user._id }, 'disconnected');
          } else if (socket.arenaGuest?.guestTokenId) {
            await setArenaParticipantPresence(roomId, { guestTokenId: socket.arenaGuest.guestTokenId }, 'disconnected');
          }
          await emitArenaState(io, roomId, 'arena:lobbyState');
        } catch (_) {
          // ignore disconnect race
        }
      }
    });
  });
};
