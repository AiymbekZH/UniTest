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
      'temp_ban_user', 'mute_user', 'suspend_user',
      'change_role', 'warn_user', 'clear_warnings',
      'send_message',
      'delete_test', 'delete_comment',
      'delete_group', 'delete_message',
      'delete_result',
      'delete_question',
      'edit_user_notes',
      'grant_ai_access', 'revoke_ai_access',
      'mass_action',
      'admin_login',
      'report_status_change', 'report_action',
      'email_verified',
      'other'
    ],
    index: true
  },

  // Target of the action
  targetType: { type: String, enum: ['user', 'test', 'comment', 'group', 'message', 'report', 'result', 'question', 'other'], default: 'other' },
  targetId: { type: String, default: '' },
  targetLabel: { type: String, default: '' },  // human-readable (e.g. "Ivan Petrov")

  // Details
  details: { type: String, default: '', maxlength: 500 },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Request context
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now }
});

// Single index on createdAt with TTL — also serves the recent-first query order.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
