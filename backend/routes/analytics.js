const express = require('express');
const Analytics = require('../models/Analytics');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Track video view
router.post('/track/view', optionalAuth, async (req, res) => {
  try {
    const { 
      videoId, 
      sessionId = crypto.randomBytes(16).toString('hex'),
      source = 'direct',
      referrer 
    } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Get IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if this session already viewed the video
    let analytics = await Analytics.findOne({
      video: videoId,
      sessionId
    });

    if (!analytics) {
      // Create new analytics entry
      analytics = new Analytics({
        video: videoId,
        viewer: req.user ? req.user._id : null,
        sessionId,
        ipAddress,
        userAgent,
        source,
        referrer,
        device: {
          type: detectDeviceType(userAgent)
        }
      });

      // Increment video view count
      video.views += 1;
      await video.save();
    }

    analytics.lastUpdate = new Date();
    await analytics.save();

    res.json({ 
      sessionId,
      analyticsId: analytics._id,
      message: 'View tracked successfully' 
    });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update watch time and events
router.post('/track/progress', optionalAuth, async (req, res) => {
  try {
    const { 
      analyticsId,
      sessionId,
      videoId,
      watchTime, 
      percentageWatched,
      event 
    } = req.body;

    let analytics;
    
    if (analyticsId) {
      analytics = await Analytics.findById(analyticsId);
    } else if (sessionId && videoId) {
      analytics = await Analytics.findOne({ sessionId, video: videoId });
    }

    if (!analytics) {
      return res.status(404).json({ message: 'Analytics session not found' });
    }

    // Update watch time
    if (watchTime !== undefined) {
      analytics.watchTime = Math.max(analytics.watchTime, watchTime);
    }
    
    if (percentageWatched !== undefined) {
      analytics.percentageWatched = Math.max(analytics.percentageWatched, percentageWatched);
    }

    // Add event if provided
    if (event) {
      analytics.events.push({
        type: event.type,
        timestamp: event.timestamp
      });

      // If video ended, update end time
      if (event.type === 'ended') {
        analytics.endTime = new Date();
      }
    }

    analytics.lastUpdate = new Date();
    await analytics.save();

    res.json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Track progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Track engagement (like, dislike, comment, share, subscribe)
router.post('/track/engagement', auth, async (req, res) => {
  try {
    const { videoId, sessionId, type } = req.body;

    const analytics = await Analytics.findOne({
      video: videoId,
      sessionId
    });

    if (!analytics) {
      return res.status(404).json({ message: 'Analytics session not found' });
    }

    // Update engagement based on type
    switch (type) {
      case 'like':
        analytics.engagements.liked = true;
        analytics.engagements.disliked = false;
        break;
      case 'dislike':
        analytics.engagements.disliked = true;
        analytics.engagements.liked = false;
        break;
      case 'comment':
        analytics.engagements.commented = true;
        break;
      case 'share':
        analytics.engagements.shared = true;
        break;
      case 'subscribe':
        analytics.engagements.subscribed = true;
        break;
    }

    await analytics.save();

    res.json({ message: 'Engagement tracked successfully' });
  } catch (error) {
    console.error('Track engagement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get video analytics (for video owner)
router.get('/video/:videoId', auth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Check if user owns the video
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these analytics' });
    }

    // Calculate date range
    const dateRange = getDateRange(period);

    // Get overall analytics
    const overallStats = await Analytics.getVideoAnalytics(req.params.videoId, dateRange);
    
    // Get audience retention
    const audienceRetention = await Analytics.getAudienceRetention(req.params.videoId);
    
    // Get traffic sources
    const trafficSources = await Analytics.getTrafficSources(req.params.videoId, dateRange);
    
    // Get device stats
    const deviceStats = await Analytics.getDeviceStats(req.params.videoId, dateRange);
    
    // Get hourly views for real-time data
    const hourlyViews = await Analytics.getHourlyViews(req.params.videoId, 48);

    res.json({
      video: {
        id: video._id,
        title: video.title,
        uploadedAt: video.uploadedAt,
        duration: video.duration
      },
      period,
      overview: overallStats,
      audienceRetention,
      trafficSources,
      deviceStats,
      hourlyViews,
      performance: calculatePerformanceMetrics(overallStats, video)
    });
  } catch (error) {
    console.error('Get video analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel analytics overview (for channel owner)
router.get('/channel', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateRange = getDateRange(period);

    // Get all user's videos
    const videos = await Video.find({ 
      author: req.user._id,
      status: 'active' 
    }).select('_id title views likes dislikes uploadedAt');

    if (videos.length === 0) {
      return res.json({
        period,
        overview: {
          totalViews: 0,
          totalWatchTime: 0,
          subscribers: 0,
          estimatedRevenue: 0
        },
        topVideos: [],
        recentPerformance: []
      });
    }

    const videoIds = videos.map(v => v._id);

    // Get aggregated analytics for all videos
    const aggregatedStats = await Analytics.aggregate([
      { 
        $match: { 
          video: { $in: videoIds },
          startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        } 
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          totalWatchTime: { $sum: '$watchTime' },
          uniqueViewers: { $addToSet: '$sessionId' },
          subscribersGained: { $sum: { $cond: ['$engagements.subscribed', 1, 0] } }
        }
      },
      {
        $project: {
          totalViews: 1,
          totalWatchTime: 1,
          uniqueViewers: { $size: '$uniqueViewers' },
          subscribersGained: 1
        }
      }
    ]);

    const stats = aggregatedStats[0] || {
      totalViews: 0,
      totalWatchTime: 0,
      uniqueViewers: 0,
      subscribersGained: 0
    };

    // Get top performing videos
    const topVideos = await Analytics.aggregate([
      { 
        $match: { 
          video: { $in: videoIds },
          startTime: { $gte: dateRange.startDate }
        } 
      },
      {
        $group: {
          _id: '$video',
          views: { $sum: 1 },
          watchTime: { $sum: '$watchTime' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'videos',
          localField: '_id',
          foreignField: '_id',
          as: 'videoData'
        }
      },
      { $unwind: '$videoData' },
      {
        $project: {
          title: '$videoData.title',
          thumbnailUrl: '$videoData.thumbnailUrl',
          views: 1,
          watchTime: 1
        }
      }
    ]);

    // Get subscriber count
    const user = await User.findById(req.user._id).select('subscriberCount');

    res.json({
      period,
      overview: {
        totalViews: stats.totalViews,
        totalWatchTime: stats.totalWatchTime,
        uniqueViewers: stats.uniqueViewers,
        subscribers: user.subscriberCount || 0,
        subscribersGained: stats.subscribersGained,
        estimatedRevenue: calculateEstimatedRevenue(stats)
      },
      topVideos,
      videosCount: videos.length
    });
  } catch (error) {
    console.error('Get channel analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get real-time analytics (last 48 hours)
router.get('/realtime/:videoId', auth, async (req, res) => {
  try {
    // Check if user owns the video
    const video = await Video.findById(req.params.videoId);
    if (!video || video.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get current viewers (sessions active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const currentViewers = await Analytics.countDocuments({
      video: req.params.videoId,
      lastUpdate: { $gte: fiveMinutesAgo }
    });

    // Get views in last 48 hours
    const hourlyViews = await Analytics.getHourlyViews(req.params.videoId, 48);

    // Get recent engagement
    const recentEngagement = await Analytics.aggregate([
      {
        $match: {
          video: mongoose.Types.ObjectId(req.params.videoId),
          startTime: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          likes: { $sum: { $cond: ['$engagements.liked', 1, 0] } },
          comments: { $sum: { $cond: ['$engagements.commented', 1, 0] } },
          shares: { $sum: { $cond: ['$engagements.shared', 1, 0] } }
        }
      }
    ]);

    res.json({
      currentViewers,
      hourlyViews,
      recentEngagement: recentEngagement[0] || { likes: 0, comments: 0, shares: 0 }
    });
  } catch (error) {
    console.error('Get realtime analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet')) return 'tablet';
  if (ua.includes('tv')) return 'tv';
  return 'desktop';
}

function getDateRange(period) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '1d':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  return { startDate, endDate };
}

function calculatePerformanceMetrics(stats, video) {
  const avgViewDuration = stats.avgWatchTime;
  const videoDuration = video.duration;
  
  return {
    engagementRate: ((stats.likes + stats.comments + stats.shares) / stats.totalViews * 100).toFixed(2),
    likeDislikeRatio: stats.dislikes > 0 ? (stats.likes / stats.dislikes).toFixed(2) : stats.likes,
    averageViewDuration: avgViewDuration,
    averagePercentageViewed: stats.avgPercentageWatched,
    clickThroughRate: (stats.subscribersGained / stats.totalViews * 100).toFixed(2)
  };
}

function calculateEstimatedRevenue(stats) {
  // Simple revenue calculation: $0.01 per view + $0.001 per minute watched
  const viewRevenue = stats.totalViews * 0.01;
  const watchTimeRevenue = (stats.totalWatchTime / 60) * 0.001;
  return (viewRevenue + watchTimeRevenue).toFixed(2);
}

module.exports = router;