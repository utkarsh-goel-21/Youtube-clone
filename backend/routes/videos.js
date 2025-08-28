const express = require('express');
const { body, validationResult } = require('express-validator');
const Video = require('../models/Video');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadVideo, uploadThumbnail } = require('../middleware/upload');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const NotificationHelper = require('../utils/notificationHelper');

const router = express.Router();

// Get cache manager from app
let cacheManager;
router.use((req, res, next) => {
  cacheManager = req.app.get('cache');
  next();
});

// Get subscription feed videos
router.get('/subscriptions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get user's subscriptions
    const user = await User.findById(req.user._id).select('subscriptions');
    
    if (!user.subscriptions || user.subscriptions.length === 0) {
      return res.json({
        videos: [],
        pagination: {
          current: 1,
          pages: 1,
          total: 0
        }
      });
    }

    // Get videos from subscribed channels
    const videos = await Video.find({
      author: { $in: user.subscriptions },
      status: 'active',
      isPublic: true
    })
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('author', 'username channelName avatar isVerified');

    const total = await Video.countDocuments({
      author: { $in: user.subscriptions },
      status: 'active',
      isPublic: true
    });

    // Convert to JSON to apply transforms
    const videosJSON = videos.map(v => v.toJSON());
    
    res.json({
      videos: videosJSON,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Get subscription feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's videos (must be before /:id route)
router.get('/my-videos', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const videos = await Video.find({ 
      author: req.user._id,
      status: { $ne: 'deleted' }
    })
      .populate('author', 'username channelName avatar isVerified')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments({ 
      author: req.user._id,
      status: { $ne: 'deleted' }
    });

    // Convert to JSON to apply transforms
    const videosJSON = videos.map(v => v.toJSON());
    
    res.json({
      videos: videosJSON,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get my videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all videos with pagination and filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'uploadedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Check cache
    const cacheKey = cacheManager.generateKey('videos', {
      page, limit, category, sortBy, sortOrder
    });
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    let query = { status: 'active', isPublic: true };
    if (category && category !== 'all') {
      query.category = category;
    }

    const videos = await Video.find(query)
      .populate('author', 'username channelName avatar isVerified')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(query);

    // Convert to JSON to apply transforms
    const videosJSON = videos.map(v => v.toJSON());
    
    const response = {
      videos: videosJSON,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };

    // Cache the response
    cacheManager.set(cacheKey, response, 300); // 5 minutes
    res.set('X-Cache', 'MISS');
    res.json(response);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending videos
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    
    // Check cache for trending videos (longer TTL since trending changes less frequently)
    const cacheKey = cacheManager.generateKey('trending', { limit });
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Calculate trending score based on views and recency
    const videos = await Video.aggregate([
      { $match: { status: 'active', isPublic: true } },
      {
        $addFields: {
          trendingScore: {
            $multiply: [
              '$views',
              {
                $divide: [
                  1,
                  {
                    $add: [
                      1,
                      {
                        $divide: [
                          { $subtract: [new Date(), '$uploadedAt'] },
                          1000 * 60 * 60 * 24 // Convert to days
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit }
    ]);

    await Video.populate(videos, {
      path: 'author',
      select: 'username channelName avatar isVerified'
    });

    // Convert aggregated results to proper format
    const videosJSON = videos.map(v => {
      // Apply the same transform as the schema
      if (v.videoUrl) {
        const videoFilename = v.videoUrl.split('\\').pop().split('/').pop();
        v.videoUrl = `/uploads/${videoFilename}`;
      }
      if (v.thumbnailUrl) {
        const thumbnailFilename = v.thumbnailUrl.split('\\').pop().split('/').pop();
        v.thumbnailUrl = `/thumbnails/${thumbnailFilename}`;
      }
      return v;
    });
    
    const response = { videos: videosJSON };
    
    // Cache for 1 hour
    cacheManager.set(cacheKey, response, 3600);
    res.set('X-Cache', 'MISS');
    res.json(response);
  } catch (error) {
    console.error('Get trending videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get video by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('author', 'username channelName avatar isVerified subscriberCount');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status !== 'active' || !video.isPublic) {
      if (!req.user || video.author._id.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: 'Video not found' });
      }
    }

    // Increment view count
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    // Add to user's watch history if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { watchHistory: { video: req.params.id } }
      });
      await User.findByIdAndUpdate(req.user._id, {
        $push: { watchHistory: { video: req.params.id, watchedAt: new Date() } }
      });
    }

    // Get user's like/dislike status if authenticated
    let userInteraction = null;
    if (req.user) {
      userInteraction = {
        isLiked: video.likes.includes(req.user._id),
        isDisliked: video.dislikes.includes(req.user._id),
        isSubscribed: false
      };

      // Check if user is subscribed to the channel
      const author = await User.findById(video.author._id);
      userInteraction.isSubscribed = author.subscribers.includes(req.user._id);
    }

    // Convert to JSON properly to apply transforms
    const videoData = video.toJSON();
    
    res.json({
      video: {
        ...videoData,
        views: video.views + 1,
        likesCount: video.likes.length,
        dislikesCount: video.dislikes.length
      },
      userInteraction
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload video
router.post('/upload', [
  auth,
  uploadVideo.single('video'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('category')
    .optional()
    .isIn(['Music', 'Gaming', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Film', 'Howto', 'Other'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const { title, description, category, tags, isPublic } = req.body;
    
    // Get video duration using ffmpeg
    const getVideoDuration = () => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(req.file.path, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            resolve(Math.floor(metadata.format.duration));
          }
        });
      });
    };

    let duration;
    try {
      duration = await getVideoDuration();
    } catch (error) {
      console.error('Error getting video duration:', error);
      duration = 0;
    }

    // Generate thumbnail from video
    const thumbnailPath = path.join('thumbnails', `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`);
    
    const generateThumbnail = () => {
      return new Promise((resolve, reject) => {
        ffmpeg(req.file.path)
          .screenshots({
            count: 1,
            folder: 'thumbnails',
            filename: path.basename(thumbnailPath),
            size: '1280x720'
          })
          .on('end', () => resolve(thumbnailPath))
          .on('error', (err) => {
            console.error('Thumbnail generation error:', err);
            resolve(null);
          });
      });
    };

    const thumbnailUrl = await generateThumbnail();

    const video = new Video({
      title,
      description,
      videoUrl: req.file.path,
      thumbnailUrl: thumbnailUrl || '/thumbnails/default.jpg',
      duration,
      author: req.user._id,
      category: category || 'Other',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []),
      isPublic: isPublic !== false,
      status: 'active'
    });

    await video.save();
    await video.populate('author', 'username channelName avatar');

    // Send notifications to subscribers about new video
    if (video.isPublic) {
      NotificationHelper.notifyNewVideo(video, req.user, req);
    }

    res.status(201).json({
      message: 'Video uploaded successfully',
      video
    });
  } catch (error) {
    console.error('Video upload error:', error);
    // Clean up uploaded file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Server error during upload' });
  }
});

// Update video
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('category')
    .optional()
    .isIn(['Music', 'Gaming', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Film', 'Howto', 'Other'])
    .withMessage('Invalid category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, tags, isPublic } = req.body;

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (category !== undefined) video.category = category;
    if (tags !== undefined) video.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []);
    if (isPublic !== undefined) video.isPublic = isPublic;
    video.updatedAt = new Date();

    await video.save();
    await video.populate('author', 'username channelName avatar');

    res.json({
      message: 'Video updated successfully',
      video
    });
  } catch (error) {
    console.error('Video update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete video
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete video file
    const videoPath = video.videoUrl.replace(/^\//, ''); // Remove leading slash
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      console.log('Deleted video file:', videoPath);
    }

    // Delete thumbnail file
    if (video.thumbnailUrl) {
      const thumbnailPath = video.thumbnailUrl.replace(/^\//, ''); // Remove leading slash
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log('Deleted thumbnail file:', thumbnailPath);
      }
    }

    // Delete all comments for this video
    await Comment.deleteMany({ video: req.params.id });

    // Remove from all playlists
    await User.updateMany(
      {},
      { $pull: { 'playlists.$[].videos': req.params.id } }
    );

    await video.deleteOne();

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Video delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like video
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await video.addLike(req.user._id);

    res.json({
      message: 'Video liked',
      likesCount: video.likes.length,
      dislikesCount: video.dislikes.length
    });
  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dislike video
router.post('/:id/dislike', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await video.addDislike(req.user._id);

    res.json({
      message: 'Video disliked',
      likesCount: video.likes.length,
      dislikesCount: video.dislikes.length
    });
  } catch (error) {
    console.error('Dislike video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get videos by channel
router.get('/channel/:channelId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    let query = { author: req.params.channelId, status: 'active' };
    
    // If not the channel owner, only show public videos
    if (!req.user || req.user._id.toString() !== req.params.channelId) {
      query.isPublic = true;
    }

    const videos = await Video.find(query)
      .populate('author', 'username channelName avatar isVerified')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(query);

    // Convert to JSON to apply transforms
    const videosJSON = videos.map(v => v.toJSON());
    
    res.json({
      videos: videosJSON,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get channel videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get related videos
router.get('/:id/related', optionalAuth, async (req, res) => {
  try {
    const currentVideo = await Video.findById(req.params.id);
    if (!currentVideo) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const limit = parseInt(req.query.limit) || 10;

    // Find related videos based on category and tags
    const relatedVideos = await Video.find({
      _id: { $ne: req.params.id },
      status: 'active',
      isPublic: true,
      $or: [
        { category: currentVideo.category },
        { tags: { $in: currentVideo.tags } },
        { author: currentVideo.author }
      ]
    })
    .populate('author', 'username channelName avatar isVerified')
    .sort({ views: -1 })
    .limit(limit);

    res.json({ videos: relatedVideos });
  } catch (error) {
    console.error('Get related videos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;