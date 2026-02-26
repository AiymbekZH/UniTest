const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
const OWNER_EMAIL = process.env.ADMIN_EMAIL;
const OWNER_ID = (process.env.ADMIN_UNIQUE_ID || 'OWNERUNITEST').toUpperCase();

async function ensureOwnerAdmin(user) {
  if (!OWNER_EMAIL) return;
  if (user.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) return;
  if ((user.uniqueId || '').toUpperCase() !== OWNER_ID) return;
  if (user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const user = new User({ firstName, lastName, middleName, email, password, role });
    await user.save();
    await ensureOwnerAdmin(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
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
        language: user.language
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Ваш аккаунт заблокирован', reason: user.banReason });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    await ensureOwnerAdmin(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
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
        language: user.language
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Activate admin with unique ID
router.post('/activate-admin', auth, async (req, res) => {
  try {
    const { uniqueId } = req.body;

    if (!OWNER_EMAIL) {
      return res.status(403).json({ message: 'Активация админа отключена' });
    }

    if (req.user.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!uniqueId || uniqueId.trim().length === 0) {
      return res.status(400).json({ message: 'Пожалуйста, введите ваш ID' });
    }

    if ((uniqueId || '').toUpperCase() !== OWNER_ID) {
      return res.status(403).json({ message: 'Неверный ID' });
    }

    if ((req.user.uniqueId || '').toUpperCase() !== OWNER_ID) {
      return res.status(403).json({ message: 'Неверный ID' });
    }

    // Check if the requesting user is already admin
    if (req.user.role === 'admin') {
      return res.status(400).json({ message: 'Вы уже администратор!' });
    }

    // Grant admin role to requesting user
    req.user.role = 'admin';
    await req.user.save();

    res.json({
      message: 'Поздравляем! Вам предоставлены права администратора! 🎉',
      user: {
        id: req.user._id,
        role: req.user.role,
        uniqueId: req.user.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
