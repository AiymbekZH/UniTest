const mongoose = require('mongoose');

const challengeRewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengeKey: { type: String, required: true },
  challengeType: {
    type: String,
    enum: ['daily', 'weekly'],
    required: true
  },
  rewardXp: { type: Number, required: true, min: 0 },
  awardedAt: { type: Date, default: Date.now },
  relatedTestIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  result: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null }
}, { timestamps: true });

challengeRewardSchema.index({ user: 1, challengeKey: 1 }, { unique: true });
challengeRewardSchema.index({ user: 1, awardedAt: -1 });

module.exports = mongoose.model('ChallengeReward', challengeRewardSchema);
