const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  key: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
}, { _id: false });

const userProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  xp: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  currentStreakDays: { type: Number, default: 0, min: 0 },
  longestStreakDays: { type: Number, default: 0, min: 0 },
  lastActivityDate: { type: Date, default: null },
  badges: { type: [badgeSchema], default: [] },
  stats: {
    completedExams: { type: Number, default: 0, min: 0 },
    completedPracticeRuns: { type: Number, default: 0, min: 0 },
    totalCompleted: { type: Number, default: 0, min: 0 },
    perfectScores: { type: Number, default: 0, min: 0 },
    top3Finishes: { type: Number, default: 0, min: 0 }
  }
}, { timestamps: true });

userProgressSchema.index({ xp: -1, updatedAt: -1 });

module.exports = mongoose.model('UserProgress', userProgressSchema);
