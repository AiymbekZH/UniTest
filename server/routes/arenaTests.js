const express = require('express');
const ArenaTest = require('../models/ArenaTest');
const BankQuestion = require('../models/BankQuestion');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Reasonable defaults / clamps for the settings object.
const PWR_ENUM = ['fiftyFifty', 'doublePoints', 'shield', 'timeFreeze', 'steal', 'mirror', 'suddenDeath'];
const TAG_ENUM = new Set(['normal', 'blitz', 'think', 'jackpot', 'boss']);
const QTYPE_ENUM = new Set(['single-choice', 'multiple-choice', 'true-false', 'essay', 'matching', 'fill-blank']);
const VIBE_ENUM = new Set(['default', 'quizshow', '8bit', 'cinematic', 'chill']);
const LANG_ENUM = new Set(['en', 'ru', 'kz', 'es']);

function sanitizeStr(val, max = 8000) {
  return String(val || '').slice(0, max);
}

// Embedded option: id, text, isCorrect, optional matchPair.
function sanitizeEmbeddedOption(raw = {}) {
  return {
    id: sanitizeStr(raw.id, 64) || Math.random().toString(36).slice(2, 12),
    text: sanitizeStr(raw.text, 2000),
    isCorrect: !!raw.isCorrect,
    matchPair: sanitizeStr(raw.matchPair, 2000)
  };
}

// Translation block per language.
function sanitizeEmbeddedTranslation(raw = {}) {
  return {
    questionText:  sanitizeStr(raw.questionText, 8000),
    options:       Array.isArray(raw.options) ? raw.options.slice(0, 12).map(o => sanitizeStr(o, 2000)) : [],
    matchPairs:    Array.isArray(raw.matchPairs) ? raw.matchPairs.slice(0, 12).map(o => sanitizeStr(o, 2000)) : [],
    passage:       sanitizeStr(raw.passage, 8000),
    explanation:   sanitizeStr(raw.explanation, 4000),
    correctAnswer: sanitizeStr(raw.correctAnswer, 2000)
  };
}

// Embedded question payload: validates type, length-clamps strings, max 12 options.
function sanitizeEmbeddedQuestion(raw = {}) {
  if (!raw || !QTYPE_ENUM.has(raw.type)) return null;
  const opts = Array.isArray(raw.options) ? raw.options.slice(0, 12).map(sanitizeEmbeddedOption) : [];
  const translations = {};
  if (raw.translations && typeof raw.translations === 'object') {
    for (const [code, val] of Object.entries(raw.translations)) {
      if (LANG_ENUM.has(code) && val) translations[code] = sanitizeEmbeddedTranslation(val);
    }
  }
  return {
    type: raw.type,
    questionText: sanitizeStr(raw.questionText, 8000),
    passage:      sanitizeStr(raw.passage, 8000),
    points:       Math.max(0, Math.min(1000, Number(raw.points) || 1)),
    options:      opts,
    correctAnswer: sanitizeStr(raw.correctAnswer, 2000),
    explanation:   sanitizeStr(raw.explanation, 4000),
    media: raw.media && typeof raw.media === 'object' ? {
      type:     ['image', 'video', 'audio', ''].includes(raw.media.type) ? raw.media.type : '',
      url:      sanitizeStr(raw.media.url, 4000),
      fileName: sanitizeStr(raw.media.fileName, 256)
    } : { type: '', url: '', fileName: '' },
    translations
  };
}

// Mixed entries: each entry is either a 'bank' ref or a fully-validated 'embedded' payload.
function sanitizeEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(e => {
      const tag = TAG_ENUM.has(e?.tag) ? e.tag : 'normal';
      const timerOverride = Number.isFinite(Number(e?.timerOverride))
        ? Math.max(5, Math.min(300, Number(e.timerOverride))) : null;
      const pointsOverride = Number.isFinite(Number(e?.pointsOverride))
        ? Math.max(0, Math.min(1000, Number(e.pointsOverride))) : null;

      const kind = e?.kind === 'embedded' ? 'embedded' : 'bank';
      if (kind === 'embedded') {
        const embedded = sanitizeEmbeddedQuestion(e?.embedded);
        if (!embedded) return null;
        return { kind, embedded, bankQuestion: null, timerOverride, pointsOverride, tag };
      }
      const bankId = e?.bankQuestion || e?.bankQuestionId;
      if (!bankId) return null;
      return { kind: 'bank', bankQuestion: bankId, embedded: null, timerOverride, pointsOverride, tag };
    })
    .filter(Boolean);
}

function sanitizeSettings(raw = {}) {
  const clamp = (val, lo, hi, dflt) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
  };
  return {
    countdownSeconds: clamp(raw.countdownSeconds, 3, 15, 5),
    questionIntroSec: clamp(raw.questionIntroSec, 1, 10, 3),
    answerTimeSec:    clamp(raw.answerTimeSec, 5, 120, 20),
    answerRevealSec:  clamp(raw.answerRevealSec, 2, 20, 5),
    leaderboardSec:   clamp(raw.leaderboardSec, 2, 30, 6),
    allowGuests:      raw.allowGuests !== false,
    maxPlayers:       clamp(raw.maxPlayers, 2, 500, 100),
    powerUpPool:      Array.isArray(raw.powerUpPool)
      ? [...new Set(raw.powerUpPool.filter(p => PWR_ENUM.includes(p)))]
      : ['fiftyFifty', 'doublePoints', 'shield'],
    streaksEnabled:    !!raw.streaksEnabled,
    underdogBonus:     !!raw.underdogBonus,
    shuffleQuestions:  !!raw.shuffleQuestions,
    bossRoundEnabled:  !!raw.bossRoundEnabled,
    crownCarryEnabled: !!raw.crownCarryEnabled,
    audioVibe: VIBE_ENUM.has(raw.audioVibe) ? raw.audioVibe : 'default',
  };
}

// List my arena tests (with optional search).
router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { creator: req.user._id };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // PERF: list view (MyArenaTests) only needs entries.length — drop the heavy
    // embedded payloads (each can carry 4-language translations + media).
    // Project `entries._id` so length is preserved, skip populate, use .lean().
    const projection = {
      title: 1, description: 1, tags: 1, settings: 1,
      isPublished: 1, lastUsedAt: 1, usageCount: 1,
      createdAt: 1, updatedAt: 1,
      'entries._id': 1
    };
    const [tests, total] = await Promise.all([
      ArenaTest.find(query, projection)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ArenaTest.countDocuments(query)
    ]);
    res.json({
      tests,
      total,
      page: parseInt(page),
      totalPages: Math.max(1, Math.ceil(total / parseInt(limit)))
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения арена-тестов' });
  }
});

// Get one arena test (with bank questions populated for editing/preview).
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await ArenaTest.findOne({ _id: req.params.id, creator: req.user._id })
      .populate('entries.bankQuestion');
    if (!test) return res.status(404).json({ message: 'Арена-тест не найден' });
    res.json({ test });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения арена-теста' });
  }
});

// Create new arena test.
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, cover, entries, settings, tags, isPublished } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Название обязательно' });
    }
    const cleanEntries = sanitizeEntries(entries);
    if (!cleanEntries.length) {
      return res.status(400).json({ message: 'Добавьте хотя бы один вопрос' });
    }
    // Ownership check only for bank-kind entries; embedded are creator-authored.
    const bankIds = cleanEntries.filter(e => e.kind === 'bank').map(e => e.bankQuestion);
    let ownedSet = new Set();
    if (bankIds.length) {
      const owned = await BankQuestion.find({ _id: { $in: bankIds }, creator: req.user._id }).select('_id');
      ownedSet = new Set(owned.map(d => String(d._id)));
    }
    const filtered = cleanEntries.filter(e =>
      e.kind === 'embedded' || ownedSet.has(String(e.bankQuestion))
    );
    if (!filtered.length) {
      return res.status(400).json({ message: 'Вопросы не найдены или вам не принадлежат' });
    }

    const created = await ArenaTest.create({
      creator: req.user._id,
      title: String(title).trim().slice(0, 140),
      description: String(description || '').slice(0, 1000),
      cover: typeof cover === 'string' ? cover.slice(0, 500) : '',
      entries: filtered,
      settings: sanitizeSettings(settings),
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20) : [],
      isPublished: !!isPublished,
    });
    res.status(201).json({ test: created });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания арена-теста' });
  }
});

// Update arena test.
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, cover, entries, settings, tags, isPublished } = req.body || {};
    const test = await ArenaTest.findOne({ _id: req.params.id, creator: req.user._id });
    if (!test) return res.status(404).json({ message: 'Арена-тест не найден' });

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'Название обязательно' });
      test.title = String(title).trim().slice(0, 140);
    }
    if (description !== undefined) test.description = String(description || '').slice(0, 1000);
    if (cover !== undefined) test.cover = typeof cover === 'string' ? cover.slice(0, 500) : '';
    if (entries !== undefined) {
      const cleanEntries = sanitizeEntries(entries);
      // Ownership filter (same as create) — only for bank-kind entries.
      const bankIds = cleanEntries.filter(e => e.kind === 'bank').map(e => e.bankQuestion);
      let ownedSet = new Set();
      if (bankIds.length) {
        const owned = await BankQuestion.find({ _id: { $in: bankIds }, creator: req.user._id }).select('_id');
        ownedSet = new Set(owned.map(d => String(d._id)));
      }
      test.entries = cleanEntries.filter(e =>
        e.kind === 'embedded' || ownedSet.has(String(e.bankQuestion))
      );
      if (!test.entries.length) {
        return res.status(400).json({ message: 'Должен быть хотя бы один вопрос' });
      }
    }
    if (settings !== undefined) test.settings = sanitizeSettings(settings);
    if (tags !== undefined) {
      test.tags = Array.isArray(tags)
        ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : [];
    }
    if (isPublished !== undefined) test.isPublished = !!isPublished;

    await test.save();
    res.json({ test });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления арена-теста' });
  }
});

// Delete arena test.
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await ArenaTest.findOneAndDelete({ _id: req.params.id, creator: req.user._id });
    if (!result) return res.status(404).json({ message: 'Арена-тест не найден' });
    res.json({ message: 'Удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

// Promote an embedded entry into the user's BankQuestion bank.
// Body: { entryIndex }. Replaces the embedded payload with a bankQuestion ref
// while preserving timerOverride/pointsOverride/tag.
router.post('/:id/promote-to-bank', auth, async (req, res) => {
  try {
    const { entryIndex } = req.body || {};
    const test = await ArenaTest.findOne({ _id: req.params.id, creator: req.user._id });
    if (!test) return res.status(404).json({ message: 'Арена-тест не найден' });
    const idx = parseInt(entryIndex, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= test.entries.length) {
      return res.status(400).json({ message: 'Некорректный entryIndex' });
    }
    const entry = test.entries[idx];
    if (entry.kind !== 'embedded' || !entry.embedded) {
      return res.status(400).json({ message: 'Этот вопрос уже в банке' });
    }
    const e = entry.embedded;
    const bankDoc = await BankQuestion.create({
      creator: req.user._id,
      type: e.type,
      questionText: e.questionText,
      points: e.points || 1,
      options: (e.options || []).map(o => ({
        id: o.id,
        text: o.text,
        isCorrect: !!o.isCorrect,
        matchPair: o.matchPair || ''
      })),
      correctAnswer: e.correctAnswer || '',
      explanation: e.explanation || '',
      tags: [],
      category: ''
    });
    test.entries[idx] = {
      kind: 'bank',
      bankQuestion: bankDoc._id,
      embedded: null,
      timerOverride: entry.timerOverride,
      pointsOverride: entry.pointsOverride,
      tag: entry.tag || 'normal'
    };
    await test.save();
    res.json({ test, bankQuestion: bankDoc });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка переноса в банк' });
  }
});

// Duplicate (clone with reset usageCount).
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ArenaTest.findOne({ _id: req.params.id, creator: req.user._id });
    if (!original) return res.status(404).json({ message: 'Арена-тест не найден' });
    const copy = original.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.title = `${copy.title} (копия)`;
    copy.usageCount = 0;
    copy.lastUsedAt = null;
    copy.isPublished = false;
    const created = await ArenaTest.create(copy);
    res.status(201).json({ test: created });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка дублирования' });
  }
});

module.exports = router;
