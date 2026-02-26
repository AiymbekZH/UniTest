const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bankQuestionSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['single-choice', 'multiple-choice', 'true-false', 'essay', 'matching', 'fill-blank'],
    required: true
  },
  questionText: { type: String, required: true },
  points: { type: Number, default: 1, min: 0 },
  options: [{
    id: { type: String, default: () => uuidv4() },
    text: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    matchPair: { type: String, default: '' }
  }],
  correctAnswer: { type: String, default: '' },
  explanation: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  category: { type: String, default: '', trim: true },
  usageCount: { type: Number, default: 0 }
}, { timestamps: true });

bankQuestionSchema.index({ questionText: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('BankQuestion', bankQuestionSchema);
