const express = require('express');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');
const ModerationAction = require('../models/ModerationAction');
const User = require('../models/User');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Stream = require('../models/Stream');
const { auth, adminAuth } = require('../middleware/auth');
const contentFilter = require('../utils/contentFilter');

const router = express.Router();

// Report content
router.post('/report', [
  auth,
  body('contentType')
    .isIn(['video', 'comment', 'user', 'stream', 'playlist'])
    .withMessage('Invalid content type'),
  body('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
  body('reason')
    .isIn(['spam', 'sexual_content', 'violent_content', 'hateful_content', 'harassment', 
           'harmful_content', 'child_safety', 'terrorism', 'misinformation', 'copyright', 
           'privacy', 'impersonation', 'other'])
    .withMessage('Invalid reason'),
  body('description')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { contentType, contentId, reason, description, evidence } = req.body;

    // Check if already reported by this user
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      contentType,
      contentId,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingReport) {
      return res.status(400).json({ 
        message: 'You have already reported this content'
      });
    }

    // Get content details for metadata
    let contentModel, contentData;
    switch (contentType) {
      case 'video':
        contentModel = 'Video';
        contentData = await Video.findById(contentId).populate('author');
        break;
      case 'comment':
        contentModel = 'Comment';
        contentData = await Comment.findById(contentId).populate('author');
        break;
      case 'user':
        contentModel = 'User';
        contentData = await User.findById(contentId);
        break;
      case 'stream':
        contentModel = 'Stream';
        contentData = await Stream.findById(contentId).populate('streamer');
        break;
      default:
        contentModel = 'Video';
    }

    if (!contentData) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Determine priority based on content and reason
    let priority = 'medium';
    if (['child_safety', 'terrorism', 'violent_content'].includes(reason)) {
      priority = 'critical';
    } else if (['hateful_content', 'harassment', 'harmful_content'].includes(reason)) {
      priority = 'high';
    }

    // Check how many times this content has been reported
    const reportCount = await Report.countDocuments({
      contentType,
      contentId
    });

    // Create report
    const report = new Report({
      reporter: req.user._id,
      contentType,
      contentId,
      contentModel,
      reason,
      category: getCategoryFromReason(reason),
      description,
      evidence: evidence || [],
      priority,
      metadata: {
        contentTitle: contentData.title || contentData.username || contentData.content,
        contentAuthor: contentData.author?.username || contentData.streamer?.username || contentData.username,
        contentCreatedAt: contentData.createdAt,
        viewCount: contentData.views || contentData.viewCount || 0,
        reportCount: reportCount + 1
      }
    });

    await report.save();

    // Auto-escalate if multiple reports
    if (reportCount >= 5) {
      report.priority = 'high';
      report.isUrgent = true;
      await report.save();
    }

    res.status(201).json({ 
      message: 'Report submitted successfully',
      reportId: report._id
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Error submitting report' });
  }
});

// Get user's reports
router.get('/reports/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments({ reporter: req.user._id });

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

// Admin: Get moderation queue
router.get('/queue', adminAuth, async (req, res) => {
  try {
    const { status, priority, contentType, assignedTo, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (contentType) query.contentType = contentType;
    if (assignedTo) query.assignedTo = assignedTo;

    const reports = await Report.getModerationQueue({ 
      ...query, 
      limit: parseInt(limit) 
    });

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({ message: 'Error fetching moderation queue' });
  }
});

// Admin: Review report
router.post('/review/:reportId', adminAuth, async (req, res) => {
  try {
    const { action, notes } = req.body;
    
    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Assign to moderator if not assigned
    if (!report.assignedTo) {
      await report.assignToModerator(req.user._id);
    }

    // Take moderation action
    if (action === 'escalate') {
      await report.escalate(notes, req.user._id);
    } else if (action === 'dismiss') {
      report.status = 'dismissed';
      report.resolution = {
        action: 'no_action',
        notes,
        resolvedBy: req.user._id,
        resolvedAt: new Date()
      };
      await report.save();
    } else {
      // Resolve with action
      await report.resolve(action, notes, req.user._id);

      // Create moderation action record
      const moderationAction = new ModerationAction({
        moderator: req.user._id,
        targetContent: report.contentId,
        targetContentModel: report.contentModel,
        actionType: mapResolutionToActionType(action),
        reason: notes,
        violationCategory: mapReasonToCategory(report.reason),
        severity: mapPriorityToSeverity(report.priority),
        reportId: report._id
      });

      await moderationAction.save();

      // Apply the action
      await applyModerationAction(moderationAction);
    }

    res.json({ 
      message: 'Report reviewed successfully',
      report
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ message: 'Error reviewing report' });
  }
});

// Admin: Get moderation statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;

    const reportStats = await Report.getReportStats(timeframe);
    const actionStats = await ModerationAction.getStats(timeframe);

    // Get pending reports by priority
    const pendingByPriority = await Report.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top reported content
    const topReported = await Report.aggregate([
      {
        $group: {
          _id: {
            contentType: '$contentType',
            contentId: '$contentId'
          },
          count: { $sum: 1 },
          reasons: { $push: '$reason' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      reports: reportStats,
      actions: actionStats,
      pendingByPriority,
      topReported,
      timeframe
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Admin: Ban/suspend user
router.post('/user/:userId/action', adminAuth, async (req, res) => {
  try {
    const { action, reason, duration, notes } = req.body;
    
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let expiresAt = null;
    if (duration && action === 'suspend_user') {
      expiresAt = new Date();
      switch (duration.unit) {
        case 'hours':
          expiresAt.setHours(expiresAt.getHours() + duration.value);
          break;
        case 'days':
          expiresAt.setDate(expiresAt.getDate() + duration.value);
          break;
        case 'weeks':
          expiresAt.setDate(expiresAt.getDate() + (duration.value * 7));
          break;
        case 'months':
          expiresAt.setMonth(expiresAt.getMonth() + duration.value);
          break;
      }
    }

    // Create moderation action
    const moderationAction = new ModerationAction({
      moderator: req.user._id,
      targetUser: req.params.userId,
      actionType: action,
      reason,
      violationCategory: 'community_guidelines',
      severity: action === 'ban_user' ? 'critical' : 'severe',
      duration,
      expiresAt,
      notes
    });

    await moderationAction.save();

    // Apply the action
    if (action === 'ban_user') {
      targetUser.isBanned = true;
      await targetUser.save();
    } else if (action === 'suspend_user') {
      targetUser.suspendedUntil = expiresAt;
      await targetUser.save();
    } else if (action === 'warn_user') {
      // Send warning notification (implement with notification system)
    }

    res.json({ 
      message: `User ${action.replace('_', ' ')} successfully`,
      action: moderationAction
    });
  } catch (error) {
    console.error('Error applying user action:', error);
    res.status(500).json({ message: 'Error applying user action' });
  }
});

// Admin: Get user moderation history
router.get('/user/:userId/history', adminAuth, async (req, res) => {
  try {
    const history = await ModerationAction.getUserHistory(req.params.userId);
    const activeRestrictions = await ModerationAction.getActiveRestrictions(req.params.userId);
    
    res.json({
      history,
      activeRestrictions
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ message: 'Error fetching user history' });
  }
});

// Check content before posting (for proactive moderation)
router.post('/check', auth, async (req, res) => {
  try {
    const { content, contentType } = req.body;
    
    const analysis = await contentFilter.analyzeContent(content, contentType);
    
    res.json({
      allowed: analysis.clean,
      violations: analysis.violations,
      confidence: analysis.confidence,
      suggestions: analysis.clean ? [] : ['Please review our community guidelines']
    });
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({ message: 'Error checking content' });
  }
});

// Helper functions (would be in a separate utility file)
function getCategoryFromReason(reason) {
  const categoryMap = {
    'spam': 'content',
    'sexual_content': 'safety',
    'violent_content': 'safety',
    'hateful_content': 'behavior',
    'harassment': 'behavior',
    'harmful_content': 'safety',
    'child_safety': 'safety',
    'terrorism': 'safety',
    'misinformation': 'content',
    'copyright': 'legal',
    'privacy': 'legal',
    'impersonation': 'behavior'
  };
  return categoryMap[reason] || 'content';
}

function mapResolutionToActionType(resolution) {
  const actionMap = {
    'warning': 'warn_user',
    'content_removed': 'remove_content',
    'content_restricted': 'restrict_content',
    'user_suspended': 'suspend_user',
    'user_banned': 'ban_user',
    'channel_strike': 'issue_strike'
  };
  return actionMap[resolution] || 'review_appeal';
}

function mapReasonToCategory(reason) {
  const categoryMap = {
    'spam': 'spam',
    'sexual_content': 'sexual_content',
    'violent_content': 'violence',
    'hateful_content': 'hate_speech',
    'harassment': 'harassment',
    'copyright': 'copyright',
    'privacy': 'privacy'
  };
  return categoryMap[reason] || 'community_guidelines';
}

function mapPriorityToSeverity(priority) {
  const severityMap = {
    'critical': 'critical',
    'high': 'severe',
    'medium': 'moderate',
    'low': 'minor'
  };
  return severityMap[priority];
}

async function applyModerationAction(action) {
  // This would implement the actual action
  // For example, removing content, suspending users, etc.
  // Implementation depends on the action type
}

module.exports = router;