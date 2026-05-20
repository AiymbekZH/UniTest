const mongoose = require('mongoose');

/**
 * Report schema — abuse / complaint reports filed by users.
 *
 * Major changes vs the original:
 *   - severity / priority for triage
 *   - reasonCategory enum so the dashboard can chart "what gets reported the most"
 *   - targetSnapshot: a frozen copy of essential target data at the moment the
 *     report was filed, so admins still see context if the target later gets
 *     deleted (test/comment removed, user banned away, etc.).
 *   - actionsTaken: in-place audit trail per report
 *   - dedupeKey for clustering ("5 jets on this test")
 *   - resolution enum so we can tell *how* a report was closed
 *
 * Old data continues to work — every new field has a safe default.
 */
const targetSnapshotSchema = new mongoose.Schema({
  type: { type: String, enum: ['test', 'comment', 'user', 'message'], required: true },
  refId: { type: String, default: '' },
  // Generic display fields — front-end picks what's relevant per type.
  title: { type: String, default: '' },        // test title / username
  excerpt: { type: String, default: '' },      // comment text / message text / bio
  ownerLabel: { type: String, default: '' },   // creator name (for tests/comments/messages)
  ownerId: { type: String, default: '' },
  capturedAt: { type: Date, default: Date.now }
}, { _id: false });

const actionsTakenSchema = new mongoose.Schema({
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byLabel: { type: String, default: '' },
  action: { type: String, default: '' },        // e.g. "warned_target", "deleted_test"
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['test', 'comment', 'user', 'message'], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  reason: { type: String, required: true, trim: true, maxlength: 500 },
  reasonCategory: {
    type: String,
    enum: [
      'spam', 'harassment', 'hate_speech', 'sexual', 'violence',
      'self_harm', 'misinformation', 'cheating', 'copyright',
      'underage', 'illegal', 'other'
    ],
    default: 'other',
    index: true
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },

  // Frozen snapshot of the target at submit time
  targetSnapshot: { type: targetSnapshotSchema, default: () => ({}) },

  // De-duplication key. We hash (targetType + ':' + targetId) so all reports
  // about the same object cluster together.
  dedupeKey: { type: String, index: true, default: '' },

  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  resolution: {
    type: String,
    enum: [
      '', 'no_action', 'warning_issued', 'content_removed',
      'user_muted', 'user_suspended', 'user_banned',
      'duplicate', 'spam_report'
    ],
    default: ''
  },
  adminNote: { type: String, default: '', maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },

  actionsTaken: { type: [actionsTakenSchema], default: [] }
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ dedupeKey: 1, createdAt: -1 });
reportSchema.index({ reasonCategory: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
