const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['message', 'donation', 'subscription', 'moderator', 'system'],
    default: 'message'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  donation: {
    amount: Number,
    currency: String
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: Date,
  metadata: {
    userBadges: [String], // subscriber, moderator, verified, etc.
    color: String, // user's chat color
    emotes: [String] // emote codes used
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatMessageSchema.index({ stream: 1, createdAt: -1 });
chatMessageSchema.index({ stream: 1, isPinned: 1 });
chatMessageSchema.index({ user: 1, stream: 1 });

// Get recent messages for a stream
chatMessageSchema.statics.getRecentMessages = async function(streamId, limit = 100) {
  return await this.find({
    stream: streamId,
    isDeleted: false
  })
  .populate('user', 'username channelName avatar')
  .populate('replyTo', 'user message')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Soft delete message
chatMessageSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true;
  this.deletedBy = deletedBy;
  this.deletedAt = new Date();
  this.message = '[Message deleted]';
  return await this.save();
};

// Virtual for time ago
chatMessageSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;