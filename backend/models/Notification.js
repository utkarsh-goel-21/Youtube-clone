const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'new_video',        // New video from subscribed channel
      'comment_reply',    // Reply to your comment
      'video_comment',    // Comment on your video
      'video_like',       // Someone liked your video
      'comment_like',     // Someone liked your comment
      'new_subscriber',   // New subscriber to your channel
      'playlist_add',     // Your video added to playlist
      'mention',          // Mentioned in comment/description
      'milestone',        // Channel milestone (100, 1k, 10k subscribers)
      'live_stream'       // Channel went live
    ]
  },
  entityType: {
    type: String,
    enum: ['video', 'comment', 'channel', 'playlist', 'stream'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityModel'
  },
  entityModel: {
    type: String,
    required: true,
    enum: ['Video', 'Comment', 'User', 'Playlist']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  thumbnail: String,
  actionUrl: String,
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  clicked: {
    type: Boolean,
    default: false
  },
  clickedAt: Date,
  metadata: {
    videoTitle: String,
    channelName: String,
    commentText: String,
    subscriberCount: Number,
    viewCount: Number,
    likeCount: Number
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
  
  return 'Just now';
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    // Don't create notification if sender and recipient are the same
    if (data.sender.toString() === data.recipient.toString()) {
      return null;
    }

    // Check if similar notification exists recently (within last hour)
    const existingNotification = await this.findOne({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      entityId: data.entityId,
      createdAt: { $gte: new Date(Date.now() - 60*60*1000) }
    });

    if (existingNotification) {
      // Update the existing notification instead
      existingNotification.read = false;
      existingNotification.updatedAt = new Date();
      return await existingNotification.save();
    }

    const notification = new this(data);
    return await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    read: false
  });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    {
      recipient: userId,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );
};

// Static method to get notifications with pagination
notificationSchema.statics.getNotifications = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const notifications = await this.find({ recipient: userId })
    .populate('sender', 'username avatar channelName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  const total = await this.countDocuments({ recipient: userId });
  const unreadCount = await this.getUnreadCount(userId);
  
  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  };
};

// Instance method to format notification
notificationSchema.methods.format = function() {
  const formatted = {
    _id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    thumbnail: this.thumbnail,
    actionUrl: this.actionUrl,
    read: this.read,
    timeAgo: this.timeAgo,
    sender: this.sender,
    metadata: this.metadata,
    createdAt: this.createdAt
  };
  
  return formatted;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;