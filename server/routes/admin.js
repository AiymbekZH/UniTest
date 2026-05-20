const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Test = require('../models/Test');
const Result = require('../models/Result');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { adminAuth, auth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function tryNotify(userId, payload) {
  if (!userId) return Promise.resolve();
  return Notification.create({
    user: userId,
    type: payload.type || 'system',
    title: payload.title || 'Сообщение',
    message: payload.message || '',
    meta: payload.meta || {},
    link: payload.link || ''
  }).catch(() => null);
}

// Get all users (admin)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search, role, aiAccess, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (aiAccess === 'true') {
      filter.aiAccess = true;
      if (!role) filter.role = { $ne: 'admin' };
    }
    if (aiAccess === 'false') {
      filter.aiAccess = false;
      if (!role) filter.role = { $ne: 'admin' };
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ users, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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

    await logAudit(req, {
      action: 'ban_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName} (${user.email})`,
      details: user.banReason
    });

    res.json({ message: 'Пользователь заблокирован', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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

    await logAudit(req, {
      action: 'unban_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName} (${user.email})`
    });

    res.json({ message: 'Пользователь разблокирован', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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

    await logAudit(req, {
      action: 'warn_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`,
      details: message
    });

    res.json({ message: 'Предупреждение отправлено', warnings: user.warnings });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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

    await logAudit(req, {
      action: 'change_role',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`,
      details: `Роль → ${role}`
    });

    res.json({ message: 'Роль обновлена', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Set AI access for a single user
router.put('/users/:id/ai-access', adminAuth, async (req, res) => {
  try {
    if (typeof req.body.aiAccess !== 'boolean') {
      return res.status(400).json({ message: 'Укажите aiAccess: true или false' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Администраторы получают доступ к AI автоматически' });
    }

    user.aiAccess = req.body.aiAccess;
    await user.save();

    await logAudit(req, {
      action: user.aiAccess ? 'grant_ai_access' : 'revoke_ai_access',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`
    });

    res.json({ message: user.aiAccess ? 'Доступ к AI выдан' : 'Доступ к AI отключен', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Bulk-set AI access for non-admin users
router.put('/ai-access/bulk', adminAuth, async (req, res) => {
  try {
    if (typeof req.body.aiAccess !== 'boolean') {
      return res.status(400).json({ message: 'Укажите aiAccess: true или false' });
    }

    const result = await User.updateMany(
      { role: { $ne: 'admin' } },
      { $set: { aiAccess: req.body.aiAccess } }
    );

    res.json({
      message: req.body.aiAccess
        ? 'AI-доступ выдан всем не-админам'
        : 'AI-доступ снят у всех не-админов',
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
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
      .populate('creator', 'firstName lastName email username uniqueId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ tests, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Stats overview (admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [userCount, testCount, resultCount, bannedCount, aiAccessCount] = await Promise.all([
      User.countDocuments(),
      Test.countDocuments({ isDeleted: { $ne: true } }),
      Result.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ aiAccess: true, role: { $ne: 'admin' } })
    ]);
    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(5);
    const recentTests = await Test.find({ isDeleted: { $ne: true } })
      .populate('creator', 'firstName lastName username uniqueId')
      .sort({ createdAt: -1 }).limit(5);

    res.json({ userCount, testCount, resultCount, bannedCount, aiAccessCount, recentUsers, recentTests });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Delete comment (admin)
router.delete('/comments/:id', adminAuth, async (req, res) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Delete results by user for specific test (admin - remove from leaderboard)
router.delete('/results/user/:userId/test/:testId', adminAuth, async (req, res) => {
  try {
    const deleted = await Result.deleteMany({ user: req.params.userId, test: req.params.testId });
    res.json({ message: `Удалено ${deleted.deletedCount} результатов` });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get leaderboard for a test (admin view - with result IDs for deletion)
router.get('/leaderboard/:testId', adminAuth, async (req, res) => {
  try {
    const results = await Result.find({ test: req.params.testId, status: 'completed' })
      .populate('user', 'firstName lastName email username uniqueId')
      .sort({ percentage: -1, timeSpent: 1 })
      .select('user guestName percentage score totalPoints timeSpent completedAt');

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get test details with questions (admin)
router.get('/tests/:id/details', adminAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('creator', 'firstName lastName email username uniqueId');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── User detail (admin) ────────────────────────────────────────────────────

// Deep user profile: counts + recent activity for the admin drawer.
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    const [testsCreated, resultsCount, reportsAgainst, reportsFiled, recentResults, recentTests] = await Promise.all([
      Test.countDocuments({ creator: user._id, isDeleted: { $ne: true } }),
      Result.countDocuments({ user: user._id, status: 'completed' }),
      // Reports filed against this user as a target
      require('../models/Report').countDocuments({ targetType: 'user', targetId: user._id }),
      // Reports filed by this user
      require('../models/Report').countDocuments({ reporter: user._id }),
      Result.find({ user: user._id, status: 'completed' })
        .populate('test', 'title shareLink')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Test.find({ creator: user._id, isDeleted: { $ne: true } })
        .select('title shareLink createdAt attemptCount rating')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.json({
      user,
      stats: { testsCreated, resultsCount, reportsAgainst, reportsFiled },
      recentResults,
      recentTests
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Update private admin notes for a user.
router.put('/users/:id/notes', adminAuth, async (req, res) => {
  try {
    const notes = String(req.body.notes || '').slice(0, 2000);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { adminNotes: notes },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    await logAudit(req, {
      action: 'edit_user_notes',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Temporary moderation actions: mute / suspend / temp-ban.
// body: { hours?: number, reason?: string }  hours=0 or omitted clears the state.
function clampHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 24 * 365); // hard cap at 1 year
}

router.put('/users/:id/mute', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Нельзя заглушить администратора' });

    const hours = clampHours(req.body.hours);
    user.mutedUntil = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null;
    await user.save();

    await logAudit(req, {
      action: 'mute_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`,
      details: hours > 0 ? `${hours} ч.` : 'снято',
      meta: { reason: req.body.reason || '' }
    });
    await tryNotify(user._id, {
      type: 'warning',
      title: hours > 0 ? 'Временное ограничение' : 'Ограничение снято',
      message: hours > 0
        ? `Вам нельзя оставлять комментарии и сообщения в течение ${hours} ч.${req.body.reason ? ' Причина: ' + req.body.reason : ''}`
        : 'Ваше ограничение на чат и комментарии снято.'
    });
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Нельзя приостановить администратора' });

    const hours = clampHours(req.body.hours);
    user.suspendedUntil = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null;
    await user.save();

    await logAudit(req, {
      action: 'suspend_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`,
      details: hours > 0 ? `${hours} ч.` : 'снято',
      meta: { reason: req.body.reason || '' }
    });
    await tryNotify(user._id, {
      type: 'warning',
      title: hours > 0 ? 'Приостановка' : 'Приостановка снята',
      message: hours > 0
        ? `Создание тестов и участие в арене заблокированы на ${hours} ч.${req.body.reason ? ' Причина: ' + req.body.reason : ''}`
        : 'Ваша приостановка снята.'
    });
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/users/:id/temp-ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Нельзя забанить администратора' });

    const hours = clampHours(req.body.hours);
    user.bannedUntil = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null;
    if (hours > 0 && req.body.reason) user.banReason = req.body.reason;
    await user.save();

    await logAudit(req, {
      action: 'temp_ban_user',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.firstName} ${user.lastName}`,
      details: hours > 0 ? `${hours} ч.` : 'снято',
      meta: { reason: req.body.reason || '' }
    });
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Bulk action on users — supports ban / unban / change role / warn / message.
router.post('/users/bulk', adminAuth, async (req, res) => {
  try {
    const { action, userIds, payload = {} } = req.body || {};
    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Нужны action и userIds[]' });
    }
    if (userIds.length > 200) {
      return res.status(400).json({ message: 'Не более 200 пользователей за раз' });
    }

    // Always exclude admins from any destructive bulk operation.
    const filter = { _id: { $in: userIds }, role: { $ne: 'admin' } };
    let updated = 0;

    if (action === 'ban') {
      const reason = String(payload.reason || 'Нарушение правил');
      const r = await User.updateMany(filter, { $set: { isBanned: true, banReason: reason } });
      updated = r.modifiedCount || 0;
    } else if (action === 'unban') {
      const r = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { isBanned: false, banReason: '', bannedUntil: null } }
      );
      updated = r.modifiedCount || 0;
    } else if (action === 'role') {
      const role = payload.role;
      if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: 'Неверная роль (нельзя массово назначать admin)' });
      }
      const r = await User.updateMany(filter, { $set: { role } });
      updated = r.modifiedCount || 0;
    } else if (action === 'warn') {
      const message = String(payload.message || '').trim();
      if (!message) return res.status(400).json({ message: 'Нужен текст предупреждения' });
      const users = await User.find(filter).select('_id warnings');
      await Promise.all(users.map((u) => {
        u.warnings.push({ message, fromAdmin: req.user._id });
        return u.save();
      }));
      updated = users.length;
    } else if (action === 'message') {
      const message = String(payload.message || '').trim();
      if (!message) return res.status(400).json({ message: 'Нужен текст сообщения' });
      const users = await User.find(filter).select('_id');
      await Promise.all(users.map((u) =>
        Notification.create({
          user: u._id,
          type: 'system',
          title: '📩 Сообщение от администрации',
          message
        })
      ));
      updated = users.length;
    } else {
      return res.status(400).json({ message: 'Неизвестное действие' });
    }

    await logAudit(req, {
      action: 'mass_action',
      targetType: 'user',
      targetId: 'bulk',
      targetLabel: `bulk:${action}`,
      details: `${updated}/${userIds.length}`,
      meta: { action, payload }
    });
    res.json({ updated });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Activity timeline for a single user (recent results, tests, reports filed).
router.get('/users/:id/timeline', adminAuth, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const userId = req.params.id;
    const [results, tests, filed, against] = await Promise.all([
      Result.find({ user: userId })
        .populate('test', 'title shareLink')
        .sort({ createdAt: -1 })
        .limit(20)
        .select('test percentage createdAt status isPractice')
        .lean(),
      Test.find({ creator: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title shareLink createdAt isDeleted attemptCount rating')
        .lean(),
      Report.find({ reporter: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('targetType targetId reason status createdAt')
        .lean(),
      Report.find({ targetType: 'user', targetId: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('reporter reason status createdAt')
        .populate('reporter', 'firstName lastName username')
        .lean()
    ]);
    res.json({
      results,
      tests,
      reportsFiled: filed,
      reportsAgainst: against
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Stats charts (time series) ─────────────────────────────────────────────

router.get('/stats/charts', adminAuth, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const range = String(req.query.range || '30d');
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dayBucket = {
      $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
    };
    const groupByDay = (Model, extraMatch = {}) =>
      Model.aggregate([
        { $match: { createdAt: { $gte: since }, ...extraMatch } },
        { $group: { _id: dayBucket, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

    const [signupsRaw, testsRaw, resultsRaw, reportsRaw] = await Promise.all([
      groupByDay(User),
      groupByDay(Test, { isDeleted: { $ne: true } }),
      groupByDay(Result, { status: 'completed' }),
      groupByDay(Report)
    ]);

    // Make a contiguous day range so the chart doesn't skip empty days.
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      series.push({
        day: key,
        signups: signupsRaw.find((r) => r._id === key)?.count || 0,
        tests: testsRaw.find((r) => r._id === key)?.count || 0,
        results: resultsRaw.find((r) => r._id === key)?.count || 0,
        reports: reportsRaw.find((r) => r._id === key)?.count || 0
      });
    }
    res.json({ range, series });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Audit log (admin) ──────────────────────────────────────────────────────

router.get('/audit', adminAuth, async (req, res) => {
  try {
    const { actor, action, targetType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (actor) filter.actor = actor;
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    const lim = Math.min(Number(limit) || 50, 200);
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'firstName lastName email username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);
    res.json({ items, total, totalPages: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Comments moderation ────────────────────────────────────────────────────

router.get('/comments', adminAuth, async (req, res) => {
  try {
    const { search, page = 1, limit = 30, deleted } = req.query;
    const filter = {};
    if (search) filter.text = { $regex: search, $options: 'i' };
    if (deleted === 'true') filter.isDeleted = true;
    if (deleted === 'false') filter.isDeleted = { $ne: true };
    const lim = Math.min(Number(limit) || 30, 100);
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const [items, total] = await Promise.all([
      Comment.find(filter)
        .populate('author', 'firstName lastName username uniqueId')
        .populate('test', 'title shareLink')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Comment.countDocuments(filter)
    ]);
    res.json({ items, total, totalPages: Math.ceil(total / lim) });
  } catch (_) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
