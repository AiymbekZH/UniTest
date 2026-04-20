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

router.get('/active', auth, async (req, res) => {
  try {
    const now = new Date();
    const baseMeta = {
      serverNow: now.toISOString(),
      dailyResetAt: getNextDailyResetAt(now).toISOString(),
      weeklyResetAt: getNextWeeklyResetAt(now).toISOString()
    };

    const tests = await Test.find({
      isDeleted: { $ne: true },
      'settings.isPublic': true
    })
      .populate('creator', 'firstName lastName avatar')
      .sort({ rating: -1, attemptCount: -1, createdAt: -1 })
      .select('title shareLink coverImage totalPoints rating questions creator settings')
      .lean();

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
