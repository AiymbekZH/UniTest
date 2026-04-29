const express = require('express');
const ChallengeReward = require('../models/ChallengeReward');
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { notifyTestCompletion } = require('../utils/mailer');
const { awardCompletionProgress, awardXpBonus, getDayKey } = require('../utils/progress');
const { getWeekStartKey, selectDailyChallenge, selectWeeklySprint } = require('../utils/challenges');

const router = express.Router();
const SUPPORTED_TRANSLATION_LANGUAGES = ['en', 'ru', 'kz', 'es'];

function buildOfficialResultMatch(testId) {
  return {
    test: testId,
    status: 'completed',
    isPractice: { $ne: true }
  };
}

async function recalculateOfficialTestStats(test) {
  const officialMatch = buildOfficialResultMatch(test._id);
  const [stats] = await Result.aggregate([
    { $match: officialMatch },
    {
      $group: {
        _id: null,
        avg: { $avg: '$percentage' },
        count: { $sum: 1 }
      }
    }
  ]);

  test.attemptCount = stats?.count || 0;
  test.averageScore = Math.round(stats?.avg || 0);
  await test.save();
}

async function awardChallengeRewards({ userId, resultId, completedAt = new Date() }) {
  if (!userId) return [];

  const challengeTests = await Test.find({
    isDeleted: { $ne: true },
    'settings.isPublic': true
  })
    .sort({ rating: -1, attemptCount: -1, createdAt: -1 })
    .select('title shareLink')
    .lean();

  if (!challengeTests.length) return [];

  const dailyChallenge = selectDailyChallenge(challengeTests, userId.toString(), completedAt);
  const weeklySprint = selectWeeklySprint(challengeTests, userId.toString(), completedAt);
  const todayKey = getDayKey(completedAt);
  const weekKey = getWeekStartKey(completedAt);

  const [dailyResults, weeklyResults] = await Promise.all([
    dailyChallenge
      ? Result.find({
          user: userId,
          status: 'completed',
          createdAt: { $gte: new Date(`${todayKey}T00:00:00.000Z`) }
        }).select('test').lean()
      : [],
    weeklySprint
      ? Result.find({
          user: userId,
          status: 'completed',
          createdAt: { $gte: new Date(`${weekKey}T00:00:00.000Z`) }
        }).select('test').lean()
      : []
  ]);

  const awardedRewards = [];
  const dailyCompletedTestIds = new Set(dailyResults.map(result => result.test?.toString()));
  const weeklyCompletedTestIds = new Set(weeklyResults.map(result => result.test?.toString()));

  if (dailyChallenge && dailyCompletedTestIds.has(dailyChallenge.test._id.toString())) {
    const upsertResult = await ChallengeReward.updateOne(
      { user: userId, challengeKey: dailyChallenge.challengeKey },
      {
        $setOnInsert: {
          challengeType: 'daily',
          rewardXp: dailyChallenge.rewardXp,
          awardedAt: completedAt,
          relatedTestIds: [dailyChallenge.test._id],
          result: resultId || null
        }
      },
      { upsert: true }
    );

    if (upsertResult.upsertedCount > 0) {
      await awardXpBonus({
        userId,
        xpGain: dailyChallenge.rewardXp,
        type: 'challenge_available',
        title: 'Награда за челлендж дня',
        message: `Вы завершили челлендж дня и получили ${dailyChallenge.rewardXp} XP.`,
        meta: {
          source: 'challenge',
          challengeType: 'daily',
          challengeKey: dailyChallenge.challengeKey
        },
        link: '/dashboard',
        awardedAt: completedAt
      });

      awardedRewards.push({
        challengeKey: dailyChallenge.challengeKey,
        challengeType: 'daily',
        rewardXp: dailyChallenge.rewardXp
      });
    }
  }

  if (weeklySprint) {
    const weeklyCompletedCount = weeklySprint.tests
      .filter(test => weeklyCompletedTestIds.has(test._id.toString()))
      .length;

    if (weeklyCompletedCount >= weeklySprint.goalCount) {
      const upsertResult = await ChallengeReward.updateOne(
        { user: userId, challengeKey: weeklySprint.challengeKey },
        {
          $setOnInsert: {
            challengeType: 'weekly',
            rewardXp: weeklySprint.rewardXp,
            awardedAt: completedAt,
            relatedTestIds: weeklySprint.tests.map(test => test._id),
            result: resultId || null
          }
        },
        { upsert: true }
      );

      if (upsertResult.upsertedCount > 0) {
        await awardXpBonus({
          userId,
          xpGain: weeklySprint.rewardXp,
          type: 'challenge_available',
          title: 'Награда за недельный спринт',
          message: `Вы закрыли недельный спринт и получили ${weeklySprint.rewardXp} XP.`,
          meta: {
            source: 'challenge',
            challengeType: 'weekly',
            challengeKey: weeklySprint.challengeKey
          },
          link: '/dashboard',
          awardedAt: completedAt
        });

        awardedRewards.push({
          challengeKey: weeklySprint.challengeKey,
          challengeType: 'weekly',
          rewardXp: weeklySprint.rewardXp
        });
      }
    }
  }

  return awardedRewards;
}

function normalizeFreeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function getAcceptedFillBlankAnswers(question) {
  const values = new Set();
  const addValue = (candidate) => {
    const normalized = normalizeFreeText(candidate);
    if (normalized) values.add(normalized);
  };

  addValue(question.correctAnswer);

  for (const lang of SUPPORTED_TRANSLATION_LANGUAGES) {
    addValue(question.translations?.[lang]?.correctAnswer);
  }

  return values;
}

function gradeAnswers(test, answers = []) {
  const usePartialCredit = test.settings?.partialCredit === true;
  let score = 0;
  let variantTotalPoints = 0;

  const gradedAnswers = answers.map(answer => {
    const question = test.questions.find(q => q.id === answer.questionId);
    if (!question) return { ...answer, isCorrect: false, pointsEarned: 0 };

    variantTotalPoints += question.points;

    let isCorrect = false;
    let pointsEarned = 0;

    let userAnswer = '';
    if (answer.selectedOptions?.length > 0) {
      userAnswer = answer.selectedOptions.map(optId => {
        const opt = question.options.find(o => o.id === optId);
        return opt ? opt.text : optId;
      }).join(', ');
    } else if (answer.textAnswer) {
      userAnswer = answer.textAnswer;
    }

    const baseAnswer = {
      ...answer,
      type: question.type,
      questionText: question.questionText,
      maxPoints: question.points,
      userAnswer
    };

    switch (question.type) {
      case 'single-choice': {
        const correctOpt = question.options.find(o => o.isCorrect);
        isCorrect = correctOpt && answer.selectedOptions[0] === correctOpt.id;
        break;
      }
      case 'multiple-choice': {
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id).sort();
        const selectedIds = (answer.selectedOptions || []).sort();
        isCorrect = correctIds.length === selectedIds.length &&
          correctIds.every((id, i) => id === selectedIds[i]);

        if (!isCorrect && usePartialCredit && correctIds.length > 0) {
          const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
          const wrongSelected = selectedIds.filter(id => !correctIds.includes(id)).length;
          const ratio = Math.max(0, (correctSelected - wrongSelected) / correctIds.length);
          if (ratio > 0) {
            pointsEarned = Math.round(question.points * ratio * 100) / 100;
            score += pointsEarned;
            return { ...baseAnswer, isCorrect: false, pointsEarned };
          }
        }
        break;
      }
      case 'true-false': {
        const correctOpt = question.options.find(o => o.isCorrect);
        isCorrect = correctOpt && answer.selectedOptions[0] === correctOpt.id;
        break;
      }
      case 'matching': {
        const correctPairs = question.options.reduce((acc, o) => {
          if (o.matchPair) acc[o.id] = o.matchPair;
          return acc;
        }, {});
        const userPairs = (answer.matchingPairs || []).reduce((acc, p) => {
          acc[p.left] = p.right;
          return acc;
        }, {});
        isCorrect = Object.keys(correctPairs).length === Object.keys(userPairs).length &&
          Object.entries(correctPairs).every(([k, v]) => userPairs[k] === v);

        if (!isCorrect && usePartialCredit && Object.keys(correctPairs).length > 0) {
          const totalPairs = Object.keys(correctPairs).length;
          const correctCount = Object.entries(correctPairs).filter(([k, v]) => userPairs[k] === v).length;
          const ratio = correctCount / totalPairs;
          if (ratio > 0) {
            pointsEarned = Math.round(question.points * ratio * 100) / 100;
            score += pointsEarned;
            return { ...baseAnswer, isCorrect: false, pointsEarned };
          }
        }
        break;
      }
      case 'fill-blank': {
        const acceptedAnswers = getAcceptedFillBlankAnswers(question);
        isCorrect = acceptedAnswers.has(normalizeFreeText(answer.textAnswer));
        break;
      }
      case 'essay': {
        return { ...baseAnswer, isCorrect: false, pointsEarned: 0 };
      }
    }

    if (isCorrect) {
      pointsEarned = question.points;
      score += pointsEarned;
    }

    return { ...baseAnswer, isCorrect, pointsEarned };
  });

  return {
    gradedAnswers,
    score,
    totalPoints: variantTotalPoints > 0 ? variantTotalPoints : test.totalPoints
  };
}

// Submit test result
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { testId, answers, guestName, guestId, violations, timeSpent, variantNumber, sessionId, isPractice = false } = req.body;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    if (sessionId) {
      const existingResult = await Result.findOne({ test: testId, sessionId, status: 'completed' });
      if (existingResult) {
        return res.json(existingResult);
      }
    }

    if (!isPractice && test.settings?.maxAttempts > 0) {
      const query = { test: testId, status: 'completed' };
      if (req.user?._id) {
        query.user = req.user._id;
      } else if (guestId) {
        query.guestId = guestId;
      } else if (guestName) {
        query.guestName = guestName;
      }
      const existingAttempts = await Result.countDocuments(query);
      if (existingAttempts >= test.settings.maxAttempts) {
        return res.status(400).json({ message: `Превышен лимит попыток (${test.settings.maxAttempts})` });
      }
    }

    const { gradedAnswers, score, totalPoints } = gradeAnswers(test, answers);

    const result = new Result({
      test: testId,
      user: req.user?._id || null,
      guestName: !req.user ? guestName : '',
      guestId: !req.user ? (guestId || '') : '',
      sessionId: sessionId || '',
      isPractice: isPractice === true,
      variantNumber: variantNumber || 0,
      answers: gradedAnswers,
      score,
      totalPoints,
      violations: violations || [],
      timeSpent: timeSpent || 0,
      completedAt: new Date(),
      status: 'completed'
    });

    await result.save();

    if (!result.isPractice) {
      await recalculateOfficialTestStats(test);
    }

    await awardCompletionProgress({
      userId: req.user?._id || null,
      isPractice: result.isPractice,
      percentage: result.percentage,
      completedAt: result.completedAt || new Date()
    });

    await awardChallengeRewards({
      userId: req.user?._id || null,
      resultId: result._id,
      completedAt: result.completedAt || new Date()
    });

    // Email notification to test creator — only for PRIVATE tests (non-blocking)
    // Public tests skip email to avoid spamming teacher's inbox
    if (!result.isPractice && !test.settings?.isPublic) {
      try {
        const creator = await User.findById(test.creator);
        if (creator?.email) {
          const studentName = req.user
            ? `${req.user.lastName} ${req.user.firstName}`
            : (guestName || 'Гость');
          const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
          notifyTestCompletion({
            teacherEmail: creator.email,
            teacherName: creator.firstName,
            studentName,
            testTitle: test.title,
            score,
            totalPoints,
            percentage,
          }).catch(() => {}); // fire-and-forget
        }
      } catch (_) { /* email errors should never break result submission */ }
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сохранения результата' });
  }
});

// Report violation during test
router.post('/violation', optionalAuth, async (req, res) => {
  try {
    const { resultId, violation } = req.body;
    const result = await Result.findById(resultId);
    if (!result) return res.status(404).json({ message: 'Результат не найден' });

    result.violations.push(violation);
    await result.save();

    res.json({ violationCount: result.violationCount });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Get results for a test (for test creator)
router.get('/test/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const results = await Result.find(buildOfficialResultMatch(req.params.testId))
      .populate('user', 'firstName lastName email role avatar username uniqueId')
      .sort({ percentage: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения результатов' });
  }
});

// Get my results
router.get('/my', auth, async (req, res) => {
  try {
    const results = await Result.find({ user: req.user._id })
      .populate('test', 'title description totalPoints')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения результатов' });
  }
});

// Grade essay answer (teacher only)
router.put('/:resultId/grade-essay', auth, async (req, res) => {
  try {
    const { questionId, points, feedback } = req.body;
    const result = await Result.findById(req.params.resultId);
    if (!result) return res.status(404).json({ message: 'Результат не найден' });

    const test = await Test.findById(result.test);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    // Only test creator (teacher) can grade
    if (test.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель теста может оценивать эссе' });
    }

    const question = test.questions.find(q => q.id === questionId);
    if (!question || question.type !== 'essay') {
      return res.status(400).json({ message: 'Вопрос не найден или не является эссе' });
    }

    // Update the answer
    const answer = result.answers.find(a => a.questionId === questionId);
    if (!answer) return res.status(404).json({ message: 'Ответ не найден' });

    const oldPoints = answer.pointsEarned;
    answer.pointsEarned = Math.min(points, question.points);
    answer.isCorrect = answer.pointsEarned > 0;
    if (feedback) answer.feedback = feedback;

    // Recalculate total score
    result.score = result.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
    await result.save();

    // Update test average
    if (!result.isPractice) {
      await recalculateOfficialTestStats(test);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка оценивания' });
  }
});

// Public leaderboard for a test (no auth needed)
router.get('/leaderboard/:testId', async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).select('title settings totalPoints');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const results = await Result.find(buildOfficialResultMatch(req.params.testId))
      .populate('user', 'firstName lastName avatar username uniqueId')
      .sort({ percentage: -1, timeSpent: 1 })
      .select('user guestName percentage score totalPoints timeSpent completedAt')
      .limit(100);

    // Deduplicate: keep best result per user/guest (by name comparison too)
    const seen = new Map();
    for (const r of results) {
      // Primary key: user ID if authenticated, else guestName
      const key = r.user ? r.user._id.toString() : (r.guestName || 'anonymous');
      // Also create a name key to deduplicate guests with same name as registered users
      const nameKey = r.user 
        ? `${r.user.lastName} ${r.user.firstName}`.trim().toLowerCase() 
        : (r.guestName || 'anonymous').trim().toLowerCase();
      
      if (!seen.has(key) && !seen.has(`name:${nameKey}`)) {
        seen.set(key, r);
        seen.set(`name:${nameKey}`, r);
      }
    }
    // Filter only actual results (skip name: entries)
    const uniqueResults = Array.from(seen.entries())
      .filter(([k]) => !k.startsWith('name:'))
      .map(([, v]) => v);

    const leaderboard = uniqueResults.map((r, i) => ({
      rank: i + 1,
      userName: r.user ? `${r.user.lastName} ${r.user.firstName}` : r.guestName || 'Гость',
      userId: r.user?._id || null,
      avatar: r.user?.avatar || null,
      score: r.score,
      maxScore: r.totalPoints,
      percentage: r.percentage,
      timeSpent: r.timeSpent,
      completedAt: r.completedAt
    }));

    res.json({ testTitle: test.title, leaderboard });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Get user's recent attempt LIST for a test (last 5 with scores + dates)
router.get('/my-attempts-list/:testId', optionalAuth, async (req, res) => {
  try {
    const baseQuery = {
      test: req.params.testId,
      status: 'completed',
      isPractice: { $ne: true },
    };
    if (req.user?._id) {
      baseQuery.user = req.user._id;
    } else if (req.query.guestId) {
      baseQuery.guestId = req.query.guestId;
    } else {
      return res.json({ attempts: [], count: 0, best: 0 });
    }

    const [attempts, count] = await Promise.all([
      Result.find(baseQuery)
        .sort({ completedAt: -1 })
        .limit(5)
        .select('_id percentage score totalPoints completedAt')
        .lean(),
      Result.countDocuments(baseQuery),
    ]);

    const allForBest = await Result.find(baseQuery).select('percentage').lean();
    const best = allForBest.length ? Math.max(...allForBest.map(a => a.percentage || 0)) : 0;

    res.json({ attempts, count, best });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения попыток' });
  }
});

// Get user's attempt count for a test
router.get('/my-attempts/:testId', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      // For guests, check by guestId query param
      const guestId = req.query.guestId;
      if (!guestId) return res.json({ attempts: 0 });
      const count = await Result.countDocuments({
        test: req.params.testId,
        guestId: guestId,
        status: 'completed',
        isPractice: { $ne: true }
      });
      return res.json({ attempts: count });
    }
    const count = await Result.countDocuments({
      test: req.params.testId,
      user: req.user._id,
      status: 'completed',
      isPractice: { $ne: true }
    });
    res.json({ attempts: count });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Question analytics for test creator
router.get('/analytics/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (test.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    const results = await Result.find(buildOfficialResultMatch(req.params.testId));
    const totalResponses = results.length;
    if (totalResponses === 0) return res.json({ totalResponses: 0, questions: [] });

    const analytics = test.questions.map(q => {
      let correctCount = 0;
      const optionCounts = {};
      q.options.forEach(o => { optionCounts[o.id] = 0; });

      results.forEach(r => {
        const answer = r.answers.find(a => a.questionId === q.id);
        if (!answer) return;
        if (answer.isCorrect) correctCount++;
        (answer.selectedOptions || []).forEach(optId => {
          if (optionCounts[optId] !== undefined) optionCounts[optId]++;
        });
      });

      return {
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        correctCount,
        totalResponses,
        correctPercent: Math.round((correctCount / totalResponses) * 100),
        options: q.options.map(o => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          selectedCount: optionCounts[o.id] || 0,
          selectedPercent: Math.round(((optionCounts[o.id] || 0) / totalResponses) * 100)
        }))
      };
    });

    res.json({ totalResponses, questions: analytics });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Get single result
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('test')
      .populate('user', 'firstName lastName email username uniqueId avatar');
    if (!result) return res.status(404).json({ message: 'Результат не найден' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Comparison: percentile / rank vs other takers ──
router.get('/:id/comparison', optionalAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).select('test percentage isPractice').lean();
    if (!result) return res.status(404).json({ message: 'Результат не найден' });

    const match = {
      test: result.test,
      status: 'completed',
      isPractice: { $ne: true },
    };

    const all = await Result.find(match).select('percentage user guestId').lean();
    const totalAttempts = all.length;

    if (totalAttempts === 0) {
      return res.json({
        totalAttempts: 0,
        rank: null,
        percentile: null,
        avgPercentage: null,
        bestPercentage: null,
        worsePercentage: null,
        currentPercentage: result.percentage,
      });
    }

    const sorted = [...all].sort((a, b) => b.percentage - a.percentage);
    const myPct = result.percentage;
    const rank = sorted.findIndex(r => r.percentage <= myPct) + 1; // 1-based first position where score <= mine
    const adjustedRank = rank > 0 ? rank : totalAttempts;
    const worseCount = all.filter(r => r.percentage < myPct).length;
    const percentile = Math.round((worseCount / totalAttempts) * 100);
    const avg = Math.round(all.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalAttempts);
    const best = sorted[0]?.percentage || 0;

    res.json({
      totalAttempts,
      rank: adjustedRank,
      percentile,
      avgPercentage: avg,
      bestPercentage: best,
      worsePercentage: percentile,
      currentPercentage: result.percentage,
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── My history: attempts of current user/guest on the same test ──
router.get('/:id/my-history', optionalAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).select('test user guestId isPractice').lean();
    if (!result) return res.status(404).json({ message: 'Результат не найден' });

    const query = {
      test: result.test,
      status: 'completed',
      isPractice: { $ne: true },
    };

    if (req.user?._id) {
      query.user = req.user._id;
    } else if (result.guestId) {
      query.guestId = result.guestId;
    } else {
      // No way to identify guest without guestId — return only current attempt
      return res.json({
        attempts: [{
          _id: result._id,
          percentage: 0,
          completedAt: null,
          isCurrent: true,
        }],
        best: 0,
        deltaVsPrevious: null,
        totalAttempts: 1,
      });
    }

    const attempts = await Result.find(query)
      .sort({ completedAt: 1 })
      .select('percentage completedAt')
      .lean();

    if (attempts.length === 0) {
      return res.json({
        attempts: [],
        best: 0,
        deltaVsPrevious: null,
        totalAttempts: 0,
      });
    }

    const enriched = attempts.map(a => ({
      _id: a._id,
      percentage: a.percentage || 0,
      completedAt: a.completedAt,
      isCurrent: a._id.toString() === result._id.toString(),
    }));

    const currentIdx = enriched.findIndex(a => a.isCurrent);
    const deltaVsPrevious = currentIdx > 0
      ? enriched[currentIdx].percentage - enriched[currentIdx - 1].percentage
      : null;

    const best = Math.max(...enriched.map(a => a.percentage));

    res.json({
      attempts: enriched,
      best,
      deltaVsPrevious,
      totalAttempts: enriched.length,
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Topic analysis: group answers by question type, recommend related tests ──
router.get('/:id/topic-analysis', optionalAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('test').lean();
    if (!result) return res.status(404).json({ message: 'Результат не найден' });
    if (!result.test) return res.json({ byTopic: [], weakTopics: [], recommendedTests: [] });

    const TYPE_LABELS = {
      'single-choice': 'Один вариант',
      'multiple-choice': 'Несколько вариантов',
      'true-false': 'Верно/Неверно',
      'essay': 'Эссе',
      'matching': 'Сопоставление',
      'fill-blank': 'Заполнить пропуск',
    };

    // Group answers by question type
    const byType = {};
    for (const answer of result.answers || []) {
      const q = result.test.questions?.find(qq => qq.id === answer.questionId);
      const type = q?.type || answer.type || 'unknown';
      if (!byType[type]) byType[type] = { total: 0, correct: 0, points: 0, maxPoints: 0 };
      byType[type].total += 1;
      if (answer.isCorrect) byType[type].correct += 1;
      byType[type].points += answer.pointsEarned || 0;
      byType[type].maxPoints += answer.maxPoints || q?.points || 1;
    }

    const byTopic = Object.entries(byType).map(([type, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const weakness = accuracy < 50 ? 'high' : accuracy < 75 ? 'medium' : 'low';
      return {
        topic: TYPE_LABELS[type] || type,
        topicKey: type,
        total: stats.total,
        correct: stats.correct,
        accuracy,
        weakness,
        pointsEarned: Math.round(stats.points * 10) / 10,
        maxPoints: stats.maxPoints,
      };
    }).sort((a, b) => a.accuracy - b.accuracy);

    const weakTopics = byTopic.filter(t => t.weakness === 'high').slice(0, 3);

    // Recommended tests by tag overlap (test-level tags)
    const myTags = (result.test.tags || []).filter(Boolean);
    let recommendedTests = [];
    if (myTags.length > 0) {
      const recs = await Test.find({
        _id: { $ne: result.test._id },
        isDeleted: { $ne: true },
        'settings.isPublic': true,
        tags: { $in: myTags },
      })
        .sort({ attemptCount: -1, averageScore: -1 })
        .limit(3)
        .select('title shareLink coverImage tags attemptCount averageScore')
        .lean();
      recommendedTests = recs.map(t => ({
        ...t,
        matchedTags: (t.tags || []).filter(tag => myTags.includes(tag)),
      }));
    }

    res.json({ byTopic, weakTopics, recommendedTests });
  } catch (e) {
    console.error('topic-analysis error:', e);
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;
