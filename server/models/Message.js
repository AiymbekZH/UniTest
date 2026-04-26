const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'audio', 'system', 'arena_invite'],
    default: 'text'
  },

  text: { type: String, default: '' },

  attachments: [{
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    data: { type: String }, // base64
  }],

  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ group: 1, isPinned: 1 });
messageSchema.index({ group: 1, sender: 1, type: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
