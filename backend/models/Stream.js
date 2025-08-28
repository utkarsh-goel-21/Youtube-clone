const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 5000
  },
  thumbnail: {
    type: String,
    default: null
  },
  streamKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  category: {
    type: String,
    enum: ['Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Talk Shows', 'Other'],
    default: 'Other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  },
  scheduledStartTime: {
    type: Date,
    default: null
  },
  actualStartTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  viewers: {
    current: {
      type: Number,
      default: 0
    },
    peak: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    unique: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  chat: {
    enabled: {
      type: Boolean,
      default: true
    },
    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    slowMode: {
      enabled: Boolean,
      seconds: Number
    },
    subscribersOnly: {
      type: Boolean,
      default: false
    }
  },
  donations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    currency: String,
    message: String,
    timestamp: Date
  }],
  recording: {
    enabled: {
      type: Boolean,
      default: true
    },
    url: String,
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    }
  },
  quality: {
    resolution: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p', '1440p', '4k'],
      default: '720p'
    },
    bitrate: {
      type: Number,
      default: 2500 // kbps
    },
    fps: {
      type: Number,
      default: 30
    }
  },
  restrictions: {
    ageRestricted: {
      type: Boolean,
      default: false
    },
    geoBlocked: {
      countries: [String]
    }
  },
  monetization: {
    enabled: {
      type: Boolean,
      default: false
    },
    midrollAds: {
      enabled: Boolean,
      frequency: Number // minutes between ads
    }
  },
  analytics: {
    avgWatchTime: Number,
    engagementRate: Number,
    chatMessages: Number,
    shares: Number
  },
  rtmpUrl: String,
  webrtcOffer: String,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
streamSchema.index({ status: 1, visibility: 1, createdAt: -1 });
streamSchema.index({ streamer: 1, status: 1 });
streamSchema.index({ category: 1, status: 1 });
streamSchema.index({ 'viewers.current': -1, status: 1 });

// Generate unique stream key
streamSchema.statics.generateStreamKey = function() {
  return 'live_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

// Get live streams
streamSchema.statics.getLiveStreams = async function(filters = {}) {
  const query = {
    status: 'live',
    visibility: 'public',
    isDeleted: false,
    ...filters
  };
  
  return await this.find(query)
    .populate('streamer', 'username channelName avatar subscriberCount')
    .sort({ 'viewers.current': -1 });
};

// Update viewer count
streamSchema.methods.updateViewerCount = async function(userId, action = 'join') {
  if (action === 'join') {
    this.viewers.current++;
    if (this.viewers.current > this.viewers.peak) {
      this.viewers.peak = this.viewers.current;
    }
    this.viewers.total++;
    if (userId && !this.viewers.unique.includes(userId)) {
      this.viewers.unique.push(userId);
    }
  } else if (action === 'leave' && this.viewers.current > 0) {
    this.viewers.current--;
  }
  
  return await this.save();
};

// Start stream
streamSchema.methods.startStream = async function() {
  this.status = 'live';
  this.actualStartTime = new Date();
  return await this.save();
};

// End stream
streamSchema.methods.endStream = async function() {
  this.status = 'ended';
  this.endTime = new Date();
  if (this.actualStartTime) {
    this.duration = Math.floor((this.endTime - this.actualStartTime) / 1000);
  }
  this.viewers.current = 0;
  return await this.save();
};

// Virtual for formatted duration
streamSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for isLive
streamSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream;