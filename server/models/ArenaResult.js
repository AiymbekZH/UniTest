const mongoose = require('mongoose');

const arenaResultSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'ArenaRoom', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: '' },
  sourceType: { type: String, enum: ['public', 'group', 'dm_duel'], required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', default: null },
  placement: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  answeredCount: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  totalResponseTimeMs: { type: Number, default: 0 },
  xpAwarded: { type: Number, default: 0 },
  badgesAwarded: [{ type: String }],
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

arenaResultSchema.index({ user: 1, completedAt: -1 });
arenaResultSchema.index({ room: 1, placement: 1 });

module.exports = mongoose.model('ArenaResult', arenaResultSchema);
