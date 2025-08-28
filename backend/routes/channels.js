const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();

// Get channel by ID or username
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { tab = 'videos', page = 1, limit = 12 } = req.query;
    
    // Find channel by ID or username
    let channel;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      channel = await User.findById(identifier)
        .select('-password -notifications -settings -watchHistory')
        .lean();
    } else {
      // It's a username
      channel = await User.findOne({ username: identifier })
        .select('-password -notifications -settings -watchHistory')
        .lean();
    }

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.isBanned) {
      return res.status(403).json({ message: 'Channel has been banned' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if current user is subscribed
    let isSubscribed = false;
    let isOwner = false;
    if (req.user) {
      isSubscribed = channel.subscribers.includes(req.user._id.toString());
      isOwner = channel._id.toString() === req.user._id.toString();
    }

    const channelData = {
      ...channel,
      subscribersCount: channel.subscribers.length,
      subscriptionsCount: channel.subscriptions.length,
      isSubscribed,
      isOwner
    };

    let tabData = {};

    switch (tab) {
      case 'videos':
        let videoQuery = { author: channel._id, status: 'active' };
        if (!isOwner) {
          videoQuery.isPublic = true;
        }

        const videos = await Video.find(videoQuery)
          .sort({ uploadedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('author', 'username channelName avatar isVerified');

        const videosTotal = await Video.countDocuments(videoQuery);
        const totalViews = await Video.aggregate([
          { $match: videoQuery },
          { $group: { _id: null, total: { $sum: '$views' } } }
        ]);

        tabData = {
          videos,
          totalViews: totalViews.length > 0 ? totalViews[0].total : 0,
          videosCount: videosTotal,
          pagination: {
            current: pageNum,
            pages: Math.ceil(videosTotal / limitNum),
            total: videosTotal
          }
        };
        break;

      case 'playlists':
        if (isOwner || !channel.settings?.privateAccount) {
          const publicPlaylists = channel.playlists
            .filter(playlist => isOwner || playlist.isPublic)
            .slice(skip, skip + limitNum);

          // Populate first few videos for each playlist
          const populatedPlaylists = await Promise.all(
            publicPlaylists.map(async (playlist) => {
              const videos = await Video.find({
                _id: { $in: playlist.videos.slice(0, 4) },
                status: 'active',
                isPublic: true
              }).select('title thumbnailUrl duration');

              return {
                ...playlist,
                videos,
                videosCount: playlist.videos.length
              };
            })
          );

          tabData = {
            playlists: populatedPlaylists,
            pagination: {
              current: pageNum,
              pages: Math.ceil(channel.playlists.length / limitNum),
              total: channel.playlists.length
            }
          };
        } else {
          tabData = {
            playlists: [],
            message: 'This channel\'s playlists are private'
          };
        }
        break;

      case 'community':
        // Community posts would go here
        // For now, return empty array
        tabData = {
          posts: [],
          message: 'Community posts feature not implemented in this demo'
        };
        break;

      case 'about':
        const aboutData = {
          description: channel.channelDescription,
          joinDate: channel.createdAt,
          totalViews: 0,
          videosCount: 0,
          subscribersCount: channel.subscribers.length
        };

        // Get channel statistics
        const channelStats = await Video.aggregate([
          { 
            $match: { 
              author: channel._id, 
              status: 'active',
              ...(isOwner ? {} : { isPublic: true })
            } 
          },
          { 
            $group: { 
              _id: null, 
              totalViews: { $sum: '$views' },
              videosCount: { $sum: 1 }
            } 
          }
        ]);

        if (channelStats.length > 0) {
          aboutData.totalViews = channelStats[0].totalViews;
          aboutData.videosCount = channelStats[0].videosCount;
        }

        tabData = aboutData;
        break;

      default:
        return res.status(400).json({ message: 'Invalid tab parameter' });
    }

    res.json({
      channel: channelData,
      tab,
      ...tabData
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update channel info
router.put('/:id', [
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
    .withMessage('Channel description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this channel' });
    }

    const { channelName, channelDescription } = req.body;
    const user = await User.findById(req.user._id);

    if (channelName !== undefined) user.channelName = channelName;
    if (channelDescription !== undefined) user.channelDescription = channelDescription;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Channel updated successfully',
      channel: {
        id: user._id,
        channelName: user.channelName,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
        banner: user.banner
      }
    });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload channel banner
router.post('/:id/banner', [
  auth,
  uploadAvatar.single('banner') // Reusing avatar upload middleware for banner
], async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this channel' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    const user = await User.findById(req.user._id);
    
    // Delete old banner if exists
    if (user.banner && user.banner !== '/uploads/banners/default.jpg') {
      const fs = require('fs');
      const path = require('path');
      const oldBannerPath = path.join(__dirname, '..', user.banner);
      if (fs.existsSync(oldBannerPath)) {
        fs.unlinkSync(oldBannerPath);
      }
    }

    user.banner = `/uploads/avatars/${req.file.filename}`; // Using avatars folder for simplicity
    await user.save();

    res.json({
      message: 'Channel banner updated successfully',
      bannerUrl: user.banner
    });
  } catch (error) {
    console.error('Upload banner error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel analytics (owner only)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this channel\'s analytics' });
    }

    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      case '1y':
        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    // Get channel statistics
    const analytics = await Video.aggregate([
      {
        $match: {
          author: req.user._id,
          status: 'active',
          uploadedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalVideos: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalDislikes: { $sum: { $size: '$dislikes' } },
          averageViews: { $avg: '$views' },
          totalWatchTime: { $sum: { $multiply: ['$views', '$duration'] } }
        }
      }
    ]);

    // Get subscriber count changes (simplified)
    const user = await User.findById(req.user._id).select('subscribers subscriberCount createdAt');
    
    // Get top performing videos
    const topVideos = await Video.find({
      author: req.user._id,
      status: 'active',
      uploadedAt: { $gte: startDate }
    })
    .sort({ views: -1 })
    .limit(10)
    .select('title views likes dislikes uploadedAt thumbnailUrl');

    const analyticsData = {
      period,
      overview: analytics.length > 0 ? analytics[0] : {
        totalViews: 0,
        totalVideos: 0,
        totalLikes: 0,
        totalDislikes: 0,
        averageViews: 0,
        totalWatchTime: 0
      },
      subscribers: {
        current: user.subscriberCount,
        // In a real app, you'd track subscriber changes over time
        change: 0,
        changePercent: 0
      },
      topVideos,
      // In a real app, you'd have detailed daily/weekly analytics
      viewsOverTime: [],
      subscribersOverTime: [],
      watchTimeOverTime: []
    };

    res.json({ analytics: analyticsData });
  } catch (error) {
    console.error('Get channel analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending channels
router.get('/trending/channels', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get channels with most subscribers gained recently
    const trendingChannels = await User.find({
      isBanned: false,
      subscriberCount: { $gt: 0 }
    })
    .select('username channelName channelDescription avatar subscriberCount isVerified createdAt')
    .sort({ subscriberCount: -1 })
    .limit(limit);

    // Add recent video count and total views for each channel
    const channelsWithStats = await Promise.all(
      trendingChannels.map(async (channel) => {
        const recentVideos = await Video.countDocuments({
          author: channel._id,
          status: 'active',
          isPublic: true,
          uploadedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        const totalViews = await Video.aggregate([
          {
            $match: {
              author: channel._id,
              status: 'active',
              isPublic: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$views' }
            }
          }
        ]);

        return {
          ...channel.toObject(),
          recentVideos,
          totalViews: totalViews.length > 0 ? totalViews[0].total : 0
        };
      })
    );

    res.json({
      channels: channelsWithStats,
      message: 'Trending channels based on subscriber count'
    });
  } catch (error) {
    console.error('Get trending channels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured channels (channels to discover)
router.get('/discover/featured', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;

    let matchStage = {
      isBanned: false,
      subscriberCount: { $gt: 10 } // Only channels with some subscribers
    };

    // If category is specified, find channels that primarily upload in that category
    if (category && category !== 'all') {
      // Find channels that have uploaded videos in the specified category
      const channelIds = await Video.distinct('author', {
        category,
        status: 'active',
        isPublic: true
      });
      
      matchStage._id = { $in: channelIds };
    }

    const featuredChannels = await User.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          // Create a featured score based on subscriber count and recent activity
          featuredScore: {
            $multiply: [
              '$subscriberCount',
              { $rand: {} } // Add some randomness
            ]
          }
        }
      },
      { $sort: { featuredScore: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          channelName: 1,
          channelDescription: 1,
          avatar: 1,
          subscriberCount: 1,
          isVerified: 1,
          createdAt: 1
        }
      }
    ]);

    // Add statistics for each channel
    const channelsWithStats = await Promise.all(
      featuredChannels.map(async (channel) => {
        const videoCount = await Video.countDocuments({
          author: channel._id,
          status: 'active',
          isPublic: true
        });

        const recentVideo = await Video.findOne({
          author: channel._id,
          status: 'active',
          isPublic: true
        })
        .sort({ uploadedAt: -1 })
        .select('title thumbnailUrl uploadedAt');

        return {
          ...channel,
          videoCount,
          recentVideo
        };
      })
    );

    res.json({
      channels: channelsWithStats,
      category: category || 'all'
    });
  } catch (error) {
    console.error('Get featured channels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;