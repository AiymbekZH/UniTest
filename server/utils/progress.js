const Notification = require('../models/Notification');
const UserProgress = require('../models/UserProgress');

const XP_PER_LEVEL = 100;

const BADGES = {
  firstCompletion: 'first_completion',
  threeDayStreak: 'three_day_streak',
  tenCompleted: 'ten_completed',
  perfectScore: 'perfect_score',
  firstArena: 'first_arena',
  arenaWinner: 'arena_winner',
  duelWinner: 'duel_winner'
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

async function createProgressNotification(userId, type, title, message, meta = {}, link = '') {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      meta,
      link
    });
  } catch (_) {
    // Non-blocking
  }
}

function updateDailyActivity(progress, completedAt = new Date()) {
  const dayKey = getDayKey(completedAt);
  const previousDayKey = progress.lastActivityDate ? getDayKey(progress.lastActivityDate) : null;
  const sameDay = previousDayKey === dayKey;

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

  return { sameDay };
}

async function awardXpBonus({
  userId,
  xpGain = 0,
  title = '',
  message = '',
  type = 'system',
  meta = {},
  link = '',
  awardedAt = new Date()
}) {
  if (!userId || xpGain <= 0) return null;

  const progress = await ensureUserProgress(userId);
  const previousLevel = progress.level;

  progress.xp += xpGain;
  progress.level = getLevelFromXp(progress.xp);
  await progress.save();

  if (title && message) {
    await createProgressNotification(userId, type, title, message, meta, link);
  }

  if (progress.level > previousLevel) {
    await createProgressNotification(
      userId,
      'system',
      'Новый уровень',
      `Вы достигли ${progress.level} уровня в UniTest.`,
      { level: progress.level, source: meta?.source || 'bonus' },
      link
    );
  }

  return {
    progress,
    xpGain,
    leveledUp: progress.level > previousLevel,
    awardedAt
  };
}

async function awardCompletionProgress({ userId, isPractice = false, percentage = 0, completedAt = new Date() }) {
  if (!userId) return null;

  const progress = await ensureUserProgress(userId);
  const { sameDay } = updateDailyActivity(progress, completedAt);

  let xpGain = isPractice ? 25 : 50;
  if (percentage >= 80) xpGain += 25;
  if (!sameDay) xpGain += 10;

  const previousLevel = progress.level;

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

async function awardArenaProgress({
  userId,
  placement = 0,
  answeredCount = 0,
  totalQuestions = 0,
  perfect = false,
  isDuel = false,
  completedAt = new Date()
}) {
  if (!userId) return null;

  const progress = await ensureUserProgress(userId);
  const previousLevel = progress.level;
  updateDailyActivity(progress, completedAt);

  let xpGain = 0;
  if (totalQuestions > 0 && answeredCount >= Math.ceil(totalQuestions * 0.7)) xpGain += 20;
  if (placement === 1) xpGain += 40;
  else if (placement === 2) xpGain += 25;
  else if (placement === 3) xpGain += 15;
  if (isDuel && placement === 1) xpGain += 25;
  if (perfect) xpGain += 25;

  progress.xp += xpGain;
  progress.level = getLevelFromXp(progress.xp);
  if (placement > 0 && placement <= 3) {
    progress.stats.top3Finishes = (progress.stats.top3Finishes || 0) + 1;
  }

  const unlockedBadgeKeys = new Set(progress.badges.map(badge => badge.key));
  const newBadges = [];
  const unlockBadge = (key) => {
    if (unlockedBadgeKeys.has(key)) return;
    unlockedBadgeKeys.add(key);
    const badge = { key, unlockedAt: completedAt };
    progress.badges.push(badge);
    newBadges.push(badge);
  };

  unlockBadge(BADGES.firstArena);
  if (placement === 1) unlockBadge(BADGES.arenaWinner);
  if (isDuel && placement === 1) unlockBadge(BADGES.duelWinner);

  await progress.save();

  if (xpGain > 0) {
    await createProgressNotification(
      userId,
      'arena_result',
      'Результат арены',
      `Вы завершили арену и получили ${xpGain} XP.`,
      { source: 'arena', placement, isDuel },
      '/dashboard'
    );
  }

  if (progress.level > previousLevel) {
    await createProgressNotification(
      userId,
      'system',
      'Новый уровень',
      `Вы достигли ${progress.level} уровня в UniTest.`,
      { level: progress.level, source: 'arena' },
      '/dashboard'
    );
  }

  for (const badge of newBadges) {
    await createProgressNotification(
      userId,
      'system',
      'Новое достижение',
      `Разблокировано достижение: ${badge.key}`,
      { badgeKey: badge.key },
      '/dashboard'
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
  awardArenaProgress,
  awardXpBonus,
  ensureUserProgress,
  getDayKey,
  getLevelMeta,
};
