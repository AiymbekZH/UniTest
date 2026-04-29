const express = require('express');
const Group = require('../models/Group');
const Test = require('../models/Test');
const User = require('../models/User');
const Message = require('../models/Message');
const Result = require('../models/Result');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const PERMISSION_KEYS = [
  'sendMessages',
  'deleteMessages',
  'kickMembers',
  'banMembers',
  'manageRoles',
  'manageGroup',
  'assignTests',
  'pinMessages',
  'launchArenas',
];

async function ensureGroupReadBaseline(group, userId) {
  const member = group.members.find(m => m.user.toString() === userId.toString());
  if (!member) return null;

  if (!member.lastReadAt) {
    member.lastReadAt = new Date();
    await group.save();
  }

  return member.lastReadAt;
}

function sanitizePermissions(input = {}) {
  return PERMISSION_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      acc[key] = input[key] === true;
    }
    return acc;
  }, {});
}

function canManageTarget(group, actorId, targetUserId) {
  const actorRole = group.getMemberRole(actorId);
  const targetRole = group.getMemberRole(targetUserId);
  if (!actorRole || !targetRole) return false;
  return targetRole.position < actorRole.position;
}

function canGrantPermissions(group, actorId, permissions = {}) {
  if (group.isOwner(actorId)) return true;

  const actorRole = group.getMemberRole(actorId);
  if (!actorRole) return false;

  return Object.entries(permissions).every(([key, value]) => value !== true || actorRole.permissions?.[key] === true);
}

async function populateGroup(group) {
  await group.populate('creator', 'firstName lastName avatar username uniqueId');
  await group.populate('members.user', 'firstName lastName email avatar username uniqueId');
  await group.populate('assignedTests.test', 'title shareLink totalPoints attemptCount averageScore');
  return group;
}

// ── Create group ──
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Название обязательно' });

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user._id,
      members: [{ user: req.user._id, roleId: 'owner', lastReadAt: new Date() }]
    });

    await group.save();
    await populateGroup(group);
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания группы' });
  }
});

// ── Get my groups ──
router.get('/my', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      isDeleted: false,
      'members.user': req.user._id
    })
      .populate('creator', 'firstName lastName avatar username uniqueId')
      .populate('members.user', 'firstName lastName email avatar username uniqueId')
      .populate('assignedTests.test', 'title shareLink totalPoints')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Get single group ──
router.get('/unread-summary', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({
      isDeleted: false,
      'members.user': req.user._id
    }).select('_id members').lean();

    if (!userGroups.length) {
      return res.json({ hasUnread: false, unreadGroupIds: [] });
    }

    // Build a map of groupId -> lastReadAt for aggregate $match
    const groupFilters = [];
    for (const g of userGroups) {
      const member = g.members.find(m => m.user.toString() === req.user._id.toString());
      const lastReadAt = member?.lastReadAt || new Date(0);
      groupFilters.push({ group: g._id, after: lastReadAt });
    }

    // Single aggregate: check all groups at once
    const unread = await Message.aggregate([
      {
        $match: {
          $or: groupFilters.map(f => ({
            group: f.group,
            createdAt: { $gt: f.after }
          })),
          sender: { $ne: req.user._id },
          type: { $ne: 'system' },
          isDeleted: false,
          deletedFor: { $ne: req.user._id },
        }
      },
      { $group: { _id: '$group' } }
    ]);

    const unreadGroupIds = unread.map(u => u._id.toString());

    res.json({
      hasUnread: unreadGroupIds.length > 0,
      unreadGroupIds
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'firstName lastName avatar username uniqueId')
      .populate('members.user', 'firstName lastName email avatar username uniqueId')
      .populate('assignedTests.test', 'title shareLink totalPoints attemptCount averageScore')
      .populate('announcement.updatedBy', 'firstName lastName avatar username uniqueId');

    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    const isMember = group.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не являетесь участником группы' });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Join group by invite code ──
router.post('/join/:code', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code, isDeleted: false });
    if (!group) return res.status(404).json({ message: 'Группа не найдена. Проверьте код приглашения.' });
    group.bannedMembers = group.bannedMembers || [];

    const isBanned = group.bannedMembers?.some(b => b.user.toString() === req.user._id.toString());
    if (isBanned) {
      return res.status(403).json({ message: 'Вы заблокированы в этой группе' });
    }

    // Check password if private
    if (group.password) {
      const { password } = req.body;
      if (!password || password !== group.password) {
        return res.status(403).json({ message: 'Неверный пароль группы', requiresPassword: true });
      }
    }

    const alreadyMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'Вы уже в этой группе' });

    group.members.push({ user: req.user._id, roleId: 'member', lastReadAt: new Date() });
    await group.save();

    await populateGroup(group);

    // System message in chat
    try {
      const sysMsg = new Message({
        group: group._id,
        sender: req.user._id,
        type: 'system',
        text: `${req.user.firstName} ${req.user.lastName} присоединился к группе`,
      });
      await sysMsg.save();
      const io = req.app.get('io');
      if (io) {
        await sysMsg.populate('sender', 'firstName lastName avatar');
        io.to(`group:${group._id}`).emit('group:message', sysMsg);
      }
    } catch (_) {}

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Update group (name, description, avatar, privacy) ──
router.put('/:id', auth, upload.single('avatar'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageGroup')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    if (req.body.name) group.name = req.body.name.trim();
    if (req.body.description !== undefined) group.description = req.body.description.trim();
    if (req.body.isPrivate !== undefined) group.isPrivate = req.body.isPrivate === 'true' || req.body.isPrivate === true;
    if (req.body.password !== undefined) group.password = req.body.password;
    if (req.body.removeAvatar === 'true' || req.body.removeAvatar === true) {
      group.avatar = '';
    }

    // Avatar upload
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      group.avatar = `data:${req.file.mimetype};base64,${base64}`;
    }

    await group.save();
    await populateGroup(group);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Delete group (soft delete) ──
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.isOwner(req.user._id)) {
      return res.status(403).json({ message: 'Только владелец может удалить группу' });
    }

    group.isDeleted = true;
    await group.save();
    res.json({ message: 'Группа удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Remove member ──
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'kickMembers')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Нельзя удалить себя' });
    }
    if (group.isOwner(req.params.userId)) {
      return res.status(403).json({ message: 'Нельзя удалить владельца группы' });
    }
    if (!canManageTarget(group, req.user._id, req.params.userId)) {
      return res.status(403).json({ message: 'Нельзя удалить участника с равной или более высокой ролью' });
    }

    const targetUser = await User.findById(req.params.userId).select('firstName lastName avatar uniqueId');
    group.members = group.members.filter(m => m.user.toString() !== req.params.userId);
    await group.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.userId}`).emit('group:kicked', {
        groupId: group._id.toString(),
      });
      io.to(`group:${group._id}`).emit('group:memberRemoved', {
        groupId: group._id.toString(),
        userId: req.params.userId,
      });
    }

    if (targetUser) {
      try {
        const sysMsg = new Message({
          group: group._id,
          sender: req.user._id,
          type: 'system',
          text: `${req.user.firstName} ${req.user.lastName} выгнал ${targetUser.firstName} ${targetUser.lastName}`,
        });
        await sysMsg.save();
        if (io) {
          await sysMsg.populate('sender', 'firstName lastName avatar');
          io.to(`group:${group._id}`).emit('group:message', sysMsg);
        }
      } catch (_) {}
    }

    res.json({ message: 'Участник удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Get banned members ──
router.get('/:id/bans', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('bannedMembers.user', 'firstName lastName email avatar username uniqueId')
      .populate('bannedMembers.bannedBy', 'firstName lastName avatar username uniqueId');

    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    group.bannedMembers = group.bannedMembers || [];
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не являетесь участником группы' });
    if (!group.hasPermission(req.user._id, 'banMembers')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    res.json(group.bannedMembers || []);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Ban member ──
router.post('/:id/members/:userId/ban', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    group.bannedMembers = group.bannedMembers || [];
    if (!group.hasPermission(req.user._id, 'banMembers')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Нельзя забанить себя' });
    }
    if (group.isOwner(req.params.userId)) {
      return res.status(403).json({ message: 'Нельзя забанить владельца группы' });
    }

    const targetMember = group.members.find(m => m.user.toString() === req.params.userId);
    if (!targetMember) return res.status(404).json({ message: 'Участник не найден' });
    if (!canManageTarget(group, req.user._id, req.params.userId)) {
      return res.status(403).json({ message: 'Нельзя забанить участника с равной или более высокой ролью' });
    }

    const alreadyBanned = group.bannedMembers?.some(b => b.user.toString() === req.params.userId);
    if (alreadyBanned) return res.status(400).json({ message: 'Пользователь уже забанен' });

    const targetUser = await User.findById(req.params.userId).select('firstName lastName avatar uniqueId');

    group.members = group.members.filter(m => m.user.toString() !== req.params.userId);
    group.bannedMembers.push({
      user: req.params.userId,
      bannedBy: req.user._id,
      bannedAt: new Date()
    });
    await group.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.userId}`).emit('group:banned', {
        groupId: group._id.toString(),
      });
      io.to(`group:${group._id}`).emit('group:memberRemoved', {
        groupId: group._id.toString(),
        userId: req.params.userId,
      });
    }

    if (targetUser) {
      try {
        const sysMsg = new Message({
          group: group._id,
          sender: req.user._id,
          type: 'system',
          text: `${req.user.firstName} ${req.user.lastName} забанил ${targetUser.firstName} ${targetUser.lastName}`,
        });
        await sysMsg.save();
        if (io) {
          await sysMsg.populate('sender', 'firstName lastName avatar');
          io.to(`group:${group._id}`).emit('group:message', sysMsg);
        }
      } catch (_) {}
    }

    await populateGroup(group);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Unban member ──
router.delete('/:id/bans/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    group.bannedMembers = group.bannedMembers || [];
    if (!group.hasPermission(req.user._id, 'banMembers')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    const banEntry = group.bannedMembers.find(b => b.user.toString() === req.params.userId);
    if (!banEntry) return res.status(404).json({ message: 'Пользователь не найден в бане' });

    const targetUser = await User.findById(req.params.userId).select('firstName lastName avatar uniqueId');
    group.bannedMembers = group.bannedMembers.filter(b => b.user.toString() !== req.params.userId);
    await group.save();

    const io = req.app.get('io');
    if (targetUser) {
      try {
        const sysMsg = new Message({
          group: group._id,
          sender: req.user._id,
          type: 'system',
          text: `${req.user.firstName} ${req.user.lastName} разбанил ${targetUser.firstName} ${targetUser.lastName}`,
        });
        await sysMsg.save();
        if (io) {
          await sysMsg.populate('sender', 'firstName lastName avatar');
          io.to(`group:${group._id}`).emit('group:message', sysMsg);
        }
      } catch (_) {}
    }

    await group.populate('bannedMembers.user', 'firstName lastName email avatar username uniqueId');
    await group.populate('bannedMembers.bannedBy', 'firstName lastName avatar username uniqueId');
    res.json(group.bannedMembers);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Leave group ──
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.isOwner(req.user._id)) {
      return res.status(400).json({ message: 'Владелец не может покинуть группу. Удалите её.' });
    }

    group.members = group.members.filter(m => m.user.toString() !== req.user._id.toString());
    await group.save();

    // System message
    try {
      const sysMsg = new Message({
        group: group._id, sender: req.user._id, type: 'system',
        text: `${req.user.firstName} ${req.user.lastName} покинул группу`,
      });
      await sysMsg.save();
      const io = req.app.get('io');
      if (io) {
        await sysMsg.populate('sender', 'firstName lastName avatar');
        io.to(`group:${group._id}`).emit('group:message', sysMsg);
      }
    } catch (_) {}

    res.json({ message: 'Вы вышли из группы' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ═══════════════════════════════════
// ══  ROLES MANAGEMENT (Discord)  ══
// ═══════════════════════════════════

// ── Create role ──
router.post('/:id/roles', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageRoles')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    const { name, color, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Название роли обязательно' });

    // Position between member(0) and caller's role
    const callerRole = group.getMemberRole(req.user._id);
    const newPosition = Math.min((req.body.position || 1), callerRole.position - 1);
    const safePermissions = sanitizePermissions(permissions);

    if (!canGrantPermissions(group, req.user._id, safePermissions)) {
      return res.status(403).json({ message: 'Нельзя выдать право, которого нет у вашей роли' });
    }

    group.roles.push({
      _id: uuidv4().slice(0, 8),
      name: name.trim(),
      color: color || '#6366f1',
      position: Math.max(1, newPosition),
      permissions: safePermissions,
    });

    await group.save();
    res.json(group.roles);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Update role ──
router.put('/:id/roles/:roleId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageRoles')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    const role = group.roles.find(r => r._id === req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Роль не найдена' });
    if (['owner'].includes(role._id)) return res.status(400).json({ message: 'Нельзя изменить эту роль' });
    const callerRole = group.getMemberRole(req.user._id);
    if (!group.isOwner(req.user._id) && role.position >= callerRole.position) {
      return res.status(403).json({ message: 'Нельзя изменить роль равную или выше вашей' });
    }

    if (req.body.name) role.name = req.body.name.trim();
    if (req.body.color) role.color = req.body.color;
    if (req.body.permissions) {
      const safePermissions = sanitizePermissions(req.body.permissions);
      if (!canGrantPermissions(group, req.user._id, safePermissions)) {
        return res.status(403).json({ message: 'Нельзя выдать право, которого нет у вашей роли' });
      }
      Object.assign(role.permissions, safePermissions);
    }

    await group.save();
    res.json(group.roles);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Delete role ──
router.delete('/:id/roles/:roleId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageRoles')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }
    if (['owner', 'admin', 'member'].includes(req.params.roleId)) {
      return res.status(400).json({ message: 'Нельзя удалить системную роль' });
    }

    const callerRole = group.getMemberRole(req.user._id);
    const role = group.roles.find(r => r._id === req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Роль не найдена' });
    if (!group.isOwner(req.user._id) && role.position >= callerRole.position) {
      return res.status(403).json({ message: 'Нельзя удалить роль равную или выше вашей' });
    }

    // Move members with this role back to 'member'
    group.members.forEach(m => {
      if (m.roleId === req.params.roleId) m.roleId = 'member';
    });
    group.roles = group.roles.filter(r => r._id !== req.params.roleId);
    await group.save();
    res.json(group.roles);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Assign role to member ──
router.put('/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageRoles')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    const { roleId } = req.body;
    const role = group.roles.find(r => r._id === roleId);
    if (!role) return res.status(404).json({ message: 'Роль не найдена' });
    if (role._id === 'owner') {
      return res.status(400).json({ message: 'Нельзя назначить роль владельца' });
    }

    // Hierarchy check
    const callerRole = group.getMemberRole(req.user._id);
    if (role.position >= callerRole.position) {
      return res.status(403).json({ message: 'Нельзя назначить роль равную или выше вашей' });
    }

    const member = group.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Участник не найден' });
    if (member.roleId === 'owner') {
      return res.status(403).json({ message: 'Нельзя изменить роль владельца' });
    }
    if (!group.isOwner(req.user._id) && !canManageTarget(group, req.user._id, req.params.userId)) {
      return res.status(403).json({ message: 'Нельзя изменить роль участника с равной или более высокой ролью' });
    }

    member.roleId = roleId;
    await group.save();
    await populateGroup(group);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ═══════════════════════════════
// ══  MESSAGES (REST for history) ══
// ═══════════════════════════════

// ── Get messages (cursor-based pagination) ──
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не участник' });

    const { before, limit = 50 } = req.query;
    const query = { group: req.params.id, deletedFor: { $ne: req.user._id } };
    if (before) query._id = { $lt: before };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit), 100))
      .populate('sender', 'firstName lastName avatar uniqueId')
      .populate({
        path: 'replyTo',
        select: 'text sender type isDeleted',
        populate: { path: 'sender', select: 'firstName lastName' }
      });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Get pinned messages ──
router.get('/:id/messages/pinned', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      group: req.params.id,
      isPinned: true,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName avatar')
      .limit(50);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ═══════════════════════════
// ══  TESTS (unchanged)   ══
// ═══════════════════════════

// ── Assign test ──
router.post('/:id/assign-test', auth, async (req, res) => {
  try {
    const { testId, deadline } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'assignTests')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const already = group.assignedTests.some(at => at.test.toString() === testId);
    if (already) return res.status(400).json({ message: 'Тест уже назначен' });

    group.assignedTests.push({ test: testId, deadline: deadline || null });
    await group.save();
    await populateGroup(group);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Remove assigned test ──
router.delete('/:id/assigned-tests/:testId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'assignTests')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    group.assignedTests = group.assignedTests.filter(at => at.test.toString() !== req.params.testId);
    await group.save();
    res.json({ message: 'Тест убран' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Regenerate invite code ──
router.post('/:id/regenerate-code', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (!group.hasPermission(req.user._id, 'manageGroup')) {
      return res.status(403).json({ message: 'Нет разрешения' });
    }

    group.inviteCode = uuidv4().slice(0, 8);
    await group.save();
    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Update group announcement ──
router.patch('/:id/announcement', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    if (!group.hasPermission(req.user._id, 'manageGroup')) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    const text = String(req.body?.text || '').trim().slice(0, 500);
    group.announcement = {
      text,
      updatedBy: text ? req.user._id : null,
      updatedAt: text ? new Date() : null,
    };
    await group.save();

    const populated = await Group.findById(req.params.id)
      .populate('announcement.updatedBy', 'firstName lastName avatar username uniqueId')
      .lean();
    res.json({ ok: true, announcement: populated.announcement });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Group statistics ──
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Нет доступа' });

    const memberIds = group.members.map(m => m.user);
    const testIds = (group.assignedTests || []).map(t => t.test).filter(Boolean);

    // Members count
    const totalMembers = memberIds.length;
    const totalAssignedTests = testIds.length;

    // Total messages in group
    const totalMessages = await Message.countDocuments({
      group: req.params.id,
      isDeleted: false,
    });

    // Results for assigned tests by group members
    let totalAttempts = 0;
    let avgScore = null;
    let topPerformers = [];
    let testStats = [];

    if (memberIds.length > 0 && testIds.length > 0) {
      const results = await Result.find({
        test: { $in: testIds },
        user: { $in: memberIds },
        status: 'completed',
      })
        .populate('user', 'firstName lastName avatar username uniqueId')
        .populate('test', 'title')
        .lean();

      totalAttempts = results.length;
      if (results.length > 0) {
        avgScore = Math.round(
          results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length
        );
      }

      // Per-user aggregation: best score per user across all tests
      const byUser = new Map();
      for (const r of results) {
        const uid = r.user?._id?.toString();
        if (!uid) continue;
        const cur = byUser.get(uid) || { user: r.user, total: 0, count: 0, best: 0 };
        cur.total += r.percentage || 0;
        cur.count += 1;
        cur.best = Math.max(cur.best, r.percentage || 0);
        byUser.set(uid, cur);
      }
      topPerformers = [...byUser.values()]
        .map(u => ({
          user: u.user,
          attempts: u.count,
          avgPercentage: Math.round(u.total / u.count),
          bestPercentage: u.best,
        }))
        .sort((a, b) => b.avgPercentage - a.avgPercentage)
        .slice(0, 5);

      // Per-test aggregation
      const byTest = new Map();
      for (const r of results) {
        const tid = r.test?._id?.toString();
        if (!tid) continue;
        const cur = byTest.get(tid) || { test: r.test, total: 0, count: 0, distinctUsers: new Set() };
        cur.total += r.percentage || 0;
        cur.count += 1;
        if (r.user?._id) cur.distinctUsers.add(r.user._id.toString());
        byTest.set(tid, cur);
      }
      testStats = [...byTest.values()].map(t => ({
        test: t.test,
        attempts: t.count,
        avgPercentage: Math.round(t.total / t.count),
        uniqueParticipants: t.distinctUsers.size,
      }));
    }

    // Activity last 7 days (messages per day)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = await Message.find({
      group: req.params.id,
      isDeleted: false,
      createdAt: { $gte: since },
    }).select('createdAt').lean();
    const activityByDay = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      activityByDay[key] = 0;
    }
    for (const m of recentMessages) {
      const key = new Date(m.createdAt).toISOString().slice(0, 10);
      if (key in activityByDay) activityByDay[key] += 1;
    }
    const activity7d = Object.entries(activityByDay).map(([date, count]) => ({ date, count }));

    res.json({
      totalMembers,
      totalAssignedTests,
      totalMessages,
      totalAttempts,
      avgScore,
      topPerformers,
      testStats,
      activity7d,
    });
  } catch (e) {
    console.error('group stats error:', e);
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;
