const express = require('express');
const DirectMessage = require('../models/DirectMessage');
const DMMessage = require('../models/DMMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

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
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await DirectMessage.find({
      participants: req.user._id,
    })
      .populate('participants', 'firstName lastName email avatar uniqueId')
      .populate({
        path: 'lastMessage',
        select: 'text type sender createdAt readBy',
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
      });
      return { ...conv.toJSON(), unreadCount };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

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
        select: 'text type sender createdAt',
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
    const query = { conversation: req.params.id, isDeleted: false };
    if (before) query._id = { $lt: before };

    const messages = await DMMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit), 100))
      .populate('sender', 'firstName lastName avatar uniqueId')
      .populate({
        path: 'replyTo',
        select: 'text sender type',
        populate: { path: 'sender', select: 'firstName lastName' }
      });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;
