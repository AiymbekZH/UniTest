const mongoose = require('mongoose');

const ticketClaimSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: '' },
  variantNumber: { type: Number, required: true }, // 1-based variant number
  claimedAt: { type: Date, default: Date.now },
  // Auto-expire after 3 hours (in case student abandons)
  expiresAt: { type: Date, default: () => new Date(Date.now() + 3 * 60 * 60 * 1000) }
}, { timestamps: true });

// Compound index: one variant per test can only be claimed once (active claims)
ticketClaimSchema.index({ test: 1, variantNumber: 1 }, { unique: true });
// Index for user lookup
ticketClaimSchema.index({ test: 1, user: 1 });
// TTL index to auto-delete expired claims
ticketClaimSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TicketClaim', ticketClaimSchema);
