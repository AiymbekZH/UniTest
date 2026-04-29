const mongoose = require('mongoose');

const arenaOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, default: '' }
}, { _id: false });

const arenaQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  type: {
    type: String,
    enum: ['single-choice', 'multiple-choice', 'true-false', 'matching', 'fill-blank'],
    required: true
  },
  questionText: { type: String, required: true },
  passage: { type: String, default: '' },
  points: { type: Number, default: 1, min: 1 },
  timeLimitSec: { type: Number, default: 20, min: 5 },
  options: { type: [arenaOptionSchema], default: [] },
  matchingRightSide: { type: [arenaOptionSchema], default: [] },
  grading: {
    correctOptionIds: { type: [String], default: [] },
    acceptedAnswers: { type: [String], default: [] },
    correctPairs: { type: Map, of: String, default: {} }
  },
  // ─── Arena spice (Phase 2 / Inline-create) ─────────────────────────────
  // speedProfile: 'blitz' | 'normal' | 'marathon' | 'custom' — bumps point multipliers.
  speedProfile: { type: String, default: 'normal' },
  // One option id flagged as a streak-killer (selecting it == 0 streak + −20% next q).
  trapOptionId: { type: String, default: '' },
  // Boss question — no power-ups can be activated (server-side reject).
  blockPowerUps: { type: Boolean, default: false },
  // Optional hint shown to all players at 50% of the timer.
  revealHint: { type: String, default: '' },
  // Per-player option shuffling flag (anti-cheat / Kahoot-style).
  shuffleOptions: { type: Boolean, default: true },
  // Optional explanation shown at answer-reveal phase.
  explanation: { type: String, default: '' }
}, { _id: false });

const arenaRoomSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    enum: ['public', 'group', 'dm_duel'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending_acceptance',
      'lobby',
      'countdown',
      'starting_countdown',
      'question_intro',
      'live_question',
      'answer_reveal',
      'leaderboard',
      'round_result',
      'paused',
      'declined',
      'cancelled',
      'final'
    ],
    default: 'lobby'
  },
  title: { type: String, required: true, trim: true },
  joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  hostUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Optional: bank-sourced arenas (created via ArenaQuestionPicker) have no source Test.
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', default: null },
  questionSnapshot: { type: [arenaQuestionSchema], default: [] },
  currentQuestionIndex: { type: Number, default: -1 },
  countdownEndsAt: { type: Date, default: null },
  questionIntroEndsAt: { type: Date, default: null },
  questionStartedAt: { type: Date, default: null },
  questionEndsAt: { type: Date, default: null },
  answerRevealEndsAt: { type: Date, default: null },
  leaderboardEndsAt: { type: Date, default: null },
  phaseEndsAt: { type: Date, default: null },
  roundResolvedAt: { type: Date, default: null },
  pausedFromStatus: {
    type: String,
    enum: ['countdown', 'starting_countdown', 'question_intro', 'live_question', 'answer_reveal', 'leaderboard', 'round_result', null],
    default: null
  },
  pauseEndsAt: { type: Date, default: null },
  finalizedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  // Used by the lobby auto-cleanup loop. Bumped on host actions, joins,
  // answers, etc. (not bumped by automatic phase progression saves).
  lastActivityAt: { type: Date, default: Date.now, index: true },
  settings: {
    countdownSeconds: { type: Number, default: 5, min: 3, max: 15 },
    questionIntroSec: { type: Number, default: 3, min: 1, max: 10 },
    answerTimeSec: { type: Number, default: 20, min: 5, max: 120 },
    answerRevealSec: { type: Number, default: 5, min: 2, max: 20 },
    leaderboardSec: { type: Number, default: 6, min: 2, max: 30 },
    allowGuests: { type: Boolean, default: false },
    maxPlayers: { type: Number, default: 100, min: 2, max: 500 }
  }
}, { timestamps: true });

arenaRoomSchema.index({ hostUser: 1, createdAt: -1 });
arenaRoomSchema.index({ sourceType: 1, status: 1, createdAt: -1 });
arenaRoomSchema.index({ group: 1, createdAt: -1 });
arenaRoomSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('ArenaRoom', arenaRoomSchema);
