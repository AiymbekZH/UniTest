/**
 * Centralized input validation middleware using the `validator` package.
 *
 * Usage:
 *   const { validateRegister, validateLogin } = require('../utils/validate');
 *   router.post('/register', validateRegister, async (req, res) => { ... });
 */
const validator = require('validator');

function fail(res, field, msg) {
  return res.status(400).json({ message: msg, field });
}

/**
 * POST /auth/register
 * Validates: firstName, lastName, email, password
 */
function validateRegister(req, res, next) {
  const { firstName, lastName, email, password } = req.body || {};

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1 || firstName.trim().length > 50) {
    return fail(res, 'firstName', 'Имя обязательно (1–50 символов)');
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1 || lastName.trim().length > 50) {
    return fail(res, 'lastName', 'Фамилия обязательна (1–50 символов)');
  }
  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return fail(res, 'email', 'Некорректный email');
  }
  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return fail(res, 'password', 'Пароль должен быть от 6 до 128 символов');
  }

  // Normalize for downstream
  req.body.firstName = firstName.trim().slice(0, 50);
  req.body.lastName = lastName.trim().slice(0, 50);
  req.body.email = validator.normalizeEmail(email) || email.toLowerCase().trim();

  next();
}

/**
 * POST /auth/login
 * Validates: email, password
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return fail(res, 'email', 'Некорректный email');
  }
  if (!password || typeof password !== 'string' || password.length < 1) {
    return fail(res, 'password', 'Пароль обязателен');
  }

  req.body.email = validator.normalizeEmail(email) || email.toLowerCase().trim();
  next();
}

/**
 * POST /auth/forgot-password
 */
function validateForgotPassword(req, res, next) {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    return fail(res, 'email', 'Некорректный email');
  }
  req.body.email = validator.normalizeEmail(email) || email.toLowerCase().trim();
  next();
}

/**
 * POST /auth/reset-password
 */
function validateResetPassword(req, res, next) {
  const { token, password } = req.body || {};
  if (!token || typeof token !== 'string' || token.length < 10) {
    return fail(res, 'token', 'Токен сброса обязателен');
  }
  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return fail(res, 'password', 'Пароль должен быть от 6 до 128 символов');
  }
  next();
}

/**
 * Generic string field trimmer + length enforcer.
 * Use as: validateStringFields({ title: 200, description: 2000 })
 */
function validateStringFields(fieldLimits = {}) {
  return (req, _res, next) => {
    for (const [field, maxLen] of Object.entries(fieldLimits)) {
      if (typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim().slice(0, maxLen);
      }
    }
    next();
  };
}

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateStringFields
};
