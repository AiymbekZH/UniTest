const Notification = require('../models/Notification');
const UserProgress = require('../models/UserProgress');

const XP_PER_LEVEL = 100;

const BADGES = {
  firstCompletion: 'first_completion',
  threeDayStreak: 'three_day_streak',
  tenCompleted: 'ten_completed',
  perfectScore: 'perfect_score'
};

function getDayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function dayKeyToUtcDate(dayKey) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function getDayDiff(previousDayKey, nextDayKey) {
  if (!previousDayKey || !nextDayKey) return null;
  const diffMs = dayKeyToUtcDate(nextDayKey).getTime() - dayKeyToUtcDate(previousDayKey).getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function getLevelFromXp(xp = 0) {
  return Math.max(1, Math.floor((Number(xp) || 0) / XP_PER_LEVEL) + 1);
}

function getLevelMeta(xp = 0) {
  const normalizedXp = Math.max(0, Number(xp) || 0);
  const level = getLevelFromXp(normalizedXp);
  const levelStartXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel: normalizedXp - levelStartXp,
    xpForNextLevel: XP_PER_LEVEL,
    nextLevelXp,
    progressPercent: Math.max(0, Math.min(100, Math.round(((normalizedXp - levelStartXp) / XP_PER_LEVEL) * 100)))
  };
}

async function ensureUserProgress(userId) {
  let progress = await UserProgress.findOne({ user: userId });
  if (!progress) {
    progress = await UserProgress.create({ user: userId });
  }
  return progress;
}

async function createProgressNotification(userId, type, title, message, meta = {}) {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      meta
    });
  } catch (_) {
    // Non-blocking
  }
}

async function awardCompletionProgress({ userId, isPractice = false, percentage = 0, completedAt = new Date() }) {
  if (!userId) return null;

  const progress = await ensureUserProgress(userId);
  const dayKey = getDayKey(completedAt);
  const previousDayKey = progress.lastActivityDate ? getDayKey(progress.lastActivityDate) : null;
  const sameDay = previousDayKey === dayKey;

  let xpGain = isPractice ? 25 : 50;
  if (percentage >= 80) xpGain += 25;
  if (!sameDay) xpGain += 10;

  const previousLevel = progress.level;

  if (!sameDay) {
    const dayDiff = getDayDiff(previousDayKey, dayKey);
    if (dayDiff === 1) {
      progress.currentStreakDays += 1;
    } else {
      progress.currentStreakDays = 1;
    }
    progress.longestStreakDays = Math.max(progress.longestStreakDays, progress.currentStreakDays);
    progress.lastActivityDate = completedAt;
  } else if (!progress.lastActivityDate) {
    progress.lastActivityDate = completedAt;
    progress.currentStreakDays = Math.max(progress.currentStreakDays, 1);
    progress.longestStreakDays = Math.max(progress.longestStreakDays, progress.currentStreakDays);
  }

  progress.xp += xpGain;
  progress.level = getLevelFromXp(progress.xp);
  progress.stats.totalCompleted += 1;
  if (isPractice) progress.stats.completedPracticeRuns += 1;
  else progress.stats.completedExams += 1;
  if (percentage === 100) progress.stats.perfectScores += 1;

  const unlockedBadgeKeys = new Set(progress.badges.map(badge => badge.key));
  const newBadges = [];

  const unlockBadge = (key) => {
    if (unlockedBadgeKeys.has(key)) return;
    unlockedBadgeKeys.add(key);
    const badge = { key, unlockedAt: completedAt };
    progress.badges.push(badge);
    newBadges.push(badge);
  };

  if (progress.stats.totalCompleted >= 1) unlockBadge(BADGES.firstCompletion);
  if (progress.currentStreakDays >= 3) unlockBadge(BADGES.threeDayStreak);
  if (progress.stats.totalCompleted >= 10) unlockBadge(BADGES.tenCompleted);
  if (percentage === 100) unlockBadge(BADGES.perfectScore);

  await progress.save();

  if (progress.level > previousLevel) {
    await createProgressNotification(
      userId,
      'system',
      'Новый уровень',
      `Вы достигли ${progress.level} уровня в UniTest.`,
      { level: progress.level }
    );
  }

  for (const badge of newBadges) {
    await createProgressNotification(
      userId,
      'system',
      'Новое достижение',
      `Разблокировано достижение: ${badge.key}`,
      { badgeKey: badge.key }
    );
  }

  return {
    progress,
    xpGain,
    newBadges,
    leveledUp: progress.level > previousLevel
  };
}

module.exports = {
  BADGES,
  XP_PER_LEVEL,
  awardCompletionProgress,
  ensureUserProgress,
  getDayKey,
  getLevelMeta,
};
