const express = require('express');
const User = require('../models/User');
const Test = require('../models/Test');
const Result = require('../models/Result');
const Comment = require('../models/Comment');
const { adminAuth, auth } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ users, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Ban user
router.put('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Нельзя забанить администратора' });

    user.isBanned = true;
    user.banReason = reason || 'Нарушение правил';
    await user.save();
    res.json({ message: 'Пользователь заблокирован', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Unban user
router.put('/users/:id/unban', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    user.isBanned = false;
    user.banReason = '';
    await user.save();
    res.json({ message: 'Пользователь разблокирован', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Warn user
router.post('/users/:id/warn', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Укажите сообщение предупреждения' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    user.warnings.push({ message, fromAdmin: req.user._id });
    await user.save();
    res.json({ message: 'Предупреждение отправлено', warnings: user.warnings });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Change user role
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Неверная роль' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Роль обновлена', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Toggle AI Access
router.put('/users/:id/ai-access', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    
    if (req.body.aiAccess !== undefined) {
      user.aiAccess = req.body.aiAccess;
    } else {
      user.aiAccess = !user.aiAccess;
    }
    
    await user.save();
    res.json({ message: user.aiAccess ? 'Доступ к AI выдан' : 'Доступ к AI отключен', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Delete test (admin)
router.delete('/tests/:id', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    test.isDeleted = true;
    test.deleteReason = reason || 'Удалён администратором';
    await test.save();
    res.json({ message: 'Тест удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get all tests (admin)
router.get('/tests', adminAuth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Test.countDocuments(filter);
    const tests = await Test.find(filter)
      .populate('creator', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ tests, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Stats overview (admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [userCount, testCount, resultCount, bannedCount] = await Promise.all([
      User.countDocuments(),
      Test.countDocuments({ isDeleted: { $ne: true } }),
      Result.countDocuments(),
      User.countDocuments({ isBanned: true })
    ]);
    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(5);
    const recentTests = await Test.find({ isDeleted: { $ne: true } })
      .populate('creator', 'firstName lastName')
      .sort({ createdAt: -1 }).limit(5);

    res.json({ userCount, testCount, resultCount, bannedCount, recentUsers, recentTests });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Delete comment (admin)
router.delete('/comments/:id', adminAuth, async (req, res) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Remove all warnings from user (admin)
router.delete('/users/:id/warnings', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    user.warnings = [];
    await user.save();
    res.json({ message: 'Предупреждения сняты', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Send message to user (stored as a special warning with type 'message')
router.post('/users/:id/message', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Укажите текст сообщения' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    user.warnings.push({ message: `📩 Сообщение от админа: ${message}`, fromAdmin: req.user._id, type: 'message' });
    await user.save();
    res.json({ message: 'Сообщение отправлено', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Delete result from leaderboard (admin)
router.delete('/results/:id', adminAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Результат не найден' });
    await Result.findByIdAndDelete(req.params.id);
    res.json({ message: 'Результат удалён из рейтинга' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Delete results by user for specific test (admin - remove from leaderboard)
router.delete('/results/user/:userId/test/:testId', adminAuth, async (req, res) => {
  try {
    const deleted = await Result.deleteMany({ user: req.params.userId, test: req.params.testId });
    res.json({ message: `Удалено ${deleted.deletedCount} результатов` });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get leaderboard for a test (admin view - with result IDs for deletion)
router.get('/leaderboard/:testId', adminAuth, async (req, res) => {
  try {
    const results = await Result.find({ test: req.params.testId, status: 'completed' })
      .populate('user', 'firstName lastName email')
      .sort({ percentage: -1, timeSpent: 1 })
      .select('user guestName percentage score totalPoints timeSpent completedAt');

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Edit test questions (admin - delete specific question)
router.delete('/tests/:testId/questions/:questionId', adminAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const qIdx = test.questions.findIndex(q => q.id === req.params.questionId);
    if (qIdx === -1) return res.status(404).json({ message: 'Вопрос не найден' });

    test.questions.splice(qIdx, 1);
    test.totalPoints = test.questions.reduce((s, q) => s + (q.points || 1), 0);
    await test.save();
    res.json({ message: 'Вопрос удалён', questionsCount: test.questions.length });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get test details with questions (admin)
router.get('/tests/:id/details', adminAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('creator', 'firstName lastName email');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
