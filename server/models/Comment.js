const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  isDeleted: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false }
}, { timestamps: true });

commentSchema.index({ test: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
