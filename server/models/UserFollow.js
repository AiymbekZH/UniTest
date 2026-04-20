const mongoose = require('mongoose');

const userFollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

userFollowSchema.index({ follower: 1, following: 1 }, { unique: true });
userFollowSchema.index({ following: 1, createdAt: -1 });
userFollowSchema.index({ follower: 1, createdAt: -1 });

module.exports = mongoose.model('UserFollow', userFollowSchema);
