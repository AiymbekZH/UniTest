/**
 * Audit logging helper for admin/critical actions.
 *
 * Usage:
 *   const { logAudit } = require('../utils/audit');
 *   await logAudit(req, {
 *     action: 'ban_user',
 *     targetType: 'user',
 *     targetId: userId,
 *     targetLabel: 'Ivan Petrov',
 *     details: 'Спам'
 *   });
 */
const AuditLog = require('../models/AuditLog');

async function logAudit(req, entry) {
  try {
    await AuditLog.create({
      actor: req.user?._id || req.user?.id,
      actorEmail: req.user?.email || '',
      action: entry.action || 'other',
      targetType: entry.targetType || 'other',
      targetId: String(entry.targetId || ''),
      targetLabel: String(entry.targetLabel || '').slice(0, 200),
      details: String(entry.details || '').slice(0, 500),
      meta: entry.meta || {},
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: String(req.headers?.['user-agent'] || '').slice(0, 300)
    });
  } catch (err) {
    // Non-blocking — never break the main flow because audit failed.
    console.error('[audit] failed to log:', err.message);
  }
}

module.exports = { logAudit };
