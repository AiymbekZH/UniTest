const crypto = require('crypto');

function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const rawSameSite = String(process.env.COOKIE_SAMESITE || 'lax').trim().toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(rawSameSite) ? rawSameSite : 'lax';

  return {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
    sameSite,
    path: '/'
  };
}

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies?.csrf_token) {
    res.cookie('csrf_token', crypto.randomBytes(24).toString('hex'), getCsrfCookieOptions());
  }
  next();
}

function csrfProtection(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // CSRF is relevant when authentication relies on cookies.
  if (!req.cookies?.unitest_token) {
    return next();
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ message: 'CSRF token invalid' });
  }

  return next();
}

module.exports = {
  ensureCsrfCookie,
  csrfProtection
};
