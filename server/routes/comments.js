const express = require('express');
const Comment = require('../models/Comment');
const Test = require('../models/Test');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');
const { sanitizePlainText } = require('../utils/sanitize');

const router = express.Router();

// Get comments for a test
router.get('/:testId', optionalAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).select('settings.allowComments creator');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (!test.settings?.allowComments) {
      return res.json({ comments: [], disabled: true });
    }

    const comments = await Comment.find({ test: req.params.testId, isDeleted: false })
      .populate('user', 'firstName lastName avatar username uniqueId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ comments, creatorId: test.creator?.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Add comment
router.post('/:testId', auth, async (req, res) => {
  try {
    const { text, replyTo } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Текст комментария обязателен' });

    const test = await Test.findById(req.params.testId).select('settings.allowComments title creator shareLink');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (!test.settings?.allowComments) {
      return res.status(400).json({ message: 'Комментарии отключены для этого теста' });
    }

    const comment = new Comment({
      test: req.params.testId,
      user: req.user._id,
      text: sanitizePlainText(text).slice(0, 2000),
      replyTo: replyTo || null
    });
    await comment.save();
    await comment.populate('user', 'firstName lastName avatar username uniqueId');

    // Send notification to the replied comment's author
    if (replyTo) {
      const parentComment = await Comment.findById(replyTo).select('user');
      if (parentComment && parentComment.user.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: parentComment.user,
          type: 'comment_reply',
          title: 'Ответ на комментарий',
          message: `${req.user.firstName} ${req.user.lastName} ответил на ваш комментарий в тесте "${test.title}"`,
          link: `/test-profile/${test.shareLink}`,
          meta: { testId: req.params.testId, commentId: comment._id }
        });
      }
    } else if (test.creator && test.creator.toString() !== req.user._id.toString()) {
      // Notify test creator about new comment
      await Notification.create({
        user: test.creator,
        type: 'comment_reply',
        title: 'Новый комментарий',
        message: `${req.user.firstName} ${req.user.lastName} оставил комментарий к тесту "${test.title}"`,
        link: `/test-profile/${test.shareLink}`,
        meta: { testId: req.params.testId, commentId: comment._id }
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Edit comment
router.put('/:id', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Текст комментария обязателен' });

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Комментарий не найден' });
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Нет прав для редактирования' });
    }

    comment.text = text.trim();
    comment.isEdited = true;
    await comment.save();
    await comment.populate('user', 'firstName lastName avatar username uniqueId');

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Delete own comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Комментарий не найден' });
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Нет прав для удаления' });
    }

    comment.isDeleted = true;
    await comment.save();
    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Vote on a comment (upvote / downvote)
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'up' or 'down'
    if (!['up', 'down'].includes(type)) return res.status(400).json({ message: 'Invalid vote type' });

    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) return res.status(404).json({ message: 'Комментарий не найден' });

    const userId = req.user._id.toString();
    const hasUp = comment.upvotes.some(id => id.toString() === userId);
    const hasDown = comment.downvotes.some(id => id.toString() === userId);

    if (type === 'up') {
      if (hasUp) {
        // Remove upvote (toggle off)
        comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId);
      } else {
        // Add upvote, remove downvote if exists
        comment.upvotes.push(req.user._id);
        if (hasDown) comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId);
      }
    } else {
      if (hasDown) {
        // Remove downvote (toggle off)
        comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId);
      } else {
        // Add downvote, remove upvote if exists
        comment.downvotes.push(req.user._id);
        if (hasUp) comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId);
      }
    }

    await comment.save();
    res.json({ upvotes: comment.upvotes.length, downvotes: comment.downvotes.length });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
