const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const NotificationHelper = require('../utils/notificationHelper');

const router = express.Router();

// Get current user's channel
router.get('/channel/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('subscriptions', 'username channelName avatar isVerified')
      .lean();

    const videos = await Video.find({ author: req.user._id })
      .sort({ uploadedAt: -1 })
      .populate('author', 'username channelName avatar');

    const totalViews = videos.reduce((sum, video) => sum + video.views, 0);

    res.json({
      user: {
        ...user,
        subscribersCount: user.subscribers.length,
        videosCount: videos.length,
        totalViews
      },
      videos
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('channelName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Channel name must be between 3 and 50 characters'),
  body('channelDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Channel description cannot exceed 1000 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { channelName, channelDescription, email } = req.body;
    const user = await User.findById(req.user._id);

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (channelName !== undefined) user.channelName = channelName;
    if (channelDescription !== undefined) user.channelDescription = channelDescription;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        channelName: user.channelName,
        channelDescription: user.channelDescription,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload avatar
router.post('/avatar', [auth, uploadAvatar.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Avatar image is required' });
    }

    const user = await User.findById(req.user._id);
    
    // Delete old avatar if exists
    if (user.avatar && user.avatar !== '/uploads/avatars/default.png') {
      const fs = require('fs');
      const oldAvatarPath = user.avatar.replace('/uploads/avatars/', './uploads/avatars/');
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Avatar updated successfully',
      avatarUrl: user.avatar
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Subscribe to user
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot subscribe to yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already subscribed
    if (currentUser.subscriptions.includes(req.params.id)) {
      return res.status(400).json({ message: 'Already subscribed' });
    }

    // Add subscription
    currentUser.subscriptions.push(req.params.id);
    targetUser.subscribers.push(req.user._id);
    targetUser.subscriberCount = targetUser.subscribers.length;

    await Promise.all([currentUser.save(), targetUser.save()]);

    // Send notification for new subscriber
    await NotificationHelper.notifySubscribe(currentUser, targetUser, req);

    // Check for milestones
    const milestones = [100, 1000, 10000, 100000, 1000000];
    if (milestones.includes(targetUser.subscriberCount)) {
      await NotificationHelper.notifyMilestone(targetUser, 'subscribers', targetUser.subscriberCount, req);
    }

    res.json({
      message: 'Successfully subscribed',
      subscribersCount: targetUser.subscriberCount
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unsubscribe from user
router.delete('/:id/subscribe', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if not subscribed
    if (!currentUser.subscriptions.includes(req.params.id)) {
      return res.status(400).json({ message: 'Not subscribed' });
    }

    // Remove subscription
    currentUser.subscriptions.pull(req.params.id);
    targetUser.subscribers.pull(req.user._id);
    targetUser.subscriberCount = targetUser.subscribers.length;

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      message: 'Successfully unsubscribed',
      subscribersCount: targetUser.subscriberCount
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's subscriptions
router.get('/subscriptions/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('subscriptions', 'username channelName avatar subscriberCount isVerified')
      .select('subscriptions');

    res.json({
      subscriptions: user.subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get subscription feed (videos from subscribed channels)
router.get('/feed/subscriptions', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).select('subscriptions');

    const videos = await Video.find({
      author: { $in: user.subscriptions },
      status: 'active',
      isPublic: true
    })
    .populate('author', 'username channelName avatar isVerified')
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Video.countDocuments({
      author: { $in: user.subscriptions },
      status: 'active',
      isPublic: true
    });

    res.json({
      videos,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get subscription feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get watch history
router.get('/history/watch', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'watchHistory.video',
        populate: {
          path: 'author',
          select: 'username channelName avatar isVerified'
        }
      })
      .select('watchHistory');

    // Filter out deleted videos and sort by watch time
    const validHistory = user.watchHistory
      .filter(item => item.video && item.video.status === 'active')
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(skip, skip + limit);

    res.json({
      history: validHistory,
      pagination: {
        current: page,
        pages: Math.ceil(user.watchHistory.length / limit),
        total: user.watchHistory.length
      }
    });
  } catch (error) {
    console.error('Get watch history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear watch history
router.delete('/history/watch', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { watchHistory: [] }
    });

    res.json({ message: 'Watch history cleared successfully' });
  } catch (error) {
    console.error('Clear watch history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get watch history (alternative endpoint)
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'all';

    let dateFilter = {};
    const now = new Date();
    
    switch (filter) {
      case 'today':
        dateFilter = {
          watchedAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        };
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { watchedAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { watchedAt: { $gte: monthAgo } };
        break;
    }

    const user = await User.findById(req.user._id);
    
    // Filter history by date
    let filteredHistory = user.watchHistory;
    if (filter !== 'all') {
      filteredHistory = user.watchHistory.filter(item => {
        const watchDate = new Date(item.watchedAt);
        if (filter === 'today') {
          return watchDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return watchDate >= weekAgo;
        } else if (filter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return watchDate >= monthAgo;
        }
        return true;
      });
    }

    // Sort and paginate the filtered history
    const sortedHistory = filteredHistory
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .slice(skip, skip + limit);

    // Get video IDs from sorted history
    const videoIds = sortedHistory.map(item => item.video);

    // Fetch videos while maintaining order
    const videos = await Video.find({
      _id: { $in: videoIds },
      status: 'active'
    }).populate('author', 'username channelName avatar isVerified');

    // Create a map for quick video lookup
    const videoMap = new Map();
    videos.forEach(video => {
      videoMap.set(video._id.toString(), video);
    });

    // Build the response maintaining the history order
    const videosWithMetadata = sortedHistory
      .map(historyItem => {
        const video = videoMap.get(historyItem.video.toString());
        if (!video) return null; // Skip if video not found or deleted
        
        return {
          ...video.toObject(),
          lastWatchedAt: historyItem.watchedAt,
          watchTime: historyItem.duration || 0,
          percentageWatched: historyItem.duration 
            ? Math.min(100, Math.round((historyItem.duration / video.duration) * 100))
            : 0
        };
      })
      .filter(item => item !== null); // Remove null entries

    res.json({
      videos: videosWithMetadata,
      pagination: {
        current: page,
        pages: Math.ceil(filteredHistory.length / limit),
        total: filteredHistory.length
      }
    });
  } catch (error) {
    console.error('Get watch history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear watch history (alternative endpoint)
router.delete('/history', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { watchHistory: [] }
    });

    res.json({ message: 'Watch history cleared successfully' });
  } catch (error) {
    console.error('Clear watch history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove video from watch history
router.delete('/history/:videoId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.watchHistory = user.watchHistory.filter(
      item => item.video.toString() !== req.params.videoId
    );
    await user.save();

    res.json({ message: 'Video removed from history' });
  } catch (error) {
    console.error('Remove from history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add video to watch history
router.post('/history/:videoId', auth, async (req, res) => {
  try {
    const { watchTime } = req.body;
    const user = await User.findById(req.user._id);
    
    // Check if video already in history
    const existingIndex = user.watchHistory.findIndex(
      item => item.video.toString() === req.params.videoId
    );

    if (existingIndex > -1) {
      // Update existing entry
      user.watchHistory[existingIndex].watchedAt = new Date();
      user.watchHistory[existingIndex].duration = watchTime || user.watchHistory[existingIndex].duration;
    } else {
      // Add new entry
      user.watchHistory.push({
        video: req.params.videoId,
        watchedAt: new Date(),
        duration: watchTime || 0
      });
    }

    await user.save();
    res.json({ message: 'Added to watch history' });
  } catch (error) {
    console.error('Add to history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create playlist
router.post('/playlists', [
  auth,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Playlist description cannot exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { name, description, isPublic } = req.body;
    
    const user = await User.findById(req.user._id);
    
    const playlist = {
      name,
      description: description || '',
      videos: [],
      isPublic: isPublic !== false,
      createdAt: new Date()
    };

    user.playlists.push(playlist);
    await user.save();

    const newPlaylist = user.playlists[user.playlists.length - 1];

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: newPlaylist
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's playlists
router.get('/playlists/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('playlists.videos', 'title thumbnailUrl duration views uploadedAt')
      .select('playlists');

    res.json({
      playlists: user.playlists.map(playlist => ({
        ...playlist.toObject(),
        videosCount: playlist.videos.length
      }))
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add video to playlist
router.post('/playlists/:playlistId/videos/:videoId', auth, async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;
    
    const user = await User.findById(req.user._id);
    const playlist = user.playlists.id(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (playlist.videos.includes(videoId)) {
      return res.status(400).json({ message: 'Video already in playlist' });
    }

    playlist.videos.push(videoId);
    await user.save();

    res.json({
      message: 'Video added to playlist successfully',
      playlist
    });
  } catch (error) {
    console.error('Add video to playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user settings
router.get('/settings/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    res.json({ settings: user.settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { emailNotifications, privateAccount, showSubscriptions } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (emailNotifications !== undefined) {
      user.settings.emailNotifications = emailNotifications;
    }
    if (privateAccount !== undefined) {
      user.settings.privateAccount = privateAccount;
    }
    if (showSubscriptions !== undefined) {
      user.settings.showSubscriptions = showSubscriptions;
    }
    
    await user.save();
    
    res.json({
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile by ID (must be last due to :id param)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -notifications')
      .populate('subscriptions', 'username channelName avatar isVerified')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's public videos
    const videos = await Video.find({
      author: req.params.id,
      status: 'active',
      isPublic: true
    })
    .sort({ uploadedAt: -1 })
    .limit(12);

    // Check if current user is subscribed
    let isSubscribed = false;
    if (req.user) {
      isSubscribed = user.subscribers.includes(req.user._id);
    }

    res.json({
      user: {
        ...user,
        subscribersCount: user.subscribers.length,
        videosCount: videos.length
      },
      videos,
      isSubscribed
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get watch later videos
router.get('/:id/watch-later', auth, async (req, res) => {
  try {
    // Only allow users to get their own watch later list
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user._id)
      .populate({
        path: 'watchLater.video',
        populate: {
          path: 'author',
          select: 'username channelName avatar isVerified'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out null videos (deleted videos)
    const videos = user.watchLater
      .filter(item => item.video)
      .map(item => ({
        ...item.video.toObject(),
        addedAt: item.addedAt
      }))
      .reverse(); // Most recently added first

    res.json({ videos });
  } catch (error) {
    console.error('Get watch later error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add video to watch later
router.post('/:id/watch-later', auth, async (req, res) => {
  try {
    // Only allow users to add to their own watch later
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already in watch later
    const alreadyAdded = user.watchLater.some(
      item => item.video.toString() === videoId
    );
    
    if (alreadyAdded) {
      return res.status(400).json({ message: 'Video already in watch later' });
    }

    // Add to watch later
    user.watchLater.push({ video: videoId });
    await user.save();

    res.json({ 
      message: 'Added to watch later',
      watchLater: user.watchLater
    });
  } catch (error) {
    console.error('Add to watch later error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove video from watch later
router.delete('/:id/watch-later/:videoId', auth, async (req, res) => {
  try {
    // Only allow users to remove from their own watch later
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user._id);
    
    // Remove from watch later
    const initialLength = user.watchLater.length;
    user.watchLater = user.watchLater.filter(
      item => item.video.toString() !== req.params.videoId
    );

    if (user.watchLater.length === initialLength) {
      return res.status(404).json({ message: 'Video not in watch later' });
    }

    await user.save();

    res.json({ 
      message: 'Removed from watch later',
      watchLater: user.watchLater
    });
  } catch (error) {
    console.error('Remove from watch later error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;