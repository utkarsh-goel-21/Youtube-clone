const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationHelper {
  static async sendNotification(data, req = null) {
    try {
      // Check if recipient has this notification type enabled
      const recipient = await User.findById(data.recipient);
      if (!recipient) return null;
      
      const { notificationPreferences } = recipient;
      if (notificationPreferences && notificationPreferences.inApp) {
        const notificationType = data.type.replace(/_/g, '');
        if (notificationPreferences.inApp[notificationType] === false) {
          return null;
        }
      }
      
      // Create the notification
      const notification = await Notification.createNotification(data);
      
      if (!notification) return null;
      
      // Send real-time notification if user is online
      if (req && req.app) {
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        
        if (io && userSockets) {
          const socketId = userSockets.get(data.recipient.toString());
          if (socketId) {
            // Populate sender info for real-time notification
            await notification.populate('sender', 'username avatar channelName');
            io.to(`user-${data.recipient}`).emit('new-notification', {
              notification: notification.format(),
              unreadCount: await Notification.getUnreadCount(data.recipient)
            });
          }
        }
      }
      
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }
  
  static async notifyNewVideo(video, author, req) {
    try {
      // Get all subscribers
      const subscribers = await User.find({
        subscriptions: author._id
      }).select('_id');
      
      // Send notification to each subscriber
      const notifications = subscribers.map(subscriber => {
        return this.sendNotification({
          recipient: subscriber._id,
          sender: author._id,
          type: 'new_video',
          entityType: 'video',
          entityId: video._id,
          entityModel: 'Video',
          title: 'New video uploaded',
          message: `${author.channelName} uploaded: ${video.title}`,
          thumbnail: video.thumbnail,
          actionUrl: `/watch/${video._id}`,
          metadata: {
            videoTitle: video.title,
            channelName: author.channelName
          }
        }, req);
      });
      
      await Promise.all(notifications);
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }
  
  static async notifyComment(comment, video, commenter, recipient, isReply = false, req) {
    try {
      const type = isReply ? 'comment_reply' : 'video_comment';
      const title = isReply ? 'New reply to your comment' : 'New comment on your video';
      const message = isReply 
        ? `${commenter.channelName} replied: ${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}`
        : `${commenter.channelName} commented: ${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}`;
      
      await this.sendNotification({
        recipient: recipient,
        sender: commenter._id,
        type,
        entityType: 'comment',
        entityId: comment._id,
        entityModel: 'Comment',
        title,
        message,
        thumbnail: video.thumbnail,
        actionUrl: `/watch/${video._id}`,
        metadata: {
          videoTitle: video.title,
          channelName: commenter.channelName,
          commentText: comment.text
        }
      }, req);
    } catch (error) {
      console.error('Error notifying comment:', error);
    }
  }
  
  static async notifySubscribe(subscriber, channel, req) {
    try {
      await this.sendNotification({
        recipient: channel._id,
        sender: subscriber._id,
        type: 'new_subscriber',
        entityType: 'channel',
        entityId: subscriber._id,
        entityModel: 'User',
        title: 'New subscriber',
        message: `${subscriber.channelName} subscribed to your channel`,
        thumbnail: subscriber.avatar,
        actionUrl: `/channel/${subscriber._id}`,
        metadata: {
          channelName: subscriber.channelName,
          subscriberCount: channel.subscriberCount + 1
        },
        priority: 'high'
      }, req);
    } catch (error) {
      console.error('Error notifying subscription:', error);
    }
  }
  
  static async notifyVideoLike(video, liker, req) {
    try {
      await this.sendNotification({
        recipient: video.author,
        sender: liker._id,
        type: 'video_like',
        entityType: 'video',
        entityId: video._id,
        entityModel: 'Video',
        title: 'Someone liked your video',
        message: `${liker.channelName} liked "${video.title}"`,
        thumbnail: video.thumbnail,
        actionUrl: `/watch/${video._id}`,
        metadata: {
          videoTitle: video.title,
          channelName: liker.channelName,
          likeCount: video.likes.length + 1
        }
      }, req);
    } catch (error) {
      console.error('Error notifying like:', error);
    }
  }
  
  static async notifyMilestone(user, milestone, count, req) {
    try {
      const milestoneMessages = {
        subscribers_100: '🎉 You reached 100 subscribers!',
        subscribers_1000: '🎊 Congratulations! 1,000 subscribers!',
        subscribers_10000: '🏆 Amazing! 10,000 subscribers!',
        subscribers_100000: '💎 Incredible! 100,000 subscribers!',
        subscribers_1000000: '🌟 You are legendary! 1 Million subscribers!',
        views_1000: '👁 Your videos reached 1,000 total views!',
        views_10000: '📈 Your videos reached 10,000 total views!',
        views_100000: '🚀 Your videos reached 100,000 total views!',
        views_1000000: '⭐ Your videos reached 1 Million views!'
      };
      
      await this.sendNotification({
        recipient: user._id,
        sender: user._id,
        type: 'milestone',
        entityType: 'channel',
        entityId: user._id,
        entityModel: 'User',
        title: 'Milestone Achieved!',
        message: milestoneMessages[`${milestone}_${count}`] || `You reached ${count} ${milestone}!`,
        thumbnail: user.avatar,
        actionUrl: `/channel/${user._id}`,
        metadata: {
          subscriberCount: milestone === 'subscribers' ? count : user.subscriberCount
        },
        priority: 'high'
      }, req);
    } catch (error) {
      console.error('Error notifying milestone:', error);
    }
  }
  
  static async notifyPlaylistAdd(playlist, video, adder, req) {
    try {
      if (playlist.author.toString() === video.author.toString()) return;
      
      await this.sendNotification({
        recipient: video.author,
        sender: adder._id,
        type: 'playlist_add',
        entityType: 'playlist',
        entityId: playlist._id,
        entityModel: 'Playlist',
        title: 'Video added to playlist',
        message: `${adder.channelName} added "${video.title}" to "${playlist.title}"`,
        thumbnail: video.thumbnail,
        actionUrl: `/playlist/${playlist._id}`,
        metadata: {
          videoTitle: video.title,
          channelName: adder.channelName
        }
      }, req);
    } catch (error) {
      console.error('Error notifying playlist add:', error);
    }
  }
}

module.exports = NotificationHelper;