const mongoose = require('mongoose');

const dmMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'audio'],
    default: 'text'
  },

  text: { type: String, default: '' },

  attachments: [{
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    data: { type: String },
  }],

  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },

  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

dmMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('DMMessage', dmMessageSchema);
