const mongoose = require('mongoose');

/**
 * Individual sticker. One doc per sticker — not embedded in StickerPack
 * (see the comment in StickerPack.js for why).
 *
 * `image` holds a base64 data string (PNG/WebP, transparent background).
 * Soft cap: 512 KB pre-base64 (~700KB encoded) — enforced in the route.
 *
 * `emoji` is an optional shortcut character used by the client picker for
 * the "search by emoji" feature in Phase 3. Any number of stickers can
 * share an emoji.
 *
 * `position` is a manually-orderable index inside the pack. Default sort
 * is `position` ASC then createdAt ASC so newly-added stickers go to the
 * end unless the user reorders them.
 */
const stickerSchema = new mongoose.Schema({
  pack: { type: mongoose.Schema.Types.ObjectId, ref: 'StickerPack', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  image: { type: String, required: true }, // base64 (data:image/webp;base64,... or raw)
  mimetype: { type: String, default: 'image/webp' },

  emoji: { type: String, default: '', maxlength: 8 },
  position: { type: Number, default: 0 },

  // Tracks how this sticker entered the pack. Useful for analytics +
  // future moderation. `'ai'` is kept in the enum only to not invalidate
  // any docs created during the short-lived Pollinations.ai integration
  // (Phase 1 → removed in 2026-05); no new code path produces it.
  source: {
    type: String,
    enum: ['upload', 'background_removed', 'editor', 'ai'],
    default: 'upload',
  },
}, { timestamps: true });

// Default fetch path: all stickers in a pack, in display order.
stickerSchema.index({ pack: 1, position: 1, createdAt: 1 });

// Soft caps; route layer enforces the hard limit.
stickerSchema.statics.PER_PACK_LIMIT = 100;
stickerSchema.statics.MAX_IMAGE_BYTES = 512 * 1024; // 512 KB raw before base64

module.exports = mongoose.model('Sticker', stickerSchema);
