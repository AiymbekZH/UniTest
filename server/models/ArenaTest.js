const mongoose = require('mongoose');

/**
 * ArenaTest — a reusable, arena-specific test template that lives outside the
 * normal Test/Question pipeline. Two entry shapes are supported:
 *   - kind:'bank'     → reference to a BankQuestion (editable in QBank globally)
 *   - kind:'embedded' → question lives ONLY inside this template (no bank pollution)
 *
 * Each entry can override the bank's default timer/points just for this arena
 * template. The full arena snapshot is hydrated at room-creation time by
 * createArenaRoomFromArenaTest() in arenaEngine.js.
 */

// Embedded option (kept identical to BankQuestion option for forward-compat).
const arenaEmbeddedOptionSchema = new mongoose.Schema({
  id: { type: String, default: () => Math.random().toString(36).slice(2, 12) },
  text: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  matchPair: { type: String, default: '' }
}, { _id: false });

// Embedded translation — same shape as Test.questions[].translations.
const arenaEmbeddedTranslationSchema = new mongoose.Schema({
  questionText: { type: String, default: '' },
  options: { type: [String], default: [] },
  matchPairs: { type: [String], default: [] },
  passage: { type: String, default: '' },
  explanation: { type: String, default: '' },
  correctAnswer: { type: String, default: '' }
}, { _id: false });

// Embedded question payload (snapshot of CreateTest question shape).
const arenaEmbeddedQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single-choice', 'multiple-choice', 'true-false', 'essay', 'matching', 'fill-blank'],
    required: true
  },
  questionText: { type: String, default: '' },
  passage:      { type: String, default: '' },
  points:       { type: Number, default: 1, min: 0, max: 1000 },
  options:      { type: [arenaEmbeddedOptionSchema], default: [] },
  correctAnswer: { type: String, default: '' },
  explanation:   { type: String, default: '' },
  media: {
    type:     { type: String, default: '' }, // image|video|audio|''
    url:      { type: String, default: '' },
    fileName: { type: String, default: '' }
  },
  // Translations keyed by lang code (en/ru/kz/es).
  translations: {
    type: Map,
    of: arenaEmbeddedTranslationSchema,
    default: () => ({})
  }
}, { _id: false });

const arenaTestEntrySchema = new mongoose.Schema({
  // Discriminator: 'bank' uses bankQuestion ref; 'embedded' uses inline payload.
  kind: { type: String, enum: ['bank', 'embedded'], default: 'bank', required: true },
  bankQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankQuestion',
    default: null
  },
  embedded: { type: arenaEmbeddedQuestionSchema, default: null },
  // Per-question overrides (null = use room default / bank default).
  timerOverride: { type: Number, default: null, min: 5, max: 300 },
  pointsOverride: { type: Number, default: null, min: 0, max: 1000 },
  // Per-question power-up tag — modifies scoring/timing/visuals at runtime.
  // 'normal' — no special behavior (default).
  // 'blitz'  — forced 5s timer.
  // 'think'  — forced 60s timer.
  // 'jackpot' — ×2 points multiplier.
  // 'boss'   — ×3 points + power-ups blocked + catch-up bonus for last-place.
  tag: {
    type: String,
    enum: ['normal', 'blitz', 'think', 'jackpot', 'boss'],
    default: 'normal'
  }
}, { _id: false });

const arenaTestSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: '', maxlength: 1000 },
  cover: { type: String, default: '' }, // optional cover image URL
  // Ordered list of bank-question references with per-question overrides.
  entries: { type: [arenaTestEntrySchema], default: [] },
  // Arena-specific runtime settings — applied as room defaults at launch.
  settings: {
    countdownSeconds:   { type: Number, default: 5,  min: 3,  max: 15 },
    questionIntroSec:   { type: Number, default: 3,  min: 1,  max: 10 },
    answerTimeSec:      { type: Number, default: 20, min: 5,  max: 120 },
    answerRevealSec:    { type: Number, default: 5,  min: 2,  max: 20 },
    leaderboardSec:     { type: Number, default: 6,  min: 2,  max: 30 },
    allowGuests:        { type: Boolean, default: true },
    maxPlayers:         { type: Number, default: 100, min: 2, max: 500 },
    // Power-up pool — which abilities are usable in arenas spawned from this template.
    // Empty array = no power-ups; default = all enabled (3 legacy + Epic E additions).
    powerUpPool: {
      type: [String],
      enum: [
        'fiftyFifty', 'doublePoints', 'shield',
        'timeFreeze', 'steal', 'mirror', 'suddenDeath'
      ],
      default: ['fiftyFifty', 'doublePoints', 'shield']
    },
    // Streak system: enables combo multipliers for consecutive correct answers.
    streaksEnabled: { type: Boolean, default: false },
    // Underdog bonus: bottom-3 players get +20% on each correct answer.
    underdogBonus: { type: Boolean, default: false },
    // Question shuffle: each player sees questions in randomized order (Kahoot style).
    shuffleQuestions: { type: Boolean, default: false },
    // Boss Round: last question is auto-tagged 'boss' regardless of per-entry tag.
    bossRoundEnabled: { type: Boolean, default: false },
    // Crown Carry: top-1 player wears a visible crown; stealing from crown is ×2.
    crownCarryEnabled: { type: Boolean, default: false },
    // Audio Vibe: theme palette for arena SFX (default | quizshow | 8bit | cinematic | chill).
    audioVibe: {
      type: String,
      enum: ['default', 'quizshow', '8bit', 'cinematic', 'chill'],
      default: 'default'
    },
  },
  // Lifecycle / discovery flags.
  isPublished: { type: Boolean, default: false, index: true },
  // Sort + cleanup helpers.
  lastUsedAt: { type: Date, default: null },
  usageCount: { type: Number, default: 0 },
  // Optional tags (free-form, lower-cased) for discoverability and filtering.
  tags: [{ type: String, trim: true, lowercase: true }],
}, { timestamps: true });

arenaTestSchema.index({ creator: 1, createdAt: -1 });
arenaTestSchema.index({ isPublished: 1, createdAt: -1 });
arenaTestSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('ArenaTest', arenaTestSchema);
