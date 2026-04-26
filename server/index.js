const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ensureCsrfCookie, csrfProtection } = require('./middleware/csrf');
const User = require('./models/User');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const resultRoutes = require('./routes/results');
const questionBankRoutes = require('./routes/questionBank');
const arenaTestsRoutes = require('./routes/arenaTests');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const groupRoutes = require('./routes/groups');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const challengeRoutes = require('./routes/challenges');
const arenaRoutes = require('./routes/arena');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// trust proxy=1 — обязательно для DigitalOcean App Platform / Heroku / Vercel.
// Прокси выставляет X-Forwarded-For на каждый запрос, без этого setting'а
// express-rate-limit бросает ERR_ERL_UNEXPECTED_X_FORWARDED_FOR и страница виснет.
// Ставим безусловно (даже на локалке безопасно — `1` доверяет только одному hop'у).
app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (isProd && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be set in production');
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProd && allowedOrigins.length === 0) return callback(null, true);
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

if (!isProd && allowedOrigins.length === 0) {
  console.warn('CORS allowlist is empty. API CORS runs in fallback mode. Set ALLOWED_ORIGINS in production.');
}

// Apply CORS only to API routes so static assets never fail because of CORS config.
app.use('/api', cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', ensureCsrfCookie);
app.use('/api', csrfProtection);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// validate.xForwardedForHeader: false выключает strict-validation
// rate-limit'a — belt-and-suspenders на случай если trust proxy не применился.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Слишком много попыток входа. Повторите позже.' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Слишком много запросов на сброс пароля. Повторите позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Слишком много попыток смены пароля. Повторите позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false }
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
app.use('/api/arena-tests', arenaTestsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/arena', arenaRoutes);

const dmRoutes = require('./routes/dm');
app.use('/api/dm', dmRoutes);

// Serve frontend build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

// Static files
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(indexHtmlPath);
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ── Socket.IO ──
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5 * 1024 * 1024,
});

// Socket auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const arenaGuestToken = socket.handshake.auth?.arenaGuestToken;
  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.isBanned) return next(new Error('AUTH_FAILED'));
      socket.user = user;
      socket.arenaGuest = null;
      return next();
    }

    if (arenaGuestToken) {
      const decoded = jwt.verify(arenaGuestToken, process.env.JWT_SECRET);
      if (decoded?.kind !== 'arena_guest') return next(new Error('AUTH_FAILED'));
      socket.user = null;
      socket.arenaGuest = decoded;
      return next();
    }

    return next(new Error('AUTH_REQUIRED'));
  } catch (e) {
    return next(new Error('AUTH_FAILED'));
  }
});

// Attach socket handlers
require('./socket/chat')(io);
require('./socket/dm')(io);
require('./socket/arena')(io);
require('./socket/presence')(io);

// Make io available to routes
app.set('io', io);

// Background: auto-cancel stale arena lobbies (15min idle).
const { startArenaCleanupLoop } = require('./utils/arenaEngine');
startArenaCleanupLoop(io, { intervalMs: 60 * 1000, idleMs: 15 * 60 * 1000 });

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`UniTest server running on port ${PORT}`);
});
