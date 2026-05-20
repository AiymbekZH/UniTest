const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Auth user cache ──
// Dashboard fires 7+ parallel requests — all calling User.findById(same_id).
// Cache user objects for 30 seconds to eliminate duplicate DB hits.
const _userCache = new Map();
const USER_CACHE_TTL = 30_000; // 30 seconds

function _getCachedUser(userId) {
  const entry = _userCache.get(userId);
  if (entry && (Date.now() - entry.ts) < USER_CACHE_TTL) return entry.user;
  return null;
}

function _setCachedUser(userId, user) {
  _userCache.set(userId, { user, ts: Date.now() });
  // Prevent unbounded growth
  if (_userCache.size > 500) {
    const oldest = _userCache.keys().next().value;
    _userCache.delete(oldest);
  }
}

async function findUserCached(userId) {
  const cached = _getCachedUser(userId);
  if (cached) return cached;
  // PERF (КРИТИЧНО): НЕ загружать `avatar` и `coverImage` (base64 ~600KB каждое).
  // /api/auth/me делается на каждой странице → раньше было 1.2 MB на каждый запрос!
  // Аватар и обложка профиля грузятся отдельно через /api/auth/me/profile-image.
  const user = await User.findById(userId)
    .select('-password -avatar -coverImage')
    .lean();
  if (user) _setCachedUser(userId, user);
  return user;
}

function extractToken(req) {
  const bearer = req.header('Authorization')?.replace('Bearer ', '');
  if (bearer) return bearer;
  const cookieToken = req.cookies?.unitest_token;
  if (cookieToken) return cookieToken;
  return null;
}

const auth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Авторизация требуется' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserCached(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Ваш аккаунт заблокирован', reason: user.banReason });
    }
    // Temporary ban (bannedUntil in the future) blocks access until expiry.
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      return res.status(403).json({
        message: 'Ваш аккаунт временно заблокирован',
        reason: user.banReason,
        until: user.bannedUntil
      });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findUserCached(decoded.userId);
      req.user = user;
    }
  } catch (error) {
    // Silently continue without auth
  }
  next();
};

// Admin-only middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Авторизация требуется' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserCached(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Пользователь не найден' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Требуются права администратора' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

module.exports = { auth, optionalAuth, adminAuth };
