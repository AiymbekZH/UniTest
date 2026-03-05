const express = require('express');
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { notifyTestCompletion } = require('../utils/mailer');

const router = express.Router();

// Submit test result
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { testId, answers, guestName, guestId, violations, timeSpent, variantNumber } = req.body;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    // Check attempt limit
    if (test.settings?.maxAttempts > 0) {
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

    const usePartialCredit = test.settings?.partialCredit === true;

    // Grade answers
    let score = 0;
    let variantTotalPoints = 0;
    const gradedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q.id === answer.questionId);
      if (!question) return { ...answer, isCorrect: false, pointsEarned: 0 };

      variantTotalPoints += question.points;

      let isCorrect = false;
      let pointsEarned = 0;
      
      // Build user-readable answer text
      let userAnswer = '';
      if (answer.selectedOptions?.length > 0) {
        userAnswer = answer.selectedOptions.map(optId => {
          const opt = question.options.find(o => o.id === optId);
          return opt ? opt.text : optId;
        }).join(', ');
      } else if (answer.textAnswer) {
        userAnswer = answer.textAnswer;
      }
      
      const baseAnswer = { ...answer, type: question.type, questionText: question.questionText, maxPoints: question.points, userAnswer };

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

          // Partial credit: award proportional points for partially correct answers
          if (!isCorrect && usePartialCredit && correctIds.length > 0) {
            const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
            const wrongSelected = selectedIds.filter(id => !correctIds.includes(id)).length;
            // Formula: (correct_selected - wrong_selected) / total_correct, minimum 0
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

          // Partial credit for matching
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
          isCorrect = answer.textAnswer?.trim().toLowerCase() ===
            question.correctAnswer?.trim().toLowerCase();
          break;
        }
        case 'essay': {
          // Essays need manual grading; mark as pending (0 points until graded)
          isCorrect = false;
          pointsEarned = 0;
          return { ...baseAnswer, isCorrect, pointsEarned };
        }
      }

      if (isCorrect) {
        pointsEarned = question.points;
        score += pointsEarned;
      }

      return { ...baseAnswer, isCorrect, pointsEarned };
    });

    const result = new Result({
      test: testId,
      user: req.user?._id || null,
      guestName: !req.user ? guestName : '',
      guestId: !req.user ? (guestId || '') : '',
      variantNumber: variantNumber || 0,
      answers: gradedAnswers,
      score,
      totalPoints: variantTotalPoints > 0 ? variantTotalPoints : test.totalPoints,
      violations: violations || [],
      timeSpent: timeSpent || 0,
      completedAt: new Date(),
      status: 'completed'
    });

    await result.save();

    // Update test stats
    test.attemptCount += 1;
    const aggResult = await Result.aggregate([
      { $match: { test: test._id, status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } }
    ]);
    test.averageScore = Math.round(aggResult[0]?.avg || 0);
    await test.save();

    // Email notification to test creator (non-blocking)
    try {
      const creator = await User.findById(test.creator);
      if (creator?.email) {
        const studentName = req.user
          ? `${req.user.lastName} ${req.user.firstName}`
          : (guestName || 'Гость');
        const percentage = test.totalPoints > 0 ? Math.round((score / test.totalPoints) * 100) : 0;
        notifyTestCompletion({
          teacherEmail: creator.email,
          teacherName: creator.firstName,
          studentName,
          testTitle: test.title,
          score,
          totalPoints: test.totalPoints,
          percentage,
        }).catch(() => {}); // fire-and-forget
      }
    } catch (_) { /* email errors should never break result submission */ }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сохранения результата', error: error.message });
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
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Get results for a test (for test creator)
router.get('/test/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const results = await Result.find({ test: req.params.testId, status: 'completed' })
      .populate('user', 'firstName lastName email role avatar')
      .sort({ percentage: -1 });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения результатов', error: error.message });
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
    res.status(500).json({ message: 'Ошибка получения результатов', error: error.message });
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
    const aggResult = await Result.aggregate([
      { $match: { test: result.test, status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } }
    ]);
    test.averageScore = Math.round(aggResult[0]?.avg || 0);
    await test.save();

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка оценивания', error: error.message });
  }
});

// Public leaderboard for a test (no auth needed)
router.get('/leaderboard/:testId', async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).select('title settings totalPoints');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const results = await Result.find({ test: req.params.testId, status: 'completed' })
      .populate('user', 'firstName lastName avatar')
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
    res.status(500).json({ message: 'Ошибка', error: error.message });
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
        status: 'completed'
      });
      return res.json({ attempts: count });
    }
    const count = await Result.countDocuments({
      test: req.params.testId,
      user: req.user._id,
      status: 'completed'
    });
    res.json({ attempts: count });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
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

    const results = await Result.find({ test: req.params.testId, status: 'completed' });
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
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Get single result
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('test')
      .populate('user', 'firstName lastName email');
    if (!result) return res.status(404).json({ message: 'Результат не найден' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

module.exports = router;
