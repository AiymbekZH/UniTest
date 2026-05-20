const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail, sendVerificationCodeEmail } = require('../utils/mailer');
const { validateRegister, validateLogin } = require('../utils/validate');
const { sanitizePlainText } = require('../utils/sanitize');

const router = express.Router();
const OWNER_EMAIL = process.env.ADMIN_EMAIL;
const OWNER_ID = (process.env.ADMIN_UNIQUE_ID || 'OWNERUNITEST').toUpperCase();
const SELF_REGISTER_ROLES = new Set(['student', 'teacher']);
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 минут
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000; // не чаще раза в минуту
const VERIFICATION_MAX_ATTEMPTS = 6;

function generateVerificationCode() {
  // 6-digit code, padded — `crypto.randomInt` is unbiased.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function hashCode(code) {
  return bcrypt.hash(String(code), 8);
}

async function compareCode(code, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(code), hash);
}

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
  // PERF: НЕ включать `avatar` и `coverImage` (~600KB base64 каждое).
  // На медленной связи логин висит >15 секунд из-за этого payload-а.
  // AuthContext лениво подгружает их через /api/auth/me/profile-image.
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    email: user.email,
    role: user.role,
    uniqueId: user.uniqueId,
    headline: user.headline || '',
    bio: user.bio || '',
    coverPreset: user.coverPreset || 'aurora',
    language: user.language,
    aiAccess: !!user.aiAccess,
    createdAt: user.createdAt
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

// Register — теперь регистрация двухшаговая:
//  1) POST /auth/register — создаёт пользователя с emailVerified=false, шлёт 6-значный код, возвращает email
//  2) POST /auth/verify-email — пользователь вводит код, мы выдаём JWT
// Это блокирует регистрацию через одноразовые/чужие email-адреса и приучает
// к подтверждению. SMTP настраивается через .env (см. mailer.js).
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Если уже существует, но email не подтверждён — перевыдадим код тому же
      // пользователю, не плодим дубли. Это покрывает кейс «закрыл вкладку,
      // открыл заново».
      if (existingUser.emailVerified === false) {
        const now = Date.now();
        const lastSent = existingUser.emailVerificationLastSentAt
          ? existingUser.emailVerificationLastSentAt.getTime()
          : 0;
        if (now - lastSent < VERIFICATION_RESEND_COOLDOWN_MS) {
          const wait = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
          return res.status(429).json({
            message: `Код уже отправлен. Подождите ${wait}с перед следующим запросом.`,
            email: existingUser.email,
            requiresVerification: true,
            cooldownSec: wait
          });
        }

        // Обновим имя/фамилию/пароль, если пользователь повторно проходит форму.
        existingUser.firstName = sanitizePlainText(firstName);
        existingUser.lastName = sanitizePlainText(lastName);
        existingUser.middleName = sanitizePlainText(middleName || '');
        existingUser.password = password; // pre-save hash сработает
        existingUser.role = SELF_REGISTER_ROLES.has(role) ? role : 'student';

        const code = generateVerificationCode();
        existingUser.emailVerificationCodeHash = await hashCode(code);
        existingUser.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
        existingUser.emailVerificationAttempts = 0;
        existingUser.emailVerificationLastSentAt = new Date();
        await existingUser.save();

        const sent = await sendVerificationCodeEmail({
          email: existingUser.email,
          firstName: existingUser.firstName,
          code,
          expiresMinutes: 15
        });
        if (!sent && process.env.NODE_ENV === 'production') {
          return res.status(503).json({ message: 'Не удалось отправить письмо. Попробуйте позже.' });
        }

        return res.status(200).json({
          email: existingUser.email,
          requiresVerification: true,
          message: 'Код отправлен на email.'
        });
      }

      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const safeRole = SELF_REGISTER_ROLES.has(role) ? role : 'student';
    const user = new User({
      firstName: sanitizePlainText(firstName),
      lastName: sanitizePlainText(lastName),
      middleName: sanitizePlainText(middleName || ''),
      email,
      password,
      role: safeRole,
      emailVerified: false
    });

    const code = generateVerificationCode();
    user.emailVerificationCodeHash = await hashCode(code);
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    await user.save();
    await ensureOwnerAdmin(user);

    const sent = await sendVerificationCodeEmail({
      email: user.email,
      firstName: user.firstName,
      code,
      expiresMinutes: 15
    });
    if (!sent && process.env.NODE_ENV === 'production') {
      // Если SMTP не настроен в проде — это критично, аккаунт уже создан
      // но без email верификации. Удалим, чтобы пользователь мог попробовать
      // ещё раз позже.
      await User.deleteOne({ _id: user._id });
      return res.status(503).json({
        message: 'Сервис отправки писем недоступен. Попробуйте позже.'
      });
    }

    return res.status(201).json({
      email: user.email,
      requiresVerification: true,
      message: 'Аккаунт создан. Введите код из письма для активации.'
    });
  } catch (error) {
    console.error('register failed:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /auth/verify-email { email, code } — финализирует регистрацию.
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Email и код обязательны' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      return res.status(400).json({ message: 'Код должен состоять из 6 цифр' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Код или email недействительны' });
    }

    if (user.emailVerified) {
      // Уже подтверждено — просто сразу выдаём токен (на случай повторного
      // нажатия / двойной отправки формы).
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      return res.json({ token, user: buildAuthPayload(user) });
    }

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({
        message: 'Код истёк. Запросите новый.',
        expired: true
      });
    }

    if ((user.emailVerificationAttempts || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: 'Слишком много неверных попыток. Запросите новый код.',
        expired: true
      });
    }

    const ok = await compareCode(cleanCode, user.emailVerificationCodeHash);
    if (!ok) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { emailVerificationAttempts: 1 } }
      );
      const remaining = VERIFICATION_MAX_ATTEMPTS - (user.emailVerificationAttempts || 0) - 1;
      return res.status(400).json({
        message: 'Неверный код',
        attemptsLeft: Math.max(remaining, 0)
      });
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = '';
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;
    await user.save();
    await ensureOwnerAdmin(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.json({
      token,
      user: buildAuthPayload(user)
    });
  } catch (error) {
    console.error('verify-email failed:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /auth/resend-code { email } — повторно отправить код, rate-limited.
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email обязателен' });

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    // Anti-enumeration: всегда отвечаем одинаково положительно для несуществующих email.
    if (!user || user.emailVerified) {
      return res.json({ message: 'Если аккаунт ждёт подтверждения, код отправлен.' });
    }

    const now = Date.now();
    const lastSent = user.emailVerificationLastSentAt
      ? user.emailVerificationLastSentAt.getTime()
      : 0;
    if (now - lastSent < VERIFICATION_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
      return res.status(429).json({
        message: `Подождите ${wait}с перед повторной отправкой.`,
        cooldownSec: wait
      });
    }

    const code = generateVerificationCode();
    user.emailVerificationCodeHash = await hashCode(code);
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    await user.save();

    const sent = await sendVerificationCodeEmail({
      email: user.email,
      firstName: user.firstName,
      code,
      expiresMinutes: 15
    });
    if (!sent && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Не удалось отправить письмо. Попробуйте позже.' });
    }

    res.json({ message: 'Код отправлен на email.' });
  } catch (error) {
    console.error('resend-code failed:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(429).json({ message: 'Слишком много неудачных попыток. Повторите позже.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Ваш аккаунт заблокирован', reason: user.banReason });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // PERF: use atomic updateOne instead of user.save() — `save()` rewrites
      // the ENTIRE User document (including ~600KB base64 avatar) on every
      // login attempt, which on M0 Atlas free tier can take 5-15+ seconds.
      const nextAttempts = (user.loginAttempts || 0) + 1;
      const update = { loginAttempts: nextAttempts };
      if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOGIN_LOCK_MS);
      }
      await User.updateOne({ _id: user._id }, update);
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    // Аккаунт ещё не подтверждён — отправим новый код и попросим верифицировать.
    if (user.emailVerified === false) {
      const now = Date.now();
      const lastSent = user.emailVerificationLastSentAt
        ? user.emailVerificationLastSentAt.getTime()
        : 0;
      if (now - lastSent >= VERIFICATION_RESEND_COOLDOWN_MS) {
        const code = generateVerificationCode();
        user.emailVerificationCodeHash = await hashCode(code);
        user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
        user.emailVerificationAttempts = 0;
        user.emailVerificationLastSentAt = new Date();
        await user.save();
        sendVerificationCodeEmail({
          email: user.email,
          firstName: user.firstName,
          code,
          expiresMinutes: 15
        }).catch(() => {});
      }
      return res.status(403).json({
        message: 'Email ещё не подтверждён. Введите код из письма.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Reset attempt counter atomically (avoids re-writing the full document).
    if ((user.loginAttempts || 0) > 0 || user.lockUntil) {
      await User.updateOne(
        { _id: user._id },
        { loginAttempts: 0, lockUntil: null }
      );
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

// PERF: Lazy-load own avatar/cover (base64 ~600KB each, excluded from /me by default).
// Frontend Auth context calls this AFTER /me to populate avatar without blocking.
router.get('/me/profile-image', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('avatar coverImage coverPreset')
      .lean();
    if (!user) return res.status(404).json({ avatar: '', coverImage: '', coverPreset: 'aurora' });
    // Cache 60 seconds — avatar rarely changes mid-session.
    // Vary: Cookie — segments cache by auth state so logout/account-switch can't leak.
    res.set('Cache-Control', 'private, max-age=60');
    res.set('Vary', 'Cookie, Authorization');
    res.json({
      avatar: user.avatar || '',
      coverImage: user.coverImage || '',
      coverPreset: user.coverPreset || 'aurora'
    });
  } catch (error) {
    res.status(500).json({ avatar: '', coverImage: '', coverPreset: 'aurora' });
  }
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

      const frontendStr = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const resetUrl = `${frontendStr}/reset-password/${resetToken}?token=${resetToken}`;

      const emailSent = await sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetUrl
      });

      if (!emailSent) {
        return res.status(503).json({
          message: 'Почта для сброса пароля не настроена на сервере'
        });
      }
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
      message: 'Не удалось начать вход через Google'
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
        googleId: payload.sub,
        // Google уже проверил email на своей стороне.
        emailVerified: true
      });
      await user.save();
    } else {
      if (!user.googleId) user.googleId = payload.sub;
      user.authProvider = 'google';
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      // Если человек ранее зарегистрировался через email и не подтвердил —
      // повторный вход через Google разблокирует аккаунт автоматически.
      if (!user.emailVerified) user.emailVerified = true;
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

    // Grant admin role to requesting user (auth uses .lean(), so use updateOne)
    await User.updateOne({ _id: req.user._id }, { role: 'admin' });

    res.json({
      message: 'Поздравляем! Вам предоставлены права администратора! 🎉',
      user: {
        id: req.user._id,
        role: 'admin',
        uniqueId: req.user.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
