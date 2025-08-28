const express = require('express');
const { body, validationResult } = require('express-validator');
const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all public playlists
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'recent' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { views: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'recent':
      default:
        sortOption = { createdAt: -1 };
    }

    const query = { isPublic: true, status: 'active' };

    const playlists = await Playlist.find(query)
      .populate('author', 'username channelName avatar')
      .populate({
        path: 'videos.video',
        select: 'title thumbnailUrl duration',
        options: { limit: 3 }
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Playlist.countDocuments(query);

    res.json({
      playlists,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's playlists
router.get('/my', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({
      author: req.user._id,
      status: 'active'
    })
    .populate({
      path: 'videos.video',
      select: 'title thumbnailUrl duration'
    })
    .sort({ lastUpdated: -1 });

    res.json({ playlists });
  } catch (error) {
    console.error('Get my playlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single playlist
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('author', 'username channelName avatar subscriberCount')
      .populate({
        path: 'videos.video',
        populate: {
          path: 'author',
          select: 'username channelName avatar'
        }
      });

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.isPublic && (!req.user || playlist.author._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'This playlist is private' });
    }

    // Increment view count
    playlist.views += 1;
    await playlist.save();

    res.json({ playlist });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create playlist
router.post('/', [
  auth,
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
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

    const { title, description, isPublic = true, videoId } = req.body;

    const playlist = new Playlist({
      title,
      description,
      author: req.user._id,
      isPublic
    });

    // If initial video is provided, add it
    if (videoId) {
      const video = await Video.findById(videoId);
      if (video) {
        playlist.addVideo(videoId);
        // Use video thumbnail as playlist thumbnail
        if (video.thumbnailUrl) {
          playlist.thumbnail = video.thumbnailUrl;
        }
      }
    }

    await playlist.save();
    await playlist.populate('author', 'username channelName avatar');
    await playlist.populate({
      path: 'videos.video',
      select: 'title thumbnailUrl duration'
    });

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update playlist
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this playlist' });
    }

    const { title, description, isPublic } = req.body;
    if (title !== undefined) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();

    res.json({
      message: 'Playlist updated successfully',
      playlist
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add video to playlist
router.post('/:id/videos', auth, async (req, res) => {
  try {
    const { videoId, position } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    const [playlist, video] = await Promise.all([
      Playlist.findById(req.params.id),
      Video.findById(videoId)
    ]);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (playlist.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this playlist' });
    }

    const added = playlist.addVideo(videoId, position);
    if (!added) {
      return res.status(400).json({ message: 'Video already in playlist' });
    }

    // Set thumbnail if playlist doesn't have one
    if (!playlist.thumbnail && video.thumbnailUrl) {
      playlist.thumbnail = video.thumbnailUrl;
    }

    await playlist.save();

    res.json({
      message: 'Video added to playlist',
      playlist
    });
  } catch (error) {
    console.error('Add video to playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove video from playlist
router.delete('/:id/videos/:videoId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this playlist' });
    }

    const removed = playlist.removeVideo(req.params.videoId);
    if (!removed) {
      return res.status(404).json({ message: 'Video not in playlist' });
    }

    await playlist.save();

    res.json({
      message: 'Video removed from playlist',
      playlist
    });
  } catch (error) {
    console.error('Remove video from playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder videos in playlist
router.put('/:id/reorder', auth, async (req, res) => {
  try {
    const { videoId, newPosition } = req.body;

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this playlist' });
    }

    const reordered = playlist.reorderVideos(videoId, newPosition);
    if (!reordered) {
      return res.status(400).json({ message: 'Failed to reorder videos' });
    }

    await playlist.save();

    res.json({
      message: 'Playlist reordered successfully',
      playlist
    });
  } catch (error) {
    console.error('Reorder playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete playlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this playlist' });
    }

    playlist.status = 'deleted';
    await playlist.save();

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/unlike playlist
router.post('/:id/like', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const userIndex = playlist.likes.indexOf(req.user._id);
    if (userIndex === -1) {
      playlist.likes.push(req.user._id);
    } else {
      playlist.likes.splice(userIndex, 1);
    }

    await playlist.save();

    res.json({
      message: userIndex === -1 ? 'Playlist liked' : 'Playlist unliked',
      likes: playlist.likes.length
    });
  } catch (error) {
    console.error('Like playlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;