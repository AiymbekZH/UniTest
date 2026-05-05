const mongoose = require('mongoose');

const dmMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    // 'sticker' added Phase 1 — routed through this same socket flow until
    // the Phase 5 cutover to ChatMessage. 'album' / 'poll' reserved.
    enum: ['text', 'image', 'video', 'file', 'audio', 'arena_invite', 'sticker', 'album', 'poll'],
    default: 'text'
  },

  text: { type: String, default: '' },

  attachments: [{
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    data: { type: String },
  }],

  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },

  isEdited: { type: Boolean, default: false },
  // Phase 1: precise edit timestamp + 24h enforcement window. `isEdited`
  // stays as the boolean fast-path some legacy queries rely on.
  editedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },

  // Forward snapshot — see ChatMessage.js for the field rationale. We
  // denormalize the origin so a deleted source message still renders the
  // "from X" attribution.
  forwardedFrom: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    chatType: { type: String, enum: ['dm', 'group'] },
    chatId: { type: mongoose.Schema.Types.ObjectId },
  },

  // DMs don't have @mentions yet, but we keep the field so the unified
  // search endpoint doesn't have to special-case its absence.
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
}, { timestamps: true });

dmMessageSchema.index({ conversation: 1, createdAt: -1 });
dmMessageSchema.index({ conversation: 1, sender: 1, readBy: 1, isDeleted: 1 });
// Global search across the user's DMs (Phase 4 /api/messages/search).
dmMessageSchema.index({ text: 'text' }, { name: 'dm_text_search' });

module.exports = mongoose.model('DMMessage', dmMessageSchema);
