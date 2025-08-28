const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const NotificationHelper = require('../utils/notificationHelper');

const router = express.Router();

// Get comments for a video
router.get('/video/:videoId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Get top-level comments (not replies)
    const comments = await Comment.find({
      video: req.params.videoId,
      parentComment: null,
      isDeleted: false
    })
    .populate('author', 'username channelName avatar isVerified')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: {
        path: 'author',
        select: 'username channelName avatar isVerified'
      },
      options: { sort: { createdAt: 1 }, limit: 3 } // Show first 3 replies
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

    // Add interaction info if user is authenticated
    const commentsWithInteraction = comments.map(comment => {
      let userInteraction = null;
      if (req.user) {
        userInteraction = {
          isLiked: comment.likes.includes(req.user._id),
          isDisliked: comment.dislikes.includes(req.user._id)
        };
      }

      return {
        ...comment,
        likesCount: comment.likes.length,
        dislikesCount: comment.dislikes.length,
        repliesCount: comment.replies.length,
        userInteraction,
        replies: comment.replies.map(reply => ({
          ...reply,
          likesCount: reply.likes.length,
          dislikesCount: reply.dislikes.length,
          userInteraction: req.user ? {
            isLiked: reply.likes.includes(req.user._id),
            isDisliked: reply.dislikes.includes(req.user._id)
          } : null
        }))
      };
    });

    const total = await Comment.countDocuments({
      video: req.params.videoId,
      parentComment: null,
      isDeleted: false
    });

    res.json({
      comments: commentsWithInteraction,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get replies for a comment
router.get('/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const replies = await Comment.find({
      parentComment: req.params.commentId,
      isDeleted: false
    })
    .populate('author', 'username channelName avatar isVerified')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const repliesWithInteraction = replies.map(reply => {
      let userInteraction = null;
      if (req.user) {
        userInteraction = {
          isLiked: reply.likes.includes(req.user._id),
          isDisliked: reply.dislikes.includes(req.user._id)
        };
      }

      return {
        ...reply,
        likesCount: reply.likes.length,
        dislikesCount: reply.dislikes.length,
        userInteraction
      };
    });

    const total = await Comment.countDocuments({
      parentComment: req.params.commentId,
      isDeleted: false
    });

    res.json({
      replies: repliesWithInteraction,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create comment
router.post('/', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  body('videoId')
    .isMongoId()
    .withMessage('Valid video ID is required'),
  body('parentCommentId')
    .optional()
    .isMongoId()
    .withMessage('Valid parent comment ID is required if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { content, videoId, parentCommentId } = req.body;

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if parent comment exists (for replies)
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      if (parentComment.video.toString() !== videoId) {
        return res.status(400).json({ message: 'Parent comment does not belong to this video' });
      }
    }

    const comment = new Comment({
      content,
      author: req.user._id,
      video: videoId,
      parentComment: parentCommentId || null
    });

    await comment.save();

    // Add comment to parent's replies array
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      });
    }

    // Add comment to video's comments array
    await Video.findByIdAndUpdate(videoId, {
      $push: { comments: comment._id }
    });

    await comment.populate('author', 'username channelName avatar isVerified');

    // Send notification
    if (parentCommentId) {
      // Reply notification
      const parentComment = await Comment.findById(parentCommentId).populate('author');
      if (parentComment && parentComment.author._id.toString() !== req.user._id.toString()) {
        await NotificationHelper.notifyComment(comment, video, req.user, parentComment.author._id, true, req);
      }
    } else {
      // Video comment notification
      if (video.author.toString() !== req.user._id.toString()) {
        await NotificationHelper.notifyComment(comment, video, req.user, video.author, false, req);
      }
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment: {
        ...comment.toObject(),
        likesCount: 0,
        dislikesCount: 0,
        repliesCount: 0,
        userInteraction: {
          isLiked: false,
          isDisliked: false
        }
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment
router.put('/:id', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit deleted comment' });
    }

    comment.content = req.body.content;
    comment.isEdited = true;
    comment.updatedAt = new Date();

    await comment.save();
    await comment.populate('author', 'username channelName avatar isVerified');

    res.json({
      message: 'Comment updated successfully',
      comment: {
        ...comment.toObject(),
        likesCount: comment.likes.length,
        dislikesCount: comment.dislikes.length,
        repliesCount: comment.replies.length
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark as deleted instead of actually deleting
    comment.isDeleted = true;
    comment.content = '[This comment has been deleted]';
    await comment.save();

    // Remove from video's comments array
    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: req.params.id }
    });

    // Remove from parent comment's replies array
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: req.params.id }
      });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like comment
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: 'Cannot like deleted comment' });
    }

    await comment.addLike(req.user._id);

    res.json({
      message: 'Comment liked',
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dislike comment
router.post('/:id/dislike', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: 'Cannot dislike deleted comment' });
    }

    await comment.addDislike(req.user._id);

    res.json({
      message: 'Comment disliked',
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length
    });
  } catch (error) {
    console.error('Dislike comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove like from comment
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await comment.removeLike(req.user._id);

    res.json({
      message: 'Like removed',
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length
    });
  } catch (error) {
    console.error('Remove like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove dislike from comment
router.delete('/:id/dislike', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await comment.removeDislike(req.user._id);

    res.json({
      message: 'Dislike removed',
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length
    });
  } catch (error) {
    console.error('Remove dislike error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Pin comment (video owner only)
router.post('/:id/pin', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('video');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.video.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only video owner can pin comments' });
    }

    // Unpin other comments on this video
    await Comment.updateMany(
      { video: comment.video._id },
      { isPinned: false }
    );

    comment.isPinned = true;
    await comment.save();

    res.json({ message: 'Comment pinned successfully' });
  } catch (error) {
    console.error('Pin comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Heart comment (video owner only)
router.post('/:id/heart', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('video');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.video.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only video owner can heart comments' });
    }

    comment.isHearted = !comment.isHearted;
    await comment.save();

    res.json({ 
      message: comment.isHearted ? 'Comment hearted' : 'Heart removed',
      isHearted: comment.isHearted
    });
  } catch (error) {
    console.error('Heart comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;