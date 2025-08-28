const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Search videos and channels
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 12, sortBy = 'relevance' } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const results = {
      videos: [],
      channels: [],
      query: searchQuery,
      pagination: {
        current: pageNum,
        pages: 0,
        total: 0
      }
    };

    // Search videos
    if (type === 'all' || type === 'videos') {
      let videoSortOptions = {};
      
      switch (sortBy) {
        case 'upload_date':
          videoSortOptions = { uploadedAt: -1 };
          break;
        case 'view_count':
          videoSortOptions = { views: -1 };
          break;
        case 'rating':
          videoSortOptions = { likes: -1 };
          break;
        case 'relevance':
        default:
          // MongoDB text search score
          videoSortOptions = { score: { $meta: 'textScore' } };
          break;
      }

      const videoQuery = {
        $text: { $search: searchQuery },
        status: 'active',
        isPublic: true
      };

      if (sortBy === 'relevance') {
        // Add text score for relevance sorting
        const videos = await Video.find(
          videoQuery,
          { score: { $meta: 'textScore' } }
        )
        .populate('author', 'username channelName avatar isVerified')
        .sort(videoSortOptions)
        .skip(type === 'videos' ? skip : 0)
        .limit(type === 'videos' ? limitNum : Math.ceil(limitNum * 0.7));

        results.videos = videos;
      } else {
        const videos = await Video.find(videoQuery)
          .populate('author', 'username channelName avatar isVerified')
          .sort(videoSortOptions)
          .skip(type === 'videos' ? skip : 0)
          .limit(type === 'videos' ? limitNum : Math.ceil(limitNum * 0.7));

        results.videos = videos;
      }

      if (type === 'videos') {
        const videoCount = await Video.countDocuments(videoQuery);
        results.pagination = {
          current: pageNum,
          pages: Math.ceil(videoCount / limitNum),
          total: videoCount
        };
      }
    }

    // Search channels
    if (type === 'all' || type === 'channels') {
      const channelQuery = {
        $or: [
          { username: { $regex: searchQuery, $options: 'i' } },
          { channelName: { $regex: searchQuery, $options: 'i' } },
          { channelDescription: { $regex: searchQuery, $options: 'i' } }
        ],
        isBanned: false
      };

      let channelSortOptions = {};
      switch (sortBy) {
        case 'subscriber_count':
          channelSortOptions = { subscriberCount: -1 };
          break;
        case 'upload_date':
          channelSortOptions = { createdAt: -1 };
          break;
        case 'relevance':
        default:
          // Sort by subscriber count for relevance
          channelSortOptions = { subscriberCount: -1 };
          break;
      }

      const channels = await User.find(channelQuery)
        .select('username channelName channelDescription avatar subscriberCount isVerified createdAt')
        .sort(channelSortOptions)
        .skip(type === 'channels' ? skip : 0)
        .limit(type === 'channels' ? limitNum : Math.ceil(limitNum * 0.3));

      // Add video count for each channel
      const channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const videoCount = await Video.countDocuments({
            author: channel._id,
            status: 'active',
            isPublic: true
          });
          
          return {
            ...channel.toObject(),
            videoCount
          };
        })
      );

      results.channels = channelsWithStats;

      if (type === 'channels') {
        const channelCount = await User.countDocuments(channelQuery);
        results.pagination = {
          current: pageNum,
          pages: Math.ceil(channelCount / limitNum),
          total: channelCount
        };
      }
    }

    // For 'all' type, set pagination based on total results
    if (type === 'all') {
      const totalResults = results.videos.length + results.channels.length;
      results.pagination = {
        current: pageNum,
        pages: totalResults > 0 ? Math.ceil(totalResults / limitNum) : 0,
        total: totalResults
      };
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

// Direct video search endpoint
router.get('/videos', optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, limit = 12, sortBy = 'relevance' } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search videos using text index
    const videoQuery = {
      $text: { $search: searchQuery }
    };

    let videoSortOptions = {};
    if (sortBy === 'relevance') {
      videoSortOptions = { score: { $meta: 'textScore' } };
    } else if (sortBy === 'upload_date') {
      videoSortOptions = { uploadedAt: -1 };
    } else if (sortBy === 'view_count') {
      videoSortOptions = { views: -1 };
    }

    const videos = await Video.find(videoQuery)
      .populate('author', 'username channelName avatar isVerified subscriberCount')
      .sort(videoSortOptions)
      .limit(limitNum)
      .skip(skip);

    const totalVideos = await Video.countDocuments(videoQuery);

    res.json({
      videos,
      query: searchQuery,
      pagination: {
        current: pageNum,
        pages: Math.ceil(totalVideos / limitNum),
        total: totalVideos
      }
    });
  } catch (error) {
    console.error('Video search error:', error);
    res.status(500).json({ message: 'Server error during video search' });
  }
});

// Search suggestions/autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchQuery = q.trim();
    const limitNum = parseInt(limit);

    // Get popular search terms from video titles and channel names
    const videoSuggestions = await Video.aggregate([
      {
        $match: {
          title: { $regex: searchQuery, $options: 'i' },
          status: 'active',
          isPublic: true
        }
      },
      {
        $group: {
          _id: null,
          titles: { $push: '$title' }
        }
      }
    ]);

    const channelSuggestions = await User.aggregate([
      {
        $match: {
          $or: [
            { channelName: { $regex: searchQuery, $options: 'i' } },
            { username: { $regex: searchQuery, $options: 'i' } }
          ],
          isBanned: false
        }
      },
      {
        $group: {
          _id: null,
          names: { $push: '$channelName' }
        }
      }
    ]);

    const suggestions = [];
    
    // Add video title suggestions
    if (videoSuggestions.length > 0) {
      videoSuggestions[0].titles.forEach(title => {
        if (suggestions.length < limitNum && title.toLowerCase().includes(searchQuery.toLowerCase())) {
          suggestions.push({
            text: title,
            type: 'video'
          });
        }
      });
    }

    // Add channel name suggestions
    if (channelSuggestions.length > 0 && suggestions.length < limitNum) {
      channelSuggestions[0].names.forEach(name => {
        if (suggestions.length < limitNum && name.toLowerCase().includes(searchQuery.toLowerCase())) {
          suggestions.push({
            text: name,
            type: 'channel'
          });
        }
      });
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      )
      .slice(0, limitNum);

    res.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get search history for authenticated user
router.get('/history', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ history: [] });
    }

    // This would typically be stored in a separate SearchHistory model
    // For simplicity, we'll return empty history
    // In a real application, you'd track user search queries
    
    res.json({ 
      history: [],
      message: 'Search history feature not implemented in this demo'
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Advanced search with filters
router.get('/advanced', optionalAuth, async (req, res) => {
  try {
    const {
      q,
      category,
      duration,
      uploadDate,
      sortBy = 'relevance',
      page = 1,
      limit = 12
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let videoQuery = {
      $text: { $search: searchQuery },
      status: 'active',
      isPublic: true
    };

    // Apply category filter
    if (category && category !== 'all') {
      videoQuery.category = category;
    }

    // Apply duration filter
    if (duration) {
      switch (duration) {
        case 'short': // Under 4 minutes
          videoQuery.duration = { $lt: 240 };
          break;
        case 'medium': // 4-20 minutes
          videoQuery.duration = { $gte: 240, $lte: 1200 };
          break;
        case 'long': // Over 20 minutes
          videoQuery.duration = { $gt: 1200 };
          break;
      }
    }

    // Apply upload date filter
    if (uploadDate) {
      const now = new Date();
      let dateThreshold;
      
      switch (uploadDate) {
        case 'hour':
          dateThreshold = new Date(now.getTime() - (60 * 60 * 1000));
          break;
        case 'today':
          dateThreshold = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        case 'year':
          dateThreshold = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
          break;
      }
      
      if (dateThreshold) {
        videoQuery.uploadedAt = { $gte: dateThreshold };
      }
    }

    // Set sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'upload_date':
        sortOptions = { uploadedAt: -1 };
        break;
      case 'view_count':
        sortOptions = { views: -1 };
        break;
      case 'rating':
        sortOptions = { likes: -1 };
        break;
      case 'relevance':
      default:
        sortOptions = { score: { $meta: 'textScore' } };
        break;
    }

    let videos;
    if (sortBy === 'relevance') {
      videos = await Video.find(
        videoQuery,
        { score: { $meta: 'textScore' } }
      )
      .populate('author', 'username channelName avatar isVerified')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);
    } else {
      videos = await Video.find(videoQuery)
        .populate('author', 'username channelName avatar isVerified')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);
    }

    const total = await Video.countDocuments(videoQuery);

    res.json({
      videos,
      query: searchQuery,
      filters: {
        category,
        duration,
        uploadDate,
        sortBy
      },
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ message: 'Server error during advanced search' });
  }
});

module.exports = router;