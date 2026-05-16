const express = require('express');
const Test = require('../models/Test');
const TicketClaim = require('../models/TicketClaim');
const Notification = require('../models/Notification');
const UserFollow = require('../models/UserFollow');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const SUPPORTED_TRANSLATION_LANGUAGES = ['en', 'ru', 'kz', 'es'];

const TRUE_FALSE_CATEGORY_KEYWORDS = {
  true: ['true', 'verdadero', 'верно', 'дұрыс'],
  false: ['false', 'falso', 'неверно', 'бұрыс'],
  notGiven: [
    'not given',
    'not stated',
    'not specified',
    'not mentioned',
    'not provided',
    'не указано',
    'не дано',
    'не упоминается',
    'не уверен',
    'берілмеген',
    'көрсетілмеген',
    'no se indica',
    'no se menciona',
    'no se especifica'
  ]
};

function normalizeFreeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeComparisonText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-zа-яёқғүұөһáéíóúñ0-9]+/gi, ' ')
    .trim();
}

function detectTrueFalseCategory(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeComparisonText(candidate);
    if (!normalized) continue;

    for (const [category, keywords] of Object.entries(TRUE_FALSE_CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        return category;
      }
    }
  }

  return null;
}

function orderTrueFalseEntries(entries = []) {
  const bucketed = new Map();
  const leftovers = [];

  entries.forEach((entry) => {
    const category = detectTrueFalseCategory(
      entry?.text,
      ...SUPPORTED_TRANSLATION_LANGUAGES.map(lang => entry?.translations?.[lang])
    );

    if (category && !bucketed.has(category)) {
      bucketed.set(category, entry);
      return;
    }

    leftovers.push(entry);
  });

  return ['true', 'false', 'notGiven']
    .map(category => bucketed.get(category))
    .filter(Boolean)
    .concat(leftovers);
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

  return [...values];
}

function getDisplayCorrectAnswer(question, language) {
  const translated = language && question.translations?.[language]?.correctAnswer;
  return translated || question.correctAnswer || '';
}

const DESCRIPTION_WORD_LIMIT = 200;

function limitWords(value = '', maxWords = DESCRIPTION_WORD_LIMIT) {
  const tokens = String(value).match(/\S+\s*/g) || [];
  if (tokens.length <= maxWords) return String(value);
  return tokens.slice(0, maxWords).join('').trimEnd();
}

function sanitizeTestPayload(payload = {}) {
  return {
    ...payload,
    description: limitWords(payload.description || '')
  };
}

function shuffleArray(items = [], seed = null) {
  const result = [...items];
  let state = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) || 1 : null;
  const getRandom = () => {
    if (state === null) return require('crypto').randomInt(0, 1000000) / 1000000;
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(getRandom() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildLangTranslations(question = {}, entries = [], key, fallbackField) {
  const baseTranslations = question.translations || {};

  return SUPPORTED_TRANSLATION_LANGUAGES.reduce((acc, lang) => {
    const current = baseTranslations[lang] || {};
    acc[lang] = {
      ...current,
      [key]: entries.map(entry => entry.translations?.[lang] || entry[fallbackField] || '')
    };
    return acc;
  }, { ...baseTranslations });
}

async function notifyFollowersAboutNewPublicTest(test) {
  if (!test?.creator || !test?.settings?.isPublic) return;

  const followers = await UserFollow.find({ following: test.creator }).select('follower').lean();
  if (!followers.length) return;

  const notifications = followers
    .filter((entry) => String(entry.follower) !== String(test.creator))
    .map((entry) => ({
      user: entry.follower,
      type: 'creator_new_test',
      title: 'Новый публичный тест',
      message: `Автор опубликовал новый тест: ${test.title}`,
      link: `/test-profile/${test.shareLink}`,
      meta: {
        creatorId: test.creator,
        testId: test._id,
        shareLink: test.shareLink
      }
    }));

  if (!notifications.length) return;

  try {
    await Notification.insertMany(notifications, { ordered: false });
  } catch (_) {
    // Non-blocking notification fan-out
  }
}

// Create test
router.post('/', auth, async (req, res) => {
  try {
    const test = new Test({
      ...sanitizeTestPayload(req.body),
      creator: req.user._id
    });
    if (test.settings?.isPublic && !test.firstPublishedAt) {
      test.firstPublishedAt = new Date();
    }
    await test.save();
    if (test.settings?.isPublic) {
      await notifyFollowersAboutNewPublicTest(test);
    }
    await test.populate('creator', 'firstName lastName email role avatar username uniqueId');
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания теста' });
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
    res.status(500).json({ message: 'Ошибка загрузки файла' });
  }
});

// PERF: Memory cache for /api/tests. Key = userId + query string.
// TTL 20s. На переходах внутри SPA дашборд берёт ответ из browser cache (15с),
// а если несколько юзеров запрашивают одно — попадание в memory cache 20с.
const _testsListCache = new Map();
const TESTS_CACHE_TTL = 20_000;
function _getTestsListCache(key) {
  const e = _testsListCache.get(key);
  if (e && (Date.now() - e.ts) < TESTS_CACHE_TTL) return e.data;
  return null;
}
function _setTestsListCache(key, data) {
  _testsListCache.set(key, { data, ts: Date.now() });
  if (_testsListCache.size > 200) {
    const oldest = _testsListCache.keys().next().value;
    _testsListCache.delete(oldest);
  }
}

// Get all tests (with search & filter)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, tag, sort, page = 1, limit = 12 } = req.query;
    const query = {};

    // PERF: Browser cache для SPA-навигации между страницами.
    // private = только этот пользователь, max-age=15 = 15 секунд свежесть.
    // Vary: Cookie — КРИТИЧНО: разные cookie = разные cache entries.
    // Без этого после logout браузер отдавал бы залогиненную версию (с приватными
    // тестами) гостю, потому что URL тот же.
    res.set('Cache-Control', 'private, max-age=15');
    res.set('Vary', 'Cookie, Authorization');

    // PERF: Server memory cache.
    const cacheKey = `${req.user?._id || 'guest'}:${search || ''}:${tag || ''}:${sort || ''}:${page}:${limit}`;
    const cached = _getTestsListCache(cacheKey);
    if (cached) return res.json(cached);

    // Filter out deleted tests
    query.isDeleted = false;

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
    // PERF (КРИТИЧНО): НЕ включать coverImage в проекцию списочных endpoints.
    // coverImage хранится как base64 data URL ~300-600KB на тест, и при limit=12
    // это превращалось в 6MB на каждый запрос дашборда → запрос занимал 2-3 минуты.
    // TestCoverArtwork.jsx красиво заменяет отсутствующий coverImage на
    // AnimatedPlaceholder (градиент + первая буква). Полный coverImage грузится
    // только когда пользователь открывает конкретный тест через GET /api/tests/:id.
    const projection = {
      title: 1, description: 1, creator: 1, tags: 1,
      shareLink: 1, settings: 1, isDeleted: 1,
      attemptCount: 1, averageScore: 1, rating: 1, ratingCount: 1,
      difficultyScore: 1, difficultyCount: 1,
      totalPoints: 1, firstPublishedAt: 1,
      createdAt: 1, updatedAt: 1,
      'questions._id': 1
    };
    const [tests, total] = await Promise.all([
      Test.find(query, projection)
        // PERF (КРИТИЧНО): НЕ populate `avatar` — это base64 картинка ~600KB,
        // которая на 12 тестов = ~7MB на запрос → /api/tests отдавался за 17 секунд!
        // Аватары авторов на дашборде не отображаются. Только в одиночных endpoints (`/share/:link`, `/:id`).
        // НО обязательно нужны username/uniqueId — UsernameBadge показывает @user без них.
        .populate('creator', 'firstName lastName email role username uniqueId')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Test.countDocuments(query)
    ]);

    const responseData = {
      tests,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    };
    _setTestsListCache(cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения тестов' });
  }
});

// Batch endpoint: вернуть только coverImage для списка тестов.
// Дашборд загружает список тестов БЕЗ coverImage (быстро),
// потом в фоне дозагружает обложки этим эндпоинтом.
// Возвращает { testId: coverImageBase64 } map.
router.get('/covers', optionalAuth, async (req, res) => {
  try {
    const idsParam = String(req.query.ids || '').trim();
    if (!idsParam) return res.json({});
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 24);
    if (!ids.length) return res.json({});
    const tests = await Test.find(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { coverImage: 1 }
    ).lean();
    const map = {};
    tests.forEach(t => {
      if (t.coverImage) map[String(t._id)] = t.coverImage;
    });
    res.json(map);
  } catch (error) {
    res.json({});
  }
});

// Get my tests
router.get('/my', auth, async (req, res) => {
  try {
    // PERF: same as / endpoint — НЕ включать coverImage (тяжёлый base64).
    // TestCoverArtwork падает на красивый AnimatedPlaceholder.
    const projection = {
      title: 1, description: 1, creator: 1, tags: 1,
      shareLink: 1, settings: 1, isDeleted: 1,
      attemptCount: 1, averageScore: 1, rating: 1, ratingCount: 1,
      difficultyScore: 1, difficultyCount: 1,
      totalPoints: 1, firstPublishedAt: 1,
      createdAt: 1, updatedAt: 1,
      'questions._id': 1
    };
    const tests = await Test.find({ creator: req.user._id }, projection)
      // PERF: same as / endpoint — не populate тяжёлый base64 avatar.
      .populate('creator', 'firstName lastName email role username uniqueId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения тестов' });
  }
});

// Get test by ID (for editing)
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('creator', 'firstName lastName email role avatar username uniqueId');
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения теста' });
  }
});

// Get test by share link (for guests too)
router.get('/share/:shareLink', optionalAuth, async (req, res) => {
  try {
    const test = await Test.findOne({ shareLink: req.params.shareLink })
      .populate('creator', 'firstName lastName email role avatar username uniqueId');
    if (!test) {
      return res.status(404).json({ message: 'Тест не найден' });
    }

    // Deadline enforcement.
    //
    // The creator (and any admin) needs to be able to preview their own
    // pre-scheduled test before its public start date. Otherwise users
    // who set a future startDate get locked out of their own work and
    // see a confusing "test not found" toast on the dashboard. The check
    // still fires for everyone else.
    const creatorId = test.creator?._id?.toString() || test.creator?.toString();
    const viewerId = req.user?._id?.toString();
    const isCreator = viewerId && creatorId && viewerId === creatorId;
    const isAdmin = req.user?.role === 'admin';
    const enforceDeadline = !(isCreator || isAdmin);

    if (enforceDeadline) {
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
    }

    // Don't send correct answers to test takers
    const sanitized = test.toObject();

    const variantNum = parseInt(req.query.variant) || 0;
    const useSeededShuffle = variantNum > 0 && test.settings?.variants?.enabled;

    // Random pool selection: if questionPoolSize > 0 and < total, pick random subset
    const poolSize = test.settings?.questionPoolSize || 0;
    if (poolSize > 0 && poolSize < sanitized.questions.length) {
      const shuffled = shuffleArray(sanitized.questions, useSeededShuffle ? variantNum * 1000 + 17 : null);
      sanitized.questions = shuffled.slice(0, poolSize);
    }

    // Shuffle question order when enabled, while keeping variants deterministic.
    if (test.settings?.shuffleQuestions || useSeededShuffle) {
      sanitized.questions = shuffleArray(sanitized.questions, useSeededShuffle ? variantNum * 100 + 31 : null);
    }

    sanitized.questions = sanitized.questions.map((q, questionIndex) => {
      const { correctAnswer, ...rest } = q;
      const shouldShuffleOptions = Boolean(test.settings?.shuffleOptions) && q.type !== 'true-false';
      const optionSeedBase = useSeededShuffle ? variantNum * 10000 + (questionIndex + 1) * 131 : null;

      if (q.type === 'matching') {
        const pairEntries = q.options.map((option, optionIndex) => {
          const { isCorrect, matchPair, ...leftOption } = option;
          return {
            option: leftOption,
            pair: option.matchPair,
            translations: Object.fromEntries(
              SUPPORTED_TRANSLATION_LANGUAGES.map(lang => [
                lang,
                {
                  option: q.translations?.[lang]?.options?.[optionIndex] || option.text,
                  pair: q.translations?.[lang]?.matchPairs?.[optionIndex] || option.matchPair,
                }
              ])
            )
          };
        });

        const orderedLeft = shouldShuffleOptions
          ? shuffleArray(pairEntries, optionSeedBase !== null ? optionSeedBase + 11 : null)
          : pairEntries;
        const orderedRight = shouldShuffleOptions
          ? shuffleArray(pairEntries, optionSeedBase !== null ? optionSeedBase + 53 : null)
          : pairEntries;

        rest.options = orderedLeft.map(entry => entry.option);
        rest.translations = {
          ...buildLangTranslations(q, orderedLeft.map(entry => ({
            text: entry.option.text,
            translations: Object.fromEntries(
              SUPPORTED_TRANSLATION_LANGUAGES.map(lang => [
                lang,
                entry.translations?.[lang]?.option || entry.option.text
              ])
            )
          })), 'options', 'text')
        };
        rest.matchingRightSide = orderedRight.map(entry => entry.pair);
        rest.matchingRightSideTranslations = Object.fromEntries(
          SUPPORTED_TRANSLATION_LANGUAGES.map(lang => [
            lang,
            orderedRight.map(entry => entry.translations?.[lang]?.pair || entry.pair)
          ])
        );
      } else {
        const optionEntries = q.options.map((option, optionIndex) => {
          const { isCorrect, matchPair, ...displayOption } = option;
          return {
            option: displayOption,
            text: option.text,
            translations: Object.fromEntries(
              SUPPORTED_TRANSLATION_LANGUAGES.map(lang => [
                lang,
                q.translations?.[lang]?.options?.[optionIndex] || option.text
              ])
            )
          };
        });
        const orderedOptionsBase = q.type === 'true-false'
          ? orderTrueFalseEntries(optionEntries)
          : optionEntries;
        const orderedOptions = shouldShuffleOptions
          ? shuffleArray(orderedOptionsBase, optionSeedBase !== null ? optionSeedBase + 17 : null)
          : orderedOptionsBase;

        rest.options = orderedOptions.map(entry => entry.option);
        rest.translations = {
          ...buildLangTranslations(q, orderedOptions, 'options', 'text')
        };
      }
      return rest;
    });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения теста' });
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
    const sanitizedPayload = sanitizeTestPayload(req.body);
    const {
      _id,
      __v,
      creator,
      createdAt,
      updatedAt,
      shareLink,
      attemptCount,
      averageScore,
      rating,
      ratingCount,
      ratings,
      difficultyScore,
      difficultyCount,
      difficultyRatings,
      ...updateData
    } = sanitizedPayload;
    const wasEverPublished = Boolean(test.firstPublishedAt);
    Object.assign(test, updateData);
    const becamePublicFirstTime = test.settings?.isPublic === true && !wasEverPublished;
    if (becamePublicFirstTime) {
      test.firstPublishedAt = new Date();
    }
    await test.save();
    if (becamePublicFirstTime) {
      await notifyFollowersAboutNewPublicTest(test);
    }
    await test.populate('creator', 'firstName lastName email role avatar username uniqueId');
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления теста' });
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
    res.status(500).json({ message: 'Ошибка удаления теста' });
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
    const {
      _id,
      __v,
      shareLink,
      attemptCount,
      averageScore,
      rating,
      ratingCount,
      ratings,
      difficultyScore,
      difficultyCount,
      difficultyRatings,
      createdAt,
      updatedAt,
      ...data
    } = original.toObject();
    const copy = new Test({
      ...data,
      title: data.title + ' (копия)',
      creator: req.user._id,
      attemptCount: 0,
      averageScore: 0,
      rating: 0,
      ratingCount: 0,
      ratings: [],
      difficultyScore: 0,
      difficultyCount: 0,
      difficultyRatings: []
    });
    await copy.save();
    await copy.populate('creator', 'firstName lastName email role avatar username uniqueId');
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка дублирования теста' });
  }
});

// Check single answer (for instant feedback mode)
router.post('/:id/check-answer', optionalAuth, async (req, res) => {
  try {
    const { questionId, selectedOptions, textAnswer, matchingPairs, language } = req.body;
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
        const acceptedAnswers = getAcceptedFillBlankAnswers(question);
        correctText = getDisplayCorrectAnswer(question, language);
        isCorrect = acceptedAnswers.includes(normalizeFreeText(textAnswer));
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
    res.status(500).json({ message: 'Ошибка проверки ответа' });
  }
});

// Rate test (one rating per user)
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });
    }
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
    res.status(500).json({ message: 'Ошибка' });
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
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Rate test difficulty (one rating per user)
router.post('/:id/rate-difficulty', auth, async (req, res) => {
  try {
    const difficulty = Number(req.body?.difficulty);
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      return res.status(400).json({ message: 'Оценка сложности должна быть от 1 до 5' });
    }

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    if (!Array.isArray(test.difficultyRatings)) test.difficultyRatings = [];

    const existingIdx = test.difficultyRatings.findIndex(r => r.user.toString() === req.user._id.toString());
    let alreadyRated = false;
    if (existingIdx >= 0) {
      test.difficultyRatings[existingIdx].difficulty = difficulty;
      alreadyRated = true;
    } else {
      test.difficultyRatings.push({ user: req.user._id, difficulty });
    }

    const totalRatings = test.difficultyRatings.length;
    test.difficultyScore = totalRatings > 0
      ? test.difficultyRatings.reduce((sum, item) => sum + item.difficulty, 0) / totalRatings
      : 0;
    test.difficultyCount = totalRatings;
    await test.save();

    res.json({
      difficultyScore: test.difficultyScore,
      difficultyCount: test.difficultyCount,
      alreadyRated
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// Check user's existing difficulty rating
router.get('/:id/my-difficulty-rating', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('difficultyRatings');
    if (!test) return res.status(404).json({ message: 'Тест не найден' });
    const myDifficulty = test.difficultyRatings?.find(r => r.user.toString() === req.user._id.toString());
    res.json({ difficulty: myDifficulty?.difficulty || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

// ── Related tests (TestProfile rebuild) ──
//
// Returns up to `limit` tests related to the given one. Priority:
//   1. Matching tags (intersection via $in), sorted by rating DESC,
//      attemptCount DESC. Caps at `limit`.
//   2. If fewer than `limit` items found, top up with tests by the
//      same creator (public only).
//
// Source test is always excluded. Only public, non-deleted tests are
// returned so the Related rail doesn't leak private material.
router.get('/:id/related', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(8, Math.max(1, parseInt(req.query.limit) || 4));
    const source = await Test.findById(req.params.id).select('tags creator');
    if (!source) return res.status(404).json({ message: 'Тест не найден' });

    const base = {
      _id: { $ne: source._id },
      isDeleted: { $ne: true },
      'settings.isPublic': true,
    };

    // Tag-based matches first — intersection via $in on the source's
    // own tags. Tagless tests produce an empty byTag list which is
    // fine; creator fallback fills in below.
    let byTag = [];
    if (Array.isArray(source.tags) && source.tags.length > 0) {
      byTag = await Test.find({ ...base, tags: { $in: source.tags } })
        .sort({ rating: -1, attemptCount: -1 })
        .limit(limit)
        .select('title shareLink coverImage rating ratingCount attemptCount tags')
        .lean();
    }

    const need = limit - byTag.length;
    let byCreator = [];
    if (need > 0 && source.creator) {
      byCreator = await Test.find({
        ...base,
        creator: source.creator,
        _id: { $nin: [source._id, ...byTag.map(t => t._id)] },
      })
        .sort({ rating: -1, attemptCount: -1 })
        .limit(need)
        .select('title shareLink coverImage rating ratingCount attemptCount')
        .lean();
    }

    const items = [
      ...byTag.map(t => ({ ...t, source: 'tag' })),
      ...byCreator.map(t => ({ ...t, source: 'creator' })),
    ];
    res.json({ items });
  } catch (err) {
    console.error('[tests] related error:', err.message);
    res.status(500).json({ message: 'Ошибка' });
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
      .populate('user', 'firstName lastName username uniqueId')
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
    res.status(500).json({ message: 'Ошибка' });
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
    res.status(500).json({ message: 'Ошибка' });
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
    res.status(500).json({ message: 'Ошибка' });
  }
});

module.exports = router;
