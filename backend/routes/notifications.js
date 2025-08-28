const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all notifications for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .populate('sender', 'username avatar channelName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(req.userId);
    
    res.json({
      notifications: notifications.map(n => n.format()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.userId);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

// Mark notifications as read
router.put('/mark-read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Invalid notification IDs' });
    }
    
    await Notification.markAsRead(notificationIds, req.userId);
    
    const unreadCount = await Notification.getUnreadCount(req.userId);
    
    res.json({ 
      message: 'Notifications marked as read',
      unreadCount 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.userId);
    
    res.json({ 
      message: 'All notifications marked as read',
      unreadCount: 0 
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Mark notification as clicked
router.put('/:id/click', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.clicked = true;
    notification.clickedAt = new Date();
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
    }
    
    await notification.save();
    
    const unreadCount = await Notification.getUnreadCount(req.userId);
    
    res.json({ 
      message: 'Notification clicked',
      unreadCount 
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    const unreadCount = await Notification.getUnreadCount(req.userId);
    
    res.json({ 
      message: 'Notification deleted',
      unreadCount 
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Clear all notifications
router.delete('/clear/all', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.userId });
    
    res.json({ 
      message: 'All notifications cleared',
      unreadCount: 0 
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Error clearing notifications' });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('notificationPreferences');
    
    const defaultPreferences = {
      email: {
        newVideo: true,
        commentReply: true,
        videoComment: true,
        newSubscriber: true,
        milestone: true
      },
      push: {
        newVideo: true,
        commentReply: true,
        videoComment: true,
        newSubscriber: true,
        milestone: true,
        liveStream: true
      },
      inApp: {
        newVideo: true,
        commentReply: true,
        videoComment: true,
        videoLike: true,
        commentLike: true,
        newSubscriber: true,
        playlistAdd: true,
        mention: true,
        milestone: true,
        liveStream: true
      }
    };
    
    res.json(user.notificationPreferences || defaultPreferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Error fetching preferences' });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findById(req.userId);
    user.notificationPreferences = preferences;
    await user.save();
    
    res.json({ 
      message: 'Preferences updated',
      preferences: user.notificationPreferences 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
});

module.exports = router;