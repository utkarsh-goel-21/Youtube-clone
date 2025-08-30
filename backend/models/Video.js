const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
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
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['Music', 'Gaming', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Film', 'Howto', 'Other'],
    default: 'Other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  quality: {
    '144p': String,
    '240p': String,
    '360p': String,
    '480p': String,
    '720p': String,
    '1080p': String
  },
  captions: [{
    language: String,
    url: String
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isMonetized: {
    type: Boolean,
    default: false
  },
  ageRestricted: {
    type: Boolean,
    default: false
  },
  analytics: {
    watchTime: {
      type: Number,
      default: 0
    },
    avgViewDuration: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    clickThroughRate: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['processing', 'active', 'deleted', 'flagged', 'private'],
    default: 'processing'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ author: 1, uploadedAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ category: 1 });

videoSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

videoSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    const dislikeIndex = this.dislikes.indexOf(userId);
    if (dislikeIndex > -1) {
      this.dislikes.splice(dislikeIndex, 1);
    }
    await this.save();
  }
};

videoSchema.methods.addDislike = async function(userId) {
  if (!this.dislikes.includes(userId)) {
    this.dislikes.push(userId);
    const likeIndex = this.likes.indexOf(userId);
    if (likeIndex > -1) {
      this.likes.splice(likeIndex, 1);
    }
    await this.save();
  }
};

// Transform output to proper URLs
videoSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Get the base URL for production
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                   process.env.BASE_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://youtube-clone-backend-utkarsh.onrender.com' : '');
    
    // Convert file paths to URLs
    if (ret.videoUrl) {
      // Remove any leading path and keep only the filename
      const videoFilename = ret.videoUrl.split('\\').pop().split('/').pop();
      ret.videoUrl = baseUrl ? `${baseUrl}/uploads/${videoFilename}` : `/uploads/${videoFilename}`;
    }
    if (ret.thumbnailUrl) {
      // Remove any leading path and keep only the filename
      const thumbnailFilename = ret.thumbnailUrl.split('\\').pop().split('/').pop();
      ret.thumbnailUrl = baseUrl ? `${baseUrl}/thumbnails/${thumbnailFilename}` : `/thumbnails/${thumbnailFilename}`;
    }
    return ret;
  }
});

module.exports = mongoose.model('Video', videoSchema);