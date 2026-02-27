const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const optionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4() },
  text: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  matchPair: { type: String, default: '' } // For matching questions
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4() },
  type: {
    type: String,
    enum: [
      'single-choice',     // One correct answer
      'multiple-choice',   // Multiple correct answers
      'true-false',        // True / False / Not stated
      'essay',             // Free text answer
      'matching',          // Match pairs
      'fill-blank'         // Fill in the blank
    ],
    required: true
  },
  questionText: { type: String, required: true },
  passage: { type: String, default: '' }, // Optional reading passage/text for the question
  points: { type: Number, default: 1, min: 0 },
  options: [optionSchema],
  correctAnswer: { type: String, default: '' }, // For essay keyword / fill-blank
  media: {
    type: { type: String, enum: ['image', 'video', 'audio', ''], default: '' },
    url: { type: String, default: '' },
    fileName: { type: String, default: '' }
  },
  explanation: { type: String, default: '' }, // Optional explanation after answering
  order: { type: Number, default: 0 }
}, { _id: false });

const testSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  settings: {
    timeLimit: { type: Number, default: 0 }, // in minutes, 0 = no limit
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    maxAttempts: { type: Number, default: 1 },
    isPublic: { type: Boolean, default: false },
    antiCheat: {
      blockTabSwitch: { type: Boolean, default: true },
      blockCopyPaste: { type: Boolean, default: true },
      blockScreenshot: { type: Boolean, default: true },
      maxViolations: { type: Number, default: 5 }
    },
    instantFeedback: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    allowComments: { type: Boolean, default: true },
    questionPoolSize: { type: Number, default: 0, min: 0 }, // 0 = use all questions
    inactivityTimeout: { type: Number, default: 0, min: 0 } // minutes, 0 = disabled
  },
  isDeleted: { type: Boolean, default: false },
  deleteReason: { type: String, default: '' },
  shareLink: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },
  tags: [{ type: String, trim: true }],
  coverImage: { type: String, default: '' },
  totalPoints: { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 }
  }]
}, { timestamps: true });

// Calculate total points before saving
testSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  next();
});

// Index for search
testSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Test', testSchema);
