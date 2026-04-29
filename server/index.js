const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ensureCsrfCookie, csrfProtection } = require('./middleware/csrf');
require('dotenv').config();

const User = require('./models/User');
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

// Gzip/Brotli compression — reduces JS/CSS payload by ~70%
app.use(compression());

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

const slowRequestMs = Number(process.env.SLOW_REQUEST_MS || 1000);
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    if (duration >= slowRequestMs) {
      console.warn(`[slow] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

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

app.get('/api/health', async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateName = states[mongoose.connection.readyState] || 'unknown';
  const base = {
    mongo: stateName,
    uptime: Math.round(process.uptime()),
    nodeVersion: process.version
  };
  // readyState alone lies during stale-socket scenarios (Atlas Free tier sleep).
  // Doing a real ping confirms the connection is actually alive.
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ok: false, ...base });
  }
  try {
    const startedAt = Date.now();
    await mongoose.connection.db.admin().ping();
    return res.json({ ok: true, ...base, pingMs: Date.now() - startedAt });
  } catch (err) {
    return res.status(503).json({ ok: false, ...base, error: err.message });
  }
});

// Serve frontend build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

// Hashed assets (JS/CSS) — cache for 1 year (filenames change on rebuild)
app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

// Other static files (images, sounds, SVGs) — cache 1 day
app.use(express.static(clientDistPath, {
  maxAge: '1d',
  index: false  // SPA fallback handles index.html separately
}));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(indexHtmlPath);
});

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

const PORT = process.env.PORT || 5000;

// ─── MongoDB connection observability ──────────────────────────────────────
// Without these listeners a dropped connection is invisible — routes just hang
// until Mongoose's internal buffer overflows 30s later. With them we see exactly
// when the cluster (Atlas) goes to sleep / wakes up / drops the socket.
mongoose.connection.on('connected',    () => console.log('[mongo] connected'));
mongoose.connection.on('disconnected', () => console.warn('[mongo] disconnected — driver will auto-reconnect'));
mongoose.connection.on('reconnected',  () => console.log('[mongo] reconnected'));
mongoose.connection.on('error',        (err) => console.error('[mongo] error:', err.message));
// Replica set / serverless heartbeat events — quiet by default but logged on failure.
mongoose.connection.on('serverHeartbeatFailed', (event) => {
  console.warn(`[mongo] heartbeat failed: ${event?.failure?.message || 'unknown'}`);
});

async function connectWithRetry(uri, attempts = 3) {
  // Exponential backoff: 1s → 3s → 9s. Atlas Free tier cold-wakes can take 10-15s,
  // and DigitalOcean App Platform sometimes deploys before networking is ready.
  const opts = {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 8000),
    connectTimeoutMS:         Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS:          Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    maxPoolSize:              Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize:              Number(process.env.MONGO_MIN_POOL_SIZE || 1),
    // Fail-fast: if the driver isn't connected, throw immediately instead of
    // buffering operations for 30s. Pairs with the retry below.
    bufferCommands: false
  };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      await mongoose.connect(uri, opts);
      console.log(`[mongo] initial connect succeeded in ${Date.now() - startedAt}ms (attempt ${attempt}/${attempts})`);
      return;
    } catch (err) {
      const isLast = attempt === attempts;
      console.error(`[mongo] connect attempt ${attempt}/${attempts} failed after ${Date.now() - startedAt}ms: ${err.message}`);
      if (isLast) throw err;
      const delayMs = Math.min(9000, 1000 * Math.pow(3, attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set');
  }

  await connectWithRetry(process.env.MONGODB_URI, Number(process.env.MONGO_CONNECT_ATTEMPTS || 3));

  startArenaCleanupLoop(io, { intervalMs: 60 * 1000, idleMs: 15 * 60 * 1000 });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`UniTest server running on port ${PORT}`);
  });
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────
// Without this, DigitalOcean App Platform sends SIGTERM and we have ~10s
// before SIGKILL. Closing Mongo cleanly avoids 'connection in use' errors
// on the next deploy and lets in-flight queries finish.
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] received ${signal}, closing server…`);
  server.close(() => console.log('[shutdown] http server closed'));
  try {
    await mongoose.connection.close(false);
    console.log('[shutdown] mongo connection closed');
  } catch (err) {
    console.error('[shutdown] mongo close error:', err.message);
  }
  // Give socket.io a moment to flush, then exit.
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
