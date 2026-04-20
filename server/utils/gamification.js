const Notification = require('../models/Notification');
const Result = require('../models/Result');
const Test = require('../models/Test');
const { selectDailyChallenge } = require('./challenges');
const { ensureUserProgress, getDayKey } = require('./progress');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getUtcDayDiff(fromDate, toDate) {
  if (!fromDate || !toDate) return null;

  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(0, 0, 0, 0);

  return Math.round((to.getTime() - from.getTime()) / ONE_DAY_MS);
}

async function createDedupedNotification({
  userId,
  dedupeKey,
  type,
  title,
  message,
  link = '',
  meta = {}
}) {
  if (!userId || !dedupeKey) return false;

  try {
    const updateResult = await Notification.updateOne(
      { user: userId, dedupeKey },
      {
        $setOnInsert: {
          user: userId,
          dedupeKey,
          type,
          title,
          message,
          link,
          meta
        }
      },
      { upsert: true }
    );

    return updateResult.upsertedCount > 0;
  } catch (_) {
    return false;
  }
}

async function ensureDailyChallengeAvailableNotification(userId, publicTests, now) {
  if (!userId || !publicTests.length) return;

  const todayKey = getDayKey(now);
  const dailyChallenge = selectDailyChallenge(publicTests, userId.toString(), now);
  if (!dailyChallenge) return;

  const alreadyCompleted = await Result.exists({
    user: userId,
    test: dailyChallenge.test._id,
    status: 'completed',
    createdAt: { $gte: new Date(`${todayKey}T00:00:00.000Z`) }
  });

  if (alreadyCompleted) return;

  await createDedupedNotification({
    userId,
    dedupeKey: `daily-available:${todayKey}`,
    type: 'challenge_available',
    title: 'Новый челлендж дня',
    message: `Сегодня в фокусе: ${dailyChallenge.test.title}. Пройдите его и заберите ${dailyChallenge.rewardXp} XP.`,
    link: '/dashboard',
    meta: {
      kind: 'daily_available',
      periodKey: todayKey,
      challengeKey: dailyChallenge.challengeKey,
      rewardXp: dailyChallenge.rewardXp,
      testId: dailyChallenge.test._id,
      shareLink: dailyChallenge.test.shareLink
    }
  });
}

async function ensureStreakRiskNotification(userId, progress, now) {
  if (!userId || !progress?.lastActivityDate || !progress?.currentStreakDays) return;

  const dayDiff = getUtcDayDiff(progress.lastActivityDate, now);
  if (dayDiff !== 1) return;

  const dayKey = getDayKey(now);
  await createDedupedNotification({
    userId,
    dedupeKey: `streak-risk:${dayKey}`,
    type: 'streak_risk',
    title: 'Серия на грани',
    message: `Сегодня нужно завершить любой тест, иначе серия ${progress.currentStreakDays} дн. сгорит.`,
    link: '/dashboard',
    meta: {
      kind: 'streak_risk',
      dayKey,
      currentStreakDays: progress.currentStreakDays
    }
  });
}

async function syncGamificationNotifications(userId, now = new Date()) {
  if (!userId) return;

  try {
    const [progress, publicTests] = await Promise.all([
      ensureUserProgress(userId),
      Test.find({
        isDeleted: { $ne: true },
        'settings.isPublic': true
      })
        .sort({ rating: -1, attemptCount: -1, createdAt: -1 })
        .select('_id title shareLink')
        .lean()
    ]);

    await Promise.all([
      ensureDailyChallengeAvailableNotification(userId, publicTests, now),
      ensureStreakRiskNotification(userId, progress, now)
    ]);
  } catch (_) {
    // Non-blocking by design
  }
}

module.exports = {
  syncGamificationNotifications
};
