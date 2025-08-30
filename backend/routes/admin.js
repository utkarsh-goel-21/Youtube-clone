const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Playlist = require('../models/Playlist');
const Notification = require('../models/Notification');

// Clear all content - ADMIN ONLY
// In production, this should be protected with admin authentication
router.delete('/clear-all', async (req, res) => {
  try {
    // Delete all videos
    const videoResult = await Video.deleteMany({});
    
    // Delete all comments
    const commentResult = await Comment.deleteMany({});
    
    // Delete all playlists
    const playlistResult = await Playlist.deleteMany({});
    
    // Delete all notifications
    const notifResult = await Notification.deleteMany({});
    
    res.json({
      message: 'All content cleared successfully',
      deleted: {
        videos: videoResult.deletedCount,
        comments: commentResult.deletedCount,
        playlists: playlistResult.deletedCount,
        notifications: notifResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;