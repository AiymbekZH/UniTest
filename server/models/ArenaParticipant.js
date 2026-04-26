const mongoose = require('mongoose');

const arenaAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionIndex: { type: Number, required: true },
  type: { type: String, required: true },
  selectedOptions: [{ type: String }],
  textAnswer: { type: String, default: '' },
  matchingPairs: [{ left: String, right: String }],
  isCorrect: { type: Boolean, default: false },
  basePoints: { type: Number, default: 0 },
  speedBonus: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1 },
  pointsAwarded: { type: Number, default: 0 },
  responseTimeMs: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now }
}, { _id: false });

const arenaParticipantSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'ArenaRoom', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: '' },
  guestTokenId: { type: String, default: '' },
  role: { type: String, enum: ['host', 'player'], default: 'player' },
  state: {
    type: String,
    enum: ['joined', 'disconnected', 'declined'],
    default: 'joined'
  },
  score: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  answeredCount: { type: Number, default: 0 },
  totalResponseTimeMs: { type: Number, default: 0 },
  answers: { type: [arenaAnswerSchema], default: [] },
  joinedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  kickedAt: { type: Date, default: null },
  powerUps: {
    fiftyFifty:   { type: Number, default: 1 },
    doublePoints: { type: Number, default: 1 },
    shield:       { type: Number, default: 1 },
    timeFreeze:   { type: Number, default: 1 },
    steal:        { type: Number, default: 1 },
    mirror:       { type: Number, default: 1 },
    suddenDeath:  { type: Number, default: 1 }
  },
  activePowerUps: {
    type: Map,
    of: new mongoose.Schema({
      type: {
        type: String,
        enum: ['fiftyFifty', 'doublePoints', 'shield', 'timeFreeze', 'mirror', 'suddenDeath']
      },
      questionIndex: { type: Number },
      removedOptionIds: [{ type: String }],
      // For mirror: cached vote distribution at activation time.
      voteDistribution: { type: Map, of: Number },
      // For timeFreeze: when (ms timestamp) the freeze was applied.
      freezeAppliedAt: { type: Number }
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true });

arenaParticipantSchema.index({ room: 1, score: -1, totalResponseTimeMs: 1 });
arenaParticipantSchema.index({ room: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
arenaParticipantSchema.index({ room: 1, guestTokenId: 1 }, { unique: true, partialFilterExpression: { guestTokenId: { $type: 'string', $ne: '' } } });

module.exports = mongoose.model('ArenaParticipant', arenaParticipantSchema);
