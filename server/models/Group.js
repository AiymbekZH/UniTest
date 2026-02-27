const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  assignedTests: [{
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    assignedAt: { type: Date, default: Date.now },
    deadline: { type: Date, default: null }
  }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

groupSchema.index({ inviteCode: 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
