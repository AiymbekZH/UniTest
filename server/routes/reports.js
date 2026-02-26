const express = require('express');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Submit a report
router.post('/', auth, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason?.trim()) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    // Check for duplicate
    const existing = await Report.findOne({ 
      reporter: req.user._id, targetType, targetId, status: 'pending' 
    });
    if (existing) {
      return res.status(400).json({ message: 'Вы уже отправили жалобу на этот объект' });
    }

    const report = new Report({
      reporter: req.user._id,
      targetType,
      targetId,
      reason: reason.trim()
    });
    await report.save();
    res.status(201).json({ message: 'Жалоба отправлена', report });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get all reports (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ запрещён' });

    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('reporter', 'firstName lastName email avatar')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100);

    const counts = {
      pending: await Report.countDocuments({ status: 'pending' }),
      reviewed: await Report.countDocuments({ status: 'reviewed' }),
      resolved: await Report.countDocuments({ status: 'resolved' }),
      rejected: await Report.countDocuments({ status: 'rejected' })
    };

    res.json({ reports, counts });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Update report status (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ запрещён' });

    const { status, adminNote } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Жалоба не найдена' });

    report.status = status || report.status;
    report.adminNote = adminNote || report.adminNote;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    // Notify reporter about status change
    await Notification.create({
      user: report.reporter,
      type: 'report_status',
      title: 'Обновление жалобы',
      message: `Ваша жалоба была ${status === 'resolved' ? 'рассмотрена и решена' : status === 'rejected' ? 'отклонена' : 'обновлена'}`,
      meta: { reportId: report._id }
    });

    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
