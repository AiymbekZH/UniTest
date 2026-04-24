const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate 12-character unique ID
function generateUniqueId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  googleId: { type: String, default: '', index: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  uniqueId: { type: String, unique: true, default: generateUniqueId },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-z0-9_]+$/i,
    default: null,
    index: { unique: true, sparse: true }
  },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  avatar: { type: String, default: '' },
  headline: { type: String, trim: true, default: '', maxlength: 120 },
  bio: { type: String, trim: true, default: '', maxlength: 400 },
  coverImage: { type: String, default: '' },
  coverPreset: { type: String, enum: ['aurora', 'mesh', 'wave', 'grid'], default: 'aurora' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  aiAccess: { type: Boolean, default: false }, // AI generation and translation access
  warnings: [{
    message: { type: String },
    fromAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: '' },
  passwordResetExpiresAt: { type: Date, default: null },
  language: { type: String, enum: ['en', 'ru', 'kz', 'es'], default: 'en' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Auto-generate username for new users (uniqueness is best-effort here; the
// migration script or explicit UI update handles rare collisions)
userSchema.pre('save', async function(next) {
  if (this.username || !this.isNew) return next();
  const base = String(this.firstName || 'user')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 12) || 'user';
  const prefix = base.length < 3 ? `${base}user`.slice(0, 4) : base;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const candidate = `${prefix}_${suffix}`.slice(0, 20);
    // eslint-disable-next-line no-await-in-loop
    const taken = await mongoose.models.User.findOne({ username: candidate }).select('_id').lean();
    if (!taken) {
      this.username = candidate;
      break;
    }
  }
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.lastName} ${this.firstName}${this.middleName ? ' ' + this.middleName : ''}`;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
