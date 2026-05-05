const mongoose = require('mongoose');

/**
 * Sticker pack metadata. Stickers themselves live in the `Sticker` collection
 * (separate doc per sticker) — embedding them in this doc would push the
 * pack past Mongo's 16 MB ceiling once a pack hits ~50 PNGs at 200KB each.
 *
 * Public packs show up in the discover tab. Installing a public pack adds
 * its `_id` to the user's `installedPacks` (handled in /routes/stickers).
 */
const stickerPackSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: '', trim: true, maxlength: 300 },

  // Optional small thumbnail (base64) — first sticker is auto-used if blank.
  // Kept inline so the pack list grid renders without an extra query per pack.
  cover: { type: String, default: '' },

  isPublic: { type: Boolean, default: false, index: true },

  // Cached count + denormalised installs counter for cheap sorting in the
  // discover tab. Updated by route handlers, not by hooks (hooks would
  // trigger on every sticker save).
  stickerCount: { type: Number, default: 0 },
  installCount: { type: Number, default: 0 },

  // List of users who installed this pack. Used for /api/stickers/my which
  // also includes installed-not-owned packs. Capped at 10000 — past that
  // we should switch to a separate StickerInstall collection.
  installedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// "Most popular public packs" feed (discover tab).
stickerPackSchema.index({ isPublic: 1, installCount: -1, createdAt: -1 });

// Soft-validate the per-user pack cap. Hard cap enforced at route layer.
stickerPackSchema.statics.PACK_LIMIT_PER_USER = 20;

module.exports = mongoose.model('StickerPack', stickerPackSchema);
