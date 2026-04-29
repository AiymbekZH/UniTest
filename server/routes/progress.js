const express = require('express');
const Result = require('../models/Result');
const UserProgress = require('../models/UserProgress');
const { auth } = require('../middleware/auth');
const { syncGamificationNotifications } = require('../utils/gamification');
const { ensureUserProgress, getDayKey, getLevelMeta } = require('../utils/progress');

const router = express.Router();

function getRecentDayKeys(days = 7) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - index - 1));
    return getDayKey(date);
  });
}

router.get('/me', auth, async (req, res) => {
  try {
    // Fire-and-forget: don't block response waiting for notification sync
    syncGamificationNotifications(req.user._id).catch(() => {});

    const progress = await ensureUserProgress(req.user._id);
    const recentResults = await Result.find({
      user: req.user._id,
      status: 'completed'
    })
      // PERF: НЕ populate `coverImage` (base64 ~500KB на тест) — 6 результатов было до 3MB.
      // UI покажет плейсхолдер вместо обложки. Для полных обложек есть /api/tests/covers.
      .populate('test', 'title shareLink settings.isPublic')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const weeklyRange = getRecentDayKeys(7);
    const weekStart = `${weeklyRange[0]}T00:00:00.000Z`;

    const weeklyRaw = await Result.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'completed',
          createdAt: { $gte: new Date(weekStart) }
        }
      },
      {
        $project: {
          dayKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: '$dayKey',
          count: { $sum: 1 }
        }
      }
    ]);

    const weeklyLookup = Object.fromEntries(weeklyRaw.map(entry => [entry._id, entry.count]));
    const weeklyActivity = weeklyRange.map(dayKey => ({
      dayKey,
      count: weeklyLookup[dayKey] || 0
    }));

    const weeklyResults = await Result.find({
      user: req.user._id,
      status: 'completed',
      createdAt: { $gte: new Date(weekStart) }
    })
      .select('test isPractice')
      .lean();

    const uniqueWeeklyTests = new Set(weeklyResults.map(result => result.test.toString())).size;
    const officialThisWeek = weeklyResults.filter(result => result.isPractice !== true).length;
    const practiceThisWeek = weeklyResults.filter(result => result.isPractice === true).length;

    res.json({
      progress: {
        xp: progress.xp,
        level: progress.level,
        currentStreakDays: progress.currentStreakDays,
        longestStreakDays: progress.longestStreakDays,
        lastActivityDate: progress.lastActivityDate,
        badges: progress.badges,
        stats: progress.stats,
        levelMeta: getLevelMeta(progress.xp)
      },
      weeklyActivity,
      weeklySummary: {
        uniqueTests: uniqueWeeklyTests,
        officialRuns: officialThisWeek,
        practiceRuns: practiceThisWeek
      },
      recentResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки прогресса' });
  }
});

// PERF: leaderboard одинаковый для всех — кешируем 60с в памяти.
let _leaderboardCache = null;
let _leaderboardCacheAt = 0;
const LEADERBOARD_CACHE_TTL = 60_000;

router.get('/leaderboard', auth, async (req, res) => {
  try {
    // Browser cache 30с — мгновенно при повторном открытии.
    res.set('Cache-Control', 'private, max-age=30');

    if (_leaderboardCache && (Date.now() - _leaderboardCacheAt) < LEADERBOARD_CACHE_TTL) {
      return res.json(_leaderboardCache);
    }

    const leaderboard = await UserProgress.find({})
      // PERF: не populate `avatar` — base64 поля по ~600KB на user. UI покажет initials.
      .populate('user', 'firstName lastName uniqueId')
      .sort({ xp: -1, updatedAt: -1 })
      .limit(10)
      .lean();

    const response = {
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        user: entry.user,
        xp: entry.xp,
        level: entry.level,
        currentStreakDays: entry.currentStreakDays
      }))
    };
    _leaderboardCache = response;
    _leaderboardCacheAt = Date.now();
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки таблицы прогресса' });
  }
});

module.exports = router;
