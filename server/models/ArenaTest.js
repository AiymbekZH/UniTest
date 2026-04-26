const mongoose = require('mongoose');

/**
 * ArenaTest — a reusable, arena-specific test template that lives outside the
 * normal Test/Question pipeline. Question references point at BankQuestion, so
 * editing a bank question retroactively updates every ArenaTest that uses it.
 *
 * Each entry can override the bank's default timer/points just for this arena
 * template. The full arena snapshot is hydrated at room-creation time by
 * createArenaRoomFromArenaTest() in arenaEngine.js.
 */
const arenaTestEntrySchema = new mongoose.Schema({
  bankQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankQuestion',
    required: true
  },
  // Per-question overrides (null = use room default / bank default).
  timerOverride: { type: Number, default: null, min: 5, max: 300 },
  pointsOverride: { type: Number, default: null, min: 0, max: 1000 },
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
