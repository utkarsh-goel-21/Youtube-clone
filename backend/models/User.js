const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  channelName: {
    type: String,
    default: function() {
      return this.username;
    }
  },
  channelDescription: {
    type: String,
    maxlength: 1000
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subscriberCount: {
    type: Number,
    default: 0
  },
  subscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  watchHistory: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    duration: Number
  }],
  watchLater: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  playlists: [{
    name: String,
    description: String,
    videos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    }],
    isPublic: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['video', 'comment', 'like', 'subscribe', 'mention']
    },
    message: String,
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relatedVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  strikes: {
    type: Number,
    default: 0
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    privateAccount: {
      type: Boolean,
      default: false
    },
    showSubscriptions: {
      type: Boolean,
      default: true
    }
  },
  notificationPreferences: {
    email: {
      newVideo: { type: Boolean, default: true },
      commentReply: { type: Boolean, default: true },
      videoComment: { type: Boolean, default: true },
      newSubscriber: { type: Boolean, default: true },
      milestone: { type: Boolean, default: true }
    },
    push: {
      newVideo: { type: Boolean, default: true },
      commentReply: { type: Boolean, default: true },
      videoComment: { type: Boolean, default: true },
      newSubscriber: { type: Boolean, default: true },
      milestone: { type: Boolean, default: true },
      liveStream: { type: Boolean, default: true }
    },
    inApp: {
      newVideo: { type: Boolean, default: true },
      commentReply: { type: Boolean, default: true },
      videoComment: { type: Boolean, default: true },
      videoLike: { type: Boolean, default: true },
      commentLike: { type: Boolean, default: true },
      newSubscriber: { type: Boolean, default: true },
      playlistAdd: { type: Boolean, default: true },
      mention: { type: Boolean, default: true },
      milestone: { type: Boolean, default: true },
      liveStream: { type: Boolean, default: true }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);