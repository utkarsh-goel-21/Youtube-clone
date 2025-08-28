const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous viewers
  },
  sessionId: {
    type: String,
    required: true // To track unique views
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  watchTime: {
    type: Number,
    default: 0 // in seconds
  },
  percentageWatched: {
    type: Number,
    default: 0
  },
  events: [{
    type: {
      type: String,
      enum: ['play', 'pause', 'seek', 'ended', 'quality_change', 'fullscreen', 'error']
    },
    timestamp: Number, // video timestamp when event occurred
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  engagements: {
    liked: {
      type: Boolean,
      default: false
    },
    disliked: {
      type: Boolean,
      default: false
    },
    commented: {
      type: Boolean,
      default: false
    },
    shared: {
      type: Boolean,
      default: false
    },
    subscribed: {
      type: Boolean,
      default: false
    }
  },
  source: {
    type: String,
    enum: ['direct', 'search', 'suggested', 'channel', 'playlist', 'external', 'notification'],
    default: 'direct'
  },
  referrer: String,
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'tv', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String
  },
  location: {
    country: String,
    region: String,
    city: String
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  lastUpdate: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
analyticsSchema.index({ video: 1, sessionId: 1 });
analyticsSchema.index({ video: 1, viewer: 1 });
analyticsSchema.index({ video: 1, startTime: -1 });
analyticsSchema.index({ startTime: -1 });

// Static method to get video analytics
analyticsSchema.statics.getVideoAnalytics = async function(videoId, dateRange = {}) {
  const query = { video: videoId };
  
  if (dateRange.startDate) {
    query.startTime = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.startTime = { ...query.startTime, $lte: dateRange.endDate };
  }

  const analytics = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$sessionId' },
        totalWatchTime: { $sum: '$watchTime' },
        avgWatchTime: { $avg: '$watchTime' },
        avgPercentageWatched: { $avg: '$percentageWatched' },
        likes: { $sum: { $cond: ['$engagements.liked', 1, 0] } },
        dislikes: { $sum: { $cond: ['$engagements.disliked', 1, 0] } },
        comments: { $sum: { $cond: ['$engagements.commented', 1, 0] } },
        shares: { $sum: { $cond: ['$engagements.shared', 1, 0] } },
        subscribersGained: { $sum: { $cond: ['$engagements.subscribed', 1, 0] } }
      }
    },
    {
      $project: {
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        totalWatchTime: 1,
        avgWatchTime: { $round: ['$avgWatchTime', 2] },
        avgPercentageWatched: { $round: ['$avgPercentageWatched', 2] },
        likes: 1,
        dislikes: 1,
        comments: 1,
        shares: 1,
        subscribersGained: 1
      }
    }
  ]);

  return analytics[0] || {
    totalViews: 0,
    uniqueViewers: 0,
    totalWatchTime: 0,
    avgWatchTime: 0,
    avgPercentageWatched: 0,
    likes: 0,
    dislikes: 0,
    comments: 0,
    shares: 0,
    subscribersGained: 0
  };
};

// Get audience retention data
analyticsSchema.statics.getAudienceRetention = async function(videoId, intervals = 10) {
  const sessions = await this.find({ 
    video: videoId,
    percentageWatched: { $gt: 0 }
  }).select('events percentageWatched');

  // Create retention buckets
  const retention = new Array(intervals).fill(0);
  const counts = new Array(intervals).fill(0);
  
  sessions.forEach(session => {
    const bucketSize = 100 / intervals;
    for (let i = 0; i < intervals; i++) {
      const bucketStart = i * bucketSize;
      const bucketEnd = (i + 1) * bucketSize;
      if (session.percentageWatched >= bucketEnd || 
          (i === intervals - 1 && session.percentageWatched >= bucketStart)) {
        retention[i]++;
      }
    }
  });

  // Calculate percentage retention for each bucket
  const totalSessions = sessions.length;
  return retention.map((count, index) => ({
    percentage: (index * (100 / intervals)),
    retention: totalSessions > 0 ? (count / totalSessions) * 100 : 0
  }));
};

// Get traffic sources breakdown
analyticsSchema.statics.getTrafficSources = async function(videoId, dateRange = {}) {
  const query = { video: videoId };
  
  if (dateRange.startDate) {
    query.startTime = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.startTime = { ...query.startTime, $lte: dateRange.endDate };
  }

  return await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        avgWatchTime: { $avg: '$watchTime' }
      }
    },
    {
      $project: {
        source: '$_id',
        count: 1,
        avgWatchTime: { $round: ['$avgWatchTime', 2] },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Get device breakdown
analyticsSchema.statics.getDeviceStats = async function(videoId, dateRange = {}) {
  const query = { video: videoId };
  
  if (dateRange.startDate) {
    query.startTime = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.startTime = { ...query.startTime, $lte: dateRange.endDate };
  }

  return await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$device.type',
        count: { $sum: 1 },
        avgWatchTime: { $avg: '$watchTime' }
      }
    },
    {
      $project: {
        device: '$_id',
        count: 1,
        avgWatchTime: { $round: ['$avgWatchTime', 2] },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Get hourly views for real-time tracking
analyticsSchema.statics.getHourlyViews = async function(videoId, hours = 24) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hours);

  return await this.aggregate([
    {
      $match: {
        video: videoId,
        startTime: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d %H:00',
            date: '$startTime'
          }
        },
        views: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        hour: '$_id',
        views: 1,
        _id: 0
      }
    }
  ]);
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;