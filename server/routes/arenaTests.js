const express = require('express');
const ArenaTest = require('../models/ArenaTest');
const BankQuestion = require('../models/BankQuestion');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Reasonable defaults / clamps for the settings object.
const PWR_ENUM = ['fiftyFifty', 'doublePoints', 'shield', 'timeFreeze', 'steal', 'mirror', 'suddenDeath'];

function sanitizeEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map(e => ({
      bankQuestion: e?.bankQuestion || e?.bankQuestionId,
      timerOverride: Number.isFinite(Number(e?.timerOverride))
        ? Math.max(5, Math.min(300, Number(e.timerOverride)))
        : null,
      pointsOverride: Number.isFinite(Number(e?.pointsOverride))
        ? Math.max(0, Math.min(1000, Number(e.pointsOverride)))
        : null,
    }))
    .filter(e => !!e.bankQuestion);
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
    streaksEnabled:   !!raw.streaksEnabled,
    underdogBonus:    !!raw.underdogBonus,
    shuffleQuestions: !!raw.shuffleQuestions,
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
    const [tests, total] = await Promise.all([
      ArenaTest.find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)),
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
    // Ownership check on bank questions — drop those that don't belong to this user.
    const bankIds = cleanEntries.map(e => e.bankQuestion);
    const owned = await BankQuestion.find({ _id: { $in: bankIds }, creator: req.user._id }).select('_id');
    const ownedSet = new Set(owned.map(d => String(d._id)));
    const filtered = cleanEntries.filter(e => ownedSet.has(String(e.bankQuestion)));
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
      // Ownership filter (same as create).
      const bankIds = cleanEntries.map(e => e.bankQuestion);
      const owned = await BankQuestion.find({ _id: { $in: bankIds }, creator: req.user._id }).select('_id');
      const ownedSet = new Set(owned.map(d => String(d._id)));
      test.entries = cleanEntries.filter(e => ownedSet.has(String(e.bankQuestion)));
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
