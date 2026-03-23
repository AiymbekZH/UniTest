const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, default: '' },
  questions: { type: mongoose.Schema.Types.Mixed, required: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });

// Index for getting fastest access to user's descending history
aiHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AiHistory', aiHistorySchema);
