const express = require('express');
const crypto = require('crypto');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Test = require('../models/Test');
const Comment = require('../models/Comment');
const { auth, adminAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function dedupeKey(targetType, targetId) {
  return crypto
    .createHash('sha1')
    .update(`${targetType}:${String(targetId)}`)
    .digest('hex')
    .slice(0, 16);
}

/** Build a stable, populated snapshot of the target so the admin always has
 * context, even if the underlying object is later deleted. */
async function captureSnapshot(targetType, targetId) {
  try {
    if (targetType === 'test') {
      const t = await Test.findById(targetId)
        .populate('creator', 'firstName lastName username')
        .lean();
      if (!t) return { type: 'test', refId: String(targetId) };
      const owner = t.creator || {};
      return {
        type: 'test',
        refId: String(t._id),
        title: t.title || '',
        excerpt: (t.description || '').slice(0, 240),
        ownerLabel: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : '',
        ownerId: owner ? String(owner._id || '') : ''
      };
    }
    if (targetType === 'comment') {
      const c = await Comment.findById(targetId)
        .populate('user', 'firstName lastName username')
        .populate('test', 'title shareLink')
        .lean();
      if (!c) return { type: 'comment', refId: String(targetId) };
      const owner = c.user || {};
      return {
        type: 'comment',
        refId: String(c._id),
        title: c.test?.title ? `Комментарий к: ${c.test.title}` : 'Комментарий',
        excerpt: (c.text || '').slice(0, 320),
        ownerLabel: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : '',
        ownerId: owner ? String(owner._id || '') : ''
      };
    }
    if (targetType === 'user') {
      const u = await User.findById(targetId)
        .select('firstName lastName username email bio headline')
        .lean();
      if (!u) return { type: 'user', refId: String(targetId) };
      return {
        type: 'user',
        refId: String(u._id),
        title: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email,
        excerpt: u.headline || u.bio || '',
        ownerLabel: '',
        ownerId: String(u._id)
      };
    }
    if (targetType === 'message') {
      // Future: chat/dm message snapshot. Leaving the type slot open.
      return { type: 'message', refId: String(targetId) };
    }
  } catch (_) {
    // Silent — if we can't snapshot, the report still goes through.
  }
  return { type: targetType, refId: String(targetId) };
}

function inferSeverity(reasonCategory) {
  switch (reasonCategory) {
    case 'self_harm':
    case 'underage':
    case 'illegal':
      return 'critical';
    case 'hate_speech':
    case 'sexual':
    case 'violence':
    case 'harassment':
      return 'high';
    case 'spam':
    case 'misinformation':
    case 'cheating':
    case 'copyright':
      return 'medium';
    default:
      return 'medium';
  }
}

// ─── User-facing: submit a report ───────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    const { targetType, targetId, reason, reasonCategory } = req.body || {};
    if (!targetType || !targetId || !String(reason || '').trim()) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }
    if (!['test', 'comment', 'user', 'message'].includes(targetType)) {
      return res.status(400).json({ message: 'Неверный тип цели' });
    }

    // Don't let the same user file an identical pending report multiple times.
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: { $in: ['pending', 'in_review'] }
    });
    if (existing) {
      return res.status(400).json({ message: 'Вы уже отправили жалобу на этот объект' });
    }

    const snapshot = await captureSnapshot(targetType, targetId);
    const cat = ['spam', 'harassment', 'hate_speech', 'sexual', 'violence',
      'self_harm', 'misinformation', 'cheating', 'copyright',
      'underage', 'illegal', 'other'].includes(reasonCategory)
      ? reasonCategory
      : 'other';

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason: String(reason).trim().slice(0, 500),
      reasonCategory: cat,
      severity: inferSeverity(cat),
      targetSnapshot: snapshot,
      dedupeKey: dedupeKey(targetType, targetId)
    });

    res.status(201).json({ message: 'Жалоба отправлена', report });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── My reports (filed by the current user) ────────────────────────────────

router.get('/mine', auth, async (req, res) => {
  try {
    const items = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Admin: list reports as kanban groups + clusters ────────────────────────

router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, severity, reasonCategory, targetType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (reasonCategory) filter.reasonCategory = reasonCategory;
    if (targetType) filter.targetType = targetType;
    if (search) {
      filter.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { 'targetSnapshot.title': { $regex: search, $options: 'i' } },
        { 'targetSnapshot.excerpt': { $regex: search, $options: 'i' } }
      ];
    }

    const reports = await Report.find(filter)
      .populate('reporter', 'firstName lastName email avatar username uniqueId')
      .populate('reviewedBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    // Cluster by dedupeKey so the UI can show "5 reports about this test".
    const clusterMap = new Map();
    for (const r of reports) {
      const key = r.dedupeKey || dedupeKey(r.targetType, r.targetId);
      const slot = clusterMap.get(key) || {
        key,
        targetType: r.targetType,
        targetId: r.targetId,
        targetSnapshot: r.targetSnapshot,
        latestAt: r.createdAt,
        count: 0,
        statuses: { pending: 0, in_review: 0, resolved: 0, rejected: 0 },
        severity: r.severity,
        reports: []
      };
      slot.count += 1;
      slot.statuses[r.status] = (slot.statuses[r.status] || 0) + 1;
      slot.reports.push(r);
      // Promote highest severity for the cluster.
      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      if ((order[r.severity] || 0) > (order[slot.severity] || 0)) slot.severity = r.severity;
      if (new Date(r.createdAt) > new Date(slot.latestAt)) slot.latestAt = r.createdAt;
      clusterMap.set(key, slot);
    }
    const clusters = Array.from(clusterMap.values()).sort((a, b) =>
      new Date(b.latestAt) - new Date(a.latestAt)
    );

    const counts = {
      pending: await Report.countDocuments({ status: 'pending' }),
      in_review: await Report.countDocuments({ status: 'in_review' }),
      resolved: await Report.countDocuments({ status: 'resolved' }),
      rejected: await Report.countDocuments({ status: 'rejected' })
    };

    // Reason-category histogram for the analytics row at the top of the tab.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reasonAgg = await Report.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$reasonCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ reports, clusters, counts, reasonStats: reasonAgg });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Admin: change status / resolve a single report ────────────────────────

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { status, adminNote, resolution } = req.body || {};
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Жалоба не найдена' });

    const previousStatus = report.status;
    if (status && ['pending', 'in_review', 'resolved', 'rejected'].includes(status)) {
      report.status = status;
    }
    if (typeof adminNote === 'string') report.adminNote = adminNote.slice(0, 1000);
    if (resolution && [
      '', 'no_action', 'warning_issued', 'content_removed',
      'user_muted', 'user_suspended', 'user_banned',
      'duplicate', 'spam_report'
    ].includes(resolution)) {
      report.resolution = resolution;
    }
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.actionsTaken.push({
      by: req.user._id,
      byLabel: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      action: `status:${previousStatus}->${report.status}`,
      note: adminNote || ''
    });
    await report.save();

    await logAudit(req, {
      action: 'report_status_change',
      targetType: 'report',
      targetId: report._id,
      details: `${previousStatus}→${report.status}`,
      meta: { resolution: report.resolution }
    });

    // Notify the reporter when the case closes.
    if (['resolved', 'rejected'].includes(report.status)) {
      await Notification.create({
        user: report.reporter,
        type: 'report_status',
        title: 'Обновление жалобы',
        message:
          report.status === 'resolved'
            ? 'Ваша жалоба рассмотрена и принята к исполнению.'
            : 'Ваша жалоба рассмотрена и отклонена.',
        meta: { reportId: report._id, resolution: report.resolution }
      }).catch(() => null);
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Admin: take action against the target of a report ─────────────────────
//
// One-click moderation. Body: { action: 'warn_target' | 'delete_content' |
// 'mute_target_24h' | 'mute_target_7d' | 'suspend_target_7d' | 'ban_target',
// note?: string }. Auto-resolves the report and notifies the reporter.

router.post('/:id/take-action', adminAuth, async (req, res) => {
  try {
    const { action, note = '' } = req.body || {};
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Жалоба не найдена' });

    let resolution = '';
    let summary = '';

    const targetUserId = report.targetType === 'user'
      ? report.targetId
      : report.targetSnapshot?.ownerId;

    const ensureTargetUser = async () => {
      if (!targetUserId) return null;
      return User.findById(targetUserId);
    };

    if (action === 'delete_content') {
      if (report.targetType === 'test') {
        await Test.findByIdAndUpdate(report.targetId, {
          isDeleted: true,
          deleteReason: note || 'Удалён модератором по жалобе'
        });
        summary = 'Тест удалён.';
      } else if (report.targetType === 'comment') {
        await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true });
        summary = 'Комментарий удалён.';
      } else {
        return res.status(400).json({ message: 'Это действие не подходит для типа цели' });
      }
      resolution = 'content_removed';
    } else if (action === 'warn_target') {
      const u = await ensureTargetUser();
      if (!u) return res.status(404).json({ message: 'Целевой пользователь не найден' });
      u.warnings.push({ message: note || 'Нарушение правил по жалобе', fromAdmin: req.user._id });
      await u.save();
      summary = 'Пользователь предупреждён.';
      resolution = 'warning_issued';
    } else if (action === 'mute_target_24h' || action === 'mute_target_7d') {
      const u = await ensureTargetUser();
      if (!u) return res.status(404).json({ message: 'Целевой пользователь не найден' });
      const hours = action === 'mute_target_7d' ? 24 * 7 : 24;
      u.mutedUntil = new Date(Date.now() + hours * 3600 * 1000);
      await u.save();
      summary = `Пользователь заглушён на ${hours} ч.`;
      resolution = 'user_muted';
    } else if (action === 'suspend_target_7d') {
      const u = await ensureTargetUser();
      if (!u) return res.status(404).json({ message: 'Целевой пользователь не найден' });
      u.suspendedUntil = new Date(Date.now() + 24 * 7 * 3600 * 1000);
      await u.save();
      summary = 'Пользователь приостановлен на 7 дней.';
      resolution = 'user_suspended';
    } else if (action === 'ban_target') {
      const u = await ensureTargetUser();
      if (!u) return res.status(404).json({ message: 'Целевой пользователь не найден' });
      if (u.role === 'admin') return res.status(400).json({ message: 'Нельзя забанить администратора' });
      u.isBanned = true;
      u.banReason = note || 'Забанен по жалобе';
      await u.save();
      summary = 'Пользователь заблокирован.';
      resolution = 'user_banned';
    } else {
      return res.status(400).json({ message: 'Неизвестное действие' });
    }

    // Mark the report resolved.
    report.status = 'resolved';
    report.resolution = resolution;
    report.adminNote = note || report.adminNote;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.actionsTaken.push({
      by: req.user._id,
      byLabel: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      action,
      note
    });
    await report.save();

    await logAudit(req, {
      action: 'report_action',
      targetType: 'report',
      targetId: report._id,
      targetLabel: report.targetSnapshot?.title || '',
      details: `${action} → ${summary}`,
      meta: { resolution, reportId: report._id }
    });

    // Notify reporter & (where relevant) target.
    await Notification.create({
      user: report.reporter,
      type: 'report_status',
      title: 'Жалоба удовлетворена',
      message: summary || 'Действие принято.',
      meta: { reportId: report._id, resolution }
    }).catch(() => null);
    if (targetUserId && ['warn_target', 'mute_target_24h', 'mute_target_7d', 'suspend_target_7d', 'ban_target'].includes(action)) {
      await Notification.create({
        user: targetUserId,
        type: 'warning',
        title: 'Действие модерации',
        message: summary,
        meta: { resolution }
      }).catch(() => null);
    }

    res.json({ report, summary });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ─── Admin: bulk-resolve all reports in a cluster ──────────────────────────

router.post('/cluster/:dedupeKey/resolve', adminAuth, async (req, res) => {
  try {
    const { resolution = 'no_action', adminNote = '' } = req.body || {};
    const updated = await Report.updateMany(
      { dedupeKey: req.params.dedupeKey, status: { $in: ['pending', 'in_review'] } },
      {
        $set: {
          status: 'resolved',
          resolution,
          adminNote,
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        }
      }
    );
    await logAudit(req, {
      action: 'mass_action',
      targetType: 'report',
      targetId: req.params.dedupeKey,
      details: `cluster resolved (${updated.modifiedCount})`,
      meta: { resolution }
    });
    res.json({ modified: updated.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
