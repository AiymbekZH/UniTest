const express = require('express');
const Test = require('../models/Test');
const TicketClaim = require('../models/TicketClaim');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Create test
router.post('/', auth, async (req, res) => {
  try {
    const test = new Test({
      ...req.body,
      creator: req.user._id
    });
    await test.save();
    await test.populate('creator', 'firstName lastName email role avatar');
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания теста', error: error.message });
  }
});

// Upload media for questions — returns base64 data URL for MongoDB persistence
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }
    let mediaType = 'image';
    if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) mediaType = 'audio';

    // Convert buffer to base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    res.json({
      url: dataUrl,
      type: mediaType,
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки файла', error: error.message });
  }
});

// Get all tests (with search & filter)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, tag, sort, page = 1, limit = 12 } = req.query;
    const query = {};

    // Filter out deleted tests
    query.isDeleted = { $ne: true };

    // Show user's own tests + public tests (guests see only public)
    if (req.user) {
      query.$or = [
        { creator: req.user._id },
        { 'settings.isPublic': true }
      ];
    } else {
      query['settings.isPublic'] = true;
    }

    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const ownerFilter = req.user
        ? { $or: [{ creator: req.user._id }, { 'settings.isPublic': true }] }
        : { 'settings.isPublic': true };
      query.$and = [
        ownerFilter,
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tags: searchRegex }
          ]
        }
      ];
      delete query.$or;
      delete query['settings.isPublic'];
    }
    if (tag) {
      query.tags = { $in: [tag] };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'popular') sortOption = { attemptCount: -1 };
    if (sort === 'title') sortOption = { title: 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tests = await Test.find(query)
      .populate('creator', 'firstName lastName email role avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Test.countDocuments(query);

    res.json({
      tests,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения тестов', error: error.message });
  }
});

// Get my tests
router.get('/my', auth, async (req, res) => {
  try {
    const tests = await Test.find({ creator: req.user._id })
      .populate('creator', 'firstName lastName email role avatar')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения тестов', error: error.message });
  }
});

// Get test by ID (for editing)
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('creator', 'firstName lastName email role avatar');
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения теста', error: error.message });
  }
});

// Get test by share link (for guests too)
router.get('/share/:shareLink', optionalAuth, async (req, res) => {
  try {
    const test = await Test.findOne({ shareLink: req.params.shareLink })
      .populate('creator', 'firstName lastName email role avatar');
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }

    // Deadline enforcement
    const now = new Date();
    if (test.settings.startDate && now < new Date(test.settings.startDate)) {
      return res.status(403).json({
        message: 'Тест ещё не открыт',
        code: 'NOT_STARTED',
        startDate: test.settings.startDate
      });
    }
    if (test.settings.endDate && now > new Date(test.settings.endDate)) {
      return res.status(403).json({
        message: 'Тест уже закрыт',
        code: 'ENDED',
        endDate: test.settings.endDate
      });
    }

    // Don't send correct answers to test takers
    const sanitized = test.toObject();

    // Seeded shuffle for variant-based ordering
    const variantNum = parseInt(req.query.variant) || 0;
    function seededShuffle(arr, seed) {
      const result = [...arr];
      let s = seed;
      for (let i = result.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    // Random pool selection: if questionPoolSize > 0 and < total, pick random subset
    const poolSize = test.settings?.questionPoolSize || 0;
    if (poolSize > 0 && poolSize < sanitized.questions.length) {
      const shuffled = variantNum > 0
        ? seededShuffle(sanitized.questions, variantNum * 1000)
        : [...sanitized.questions].sort(() => Math.random() - 0.5);
      sanitized.questions = shuffled.slice(0, poolSize);
    }

    // If variant system is active, shuffle questions deterministically per variant
    if (variantNum > 0 && test.settings?.variants?.enabled) {
      sanitized.questions = seededShuffle(sanitized.questions, variantNum);
    }

    sanitized.questions = sanitized.questions.map(q => {
      const { correctAnswer, ...rest } = q;
      if (q.type === 'matching') {
        // Collect right-side (matchPair) values and shuffle them
        const rightSide = q.options
          .map(o => o.matchPair)
          .filter(Boolean)
          .sort(() => Math.random() - 0.5);
        rest.matchingRightSide = rightSide;
        rest.options = rest.options.map(o => {
          const { isCorrect, matchPair, ...opt } = o;
          return opt; // Left side only (text), no matchPair
        });
      } else {
        rest.options = rest.options.map(o => {
          const { isCorrect, matchPair, ...opt } = o;
          return opt;
        });
      }
      return rest;
    });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения теста', error: error.message });
  }
});

// Update test
router.put('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }
    if (test.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Нет прав для редактирования' });
    }

    // Strip system fields to prevent duplication/corruption
    const { _id, __v, creator, createdAt, updatedAt, shareLink, attemptCount, averageScore, ...updateData } = req.body;
    Object.assign(test, updateData);
    await test.save();
    await test.populate('creator', 'firstName lastName email role avatar');
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления теста', error: error.message });
  }
});

// Delete test
router.delete('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }
    if (test.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Нет прав для удаления' });
    }
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: 'Тест удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления теста', error: error.message });
  }
});

// Duplicate test (API only — no frontend button yet)
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Test.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Тест не найден' });
    if (!original.settings.isPublic && original.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Нет доступа к этому тесту' });
    }
    const { _id, __v, shareLink, attemptCount, averageScore, rating, ratingCount, ratings, createdAt, updatedAt, ...data } = original.toObject();
    const copy = new Test({
      ...data,
      title: data.title + ' (копия)',
      creator: req.user._id,
      attemptCount: 0,
      averageScore: 0,
      rating: 0,
      ratingCount: 0,
      ratings: []
    });
    await copy.save();
    await copy.populate('creator', 'firstName lastName email role avatar');
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка дублирования теста', error: error.message });
  }
});

// Check single answer (for instant feedback mode)
router.post('/:id/check-answer', optionalAuth, async (req, res) => {
  try {
    const { questionId, selectedOptions, textAnswer, matchingPairs } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (!test.settings?.instantFeedback) {
      return res.status(403).json({ message: 'Мгновенная проверка отключена для этого теста' });
    }

    const question = test.questions.find(q => q.id === questionId);
    if (!question) return res.status(404).json({ message: 'Вопрос не найден' });

    let isCorrect = false;
    let correctOptionIds = [];
    let correctText = '';
    let correctPairs = {};
    let partialRatio = 0; // For partial credit

    const usePartialCredit = test.settings?.partialCredit === true;

    switch (question.type) {
      case 'single-choice':
      case 'true-false': {
        const correctOpt = question.options.find(o => o.isCorrect);
        correctOptionIds = correctOpt ? [correctOpt.id] : [];
        isCorrect = correctOpt && selectedOptions?.[0] === correctOpt.id;
        break;
      }
      case 'multiple-choice': {
        const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id).sort();
        correctOptionIds = correctIds;
        const selectedIds = (selectedOptions || []).sort();
        isCorrect = correctIds.length === selectedIds.length &&
          correctIds.every((id, i) => id === selectedIds[i]);
        
        // Partial credit calculation
        if (!isCorrect && usePartialCredit && correctIds.length > 0) {
          const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
          const wrongSelected = selectedIds.filter(id => !correctIds.includes(id)).length;
          partialRatio = Math.max(0, (correctSelected - wrongSelected) / correctIds.length);
        }
        break;
      }
      case 'fill-blank': {
        correctText = question.correctAnswer || '';
        isCorrect = textAnswer?.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
        break;
      }
      case 'matching': {
        const cPairs = question.options.reduce((acc, o) => {
          if (o.matchPair) acc[o.id] = o.matchPair;
          return acc;
        }, {});
        correctPairs = cPairs;
        const uPairs = (matchingPairs || []).reduce((acc, p) => {
          acc[p.left] = p.right;
          return acc;
        }, {});
        isCorrect = Object.keys(cPairs).length === Object.keys(uPairs).length &&
          Object.entries(cPairs).every(([k, v]) => uPairs[k] === v);
        
        // Partial credit for matching
        if (!isCorrect && usePartialCredit && Object.keys(cPairs).length > 0) {
          const correctCount = Object.entries(cPairs).filter(([k, v]) => uPairs[k] === v).length;
          partialRatio = correctCount / Object.keys(cPairs).length;
        }
        break;
      }
      case 'essay': {
        isCorrect = false;
        break;
      }
    }

    const partialPoints = partialRatio > 0 ? Math.round(question.points * partialRatio * 100) / 100 : 0;

    res.json({
      isCorrect,
      correctOptionIds,
      correctText,
      correctPairs,
      explanation: question.explanation || '',
      points: question.points,
      partialCredit: usePartialCredit,
      partialPoints,
      partialRatio
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка проверки ответа', error: error.message });
  }
});

// Rate test (one rating per user)
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    if (!test.ratings) test.ratings = [];
    const existingIdx = test.ratings.findIndex(r => r.user.toString() === req.user._id.toString());
    let alreadyRated = false;
    if (existingIdx >= 0) {
      test.ratings[existingIdx].rating = rating;
      alreadyRated = true;
    } else {
      test.ratings.push({ user: req.user._id, rating });
    }

    // Recalculate average from array
    const totalRatings = test.ratings.length;
    test.rating = test.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    test.ratingCount = totalRatings;
    await test.save();

    res.json({ rating: test.rating, ratingCount: test.ratingCount, alreadyRated });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Check user's existing rating
router.get('/:id/my-rating', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('ratings');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    const myRating = test.ratings?.find(r => r.user.toString() === req.user._id.toString());
    res.json({ rating: myRating?.rating || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// =================== TICKET / VARIANT SYSTEM ===================

// Get ticket status for a test (which variants are available)
router.get('/:id/tickets', optionalAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('settings.variants settings.isPublic');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (!test.settings?.variants?.enabled || !test.settings.variants.count) {
      return res.status(400).json({ message: 'Варианты не включены для этого теста' });
    }
    const variantCount = test.settings.variants.count;
    const isPublic = test.settings?.isPublic === true;
    const claims = await TicketClaim.find({ test: req.params.id })
      .populate('user', 'firstName lastName')
      .lean();

    // Build variant status array
    const variants = [];
    for (let i = 1; i <= variantCount; i++) {
      const claim = claims.find(c => c.variantNumber === i);
      variants.push({
        number: i,
        // For public tests, tickets are always available
        claimed: isPublic ? false : !!claim,
        claimedBy: (!isPublic && claim) ? (claim.user ? `${claim.user.firstName} ${claim.user.lastName}` : claim.guestName) : null,
        isMe: claim ? (req.user ? claim.user?._id?.toString() === req.user._id.toString() : false) : false
      });
    }

    // Check if current user already has a ticket
    let myVariant = null;
    if (req.user) {
      const myClaim = claims.find(c => c.user?._id?.toString() === req.user._id.toString());
      if (myClaim) myVariant = myClaim.variantNumber;
    }

    res.json({ variants, myVariant, variantCount, isPublic });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Claim a ticket variant
router.post('/:id/tickets/claim', optionalAuth, async (req, res) => {
  try {
    const { variantNumber, guestName } = req.body;
    const test = await Test.findById(req.params.id).select('settings.variants settings.isPublic');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (!test.settings?.variants?.enabled) {
      return res.status(400).json({ message: 'Варианты не включены' });
    }
    if (variantNumber < 1 || variantNumber > test.settings.variants.count) {
      return res.status(400).json({ message: 'Неверный номер варианта' });
    }

    const isPublic = test.settings?.isPublic === true;

    // For PUBLIC tests: don't create a claim, just return the variant (anyone can take any)
    if (isPublic) {
      return res.json({ variantNumber, alreadyClaimed: false });
    }

    // For PRIVATE tests: exclusive ticket system (current behavior)
    // Check if user already has a ticket for this test
    if (req.user) {
      const existing = await TicketClaim.findOne({ test: req.params.id, user: req.user._id });
      if (existing) {
        return res.json({ variantNumber: existing.variantNumber, alreadyClaimed: true });
      }
    }

    // Try to claim (atomic — unique index will prevent duplicates)
    try {
      const claim = new TicketClaim({
        test: req.params.id,
        user: req.user?._id || null,
        guestName: !req.user ? (guestName || 'Guest') : '',
        variantNumber
      });
      await claim.save();
      res.json({ variantNumber, alreadyClaimed: false });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        return res.status(409).json({ message: 'Этот билет уже занят!' });
      }
      throw dupErr;
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Release a ticket (for admin/creator cleanup)
router.delete('/:id/tickets', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('creator');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    if (test.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Нет прав' });
    }
    await TicketClaim.deleteMany({ test: req.params.id });
    res.json({ message: 'Все билеты сброшены' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

module.exports = router;
