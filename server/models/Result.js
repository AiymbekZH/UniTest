const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  selectedOptions: [{ type: String }],  // IDs of selected options
  textAnswer: { type: String, default: '' }, // For essay/fill-blank
  matchingPairs: [{ left: String, right: String }], // For matching
  isCorrect: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
  type: { type: String, default: '' },        // Question type for display
  questionText: { type: String, default: '' }, // Question text for display
  maxPoints: { type: Number, default: 0 },     // Max points for this question
  userAnswer: { type: String, default: '' },   // Human-readable user answer
  feedback: { type: String, default: '' }      // Teacher feedback for essay
}, { _id: false });

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['tab-switch', 'copy', 'paste', 'screenshot', 'right-click', 'devtools'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String, default: '' }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: '' }, // For unregistered users
  answers: [answerSchema],
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  violations: [violationSchema],
  violationCount: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  timeSpent: { type: Number, default: 0 }, // in seconds
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  }
}, { timestamps: true });

// Calculate percentage before saving
resultSchema.pre('save', function(next) {
  if (this.totalPoints > 0) {
    this.percentage = Math.round((this.score / this.totalPoints) * 100);
  }
  this.violationCount = this.violations.length;
  next();
});

// Indexes for common queries
resultSchema.index({ test: 1, status: 1 });
resultSchema.index({ user: 1, status: 1 });
resultSchema.index({ test: 1, user: 1, status: 1 });

module.exports = mongoose.model('Result', resultSchema);
