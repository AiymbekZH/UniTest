const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorEmail: { type: String, default: '' },

  // What was done
  action: {
    type: String,
    required: true,
    enum: [
      'ban_user', 'unban_user',
      'change_role', 'warn_user',
      'delete_test', 'delete_comment',
      'delete_group', 'delete_message',
      'grant_ai_access', 'revoke_ai_access',
      'mass_action', 'admin_login',
      'other'
    ],
    index: true
  },

  // Target of the action
  targetType: { type: String, enum: ['user', 'test', 'comment', 'group', 'message', 'other'], default: 'other' },
  targetId: { type: String, default: '' },
  targetLabel: { type: String, default: '' },  // human-readable (e.g. "Ivan Petrov")

  // Details
  details: { type: String, default: '', maxlength: 500 },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Request context
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now, index: true }
});

// Auto-expire after 180 days to keep the collection bounded
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
