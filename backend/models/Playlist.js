const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videos: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    position: {
      type: Number,
      default: 0
    }
  }],
  thumbnail: {
    type: String,
    default: null // Will use first video's thumbnail if not set
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
playlistSchema.index({ author: 1, createdAt: -1 });
playlistSchema.index({ title: 'text', description: 'text', tags: 'text' });
playlistSchema.index({ isPublic: 1, status: 1 });

// Virtual for video count
playlistSchema.virtual('videoCount').get(function() {
  return this.videos.length;
});

// Virtual for total duration
playlistSchema.virtual('totalDuration').get(function() {
  // This would need to be calculated from populated videos
  return 0;
});

// Update lastUpdated on save
playlistSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Method to add video to playlist
playlistSchema.methods.addVideo = function(videoId, position = null) {
  const exists = this.videos.some(v => v.video.toString() === videoId.toString());
  if (exists) {
    return false;
  }
  
  const newVideo = {
    video: videoId,
    addedAt: new Date(),
    position: position !== null ? position : this.videos.length
  };
  
  this.videos.push(newVideo);
  return true;
};

// Method to remove video from playlist
playlistSchema.methods.removeVideo = function(videoId) {
  const initialLength = this.videos.length;
  this.videos = this.videos.filter(v => v.video.toString() !== videoId.toString());
  
  // Reorder positions
  this.videos.forEach((v, index) => {
    v.position = index;
  });
  
  return this.videos.length < initialLength;
};

// Method to reorder videos
playlistSchema.methods.reorderVideos = function(videoId, newPosition) {
  const videoIndex = this.videos.findIndex(v => v.video.toString() === videoId.toString());
  if (videoIndex === -1) return false;
  
  const [video] = this.videos.splice(videoIndex, 1);
  this.videos.splice(newPosition, 0, video);
  
  // Update all positions
  this.videos.forEach((v, index) => {
    v.position = index;
  });
  
  return true;
};

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;