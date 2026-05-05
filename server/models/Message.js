const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    // 'sticker' added Phase 1 — same flow as DMMessage. 'album' / 'poll' reserved.
    enum: ['text', 'image', 'video', 'file', 'audio', 'system', 'arena_invite', 'sticker', 'album', 'poll'],
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
  // Phase 1: precise edit timestamp. See DMMessage.js for the rationale.
  editedAt: { type: Date, default: null },
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },

  forwardedFrom: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    chatType: { type: String, enum: ['dm', 'group'] },
    chatId: { type: mongoose.Schema.Types.ObjectId },
  },

  // Group @mentions — array of userIds tagged via `@username`. Used by the
  // mention-notification socket fanout in Phase 4.
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Reactions — brought to feature parity with DMMessage. Group chat had
  // no reactions before; we add the field so the unified MessageBubble can
  // render them on both sides.
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],

  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ group: 1, isPinned: 1 });
messageSchema.index({ group: 1, sender: 1, type: 1, isDeleted: 1, createdAt: -1 });
// Mention notification fanout.
messageSchema.index({ mentions: 1, createdAt: -1 });
// Global search across the user's groups (Phase 4 /api/messages/search).
messageSchema.index({ text: 'text' }, { name: 'group_text_search' });

module.exports = mongoose.model('Message', messageSchema);
