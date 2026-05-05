const mongoose = require('mongoose');

/**
 * Unified chat message model.
 *
 * Phase 1: this schema exists alongside DMMessage and (group) Message but
 * is NOT yet written to by live code paths. The Phase 5 migration script
 * (`server/scripts/migrate-chat-messages.js`) copies the existing two
 * collections into here, after which the old models become read-only and
 * are eventually deleted.
 *
 * Why one model: DMs and groups have ~95% overlapping fields (text,
 * attachments, replyTo, reactions, readBy, deletedFor, isDeleted, isEdited).
 * Having two collections meant duplicating 600+ lines of socket handlers,
 * route logic, and indexing strategy. With a single shape we can write one
 * `editMessage()` / `forwardMessage()` / `searchMessages()` once and run
 * it polymorphically.
 *
 * Discriminator: `chatType` + `chatId`. `chatType: 'dm'` means `chatId`
 * points to a DirectMessage doc; `chatType: 'group'` points to a Group doc.
 * No `populate()` virtual is defined here because the lookup target depends
 * on chatType — callers fetch the parent explicitly.
 */
const chatMessageSchema = new mongoose.Schema({
  // ── Discriminator ──
  chatType: {
    type: String,
    enum: ['dm', 'group'],
    required: true,
    index: true,
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    // refPath would be cleaner but we keep it loose so test fixtures and
    // the migration script can plug in custom IDs without breaking refs.
  },

  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Content ──
  type: {
    type: String,
    enum: [
      'text',
      'image',
      'video',
      'file',
      'audio',
      'sticker',      // new — separate from `image` because it's a 1:1 reference to a StickerPack entry
      'arena_invite',
      'system',       // group-only system messages (joined/left/kicked)
      'poll',         // future: lightweight in-chat polls
      'album',        // future: 2-10 grouped media in a single bubble
    ],
    default: 'text',
  },

  text: { type: String, default: '', maxlength: 4096 },

  attachments: [{
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    data: { type: String }, // base64 — same in-doc storage as the legacy schemas
    // Optional pre-computed thumbnail (smaller base64) for fast list rendering.
    // Currently unused; reserved for Phase 3 image gallery.
    thumbnail: { type: String },
  }],

  // ── Threading / forwards / mentions ──
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null,
  },

  // When this message is a forward, denormalize a small snapshot of the
  // origin so we can render "Переслано от X" without extra queries even
  // if the original is later deleted.
  forwardedFrom: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    chatType: { type: String, enum: ['dm', 'group'] },
    chatId: { type: mongoose.Schema.Types.ObjectId },
  },

  // Group @mentions. DMs always set this to []. Tracked separately from
  // the text so we can fan out push notifications without parsing.
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Lifecycle flags ──
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  isPinned: { type: Boolean, default: false }, // group-only meaningfully
  isDeleted: { type: Boolean, default: false },

  // For "delete only for me" — the sender stays here, the recipient hides it.
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Read receipts ──
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Reactions (DM had this; group didn't — now both do) ──
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],

  // ── Free-form metadata bucket ──
  // Used for: arena_invite { roomId, joinCode, sourceType, invitedUserId,
  // duelStatus }, sticker { stickerId, packId }, poll { options, votes },
  // album { count }, etc. Shape varies by `type`.
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// ── Indexes ──
// Primary fetch path for any chat: "give me the last N messages in this
// chat (excluding ones deleted for me)". Compound index lets Mongo serve
// the `find({ chatType, chatId, deletedFor: { $ne: me } }).sort({ createdAt: -1 })`
// query without an in-memory sort.
chatMessageSchema.index({ chatType: 1, chatId: 1, createdAt: -1 });

// Pinned-only fetch (group settings panel + "pinned" badge in chat header).
chatMessageSchema.index({ chatType: 1, chatId: 1, isPinned: 1 });

// Global search by sender. Used by the Phase 4 message search modal when
// the user filters "from me".
chatMessageSchema.index({ sender: 1, createdAt: -1 });

// Global text search across all my chats (Phase 4 /api/messages/search).
// Mongo $text index — single per collection. Keep this minimal so it
// doesn't blow up storage.
chatMessageSchema.index({ text: 'text' }, { name: 'text_search' });

// Fast unread aggregate for the chat list.
chatMessageSchema.index({ chatType: 1, chatId: 1, sender: 1, readBy: 1, isDeleted: 1 });

// Mention notification fanout.
chatMessageSchema.index({ mentions: 1, createdAt: -1 });

// ── Virtuals / helpers ──
chatMessageSchema.virtual('isForward').get(function () {
  return Boolean(this.forwardedFrom?.messageId);
});

// Edit window: 24h after createdAt. Returns true if `userId` is allowed
// to edit this message right now. Used by /api/messages/:id/edit.
chatMessageSchema.methods.canBeEditedBy = function (userId) {
  if (!userId) return false;
  if (this.isDeleted) return false;
  if (String(this.sender) !== String(userId)) return false;
  if (this.type !== 'text') return false; // can't edit attachments/stickers/system
  const ageMs = Date.now() - new Date(this.createdAt).getTime();
  return ageMs < 24 * 60 * 60 * 1000;
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
