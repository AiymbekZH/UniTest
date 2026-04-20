const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const UserFollow = require('../models/UserFollow');
const UserProgress = require('../models/UserProgress');
const Comment = require('../models/Comment');
const Test = require('../models/Test');
const Result = require('../models/Result');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { ensureUserProgress, getLevelMeta } = require('../utils/progress');

const router = express.Router();

function toObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

function sanitizeText(value = '', maxLength = 0) {
  const normalized = String(value || '').trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function buildOwnUserPayload(user) {
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    email: user.email,
    role: user.role,
    uniqueId: user.uniqueId,
    fullName: user.fullName,
    avatar: user.avatar,
    headline: user.headline || '',
    bio: user.bio || '',
    coverImage: user.coverImage || '',
    coverPreset: user.coverPreset || 'aurora',
    language: user.language,
    aiAccess: !!user.aiAccess,
    createdAt: user.createdAt
  };
}

function buildPublicUserPayload(user) {
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    role: user.role,
    uniqueId: user.uniqueId,
    avatar: user.avatar || '',
    headline: user.headline || '',
    bio: user.bio || '',
    coverImage: user.coverImage || '',
    coverPreset: user.coverPreset || 'aurora',
    createdAt: user.createdAt
  };
}

async function getProgressSummary(userId) {
  const progress = await ensureUserProgress(userId);
  return {
    xp: progress.xp,
    level: progress.level,
    currentStreakDays: progress.currentStreakDays,
    longestStreakDays: progress.longestStreakDays,
    lastActivityDate: progress.lastActivityDate,
    badges: progress.badges,
    stats: progress.stats,
    levelMeta: getLevelMeta(progress.xp)
  };
}

async function getCreatorStats(userId) {
  const [testsCreated, resultStats, publicStatsRaw] = await Promise.all([
    Test.countDocuments({ creator: userId, isDeleted: { $ne: true } }),
    Result.aggregate([
      { $match: { user: toObjectId(userId), status: 'completed' } },
      {
        $group: {
          _id: null,
          testsTaken: { $sum: 1 },
          avgScore: { $avg: '$percentage' }
        }
      }
    ]),
    Test.aggregate([
      {
        $match: {
          creator: toObjectId(userId),
          isDeleted: { $ne: true },
          'settings.isPublic': true
        }
      },
      {
        $group: {
          _id: null,
          publicTestsCount: { $sum: 1 },
          publicPlays: { $sum: '$attemptCount' },
          ratedTests: {
            $sum: {
              $cond: [{ $gt: ['$ratingCount', 0] }, 1, 0]
            }
          },
          ratingTotal: {
            $sum: {
              $cond: [{ $gt: ['$ratingCount', 0] }, '$rating', 0]
            }
          }
        }
      }
    ])
  ]);

  const resultEntry = resultStats[0] || {};
  const publicStats = publicStatsRaw[0] || {};

  return {
    testsCreated,
    testsTaken: resultEntry.testsTaken || 0,
    totalScore: resultEntry.avgScore ? Math.round(resultEntry.avgScore) : 0,
    publicTestsCount: publicStats.publicTestsCount || 0,
    publicPlays: publicStats.publicPlays || 0,
    publicAverageRating: (publicStats.ratedTests || 0) > 0
      ? Number(((publicStats.ratingTotal || 0) / publicStats.ratedTests).toFixed(1))
      : 0
  };
}

async function getFollowCounts(userId) {
  const [followersCount, followingCount] = await Promise.all([
    UserFollow.countDocuments({ following: userId }),
    UserFollow.countDocuments({ follower: userId })
  ]);

  return { followersCount, followingCount };
}

async function getPublicTests(userId, limit = 12) {
  return Test.find({
    creator: userId,
    isDeleted: { $ne: true },
    'settings.isPublic': true
  })
    .select('title shareLink coverImage rating ratingCount attemptCount questions tags createdAt settings')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getFollowState(viewerId, profileId) {
  if (!viewerId || String(viewerId) === String(profileId)) {
    return { isFollowing: false };
  }

  const existing = await UserFollow.findOne({ follower: viewerId, following: profileId }).select('_id').lean();
  return { isFollowing: !!existing };
}

async function buildProfileResponse({ profileUserId, viewerId = null, includePublicTests = true }) {
  const user = await User.findById(profileUserId).select('-password');
  if (!user) return null;

  const [progressSummary, creatorStats, followCounts, publicTests, followState] = await Promise.all([
    getProgressSummary(profileUserId),
    getCreatorStats(profileUserId),
    getFollowCounts(profileUserId),
    includePublicTests ? getPublicTests(profileUserId, 20) : Promise.resolve([]),
    getFollowState(viewerId, profileUserId)
  ]);

  return {
    user: buildPublicUserPayload(user),
    progressSummary,
    creatorStats,
    followCounts,
    followState,
    publicTests
  };
}

async function getFollowList(userId, type) {
  const query = type === 'followers'
    ? { following: userId }
    : { follower: userId };

  const populateField = type === 'followers' ? 'follower' : 'following';

  const entries = await UserFollow.find(query)
    .sort({ createdAt: -1 })
    .populate(populateField, 'firstName lastName middleName avatar headline role uniqueId')
    .lean();

  return entries
    .map((entry) => entry[populateField])
    .filter(Boolean)
    .map((item) => ({
      id: item._id,
      _id: item._id,
      firstName: item.firstName,
      lastName: item.lastName,
      middleName: item.middleName,
      avatar: item.avatar || '',
      headline: item.headline || '',
      role: item.role,
      uniqueId: item.uniqueId
    }));
}

// Get own profile summary
router.get('/me', auth, async (req, res) => {
  try {
    const [progressSummary, creatorStats, followCounts, publicTests] = await Promise.all([
      getProgressSummary(req.user._id),
      getCreatorStats(req.user._id),
      getFollowCounts(req.user._id),
      getPublicTests(req.user._id, 12)
    ]);

    res.json({
      user: buildOwnUserPayload(req.user),
      progressSummary,
      creatorStats,
      followCounts,
      publicTests
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Update profile
router.put('/me', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      language,
      headline,
      bio,
      coverPreset
    } = req.body || {};

    const updates = {};

    if (firstName !== undefined) {
      const value = sanitizeText(firstName, 60);
      if (!value) return res.status(400).json({ message: 'Имя обязательно' });
      updates.firstName = value;
    }

    if (lastName !== undefined) {
      const value = sanitizeText(lastName, 60);
      if (!value) return res.status(400).json({ message: 'Фамилия обязательна' });
      updates.lastName = value;
    }

    if (middleName !== undefined) updates.middleName = sanitizeText(middleName, 60);
    if (headline !== undefined) updates.headline = sanitizeText(headline, 120);
    if (bio !== undefined) updates.bio = sanitizeText(bio, 400);
    if (language && ['en', 'ru', 'kz', 'es'].includes(language)) updates.language = language;
    if (coverPreset && ['aurora', 'mesh', 'wave', 'grid'].includes(coverPreset)) updates.coverPreset = coverPreset;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user: buildOwnUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });

    const base64 = req.file.buffer.toString('base64');
    const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;

    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
    res.json({ avatar: avatarUrl, user: buildOwnUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Upload banner
router.post('/banner', auth, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });

    const base64 = req.file.buffer.toString('base64');
    const coverImage = `data:${req.file.mimetype};base64,${base64}`;

    const user = await User.findByIdAndUpdate(req.user._id, { coverImage }, { new: true }).select('-password');
    res.json({ coverImage, user: buildOwnUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Delete banner
router.delete('/banner', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { coverImage: '' }, { new: true }).select('-password');
    res.json({ user: buildOwnUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Укажите текущий и новый пароль' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Новый пароль должен быть минимум 6 символов' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get my warnings
router.get('/me/warnings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('warnings');
    res.json({ warnings: user?.warnings || [] });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get my comments across all tests
router.get('/me/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ user: req.user._id, isDeleted: false })
      .populate('test', 'title shareLink')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get my aggregated stats
router.get('/me/stats', auth, async (req, res) => {
  try {
    const creatorStats = await getCreatorStats(req.user._id);
    res.json({
      testsCreated: creatorStats.testsCreated,
      testsTaken: creatorStats.testsTaken,
      totalScore: creatorStats.totalScore,
      publicTestsCount: creatorStats.publicTestsCount,
      publicPlays: creatorStats.publicPlays,
      publicAverageRating: creatorStats.publicAverageRating
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Follow profile
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'Нельзя подписаться на себя' });
    }

    const targetUser = await User.findById(req.params.id).select('_id');
    if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден' });

    await UserFollow.updateOne(
      { follower: req.user._id, following: req.params.id },
      { $setOnInsert: { follower: req.user._id, following: req.params.id } },
      { upsert: true }
    );

    const followCounts = await getFollowCounts(req.params.id);
    res.json({ success: true, followState: { isFollowing: true }, followCounts });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Unfollow profile
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    await UserFollow.deleteOne({ follower: req.user._id, following: req.params.id });
    const followCounts = await getFollowCounts(req.params.id);
    res.json({ success: true, followState: { isFollowing: false }, followCounts });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get followers
router.get('/:id/followers', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const users = await getFollowList(req.params.id, 'followers');
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get following
router.get('/:id/following', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const users = await getFollowList(req.params.id, 'following');
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Get public profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const data = await buildProfileResponse({
      profileUserId: req.params.id,
      viewerId: req.user?._id || null,
      includePublicTests: true
    });

    if (!data) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
