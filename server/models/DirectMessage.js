const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  // Standard DMs hold exactly 2 distinct user ids. The "Saved
  // Messages" virtual chat (Phase 4) is single-participant — the
  // owner only — and identified by isSelf: true. The auth checks
  // throughout dm.js work uniformly on `participants.some(...)`,
  // so the single-participant shape doesn't need a special path.
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isSelf: { type: Boolean, default: false, index: true },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },
  lastActivity: { type: Date, default: Date.now },
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

directMessageSchema.index({ participants: 1 });
directMessageSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
