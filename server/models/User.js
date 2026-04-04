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
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  avatar: { type: String, default: '' },
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
  language: { type: String, enum: ['en', 'ru', 'kz'], default: 'en' },
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

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.lastName} ${this.firstName}${this.middleName ? ' ' + this.middleName : ''}`;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
