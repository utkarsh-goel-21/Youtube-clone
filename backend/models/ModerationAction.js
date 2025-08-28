const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema({
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  targetContent: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetContentModel'
  },
  targetContentModel: {
    type: String,
    enum: ['Video', 'Comment', 'Stream', 'Playlist']
  },
  actionType: {
    type: String,
    enum: [
      // Content actions
      'remove_content',
      'restore_content',
      'restrict_content',
      'unrestrict_content',
      'demonetize_content',
      'remonetize_content',
      
      // User actions
      'warn_user',
      'suspend_user',
      'unsuspend_user',
      'ban_user',
      'unban_user',
      'restrict_user',
      'unrestrict_user',
      
      // Channel actions
      'issue_strike',
      'remove_strike',
      'disable_features',
      'enable_features',
      'disable_monetization',
      'enable_monetization',
      
      // Other actions
      'review_appeal',
      'approve_appeal',
      'deny_appeal',
      'escalate_report',
      'dismiss_report'
    ],
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  violationCategory: {
    type: String,
    enum: [
      'community_guidelines',
      'copyright',
      'privacy',
      'terms_of_service',
      'spam',
      'misleading',
      'hate_speech',
      'violence',
      'sexual_content',
      'child_safety',
      'other'
    ]
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe', 'critical'],
    default: 'moderate'
  },
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months', 'permanent']
    }
  },
  expiresAt: Date,
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  notes: {
    type: String,
    maxlength: 5000
  },
  evidence: [{
    type: String,
    maxlength: 1000
  }],
  isAutomated: {
    type: Boolean,
    default: false
  },
  automatedSystem: String, // Name of the automated system if applicable
  confidence: Number, // Confidence score if automated (0-100)
  isReversible: {
    type: Boolean,
    default: true
  },
  reversedBy: {
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    at: Date,
    reason: String
  },
  affectedMetrics: {
    videosRemoved: Number,
    commentsRemoved: Number,
    subscribersLost: Number,
    viewsLost: Number,
    revenueLost: Number
  },
  userNotified: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  appealDeadline: Date,
  metadata: {
    ipAddress: String,
    userAgent: String,
    previousViolations: Number,
    accountAge: Number,
    channelSize: Number
  }
}, {
  timestamps: true
});

// Indexes
moderationActionSchema.index({ targetUser: 1, createdAt: -1 });
moderationActionSchema.index({ actionType: 1, createdAt: -1 });
moderationActionSchema.index({ expiresAt: 1 });
moderationActionSchema.index({ moderator: 1, createdAt: -1 });

// Check if action is expired
moderationActionSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Reverse action
moderationActionSchema.methods.reverse = async function(moderatorId, reason) {
  if (!this.isReversible) {
    throw new Error('This action is not reversible');
  }
  
  this.reversedBy = {
    moderator: moderatorId,
    at: new Date(),
    reason
  };
  
  return await this.save();
};

// Get user's moderation history
moderationActionSchema.statics.getUserHistory = async function(userId, limit = 50) {
  return await this.find({ targetUser: userId })
    .populate('moderator', 'username role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get active restrictions for a user
moderationActionSchema.statics.getActiveRestrictions = async function(userId) {
  return await this.find({
    targetUser: userId,
    actionType: { $in: ['suspend_user', 'ban_user', 'restrict_user', 'issue_strike'] },
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null }
    ],
    'reversedBy.at': { $exists: false }
  });
};

// Get moderation statistics
moderationActionSchema.statics.getStats = async function(timeframe = 'day') {
  const now = new Date();
  let startDate;
  
  switch(timeframe) {
    case 'hour':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        automated: {
          $sum: { $cond: ['$isAutomated', 1, 0] }
        },
        manual: {
          $sum: { $cond: ['$isAutomated', 0, 1] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Check if user has recent violations
moderationActionSchema.statics.hasRecentViolations = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const violations = await this.countDocuments({
    targetUser: userId,
    createdAt: { $gte: startDate },
    severity: { $in: ['severe', 'critical'] }
  });
  
  return violations > 0;
};

const ModerationAction = mongoose.model('ModerationAction', moderationActionSchema);

module.exports = ModerationAction;