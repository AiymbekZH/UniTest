const express = require('express');
const ChallengeReward = require('../models/ChallengeReward');
const Result = require('../models/Result');
const Test = require('../models/Test');
const { auth } = require('../middleware/auth');
const { getDayKey } = require('../utils/progress');
const {
  getNextDailyResetAt,
  getNextWeeklyResetAt,
  getWeekStartKey,
  selectDailyChallenge,
  selectWeeklySprint
} = require('../utils/challenges');

const router = express.Router();

// Cache public tests for challenge selection (refreshes every 10 min)
let _challengeTestsCache = null;
let _challengeTestsCacheAt = 0;
const CHALLENGE_CACHE_MS = 10 * 60 * 1000;

async function _getCachedChallengeTests() {
  const now = Date.now();
  if (_challengeTestsCache && (now - _challengeTestsCacheAt) < CHALLENGE_CACHE_MS) {
    return _challengeTestsCache;
  }
  _challengeTestsCache = await Test.find({
    isDeleted: false,
    'settings.isPublic': true
  })
    // PERF: НЕ populate `avatar` (base64 ~600KB) — кешируем 200 тестов в памяти,
    // с avatar = 120MB кеша + до 1.2MB на каждый ответ /challenges/active.
    .populate('creator', 'firstName lastName')
    .sort({ rating: -1, attemptCount: -1, createdAt: -1 })
    .select('title shareLink totalPoints rating questions creator settings')
    .limit(200)
    .lean();
  _challengeTestsCacheAt = now;
  return _challengeTestsCache;
}

router.get('/active', auth, async (req, res) => {
  try {
    const now = new Date();
    const baseMeta = {
      serverNow: now.toISOString(),
      dailyResetAt: getNextDailyResetAt(now).toISOString(),
      weeklyResetAt: getNextWeeklyResetAt(now).toISOString()
    };

    // Use cached public tests to avoid full collection scan on every load.
    // The gamification cache also uses this same pattern.
    const tests = await _getCachedChallengeTests();

    if (tests.length === 0) {
      return res.json({ ...baseMeta, dailyChallenge: null, weeklySprint: null });
    }

    const todayKey = getDayKey();
    const weekKey = getWeekStartKey();
    const dailyChallengeBase = selectDailyChallenge(tests, req.user._id.toString(), now);
    const weeklySprintBase = selectWeeklySprint(tests, req.user._id.toString(), now);

    if (!dailyChallengeBase && !weeklySprintBase) {
      return res.json({ ...baseMeta, dailyChallenge: null, weeklySprint: null });
    }

    const rewardKeys = [
      dailyChallengeBase?.challengeKey,
      weeklySprintBase?.challengeKey
    ].filter(Boolean);

    const [dailyResults, weeklyResults, claimedRewards] = await Promise.all([
      dailyChallengeBase ? Result.find({
        user: req.user._id,
        status: 'completed',
        createdAt: { $gte: new Date(`${todayKey}T00:00:00.000Z`) }
      }).select('test').lean() : [],
      Result.find({
        user: req.user._id,
        status: 'completed',
        createdAt: { $gte: new Date(`${weekKey}T00:00:00.000Z`) }
      }).select('test').lean(),
      rewardKeys.length > 0
        ? ChallengeReward.find({
            user: req.user._id,
            challengeKey: { $in: rewardKeys }
          }).select('challengeKey awardedAt').lean()
        : []
    ]);

    const dailyCompletedTestIds = new Set(dailyResults.map(result => result.test?.toString()));
    const weeklyCompletedTestIds = new Set(weeklyResults.map(result => result.test?.toString()));
    const rewardLookup = new Map(claimedRewards.map(reward => [reward.challengeKey, reward]));

    const dailyChallenge = dailyChallengeBase ? {
      ...dailyChallengeBase,
      completed: dailyCompletedTestIds.has(dailyChallengeBase.test._id.toString()),
      rewardClaimed: rewardLookup.has(dailyChallengeBase.challengeKey),
      claimedAt: rewardLookup.get(dailyChallengeBase.challengeKey)?.awardedAt || null
    } : null;

    if (dailyChallenge) {
      dailyChallenge.rewardReady = dailyChallenge.completed && !dailyChallenge.rewardClaimed;
    }

    const weeklyCompletedCount = weeklySprintBase
      ? weeklySprintBase.tests.filter(test => weeklyCompletedTestIds.has(test._id.toString())).length
      : 0;

    const weeklySprint = weeklySprintBase ? {
      ...weeklySprintBase,
      completedCount: weeklyCompletedCount,
      completed: weeklyCompletedCount >= weeklySprintBase.goalCount,
      completedTestIds: weeklySprintBase.tests
        .filter(test => weeklyCompletedTestIds.has(test._id.toString()))
        .map(test => test._id.toString()),
      rewardClaimed: rewardLookup.has(weeklySprintBase.challengeKey),
      claimedAt: rewardLookup.get(weeklySprintBase.challengeKey)?.awardedAt || null
    } : null;

    if (weeklySprint) {
      weeklySprint.rewardReady = weeklySprint.completed && !weeklySprint.rewardClaimed;
    }

    res.json({
      ...baseMeta,
      dailyChallenge,
      weeklySprint
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки челленджей' });
  }
});

module.exports = router;
