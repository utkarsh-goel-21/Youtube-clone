const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['video', 'comment', 'user', 'stream', 'playlist'],
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentModel'
  },
  contentModel: {
    type: String,
    required: true,
    enum: ['Video', 'Comment', 'User', 'Stream', 'Playlist']
  },
  reason: {
    type: String,
    enum: [
      'spam',                    // Spam or misleading
      'sexual_content',          // Sexual content
      'violent_content',         // Violence or dangerous content
      'hateful_content',         // Hate speech or discrimination
      'harassment',              // Harassment or bullying
      'harmful_content',         // Harmful or dangerous acts
      'child_safety',            // Child safety concerns
      'terrorism',               // Terrorism or extremism
      'misinformation',          // Misinformation
      'copyright',               // Copyright violation
      'privacy',                 // Privacy violation
      'impersonation',           // Impersonation
      'other'                    // Other
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['content', 'behavior', 'legal', 'safety'],
    default: 'content'
  },
  description: {
    type: String,
    maxlength: 5000,
    required: true
  },
  evidence: [{
    type: String,  // URLs, screenshots, timestamps
    maxlength: 1000
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed', 'escalated'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolution: {
    action: {
      type: String,
      enum: [
        'no_action',           // No violation found
        'warning',             // Warning issued
        'content_removed',     // Content removed
        'content_restricted',  // Age restriction applied
        'user_suspended',      // User suspended
        'user_banned',         // User permanently banned
        'channel_strike',      // Strike issued to channel
        'monetization_disabled', // Monetization disabled
        'other'
      ]
    },
    notes: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    appealable: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    contentTitle: String,
    contentAuthor: String,
    contentCreatedAt: Date,
    viewCount: Number,
    reportCount: Number,  // Number of reports for same content
    previousViolations: Number,
    automatedFlags: [String]
  },
  reviewHistory: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String,
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ status: 1, priority: -1, createdAt: 1 });
reportSchema.index({ contentType: 1, contentId: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });

// Check if content has been reported before
reportSchema.statics.checkExistingReport = async function(contentType, contentId, reason) {
  return await this.findOne({
    contentType,
    contentId,
    reason,
    status: { $in: ['pending', 'reviewing'] }
  });
};

// Get report statistics
reportSchema.statics.getReportStats = async function(timeframe = 'day') {
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

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        byReason: {
          $push: '$reason'
        },
        byContentType: {
          $push: '$contentType'
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    pending: 0,
    resolved: 0,
    byReason: [],
    byContentType: []
  };
};

// Get moderation queue
reportSchema.statics.getModerationQueue = async function(filters = {}) {
  const query = {
    status: filters.status || { $in: ['pending', 'reviewing'] }
  };

  if (filters.contentType) {
    query.contentType = filters.contentType;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  return await this.find(query)
    .populate('reporter', 'username channelName')
    .populate('assignedTo', 'username role')
    .sort({ priority: -1, createdAt: 1 })
    .limit(filters.limit || 50);
};

// Assign report to moderator
reportSchema.methods.assignToModerator = async function(moderatorId) {
  this.assignedTo = moderatorId;
  this.status = 'reviewing';
  this.reviewHistory.push({
    reviewer: moderatorId,
    action: 'assigned',
    notes: 'Report assigned for review'
  });
  return await this.save();
};

// Resolve report
reportSchema.methods.resolve = async function(action, notes, moderatorId) {
  this.status = 'resolved';
  this.resolution = {
    action,
    notes,
    resolvedBy: moderatorId,
    resolvedAt: new Date()
  };
  this.reviewHistory.push({
    reviewer: moderatorId,
    action: 'resolved',
    notes: `Resolved with action: ${action}`
  });
  return await this.save();
};

// Escalate report
reportSchema.methods.escalate = async function(notes, moderatorId) {
  this.status = 'escalated';
  this.priority = 'critical';
  this.reviewHistory.push({
    reviewer: moderatorId,
    action: 'escalated',
    notes
  });
  return await this.save();
};

// Virtual for age
reportSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for isOverdue (based on priority)
reportSchema.virtual('isOverdue').get(function() {
  const age = this.age;
  const limits = {
    critical: 1 * 60 * 60 * 1000,    // 1 hour
    high: 6 * 60 * 60 * 1000,        // 6 hours
    medium: 24 * 60 * 60 * 1000,     // 24 hours
    low: 72 * 60 * 60 * 1000         // 72 hours
  };
  
  return age > limits[this.priority];
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;