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
  usageCount: { type: Number, default: 0 },

  // ─── Arena-specific authoring fields (Phase 2 / inline-create) ───────
  // speedProfile: 'blitz' | 'normal' | 'marathon' — preset for timer + points.
  // Stored on the bank so any arena reusing the question keeps the profile.
  speedProfile: {
    type: String,
    enum: ['blitz', 'normal', 'marathon', 'custom'],
    default: 'normal'
  },
  // Per-question timer (sec) for arenas; if null, falls back to room default.
  timerSec: { type: Number, default: null, min: 5, max: 300 },
  // Marks one option (by id) as the "trap" — selecting it costs 20% streak.
  // Only meaningful for single-choice / multiple-choice questions.
  trapOptionId: { type: String, default: '' },
  // If true, no power-ups can be activated on this question (boss-level).
  blockPowerUps: { type: Boolean, default: false },
  // Optional one-line hint revealed automatically at 50% of the timer.
  revealHint: { type: String, default: '', maxlength: 200 },
  // Shuffle answer options independently per player (Kahoot-style anti-cheat).
  shuffleOptions: { type: Boolean, default: true }
}, { timestamps: true });

bankQuestionSchema.index({ questionText: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('BankQuestion', bankQuestionSchema);
