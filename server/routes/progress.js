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
        // Recompute from xp under the current curve (stored level may lag).
        level: getLevelMeta(progress.xp).level,
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
    // Vary: Cookie — чтобы после logout/смены аккаунта не отдавалась чужая версия.
    res.set('Cache-Control', 'private, max-age=30');
    res.set('Vary', 'Cookie, Authorization');

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
        // Recompute from XP rather than trusting the stored `entry.level`,
        // because the XP curve may have been adjusted server-side without a
        // bulk migration. getLevelMeta uses the current curve.
        level: getLevelMeta(entry.xp).level,
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

// ─── Skill Radar — per-tag breakdown ─────────────────────────────────────────
//
// Aggregates the player's completed Results grouped by Test.tags. For each
// tag returns: my average percentage, my run count, plus the platform-wide
// average percentage on tests that share that tag. Front-end renders a radar
// chart showing the player vs. the global average.
//
// Caveat: tests without tags fall under the "Без темы / Untagged" bucket so
// users with un-tagged tests still see something on the chart.
router.get('/me/skills', auth, async (req, res) => {
  try {
    const Test = require('../models/Test');

    // 1. Player's results joined with their test's tags.
    const myAggregation = await Result.aggregate([
      { $match: { user: req.user._id, status: 'completed' } },
      {
        $lookup: {
          from: 'tests',
          localField: 'test',
          foreignField: '_id',
          as: 'testDoc'
        }
      },
      { $unwind: { path: '$testDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          percentage: 1,
          tags: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$testDoc.tags', []] } }, 0] },
              '$testDoc.tags',
              ['__untagged__']
            ]
          }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          myAvg: { $avg: '$percentage' },
          myCount: { $sum: 1 }
        }
      }
    ]);

    if (!myAggregation.length) {
      return res.json({ skills: [] });
    }

    // 2. Platform averages for the same tags.
    const tagList = myAggregation.map((r) => r._id).filter((t) => t !== '__untagged__');
    let globalLookup = {};
    if (tagList.length) {
      const globalAgg = await Result.aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: {
            from: 'tests',
            localField: 'test',
            foreignField: '_id',
            as: 'testDoc'
          }
        },
        { $unwind: { path: '$testDoc', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$testDoc.tags', preserveNullAndEmptyArrays: true } },
        { $match: { 'testDoc.tags': { $in: tagList } } },
        {
          $group: {
            _id: '$testDoc.tags',
            globalAvg: { $avg: '$percentage' },
            globalCount: { $sum: 1 }
          }
        }
      ]);
      globalLookup = Object.fromEntries(
        globalAgg.map((g) => [g._id, { avg: g.globalAvg, count: g.globalCount }])
      );
    }

    const skills = myAggregation
      .map((entry) => ({
        tag: entry._id === '__untagged__' ? '' : entry._id,
        myAvg: Math.round(entry.myAvg || 0),
        myCount: entry.myCount,
        globalAvg: Math.round(globalLookup[entry._id]?.avg || 0),
        globalCount: globalLookup[entry._id]?.count || 0
      }))
      // Surface the most-played tags first, cap to 8 axes (radar gets unreadable beyond that).
      .sort((a, b) => b.myCount - a.myCount)
      .slice(0, 8);

    res.json({ skills });
  } catch (_err) {
    res.status(500).json({ message: 'Ошибка построения карты навыков' });
  }
});

module.exports = router;
