const Notification = require('../models/Notification');
const UserProgress = require('../models/UserProgress');

// ─── XP curve ────────────────────────────────────────────────────────────────
//
// History: the original curve was linear — XP_PER_LEVEL = 100 for every level.
// That made level 1→2 and level 99→100 cost the same, which felt cheap once
// players got past the first dozen. Switched to a sub-linear power curve so
// early levels stay quick and later ones genuinely take work.
//
// XP needed to GO FROM level L to L+1:
//   xpForLevelGap(L) = round(BASE_XP * L ^ EXPONENT)
//
// Examples (BASE_XP=50, EXPONENT=1.2):
//   L=1   →    50 xp   (cheap onboarding)
//   L=5   →   345 xp
//   L=10  →   792 xp
//   L=25  →  2375 xp
//   L=50  →  5605 xp
//   L=100 → 12559 xp
//
// Total XP needed to reach level L from zero = sum_{k=1..L-1} xpForLevelGap(k).
//
// We expose a legacy XP_PER_LEVEL constant set to BASE_XP so any external
// reference doesn't crash, but no internal code paths use it anymore.
const BASE_XP = 50;
const EXPONENT = 1.2;
const MAX_LEVEL_LOOKUP = 500; // hard cap — beyond this we just keep extrapolating
const XP_PER_LEVEL = BASE_XP; // legacy export, no longer used internally

/** XP required to cross from level L to level L+1. */
function xpForLevelGap(level) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(BASE_XP * Math.pow(L, EXPONENT));
}

/**
 * Cumulative XP needed to *reach* `targetLevel` from zero.
 * Memoized in module scope because it's called per-render on the dashboard.
 */
const _cumulativeCache = [0, 0]; // index = level; level 1 starts at 0 xp
function cumulativeXpForLevel(targetLevel) {
  const L = Math.max(1, Math.floor(Number(targetLevel) || 1));
  while (_cumulativeCache.length <= L && _cumulativeCache.length <= MAX_LEVEL_LOOKUP + 1) {
    const prev = _cumulativeCache[_cumulativeCache.length - 1];
    const gap = xpForLevelGap(_cumulativeCache.length - 1);
    _cumulativeCache.push(prev + gap);
  }
  if (L >= _cumulativeCache.length) {
    // Above the cache cap — extrapolate linearly from the last known sum.
    const last = _cumulativeCache[_cumulativeCache.length - 1];
    const lastLevel = _cumulativeCache.length - 1;
    return last + xpForLevelGap(lastLevel) * (L - lastLevel);
  }
  return _cumulativeCache[L];
}

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
  const normalizedXp = Math.max(0, Number(xp) || 0);
  // Find the highest L such that cumulativeXpForLevel(L) <= normalizedXp.
  // Linear scan is fine — players don't realistically pass MAX_LEVEL_LOOKUP.
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= normalizedXp && level < MAX_LEVEL_LOOKUP) {
    level += 1;
  }
  return Math.max(1, level);
}

function getLevelMeta(xp = 0) {
  const normalizedXp = Math.max(0, Number(xp) || 0);
  const level = getLevelFromXp(normalizedXp);
  const levelStartXp = cumulativeXpForLevel(level);
  const xpForNextLevel = xpForLevelGap(level);
  const nextLevelXp = levelStartXp + xpForNextLevel;
  const xpIntoLevel = Math.max(0, normalizedXp - levelStartXp);
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    nextLevelXp,
    progressPercent: Math.max(
      0,
      Math.min(100, Math.round((xpIntoLevel / Math.max(1, xpForNextLevel)) * 100))
    )
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

  let xpGain = isPractice ? 30 : 70;
  if (percentage >= 80) xpGain += 35;
  if (percentage === 100) xpGain += 25;     // явная награда за идеал
  if (!sameDay) xpGain += 15;                // первая попытка дня

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
