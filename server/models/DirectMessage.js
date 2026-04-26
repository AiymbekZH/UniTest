const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // exactly 2
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },
  lastActivity: { type: Date, default: Date.now },
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

directMessageSchema.index({ participants: 1 });
directMessageSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
