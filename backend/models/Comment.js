const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isHearted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

commentSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    const dislikeIndex = this.dislikes.indexOf(userId);
    if (dislikeIndex > -1) {
      this.dislikes.splice(dislikeIndex, 1);
    }
    await this.save();
  }
};

commentSchema.methods.addDislike = async function(userId) {
  if (!this.dislikes.includes(userId)) {
    this.dislikes.push(userId);
    const likeIndex = this.likes.indexOf(userId);
    if (likeIndex > -1) {
      this.likes.splice(likeIndex, 1);
    }
    await this.save();
  }
};

commentSchema.methods.removeLike = async function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    await this.save();
  }
};

commentSchema.methods.removeDislike = async function(userId) {
  const dislikeIndex = this.dislikes.indexOf(userId);
  if (dislikeIndex > -1) {
    this.dislikes.splice(dislikeIndex, 1);
    await this.save();
  }
};

module.exports = mongoose.model('Comment', commentSchema);