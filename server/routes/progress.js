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

// Aliases so users don't see the same topic split across spellings/languages.
// Maps lower-cased trimmed tag → canonical display label (in Russian, since
// the dashboard's primary audience uses ru/kz). Front-end localizes if needed.
const TAG_ALIASES = {
  'kazakhstan': 'История Казахстана',
  'kz history': 'История Казахстана',
  'история казахстана': 'История Казахстана',
  'қазақстан тарихы': 'История Казахстана',
  'қазақстан': 'История Казахстана',
  'казахстан': 'История Казахстана',
  'history': 'История',
  'история': 'История',
  'тарих': 'История',
  'math': 'Математика',
  'maths': 'Математика',
  'mathematics': 'Математика',
  'математика': 'Математика',
  'математикa': 'Математика',
  'математика ': 'Математика',
  'english': 'Английский',
  'english language': 'Английский',
  'английский': 'Английский',
  'агылшын': 'Английский',
  'russian': 'Русский язык',
  'русский': 'Русский язык',
  'русский язык': 'Русский язык',
  'kazakh': 'Казахский язык',
  'қазақ тілі': 'Казахский язык',
  'казахский': 'Казахский язык',
  'physics': 'Физика',
  'физика': 'Физика',
  'chemistry': 'Химия',
  'химия': 'Химия',
  'biology': 'Биология',
  'биология': 'Биология',
  'geography': 'География',
  'география': 'География',
  'geometry': 'Геометрия',
  'геометрия': 'Геометрия',
  'literature': 'Литература',
  'литература': 'Литература'
};

function canonicalizeTag(rawTag) {
  if (!rawTag || typeof rawTag !== 'string') return null;
  const key = rawTag.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return null;
  if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  // No alias hit — fall back to a Title Case version of the original so the
  // axis label stays readable.
  return rawTag.trim().slice(0, 22);
}

router.get('/me/skills', auth, async (req, res) => {
  try {
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
      { $unwind: '$tags' }
    ]);

    if (!myAggregation.length) {
      return res.json({ skills: [] });
    }

    // 2. Bucket by canonical tag in Node (so we benefit from TAG_ALIASES merging).
    const buckets = new Map(); // canonical -> { sum, count, originals: Set }
    for (const row of myAggregation) {
      const original = row.tags;
      const canonical =
        original === '__untagged__' ? null : canonicalizeTag(original);
      if (!canonical) continue;
      const slot = buckets.get(canonical) || { sum: 0, count: 0, originals: new Set() };
      slot.sum += Number(row.percentage) || 0;
      slot.count += 1;
      slot.originals.add(original);
      buckets.set(canonical, slot);
    }
    if (!buckets.size) {
      return res.json({ skills: [] });
    }

    // 3. Platform averages — pull all results joined with tags, canonicalize,
    //    and keep only the canonical labels the user has played.
    const wantedCanonicals = new Set(buckets.keys());
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
      { $match: { 'testDoc.tags': { $exists: true, $ne: null } } },
      {
        $project: {
          percentage: 1,
          tag: '$testDoc.tags'
        }
      }
    ]);

    const globalBuckets = new Map();
    for (const row of globalAgg) {
      const canonical = canonicalizeTag(row.tag);
      if (!canonical || !wantedCanonicals.has(canonical)) continue;
      const slot = globalBuckets.get(canonical) || { sum: 0, count: 0 };
      slot.sum += Number(row.percentage) || 0;
      slot.count += 1;
      globalBuckets.set(canonical, slot);
    }

    const skills = Array.from(buckets.entries())
      .map(([canonical, slot]) => {
        const g = globalBuckets.get(canonical) || { sum: 0, count: 0 };
        return {
          tag: canonical,
          myAvg: Math.round(slot.sum / Math.max(1, slot.count)),
          myCount: slot.count,
          globalAvg: g.count > 0 ? Math.round(g.sum / g.count) : 0,
          globalCount: g.count
        };
      })
      // Surface most-played first, cap to 8 axes (radar gets unreadable beyond that).
      .sort((a, b) => b.myCount - a.myCount)
      .slice(0, 8);

    res.json({ skills });
  } catch (_err) {
    res.status(500).json({ message: 'Ошибка построения карты навыков' });
  }
});

module.exports = router;
