const express = require('express');
const { body, validationResult } = require('express-validator');
const Stream = require('../models/Stream');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadThumbnail } = require('../middleware/upload');
const NotificationHelper = require('../utils/notificationHelper');

const router = express.Router();

// Get all live streams
router.get('/live', optionalAuth, async (req, res) => {
  try {
    const { category, sort = 'viewers', page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      status: 'live',
      visibility: 'public',
      isDeleted: false
    };

    if (category) {
      query.category = category;
    }

    let sortOption = {};
    switch (sort) {
      case 'viewers':
        sortOption = { 'viewers.current': -1 };
        break;
      case 'newest':
        sortOption = { actualStartTime: -1 };
        break;
      case 'trending':
        sortOption = { 'viewers.peak': -1, likes: -1 };
        break;
      default:
        sortOption = { 'viewers.current': -1 };
    }

    const streams = await Stream.find(query)
      .populate('streamer', 'username channelName avatar subscriberCount')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Stream.countDocuments(query);

    res.json({
      streams,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    res.status(500).json({ message: 'Error fetching live streams' });
  }
});

// Get upcoming/scheduled streams
router.get('/scheduled', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const streams = await Stream.find({
      status: 'scheduled',
      visibility: 'public',
      isDeleted: false,
      scheduledStartTime: { $gte: new Date() }
    })
    .populate('streamer', 'username channelName avatar subscriberCount')
    .sort({ scheduledStartTime: 1 })
    .skip(skip)
    .limit(limitNum);

    const total = await Stream.countDocuments({
      status: 'scheduled',
      visibility: 'public',
      isDeleted: false
    });

    res.json({
      streams,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching scheduled streams:', error);
    res.status(500).json({ message: 'Error fetching scheduled streams' });
  }
});

// Get stream by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
      .populate('streamer', 'username channelName avatar subscriberCount subscribers');

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Check visibility
    if (stream.visibility === 'private' && 
        (!req.user || stream.streamer._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'This stream is private' });
    }

    // Check if user is subscribed (for subscriber-only chat)
    let isSubscribed = false;
    if (req.user && stream.streamer.subscribers) {
      isSubscribed = stream.streamer.subscribers.includes(req.user._id);
    }

    res.json({ 
      stream,
      isSubscribed,
      canChat: !stream.chat.subscribersOnly || isSubscribed || 
               (req.user && req.user._id.toString() === stream.streamer._id.toString())
    });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ message: 'Error fetching stream' });
  }
});

// Create/schedule a stream
router.post('/create', [
  auth,
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
    .isIn(['Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Talk Shows', 'Other'])
    .withMessage('Invalid category'),
  body('scheduledStartTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { title, description, category, tags, scheduledStartTime, visibility } = req.body;

    // Check if user already has an active stream
    const existingStream = await Stream.findOne({
      streamer: req.user._id,
      status: { $in: ['scheduled', 'live'] }
    });

    if (existingStream) {
      return res.status(400).json({ 
        message: 'You already have an active or scheduled stream'
      });
    }

    const stream = new Stream({
      streamer: req.user._id,
      title,
      description,
      category: category || 'Other',
      tags: tags || [],
      visibility: visibility || 'public',
      scheduledStartTime: scheduledStartTime || null,
      status: scheduledStartTime ? 'scheduled' : 'scheduled',
      streamKey: Stream.generateStreamKey()
    });

    await stream.save();
    await stream.populate('streamer', 'username channelName avatar subscriberCount');

    res.status(201).json({ 
      message: 'Stream created successfully',
      stream
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ message: 'Error creating stream' });
  }
});

// Update stream details
router.put('/:id', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own streams' });
    }

    if (stream.status === 'ended') {
      return res.status(400).json({ message: 'Cannot edit ended streams' });
    }

    const updates = {};
    const allowedUpdates = ['title', 'description', 'category', 'tags', 'visibility', 'thumbnail'];
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    Object.assign(stream, updates);
    await stream.save();

    res.json({ 
      message: 'Stream updated successfully',
      stream
    });
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ message: 'Error updating stream' });
  }
});

// Upload stream thumbnail
router.post('/:id/thumbnail', [
  auth,
  uploadThumbnail.single('thumbnail')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Thumbnail file is required' });
    }

    const stream = await Stream.findById(req.params.id);

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own streams' });
    }

    stream.thumbnail = `/thumbnails/${req.file.filename}`;
    await stream.save();

    res.json({ 
      message: 'Thumbnail uploaded successfully',
      thumbnailUrl: stream.thumbnail
    });
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    res.status(500).json({ message: 'Error uploading thumbnail' });
  }
});

// Start streaming (go live)
router.post('/:id/start', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only start your own streams' });
    }

    if (stream.status === 'live') {
      return res.status(400).json({ message: 'Stream is already live' });
    }

    if (stream.status === 'ended') {
      return res.status(400).json({ message: 'Cannot restart ended streams' });
    }

    await stream.startStream();
    await stream.populate('streamer', 'username channelName avatar subscriberCount');

    // Notify subscribers (this would be handled by StreamManager in practice)
    // For now, we'll just return success

    res.json({ 
      message: 'Stream started successfully',
      stream,
      streamKey: stream.streamKey
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ message: 'Error starting stream' });
  }
});

// End streaming
router.post('/:id/end', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only end your own streams' });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({ message: 'Stream is not live' });
    }

    await stream.endStream();

    // If recording was enabled, create a video from the stream
    if (stream.recording.enabled && stream.recording.url) {
      const video = new Video({
        title: stream.title,
        description: stream.description,
        videoUrl: stream.recording.url,
        thumbnailUrl: stream.thumbnail,
        duration: stream.duration,
        author: stream.streamer,
        category: stream.category,
        tags: [...stream.tags, 'livestream'],
        isPublic: stream.visibility === 'public',
        status: 'active'
      });

      await video.save();
      stream.recording.videoId = video._id;
      await stream.save();
    }

    res.json({ 
      message: 'Stream ended successfully',
      stream,
      recordedVideoId: stream.recording.videoId
    });
  } catch (error) {
    console.error('Error ending stream:', error);
    res.status(500).json({ message: 'Error ending stream' });
  }
});

// Get stream chat messages
router.get('/:id/chat', optionalAuth, async (req, res) => {
  try {
    const { limit = 100, before } = req.query;
    
    const query = {
      stream: req.params.id,
      isDeleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'username channelName avatar')
      .populate('replyTo', 'user message')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ 
      messages: messages.reverse()
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Error fetching chat messages' });
  }
});

// Get user's streams
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      streamer: req.params.userId,
      isDeleted: false
    };

    if (status !== 'all') {
      query.status = status;
    }

    // Hide private streams from other users
    if (!req.user || req.user._id.toString() !== req.params.userId) {
      query.visibility = { $ne: 'private' };
    }

    const streams = await Stream.find(query)
      .populate('streamer', 'username channelName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Stream.countDocuments(query);

    res.json({
      streams,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching user streams:', error);
    res.status(500).json({ message: 'Error fetching user streams' });
  }
});

// Get stream analytics (for streamer only)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream || stream.isDeleted) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only view analytics for your own streams' });
    }

    const analytics = {
      viewers: {
        current: stream.viewers.current,
        peak: stream.viewers.peak,
        total: stream.viewers.total,
        unique: stream.viewers.unique.length,
        avgWatchTime: stream.analytics.avgWatchTime || 0
      },
      engagement: {
        likes: stream.likes.length,
        dislikes: stream.dislikes.length,
        chatMessages: stream.analytics.chatMessages || 0,
        donations: stream.donations.length,
        totalDonations: stream.donations.reduce((sum, d) => sum + d.amount, 0)
      },
      performance: {
        duration: stream.duration,
        status: stream.status,
        startTime: stream.actualStartTime,
        endTime: stream.endTime
      }
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Error fetching stream analytics:', error);
    res.status(500).json({ message: 'Error fetching stream analytics' });
  }
});

// Delete stream
router.delete('/:id', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.streamer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own streams' });
    }

    if (stream.status === 'live') {
      return res.status(400).json({ message: 'Cannot delete a live stream' });
    }

    stream.isDeleted = true;
    await stream.save();

    res.json({ message: 'Stream deleted successfully' });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ message: 'Error deleting stream' });
  }
});

module.exports = router;