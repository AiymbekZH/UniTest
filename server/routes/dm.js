const express = require('express');
const DirectMessage = require('../models/DirectMessage');
const DMMessage = require('../models/DMMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

async function findVisibleConversationMessage(conversationId, userId) {
  return DMMessage.findOne({
    conversation: conversationId,
    isDeleted: false,
    deletedFor: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'firstName lastName avatar uniqueId')
    .populate({
      path: 'replyTo',
      select: 'text sender type isDeleted',
      populate: { path: 'sender', select: 'firstName lastName' }
    });
}

// ── Search users (for starting DMs) ──
router.get('/search/users', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const query = q.trim();
    const users = await User.find({
      _id: { $ne: req.user._id },
      isBanned: false,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { uniqueId: { $regex: query, $options: 'i' } },
      ]
    })
      .select('firstName lastName email avatar uniqueId role')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Get my conversations ──
router.get('/unread-summary', auth, async (req, res) => {
  try {
    // Single aggregate instead of N+1 loop
    const unread = await DMMessage.aggregate([
      {
        $match: {
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
          isDeleted: false,
          deletedFor: { $ne: req.user._id },
        }
      },
      {
        $lookup: {
          from: 'directmessages',
          localField: 'conversation',
          foreignField: '_id',
          as: 'conv'
        }
      },
      { $unwind: '$conv' },
      { $match: { 'conv.participants': req.user._id } },
      { $group: { _id: '$conversation' } }
    ]);

    const unreadConversationIds = unread.map(u => u._id.toString());

    res.json({
      hasUnread: unreadConversationIds.length > 0,
      unreadConversationIds
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await DirectMessage.find({
      participants: req.user._id,
    })
      .populate('participants', 'firstName lastName email avatar uniqueId')
      .populate({
        path: 'lastMessage',
        select: 'text type sender createdAt readBy isDeleted deletedFor attachments',
        populate: { path: 'sender', select: 'firstName lastName' }
      })
      .sort({ lastActivity: -1 });

    // Add unread count for each conversation
    const result = await Promise.all(conversations.map(async (conv) => {
      const unreadCount = await DMMessage.countDocuments({
        conversation: conv._id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
        isDeleted: false,
        deletedFor: { $ne: req.user._id },
      });

      const isLastMessageVisible =
        conv.lastMessage &&
        !conv.lastMessage.isDeleted &&
        !conv.lastMessage.deletedFor?.some(id => id.toString() === req.user._id.toString());

      const visibleLastMessage = isLastMessageVisible
        ? conv.lastMessage
        : await findVisibleConversationMessage(conv._id, req.user._id);

      const userIdStr = req.user._id.toString();
      const isPinned = (conv.pinnedBy || []).some(id => id.toString() === userIdStr);
      const isMuted = (conv.mutedBy || []).some(id => id.toString() === userIdStr);
      const isArchived = (conv.archivedBy || []).some(id => id.toString() === userIdStr);

      return {
        ...conv.toJSON(),
        lastMessage: visibleLastMessage,
        unreadCount,
        isPinned,
        isMuted,
        isArchived,
      };
    }));

    // Sort: pinned first (preserve lastActivity order within each group)
    result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Toggle pin / mute / archive ──
async function toggleConversationFlag(req, res, field) {
  try {
    const conversation = await DirectMessage.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Диалог не найден' });

    const userIdStr = req.user._id.toString();
    const isParticipant = conversation.participants.some(p => p.toString() === userIdStr);
    if (!isParticipant) return res.status(403).json({ message: 'Нет доступа' });

    const list = conversation[field] || [];
    const idx = list.findIndex(id => id.toString() === userIdStr);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(req.user._id);

    conversation[field] = list;
    await conversation.save();

    res.json({
      ok: true,
      [field === 'pinnedBy' ? 'isPinned' : field === 'mutedBy' ? 'isMuted' : 'isArchived']: idx < 0,
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка' });
  }
}

router.patch('/conversations/:id/pin', auth, (req, res) => toggleConversationFlag(req, res, 'pinnedBy'));
router.patch('/conversations/:id/mute', auth, (req, res) => toggleConversationFlag(req, res, 'mutedBy'));
router.patch('/conversations/:id/archive', auth, (req, res) => toggleConversationFlag(req, res, 'archivedBy'));

// ── Create or find conversation ──
router.post('/conversations', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ message: 'participantId required' });
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Нельзя написать самому себе' });
    }

    const otherUser = await User.findById(participantId);
    if (!otherUser) return res.status(404).json({ message: 'Пользователь не найден' });

    // Check if conversation already exists
    let conversation = await DirectMessage.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 }
    })
      .populate('participants', 'firstName lastName email avatar uniqueId')
      .populate({
        path: 'lastMessage',
        select: 'text type sender createdAt isDeleted deletedFor attachments',
        populate: { path: 'sender', select: 'firstName lastName' }
      });

    if (!conversation) {
      conversation = new DirectMessage({
        participants: [req.user._id, participantId],
      });
      await conversation.save();
      await conversation.populate('participants', 'firstName lastName email avatar uniqueId');
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Get messages for a conversation ──
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await DirectMessage.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Диалог не найден' });

    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: 'Нет доступа' });

    const { before, limit = 50 } = req.query;
    const query = { conversation: req.params.id, deletedFor: { $ne: req.user._id } };
    if (before) query._id = { $lt: before };

    const messages = await DMMessage.find(query)
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

// ── Search messages within a conversation ──
router.get('/conversations/:id/search', auth, async (req, res) => {
  try {
    const conversation = await DirectMessage.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Диалог не найден' });

    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: 'Нет доступа' });

    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const messages = await DMMessage.find({
      conversation: req.params.id,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
      text: { $regex: escaped, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'firstName lastName avatar uniqueId');

    res.json(messages);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;
