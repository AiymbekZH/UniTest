const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();
const OWNER_EMAIL = process.env.ADMIN_EMAIL;
const OWNER_ID = (process.env.ADMIN_UNIQUE_ID || 'OWNERUNITEST').toUpperCase();
const SELF_REGISTER_ROLES = new Set(['student', 'teacher']);

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const rawSameSite = String(process.env.COOKIE_SAMESITE || 'lax').trim().toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(rawSameSite) ? rawSameSite : 'lax';
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

function setAuthCookie(res, token) {
  res.cookie('unitest_token', token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie('unitest_token', { ...getCookieOptions(), maxAge: undefined });
}

function buildAuthPayload(user) {
  return {
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
    aiAccess: !!user.aiAccess
  };
}

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function buildGoogleAuthUrl(state) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !redirectUri) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

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

    const safeRole = SELF_REGISTER_ROLES.has(role) ? role : 'student';
    const user = new User({ firstName, lastName, middleName, email, password, role: safeRole });
    await user.save();
    await ensureOwnerAdmin(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: buildAuthPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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
    setAuthCookie(res, token);

    res.json({
      token,
      user: buildAuthPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Вы вышли из аккаунта' });
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.json({ message: 'Если такой email существует, ссылка для сброса отправлена.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetBase = process.env.RESET_PASSWORD_URL_BASE || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`;
      const resetUrl = `${resetBase}/${resetToken}`;

      await sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetUrl
      });
    }

    res.json({ message: 'Если такой email существует, ссылка для сброса отправлена.' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || String(password).length < 6) {
      return res.status(400).json({ message: 'Некорректный токен или пароль' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Ссылка устарела или недействительна' });
    }

    user.password = String(password);
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    await user.save();

    clearAuthCookie(res);
    res.json({ message: 'Пароль успешно изменен. Войдите снова.' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Google OAuth start (redirect flow)
router.get('/google/start', async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const url = buildGoogleAuthUrl(state);

    if (!url) {
      return res.status(503).json({ message: 'Google вход не настроен на сервере' });
    }

    res.cookie('google_oauth_state', state, {
      ...getCookieOptions(),
      maxAge: 10 * 60 * 1000
    });

    return res.redirect(url);
  } catch (error) {
    console.error('google/start failed:', error);
    return res.status(500).json({
      message: 'Не удалось начать вход через Google',
      debug: error?.message || 'unknown error'
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const client = getGoogleClient();
    if (!client) {
      return res.status(503).send('Google вход не настроен на сервере');
    }

    const { code, state } = req.query;
    if (!code || !state || req.cookies?.google_oauth_state !== state) {
      return res.status(400).send('Недействительный OAuth state');
    }

    res.clearCookie('google_oauth_state', { ...getCookieOptions(), maxAge: undefined });

    const { tokens } = await client.getToken(String(code));
    if (!tokens.id_token) {
      return res.status(400).send('Google не вернул id_token');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(400).send('Недостаточно данных аккаунта Google');
    }

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.findOne({ email: payload.email.toLowerCase() });
    }

    if (!user) {
      user = new User({
        firstName: payload.given_name || 'Google',
        lastName: payload.family_name || 'User',
        middleName: '',
        email: payload.email.toLowerCase(),
        password: crypto.randomBytes(24).toString('hex'),
        avatar: payload.picture || '',
        authProvider: 'google',
        googleId: payload.sub
      });
      await user.save();
    } else {
      if (!user.googleId) user.googleId = payload.sub;
      user.authProvider = 'google';
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    await ensureOwnerAdmin(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontend}/dashboard?auth=google-success`);
  } catch (error) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontend}/login?error=google-auth-failed`);
  }
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
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
