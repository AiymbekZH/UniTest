const express = require('express');
const { v4: uuidv4 } = require('uuid');
const ArenaRoom = require('../models/ArenaRoom');
const ArenaParticipant = require('../models/ArenaParticipant');
const ArenaResult = require('../models/ArenaResult');
const Test = require('../models/Test');
const Group = require('../models/Group');
const DirectMessage = require('../models/DirectMessage');
const DMMessage = require('../models/DMMessage');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');
const { buildArenaRoomState, buildArenaParticipantSummary, signArenaGuestToken, verifyArenaGuestToken } = require('../utils/arena');
const {
  ARENA_STATUS,
  bumpArenaActivity,
  clearArenaTimers,
  createArenaRoomDocument,
  emitArenaState,
  extendArenaTimer,
  finalizeArenaRoom,
  kickArenaParticipant,
  loadArenaParticipants,
  loadArenaRoom,
  pauseArenaRoom,
  resolveArenaParticipant,
  resumeArenaRoom,
  skipArenaPhase,
  startArenaCountdown
} = require('../utils/arenaEngine');

const router = express.Router();

async function populateRoomState(roomId) {
  const [room, participants] = await Promise.all([
    loadArenaRoom(roomId),
    loadArenaParticipants(roomId)
  ]);

  if (!room) return null;
  return {
    room,
    participants,
    state: buildArenaRoomState(room, participants)
  };
}

function getCurrentUserId(req) {
  return req.user?._id?.toString() || null;
}

function canHostArena(test, userId) {
  if (!test) return false;
  return test.settings?.isPublic === true || test.creator?.toString() === userId;
}

async function createGroupInviteMessage(req, room, test) {
  if (!room.group) return;

  const inviteMessage = new Message({
    group: room.group,
    sender: req.user._id,
    type: 'arena_invite',
    text: `Арена запущена: ${test.title}`,
    meta: {
      roomId: room._id.toString(),
      joinCode: room.joinCode,
      sourceType: 'group',
      title: test.title
    }
  });

  await inviteMessage.save();
  await inviteMessage.populate('sender', 'firstName lastName avatar uniqueId');

  const io = req.app.get('io');
  if (io) {
    io.to(`group:${room.group}`).emit('group:message', inviteMessage);

    const group = await Group.findById(room.group).select('members');
    for (const member of group?.members || []) {
      if (member.user.toString() === req.user._id.toString()) continue;
      io.to(`user:${member.user}`).emit('group:inbox', {
        groupId: room.group.toString(),
        messageId: inviteMessage._id,
        senderId: req.user._id.toString(),
      });
    }
  }
}

async function createDuelInviteMessage(req, room, test, conversation, invitedUserId) {
  const inviteMessage = new DMMessage({
    conversation: conversation._id,
    sender: req.user._id,
    type: 'arena_invite',
    text: `Вызов на дуэль: ${test.title}`,
    meta: {
      roomId: room._id.toString(),
      joinCode: room.joinCode,
      sourceType: 'dm_duel',
      title: test.title,
      invitedUserId: invitedUserId.toString()
    },
    readBy: [req.user._id]
  });

  await inviteMessage.save();
  await inviteMessage.populate('sender', 'firstName lastName avatar uniqueId');

  conversation.lastMessage = inviteMessage._id;
  conversation.lastActivity = new Date();
  await conversation.save();

  const io = req.app.get('io');
  if (io) {
    for (const pid of conversation.participants) {
      io.to(`user:${pid}`).emit('dm:message', {
        ...inviteMessage.toJSON(),
        conversationId: conversation._id.toString()
      });
    }
  }

  try {
    await Notification.create({
      user: invitedUserId,
      type: 'arena_invite',
      title: 'Вызов на дуэль',
      message: `${req.user.firstName} ${req.user.lastName} приглашает вас в дуэль по тесту "${test.title}".`,
      link: `/arena/code/${room.joinCode}`,
      meta: {
        source: 'arena',
        roomId: room._id.toString(),
        conversationId: conversation._id.toString()
      }
    });
  } catch (_) {
    // Non-blocking
  }
}

router.post('/rooms', auth, async (req, res) => {
  try {
    const { testId, sourceType = 'public', groupId, conversationId, settings = {} } = req.body;
    if (!testId) return res.status(400).json({ message: 'testId required' });

    const test = await Test.findById(testId).select('title creator settings questions shareLink isDeleted');
    if (!test || test.isDeleted) {
      return res.status(404).json({ message: 'Тест не найден' });
    }

    let room;

    if (sourceType === 'group') {
      const group = await Group.findById(groupId);
      if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
      const isMember = group.members.some(member => member.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: 'Вы не участник группы' });
      if (!group.hasPermission(req.user._id, 'launchArenas')) {
        return res.status(403).json({ message: 'Нет разрешения запускать арены' });
      }
      const assigned = group.assignedTests.some(item => item.test.toString() === testId);
      if (!assigned) {
        return res.status(400).json({ message: 'Для арены в группе можно использовать только назначенный группе тест' });
      }

      room = await createArenaRoomDocument({
        sourceType: 'group',
        title: test.title,
        hostUser: req.user._id,
        test,
        group: group._id,
        allowGuests: false,
        maxPlayers: Math.max(2, group.members.length || 2),
        settings
      });

      await createGroupInviteMessage(req, room, test);
    } else if (sourceType === 'dm_duel') {
      const conversation = await DirectMessage.findById(conversationId).select('participants');
      if (!conversation) return res.status(404).json({ message: 'Диалог не найден' });
      const isParticipant = conversation.participants.some(participant => participant.toString() === req.user._id.toString());
      if (!isParticipant) return res.status(403).json({ message: 'Нет доступа к этому диалогу' });
      if (!canHostArena(test, req.user._id.toString())) {
        return res.status(403).json({ message: 'Можно запускать дуэль только на публичном или своём тесте' });
      }

      const invitedUserId = conversation.participants.find(participant => participant.toString() !== req.user._id.toString());
      room = await createArenaRoomDocument({
        sourceType: 'dm_duel',
        title: test.title,
        hostUser: req.user._id,
        invitedUser: invitedUserId,
        test,
        conversation: conversation._id,
        allowGuests: false,
        maxPlayers: 2,
        settings,
        status: ARENA_STATUS.PENDING
      });

      await ArenaParticipant.create({
        room: room._id,
        user: req.user._id,
        role: 'host'
      });

      await createDuelInviteMessage(req, room, test, conversation, invitedUserId);
    } else {
      if (!canHostArena(test, req.user._id.toString())) {
        return res.status(403).json({ message: 'Можно запускать арену только на публичном или своём тесте' });
      }

      room = await createArenaRoomDocument({
        sourceType: 'public',
        title: test.title,
        hostUser: req.user._id,
        test,
        allowGuests: true,
        maxPlayers: Math.max(2, Math.min(500, Number(settings.maxPlayers) || 100)),
        settings
      });
    }

    const populated = await populateRoomState(room._id);
    res.status(201).json({
      room: populated.state,
      hostUrl: `/arena/host/${room._id}`,
      joinUrl: `/arena/code/${room.joinCode}`
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Ошибка создания арены' });
  }
});

router.get('/code/:joinCode', optionalAuth, async (req, res) => {
  try {
    const room = await ArenaRoom.findOne({ joinCode: String(req.params.joinCode || '').toUpperCase() })
      .populate('hostUser', 'firstName lastName avatar')
      .populate('invitedUser', 'firstName lastName avatar')
      .populate('test', 'title shareLink')
      .populate('group', 'name');

    if (!room) return res.status(404).json({ message: 'Комната не найдена' });

    const participants = await loadArenaParticipants(room._id);
    res.json({
      room: buildArenaRoomState(room, participants),
      meta: {
        canGuestJoin: room.settings.allowGuests === true,
        requiresAuth: room.sourceType !== 'public'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки комнаты' });
  }
});

// List public live arena rooms (for Arena Hub)
router.get('/public-rooms', optionalAuth, async (req, res) => {
  try {
    const rooms = await ArenaRoom.find({
      sourceType: 'public',
      status: { $in: [ARENA_STATUS.LOBBY, ARENA_STATUS.COUNTDOWN, ARENA_STATUS.LEGACY_COUNTDOWN] }
    })
      .sort({ createdAt: -1 })
      .limit(24)
      .populate('hostUser', 'firstName lastName username avatar uniqueId')
      .populate('test', 'title shareLink')
      .lean();

    const counts = await Promise.all(rooms.map(room => ArenaParticipant.countDocuments({
      room: room._id,
      state: { $ne: 'declined' }
    })));

    const payload = rooms.map((room, idx) => ({
      _id: room._id,
      joinCode: room.joinCode,
      title: room.title,
      status: room.status,
      sourceType: room.sourceType,
      participantCount: counts[idx] || 0,
      maxPlayers: room.settings?.maxPlayers || 100,
      host: room.hostUser ? {
        _id: room.hostUser._id,
        firstName: room.hostUser.firstName,
        lastName: room.hostUser.lastName,
        username: room.hostUser.username || null,
        avatar: room.hostUser.avatar || '',
        uniqueId: room.hostUser.uniqueId
      } : null,
      test: room.test ? { _id: room.test._id, title: room.test.title, shareLink: room.test.shareLink } : null,
      createdAt: room.createdAt
    }));

    res.json({ rooms: payload });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки комнат' });
  }
});

// Current user's recent arena results
router.get('/my-recent-results', auth, async (req, res) => {
  try {
    const results = await ArenaResult.find({ user: req.user._id })
      .sort({ completedAt: -1 })
      .limit(6)
      .populate('test', 'title shareLink')
      .populate('room', 'title joinCode sourceType')
      .lean();
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки результатов арены' });
  }
});

router.get('/rooms/:id', auth, async (req, res) => {
  try {
    const data = await populateRoomState(req.params.id);
    if (!data) return res.status(404).json({ message: 'Комната не найдена' });

    const isHost = data.room.hostUser?._id?.toString() === req.user._id.toString();
    const participant = await ArenaParticipant.findOne({ room: data.room._id, user: req.user._id });
    if (!isHost && !participant) {
      return res.status(403).json({ message: 'Нет доступа к этой арене' });
    }

    res.json({
      room: data.state,
      participant: participant ? buildArenaParticipantSummary(participant) : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки комнаты' });
  }
});

router.post('/rooms/:id/join', optionalAuth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id)
      .populate('group', 'members bannedMembers')
      .populate('conversation', 'participants')
      .populate('hostUser', 'firstName lastName avatar uniqueId')
      .populate('test', 'title shareLink');

    if (!room) return res.status(404).json({ message: 'Комната не найдена' });

    let participant = null;
    let guestToken = null;

    if (req.user) {
      participant = await ArenaParticipant.findOne({ room: room._id, user: req.user._id }).populate('user', 'firstName lastName avatar uniqueId');
    } else if (req.body.guestToken) {
      let payload;
      try {
        payload = verifyArenaGuestToken(req.body.guestToken);
      } catch (_) {
        return res.status(403).json({ message: 'Гостевой токен недействителен' });
      }
      if (payload.roomId !== room._id.toString()) {
        return res.status(403).json({ message: 'Гостевой токен не подходит для этой комнаты' });
      }
      participant = await ArenaParticipant.findOne({ room: room._id, guestTokenId: payload.guestTokenId });
      guestToken = req.body.guestToken;
    }

    if (!participant) {
      if (![ARENA_STATUS.LOBBY, ARENA_STATUS.PENDING].includes(room.status)) {
        return res.status(403).json({ message: 'Матч уже начался, новые игроки не допускаются' });
      }

      const joinedCount = await ArenaParticipant.countDocuments({ room: room._id, state: { $ne: 'declined' } });
      if (joinedCount >= room.settings.maxPlayers) {
        return res.status(400).json({ message: 'Комната заполнена' });
      }

      if (room.sourceType === 'group') {
        if (!req.user) return res.status(401).json({ message: 'Для групповой арены нужен аккаунт' });
        const isMember = room.group?.members?.some(member => member.user.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Вы не участник этой группы' });
      }

      if (room.sourceType === 'dm_duel') {
        if (!req.user) return res.status(401).json({ message: 'Для дуэли нужен аккаунт' });
        const allowedUserIds = [room.hostUser?._id?.toString(), room.invitedUser?._id?.toString()].filter(Boolean);
        if (!allowedUserIds.includes(req.user._id.toString())) {
          return res.status(403).json({ message: 'Вы не участник этой дуэли' });
        }
        if (room.status === ARENA_STATUS.PENDING) {
          return res.status(400).json({ message: 'Дуэль ещё не принята. Сначала примите приглашение.' });
        }
      }

      if (room.sourceType === 'public' && !req.user && !room.settings.allowGuests) {
        return res.status(401).json({ message: 'Для этой арены требуется вход в аккаунт' });
      }

      if (req.user) {
        participant = await ArenaParticipant.create({
          room: room._id,
          user: req.user._id,
          role: room.hostUser?._id?.toString() === req.user._id.toString() ? 'host' : 'player'
        });
        await participant.populate('user', 'firstName lastName avatar uniqueId');
      } else {
        const guestName = String(req.body.guestName || '').trim().slice(0, 40);
        if (!guestName) return res.status(400).json({ message: 'Введите ник для входа' });

        const guestTokenId = uuidv4();
        participant = await ArenaParticipant.create({
          room: room._id,
          guestName,
          guestTokenId,
          role: 'player'
        });

        guestToken = signArenaGuestToken({
          roomId: room._id.toString(),
          guestTokenId,
          participantId: participant._id.toString(),
          joinCode: room.joinCode,
          guestName
        });
      }
    }

    participant.state = 'joined';
    participant.lastSeenAt = new Date();
    await participant.save();

    // Mark lobby as active so cleanup loop knows it's alive.
    await bumpArenaActivity(room._id);

    const io = req.app.get('io');
    if (io) {
      await emitArenaState(io, room._id, 'arena:lobbyState');
    }

    const populated = await populateRoomState(room._id);
    res.json({
      room: populated.state,
      participant: buildArenaParticipantSummary(participant),
      guestToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Ошибка входа в арену' });
  }
});

router.post('/rooms/:id/accept-duel', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id)
      .populate('hostUser', 'firstName lastName avatar uniqueId')
      .populate('invitedUser', 'firstName lastName avatar uniqueId')
      .populate('test', 'title shareLink');

    if (!room || room.sourceType !== 'dm_duel') {
      return res.status(404).json({ message: 'Дуэль не найдена' });
    }
    const invitedUserId = room.invitedUser?._id?.toString() || room.invitedUser?.toString();
    if (invitedUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только приглашённый пользователь может принять дуэль' });
    }
    if (room.status === ARENA_STATUS.DECLINED) {
      return res.status(400).json({ message: 'Дуэль уже отклонена' });
    }

    let participant = await ArenaParticipant.findOne({ room: room._id, user: req.user._id }).populate('user', 'firstName lastName avatar uniqueId');
    if (!participant) {
      participant = await ArenaParticipant.create({
        room: room._id,
        user: req.user._id,
        role: 'player'
      });
      await participant.populate('user', 'firstName lastName avatar uniqueId');
    }

    room.status = ARENA_STATUS.LOBBY;
    await room.save();

    const io = req.app.get('io');
    if (io) {
      await emitArenaState(io, room._id, 'arena:lobbyState');
    }

    const populated = await populateRoomState(room._id);
    res.json({
      room: populated.state,
      participant: buildArenaParticipantSummary(participant)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка принятия дуэли' });
  }
});

router.post('/rooms/:id/decline-duel', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room || room.sourceType !== 'dm_duel') {
      return res.status(404).json({ message: 'Дуэль не найдена' });
    }
    const invitedUserId = room.invitedUser?._id?.toString() || room.invitedUser?.toString();
    if (invitedUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только приглашённый пользователь может отклонить дуэль' });
    }

    clearArenaTimers(room._id);
    room.status = ARENA_STATUS.DECLINED;
    room.cancelledAt = new Date();
    await room.save();

    const io = req.app.get('io');
    if (io) {
      await emitArenaState(io, room._id, 'arena:final');
    }

    res.json({ message: 'Дуэль отклонена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка отклонения дуэли' });
  }
});

router.post('/rooms/:id/start', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может запустить арену' });
    }
    if (room.status !== ARENA_STATUS.LOBBY) {
      return res.status(400).json({ message: 'Арена не находится в лобби' });
    }

    const participantCount = await ArenaParticipant.countDocuments({ room: room._id, state: { $ne: 'declined' } });
    if (room.sourceType === 'dm_duel' && participantCount < 2) {
      return res.status(400).json({ message: 'Для дуэли нужны оба игрока' });
    }
    if (room.sourceType !== 'dm_duel' && participantCount < 1) {
      return res.status(400).json({ message: 'В комнате должен быть хотя бы один игрок' });
    }

    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    await startArenaCountdown(room._id, io);
    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка запуска арены' });
  }
});

async function skipArenaPhaseRoute(req, res) {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может переключать фазу арены' });
    }

    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    const updated = await skipArenaPhase(room._id, io);
    if (!updated) {
      return res.status(400).json({ message: 'Сейчас нельзя пропустить фазу арены' });
    }

    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка переключения фазы арены' });
  }
}

router.post('/rooms/:id/next', auth, skipArenaPhaseRoute);
router.post('/rooms/:id/skip', auth, skipArenaPhaseRoute);

router.post('/rooms/:id/pause', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может поставить арену на паузу' });
    }

    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    await pauseArenaRoom(room._id, io);
    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Ошибка постановки на паузу' });
  }
});

router.post('/rooms/:id/resume', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может снять паузу' });
    }

    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    const updated = await resumeArenaRoom(room._id, io);
    if (!updated) {
      return res.status(400).json({ message: 'Комната не на паузе' });
    }
    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Ошибка снятия паузы' });
  }
});

router.post('/rooms/:id/extend-timer', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может продлить таймер' });
    }

    const extraSec = Number(req.body?.extraSec) || 15;
    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    await extendArenaTimer(room._id, extraSec, io);
    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Ошибка продления таймера' });
  }
});

router.post('/rooms/:id/kick/:participantId', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может исключать игроков' });
    }

    const io = req.app.get('io');
    await bumpArenaActivity(room._id);
    await kickArenaParticipant(room._id, req.params.participantId, io);
    const populated = await populateRoomState(room._id);
    res.json({ room: populated.state });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Ошибка исключения игрока' });
  }
});

router.post('/rooms/:id/cancel', auth, async (req, res) => {
  try {
    const room = await ArenaRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (room.hostUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только ведущий может отменить арену' });
    }

    clearArenaTimers(room._id);
    room.status = ARENA_STATUS.CANCELLED;
    room.cancelledAt = new Date();
    await room.save();

    const io = req.app.get('io');
    if (io) {
      await emitArenaState(io, room._id, 'arena:final');
    }

    res.json({ message: 'Арена отменена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка отмены арены' });
  }
});

router.get('/rooms/:id/results', optionalAuth, async (req, res) => {
  try {
    const room = await loadArenaRoom(req.params.id);
    if (!room) return res.status(404).json({ message: 'Комната не найдена' });
    if (![ARENA_STATUS.FINAL, ARENA_STATUS.CANCELLED, ARENA_STATUS.DECLINED].includes(room.status)) {
      return res.status(400).json({ message: 'Результаты ещё не готовы' });
    }

    const [participants, results] = await Promise.all([
      loadArenaParticipants(room._id),
      ArenaResult.find({ room: room._id })
        .populate('user', 'firstName lastName username avatar uniqueId')
        .sort({ placement: 1, score: -1 })
    ]);

    // Per-question analytics: correct rate, avg response time, fastest player
    const questionBreakdowns = (room.questionSnapshot || []).map((question, qIdx) => {
      const answers = [];
      participants.forEach((participant) => {
        if (participant.state === 'declined') return;
        const answer = (participant.answers || []).find(a => a.questionIndex === qIdx);
        if (answer) {
          answers.push({ participant, answer });
        }
      });
      const total = answers.length;
      const correct = answers.filter(item => item.answer.isCorrect).length;
      const avgTimeMs = total
        ? Math.round(answers.reduce((sum, item) => sum + (item.answer.responseTimeMs || 0), 0) / total)
        : 0;
      const fastestCorrect = answers
        .filter(item => item.answer.isCorrect)
        .sort((a, b) => (a.answer.responseTimeMs || 0) - (b.answer.responseTimeMs || 0))[0] || null;

      return {
        questionIndex: qIdx,
        questionNumber: qIdx + 1,
        questionText: question.questionText,
        type: question.type,
        totalAnswered: total,
        correctAnswered: correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        avgResponseTimeMs: avgTimeMs,
        fastest: fastestCorrect ? {
          displayName: fastestCorrect.participant.user
            ? `${fastestCorrect.participant.user.firstName || ''} ${fastestCorrect.participant.user.lastName || ''}`.trim()
            : (fastestCorrect.participant.guestName || 'Guest'),
          username: fastestCorrect.participant.user?.username || null,
          responseTimeMs: fastestCorrect.answer.responseTimeMs
        } : null
      };
    });

    res.json({
      room: buildArenaRoomState(room, participants),
      results,
      questionBreakdowns
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки результатов арены' });
  }
});

module.exports = router;
