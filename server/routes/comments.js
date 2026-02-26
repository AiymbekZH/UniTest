const express = require('express');
const Comment = require('../models/Comment');
const Test = require('../models/Test');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');

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
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ comments, creatorId: test.creator?.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
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
      text: text.trim(),
      replyTo: replyTo || null
    });
    await comment.save();
    await comment.populate('user', 'firstName lastName avatar');

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
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
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
    await comment.populate('user', 'firstName lastName avatar');

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
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
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
