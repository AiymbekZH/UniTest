const express = require('express');
const Test = require('../models/Test');
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
    // Don't send correct answers to test takers
    const sanitized = test.toObject();
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
        break;
      }
      case 'essay': {
        isCorrect = false;
        break;
      }
    }

    res.json({
      isCorrect,
      correctOptionIds,
      correctText,
      correctPairs,
      explanation: question.explanation || '',
      points: question.points
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

module.exports = router;
