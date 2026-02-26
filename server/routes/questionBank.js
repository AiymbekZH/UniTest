const express = require('express');
const BankQuestion = require('../models/BankQuestion');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all my bank questions (with search/filter)
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, category, page = 1, limit = 20 } = req.query;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const questions = await BankQuestion.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BankQuestion.countDocuments(query);
    const categories = await BankQuestion.distinct('category', { creator: req.user._id });

    res.json({
      questions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      categories: categories.filter(Boolean)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения вопросов', error: error.message });
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
    res.status(500).json({ message: 'Ошибка сохранения вопроса', error: error.message });
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
    res.status(500).json({ message: 'Ошибка сохранения', error: error.message });
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
    res.status(500).json({ message: 'Ошибка обновления', error: error.message });
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
    res.status(500).json({ message: 'Ошибка удаления', error: error.message });
  }
});

// Delete multiple questions
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    await BankQuestion.deleteMany({ _id: { $in: ids }, creator: req.user._id });
    res.json({ message: 'Вопросы удалены' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления', error: error.message });
  }
});

module.exports = router;
