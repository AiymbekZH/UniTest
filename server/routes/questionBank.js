const express = require('express');
const BankQuestion = require('../models/BankQuestion');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Sort whitelist (prevents arbitrary mongo sort injection).
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  most_used: { usageCount: -1, createdAt: -1 },
  least_used: { usageCount: 1, createdAt: -1 },
  alpha: { questionText: 1 }
};

// Get all my bank questions (with search/filter)
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, category, tag, sort = 'newest', page = 1, limit = 20 } = req.query;
    const query = { creator: req.user._id };

    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const sortClause = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const questions = await BankQuestion.find(query)
      .sort(sortClause)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BankQuestion.countDocuments(query);
    const [categories, tags] = await Promise.all([
      BankQuestion.distinct('category', { creator: req.user._id }),
      BankQuestion.distinct('tags', { creator: req.user._id })
    ]);

    res.json({
      questions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      categories: categories.filter(Boolean),
      tags: (tags || []).filter(Boolean).sort()
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения вопросов' });
  }
});

// Distinct tag list (lighter endpoint for filter dropdowns).
router.get('/tags', auth, async (req, res) => {
  try {
    const tags = await BankQuestion.distinct('tags', { creator: req.user._id });
    res.json({ tags: (tags || []).filter(Boolean).sort() });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения тегов' });
  }
});

// Add question to bank
router.post('/', auth, async (req, res) => {
  try {
    const question = new BankQuestion({
      ...req.body,
      creator: req.user._id
    });
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сохранения вопроса' });
  }
});

// Bulk add questions to bank (from test)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { questions, category, tags } = req.body;
    
    // Filter out empty questions and map to schema
    const formatted = questions
      .filter(q => q.questionText && q.questionText.trim())
      .map(q => ({
        creator: req.user._id,
        type: q.type,
        questionText: q.questionText,
        points: q.points || 1,
        options: (q.options || []).map(o => ({
          text: o.text || '',
          isCorrect: o.isCorrect || false,
          matchPair: o.matchPair || ''
        })),
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        category: category || '',
        tags: tags || []
      }));

    if (formatted.length === 0) {
      return res.status(400).json({ message: 'Нет вопросов для сохранения' });
    }

    const saved = await BankQuestion.insertMany(formatted);
    res.status(201).json({ count: saved.length, message: `Сохранено ${saved.length} вопросов` });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сохранения' });
  }
});

// Update question
router.put('/:id', auth, async (req, res) => {
  try {
    const question = await BankQuestion.findOneAndUpdate(
      { _id: req.params.id, creator: req.user._id },
      req.body,
      { new: true }
    );
    if (!question) return res.status(404).json({ message: 'Вопрос не найден' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления' });
  }
});

// Delete question
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await BankQuestion.findOneAndDelete({
      _id: req.params.id,
      creator: req.user._id
    });
    if (!question) return res.status(404).json({ message: 'Вопрос не найден' });
    res.json({ message: 'Вопрос удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

// Delete multiple questions
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    await BankQuestion.deleteMany({ _id: { $in: ids }, creator: req.user._id });
    res.json({ message: 'Вопросы удалены' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

// Duplicate a question (creates a clone with usageCount reset).
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await BankQuestion.findOne({ _id: req.params.id, creator: req.user._id });
    if (!original) return res.status(404).json({ message: 'Вопрос не найден' });

    const copy = original.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.usageCount = 0;
    copy.questionText = `${copy.questionText} (копия)`;
    // Force regenerate option ids so they don't collide on rendering.
    if (Array.isArray(copy.options)) {
      copy.options = copy.options.map(o => ({ ...o, id: undefined }));
    }

    const created = await BankQuestion.create(copy);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка дублирования' });
  }
});

// Bulk increment usageCount when bank questions are pulled into a test/arena snapshot.
router.post('/bump-usage', auth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids обязательны' });
    }
    const result = await BankQuestion.updateMany(
      { _id: { $in: ids }, creator: req.user._id },
      { $inc: { usageCount: 1 } }
    );
    res.json({ matched: result.matchedCount ?? result.n ?? 0 });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка учёта использования' });
  }
});

module.exports = router;
