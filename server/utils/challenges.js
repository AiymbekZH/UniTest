const { getDayKey } = require('./progress');

const DAILY_CHALLENGE_XP = 40;
const WEEKLY_SPRINT_XP = 120;
const WEEKLY_SPRINT_GOAL = 3;

function stableHash(value = '') {
  return String(value).split('').reduce((hash, char) => {
    const next = ((hash << 5) - hash) + char.charCodeAt(0);
    return next & next;
  }, 0);
}

function rotateSelection(items, seed, count = 1) {
  if (!items.length) return [];
  const startIndex = Math.abs(seed) % items.length;
  return Array.from(
    { length: Math.min(count, items.length) },
    (_, offset) => items[(startIndex + offset) % items.length]
  );
}

function getWeekStartKey(date = new Date()) {
  const utc = new Date(date);
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  utc.setUTCHours(0, 0, 0, 0);
  return getDayKey(utc);
}

function getNextDailyResetAt(date = new Date()) {
  const utc = new Date(date);
  utc.setUTCHours(24, 0, 0, 0);
  return utc;
}

function getNextWeeklyResetAt(date = new Date()) {
  const utc = new Date(date);
  const day = utc.getUTCDay() || 7;
  const daysUntilNextMonday = 8 - day;
  utc.setUTCDate(utc.getUTCDate() + daysUntilNextMonday);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function buildChallengeKey(type, periodKey) {
  return `${type}:${periodKey}`;
}

function selectDailyChallenge(tests = [], userId = '', date = new Date()) {
  if (!tests.length || !userId) return null;
  const todayKey = getDayKey(date);
  const seed = stableHash(`${userId}:${todayKey}`);
  const [test] = rotateSelection(tests, seed, 1);

  if (!test) return null;

  return {
    challengeKey: buildChallengeKey('daily', todayKey),
    rewardXp: DAILY_CHALLENGE_XP,
    periodKey: todayKey,
    test
  };
}

function selectWeeklySprint(tests = [], userId = '', date = new Date()) {
  if (!tests.length || !userId) return null;
  const weekKey = getWeekStartKey(date);
  const goalCount = Math.min(WEEKLY_SPRINT_GOAL, tests.length);

  if (!goalCount) return null;

  const seed = stableHash(`${userId}:${weekKey}`);
  const selectedTests = rotateSelection(tests, seed, goalCount);

  return {
    challengeKey: buildChallengeKey('weekly', weekKey),
    rewardXp: WEEKLY_SPRINT_XP,
    periodKey: weekKey,
    goalCount,
    tests: selectedTests
  };
}

module.exports = {
  DAILY_CHALLENGE_XP,
  WEEKLY_SPRINT_XP,
  WEEKLY_SPRINT_GOAL,
  buildChallengeKey,
  getNextDailyResetAt,
  getNextWeeklyResetAt,
  getWeekStartKey,
  rotateSelection,
  selectDailyChallenge,
  selectWeeklySprint,
  stableHash
};
