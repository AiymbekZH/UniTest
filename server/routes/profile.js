const express = require('express');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get own profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Update profile (name, language)
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName, middleName, language } = req.body;
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (middleName !== undefined) updates.middleName = middleName;
    if (language && ['en', 'ru', 'kz'].includes(language)) updates.language = language;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        email: user.email,
        role: user.role,
        uniqueId: user.uniqueId,
        fullName: user.fullName,
        avatar: user.avatar,
        language: user.language,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Upload avatar — stores as base64 data URL in MongoDB
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
    
    // Convert buffer to base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;
    
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
    res.json({ avatar: avatarUrl, user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Укажите текущий и новый пароль' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Новый пароль должен быть минимум 6 символов' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get public profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName middleName avatar role createdAt');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    // Get user's public tests count
    const Test = require('../models/Test');
    const Result = require('../models/Result');
    const testsCreated = await Test.countDocuments({ creator: req.params.id, isDeleted: { $ne: true } });
    const publicTests = await Test.find({ creator: req.params.id, isDeleted: { $ne: true }, 'settings.isPublic': true })
      .select('title shareLink rating attemptCount questions tags createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    const testsTaken = await Result.countDocuments({ user: req.params.id, status: 'completed' });

    res.json({ 
      user, 
      stats: { testsCreated, testsTaken },
      publicTests 
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get my warnings
router.get('/me/warnings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('warnings');
    res.json({ warnings: user.warnings });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get my comments across all tests
router.get('/me/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ user: req.user._id, isDeleted: false })
      .populate('test', 'title shareLink')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
