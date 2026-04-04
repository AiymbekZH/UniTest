const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const resultRoutes = require('./routes/results');
const questionBankRoutes = require('./routes/questionBank');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const groupRoutes = require('./routes/groups');
const aiRoutes = require('./routes/ai');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Fail-open when allowlist is not configured to avoid breaking app boot/static assets.
    if (allowedOrigins.length === 0) return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

// Middleware
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

if (allowedOrigins.length === 0) {
  console.warn('CORS allowlist is empty. API CORS runs in fallback mode. Set ALLOWED_ORIGINS in production.');
}

// Apply CORS only to API routes so static assets never fail because of CORS config.
app.use('/api', cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Слишком много попыток входа. Повторите позже.' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Слишком много запросов на сброс пароля. Повторите позже.' },
  standardHeaders: true,
  legacyHeaders: false
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Слишком много попыток смены пароля. Повторите позже.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Routes
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/activate-admin', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);

// Serve frontend build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

// Static files
app.use(express.static(clientDistPath));

// Read index.html once at startup to ensure UTF-8
let indexHtml = null;
try {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (err) {
  console.error('Failed to read index.html:', err);
}

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  if (indexHtml) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(indexHtml);
  } else {
    res.sendFile(indexHtmlPath);
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniTest server running on port ${PORT}`);
});
