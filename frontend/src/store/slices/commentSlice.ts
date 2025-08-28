import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { commentService } from '../../services/commentService';
import type { Comment, CreateCommentData } from '../../types/comment';

interface CommentState {
  comments: Comment[];
  replies: { [commentId: string]: Comment[] };
  totalComments: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  pagination: {
    current: number;
    pages: number;
    total: number;
  } | null;
}

const initialState: CommentState = {
  comments: [],
  replies: {},
  totalComments: 0,
  loading: false,
  submitting: false,
  error: null,
  pagination: null,
};

// Async thunks
export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async (params: { videoId: string; page?: number; limit?: number; sortBy?: string }) => {
    const response = await commentService.getComments(params);
    return response;
  }
);

export const fetchReplies = createAsyncThunk(
  'comments/fetchReplies',
  async (params: { commentId: string; page?: number; limit?: number }) => {
    const response = await commentService.getReplies(params);
    return { commentId: params.commentId, ...response };
  }
);

export const createComment = createAsyncThunk(
  'comments/createComment',
  async (data: CreateCommentData, { rejectWithValue }) => {
    try {
      const response = await commentService.createComment(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, content }: { commentId: string; content: string }, { rejectWithValue }) => {
    try {
      const response = await commentService.updateComment(commentId, content);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      await commentService.deleteComment(commentId);
      return commentId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const likeComment = createAsyncThunk(
  'comments/likeComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const response = await commentService.likeComment(commentId);
      return { commentId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const dislikeComment = createAsyncThunk(
  'comments/dislikeComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const response = await commentService.dislikeComment(commentId);
      return { commentId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeLike = createAsyncThunk(
  'comments/removeLike',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const response = await commentService.removeLike(commentId);
      return { commentId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeDislike = createAsyncThunk(
  'comments/removeDislike',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const response = await commentService.removeDislike(commentId);
      return { commentId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const commentSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    setComments: (state, action: PayloadAction<Comment[]>) => {
      state.comments = action.payload;
    },
    addComment: (state, action: PayloadAction<Comment>) => {
      if (action.payload.parentComment) {
        // It's a reply
        const parentId = action.payload.parentComment;
        if (!state.replies[parentId]) {
          state.replies[parentId] = [];
        }
        state.replies[parentId].push(action.payload);
      } else {
        // It's a top-level comment
        state.comments.unshift(action.payload);
      }
    },
    updateCommentInList: (state, action: PayloadAction<Comment>) => {
      const comment = action.payload;
      
      if (comment.parentComment) {
        // Update reply
        const parentId = comment.parentComment;
        if (state.replies[parentId]) {
          const index = state.replies[parentId].findIndex(r => r._id === comment._id);
          if (index !== -1) {
            state.replies[parentId][index] = comment;
          }
        }
      } else {
        // Update top-level comment
        const index = state.comments.findIndex(c => c._id === comment._id);
        if (index !== -1) {
          state.comments[index] = comment;
        }
      }
    },
    removeCommentFromList: (state, action: PayloadAction<string>) => {
      const commentId = action.payload;
      
      // Remove from top-level comments
      state.comments = state.comments.filter(c => c._id !== commentId);
      
      // Remove from replies
      Object.keys(state.replies).forEach(parentId => {
        state.replies[parentId] = state.replies[parentId].filter(r => r._id !== commentId);
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.submitting = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearComments: (state) => {
      state.comments = [];
      state.replies = {};
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.comments;
        state.totalComments = action.payload.total || action.payload.comments.length;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch comments';
      })
      // Fetch replies
      .addCase(fetchReplies.fulfilled, (state, action) => {
        state.replies[action.payload.commentId] = action.payload.replies;
      })
      // Create comment
      .addCase(createComment.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.submitting = false;
        const comment = action.payload.comment;
        
        if (comment.parentComment) {
          // It's a reply
          const parentId = comment.parentComment;
          if (!state.replies[parentId]) {
            state.replies[parentId] = [];
          }
          state.replies[parentId].push(comment);
        } else {
          // It's a top-level comment
          state.comments.unshift(comment);
          state.totalComments = state.totalComments + 1;
        }
      })
      .addCase(createComment.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      })
      // Update comment
      .addCase(updateComment.fulfilled, (state, action) => {
        const comment = action.payload.comment;
        
        if (comment.parentComment) {
          const parentId = comment.parentComment;
          if (state.replies[parentId]) {
            const index = state.replies[parentId].findIndex(r => r._id === comment._id);
            if (index !== -1) {
              state.replies[parentId][index] = comment;
            }
          }
        } else {
          const index = state.comments.findIndex(c => c._id === comment._id);
          if (index !== -1) {
            state.comments[index] = comment;
          }
        }
      })
      // Delete comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        const commentId = action.payload;
        state.comments = state.comments.filter(c => c._id !== commentId);
        
        Object.keys(state.replies).forEach(parentId => {
          state.replies[parentId] = state.replies[parentId].filter(r => r._id !== commentId);
        });
      })
      // Like comment
      .addCase(likeComment.fulfilled, (state, action) => {
        const { commentId, likesCount, dislikesCount } = action.payload;
        
        // Update in top-level comments
        const commentIndex = state.comments.findIndex(c => c._id === commentId);
        if (commentIndex !== -1) {
          state.comments[commentIndex].likesCount = likesCount;
          state.comments[commentIndex].dislikesCount = dislikesCount;
          if (state.comments[commentIndex].userInteraction) {
            state.comments[commentIndex].userInteraction!.isLiked = true;
            state.comments[commentIndex].userInteraction!.isDisliked = false;
          }
        }
        
        // Update in replies
        Object.keys(state.replies).forEach(parentId => {
          const replyIndex = state.replies[parentId].findIndex(r => r._id === commentId);
          if (replyIndex !== -1) {
            state.replies[parentId][replyIndex].likesCount = likesCount;
            state.replies[parentId][replyIndex].dislikesCount = dislikesCount;
            if (state.replies[parentId][replyIndex].userInteraction) {
              state.replies[parentId][replyIndex].userInteraction!.isLiked = true;
              state.replies[parentId][replyIndex].userInteraction!.isDisliked = false;
            }
          }
        });
      })
      // Dislike comment
      .addCase(dislikeComment.fulfilled, (state, action) => {
        const { commentId, likesCount, dislikesCount } = action.payload;
        
        // Update in top-level comments
        const commentIndex = state.comments.findIndex(c => c._id === commentId);
        if (commentIndex !== -1) {
          state.comments[commentIndex].likesCount = likesCount;
          state.comments[commentIndex].dislikesCount = dislikesCount;
          if (state.comments[commentIndex].userInteraction) {
            state.comments[commentIndex].userInteraction!.isLiked = false;
            state.comments[commentIndex].userInteraction!.isDisliked = true;
          }
        }
        
        // Update in replies
        Object.keys(state.replies).forEach(parentId => {
          const replyIndex = state.replies[parentId].findIndex(r => r._id === commentId);
          if (replyIndex !== -1) {
            state.replies[parentId][replyIndex].likesCount = likesCount;
            state.replies[parentId][replyIndex].dislikesCount = dislikesCount;
            if (state.replies[parentId][replyIndex].userInteraction) {
              state.replies[parentId][replyIndex].userInteraction!.isLiked = false;
              state.replies[parentId][replyIndex].userInteraction!.isDisliked = true;
            }
          }
        });
      });
  },
});

export const {
  setComments,
  addComment,
  updateCommentInList,
  removeCommentFromList,
  setLoading,
  setSubmitting,
  clearError,
  clearComments,
} = commentSlice.actions;

export default commentSlice.reducer;