const express = require('express');
const Result = require('../models/Result');
const Test = require('../models/Test');
const { auth } = require('../middleware/auth');
const { getDayKey } = require('../utils/progress');

const router = express.Router();

function stableHash(value = '') {
  return String(value).split('').reduce((hash, char) => {
    const next = ((hash << 5) - hash) + char.charCodeAt(0);
    return next & next;
  }, 0);
}

function getWeekStartKey(date = new Date()) {
  const utc = new Date(date);
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  utc.setUTCHours(0, 0, 0, 0);
  return getDayKey(utc);
}

function rotateSelection(items, seed, count = 1) {
  if (!items.length) return [];
  const startIndex = Math.abs(seed) % items.length;
  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => items[(startIndex + offset) % items.length]);
}

router.get('/active', auth, async (req, res) => {
  try {
    const tests = await Test.find({
      isDeleted: { $ne: true },
      'settings.isPublic': true
    })
      .populate('creator', 'firstName lastName avatar')
      .sort({ rating: -1, attemptCount: -1, createdAt: -1 })
      .select('title shareLink coverImage totalPoints rating questions creator settings')
      .lean();

    if (tests.length === 0) {
      return res.json({ dailyChallenge: null, weeklySprint: null });
    }

    const todayKey = getDayKey();
    const weekKey = getWeekStartKey();
    const dailySeed = stableHash(`${req.user._id}:${todayKey}`);
    const weekSeed = stableHash(`${req.user._id}:${weekKey}`);

    const [dailyTest] = rotateSelection(tests, dailySeed, 1);
    const weeklyTests = rotateSelection(
      tests.filter(test => test._id.toString() !== dailyTest?._id?.toString()),
      weekSeed,
      3
    );

    const [dailyResults, weeklyResults] = await Promise.all([
      dailyTest ? Result.find({
        user: req.user._id,
        test: dailyTest._id,
        status: 'completed',
        createdAt: { $gte: new Date(`${todayKey}T00:00:00.000Z`) }
      }).select('_id').lean() : [],
      Result.find({
        user: req.user._id,
        status: 'completed',
        createdAt: { $gte: new Date(`${weekKey}T00:00:00.000Z`) }
      }).select('test').lean()
    ]);

    const uniqueWeeklyTests = new Set(weeklyResults.map(result => result.test.toString()));

    res.json({
      dailyChallenge: dailyTest ? {
        challengeKey: `daily:${todayKey}`,
        rewardXp: 40,
        completed: dailyResults.length > 0,
        test: dailyTest
      } : null,
      weeklySprint: {
        challengeKey: `weekly:${weekKey}`,
        rewardXp: 120,
        goalCount: 3,
        completedCount: Math.min(3, uniqueWeeklyTests.size),
        completed: uniqueWeeklyTests.size >= 3,
        tests: weeklyTests
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки челленджей' });
  }
});

module.exports = router;
