import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { videoService } from '../../services/videoService';
import type { Video, VideoUploadData, VideoWithInteraction } from '../../types/video';

interface VideoState {
  videos: Video[];
  currentVideo: VideoWithInteraction | null;
  relatedVideos: Video[];
  userVideos: Video[];
  searchResults: Video[];
  trendingVideos: Video[];
  subscriptionVideos: Video[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  pagination: {
    current: number;
    pages: number;
    total: number;
  } | null;
}

const initialState: VideoState = {
  videos: [],
  currentVideo: null,
  relatedVideos: [],
  userVideos: [],
  searchResults: [],
  trendingVideos: [],
  subscriptionVideos: [],
  loading: false,
  uploading: false,
  uploadProgress: 0,
  error: null,
  pagination: null,
};

// Async thunks
export const fetchVideos = createAsyncThunk(
  'videos/fetchVideos',
  async (params: { page?: number; limit?: number; category?: string; sortBy?: string } = {}) => {
    const response = await videoService.getVideos(params);
    return response;
  }
);

export const fetchVideoById = createAsyncThunk(
  'videos/fetchVideoById',
  async (videoId: string) => {
    const response = await videoService.getVideoById(videoId);
    return response;
  }
);

export const fetchTrendingVideos = createAsyncThunk(
  'videos/fetchTrendingVideos',
  async (limit: number = 12) => {
    const response = await videoService.getTrendingVideos(limit);
    return response;
  }
);

export const fetchRelatedVideos = createAsyncThunk(
  'videos/fetchRelatedVideos',
  async (videoId: string) => {
    const response = await videoService.getRelatedVideos(videoId);
    return response;
  }
);

export const searchVideos = createAsyncThunk(
  'videos/searchVideos',
  async (params: { q: string; type?: string; page?: number; limit?: number; sortBy?: string }) => {
    const response = await videoService.searchVideos(params);
    return response;
  }
);

export const uploadVideo = createAsyncThunk(
  'videos/uploadVideo',
  async (
    data: { videoData: VideoUploadData; videoFile: File; thumbnailFile?: File },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await videoService.uploadVideo(
        data.videoData,
        data.videoFile,
        data.thumbnailFile,
        (progress: number) => {
          dispatch(setUploadProgress(progress));
        }
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateVideo = createAsyncThunk(
  'videos/updateVideo',
  async ({ videoId, data }: { videoId: string; data: Partial<VideoUploadData> }) => {
    const response = await videoService.updateVideo(videoId, data);
    return response;
  }
);

export const deleteVideo = createAsyncThunk(
  'videos/deleteVideo',
  async (videoId: string) => {
    await videoService.deleteVideo(videoId);
    return videoId;
  }
);

export const likeVideo = createAsyncThunk(
  'videos/likeVideo',
  async (videoId: string) => {
    const response = await videoService.likeVideo(videoId);
    return { videoId, ...response };
  }
);

export const dislikeVideo = createAsyncThunk(
  'videos/dislikeVideo',
  async (videoId: string) => {
    const response = await videoService.dislikeVideo(videoId);
    return { videoId, ...response };
  }
);

const videoSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    setVideos: (state, action: PayloadAction<Video[]>) => {
      state.videos = action.payload;
    },
    appendVideos: (state, action: PayloadAction<Video[]>) => {
      state.videos = [...state.videos, ...action.payload];
    },
    addVideo: (state, action: PayloadAction<Video>) => {
      state.videos.unshift(action.payload);
    },
    updateVideoInList: (state, action: PayloadAction<Video>) => {
      const index = state.videos.findIndex(v => v._id === action.payload._id);
      if (index !== -1) {
        state.videos[index] = action.payload;
      }
    },
    removeVideo: (state, action: PayloadAction<string>) => {
      state.videos = state.videos.filter(v => v._id !== action.payload);
    },
    setCurrentVideo: (state, action: PayloadAction<VideoWithInteraction | null>) => {
      state.currentVideo = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.uploading = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVideo: (state) => {
      state.currentVideo = null;
      state.relatedVideos = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch videos
      .addCase(fetchVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.videos = action.payload.videos;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch videos';
      })
      // Fetch video by ID
      .addCase(fetchVideoById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.loading = false;
        // Combine video with userInteraction
        state.currentVideo = {
          ...action.payload.video,
          userInteraction: action.payload.userInteraction
        };
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch video';
      })
      // Fetch trending videos
      .addCase(fetchTrendingVideos.fulfilled, (state, action) => {
        state.trendingVideos = action.payload.videos;
      })
      // Fetch related videos
      .addCase(fetchRelatedVideos.fulfilled, (state, action) => {
        state.relatedVideos = action.payload.videos;
      })
      // Search videos
      .addCase(searchVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload.videos;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to search videos';
      })
      // Upload video
      .addCase(uploadVideo.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadVideo.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 100;
        state.videos.unshift(action.payload.video);
      })
      .addCase(uploadVideo.rejected, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      })
      // Update video
      .addCase(updateVideo.fulfilled, (state, action) => {
        const index = state.videos.findIndex(v => v._id === action.payload.video._id);
        if (index !== -1) {
          state.videos[index] = action.payload.video;
        }
        if (state.currentVideo && state.currentVideo._id === action.payload.video._id) {
          state.currentVideo = action.payload.video;
        }
      })
      // Delete video
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.videos = state.videos.filter(v => v._id !== action.payload);
        if (state.currentVideo && state.currentVideo._id === action.payload) {
          state.currentVideo = null;
        }
      })
      // Like/dislike video
      .addCase(likeVideo.fulfilled, (state, action) => {
        if (state.currentVideo && state.currentVideo._id === action.payload.videoId) {
          // Update counts
          state.currentVideo.likesCount = action.payload.likesCount;
          state.currentVideo.dislikesCount = action.payload.dislikesCount;
          
          // Initialize userInteraction if it doesn't exist
          if (!state.currentVideo.userInteraction) {
            state.currentVideo.userInteraction = {
              liked: false,
              disliked: false
            };
          }
          
          // Toggle like state - if already liked, remove like, otherwise add like
          const wasLiked = state.currentVideo.userInteraction.liked;
          state.currentVideo.userInteraction.liked = !wasLiked;
          // If we're liking, remove any dislike
          if (!wasLiked) {
            state.currentVideo.userInteraction.disliked = false;
          }
        }
      })
      .addCase(dislikeVideo.fulfilled, (state, action) => {
        if (state.currentVideo && state.currentVideo._id === action.payload.videoId) {
          // Update counts
          state.currentVideo.likesCount = action.payload.likesCount;
          state.currentVideo.dislikesCount = action.payload.dislikesCount;
          
          // Initialize userInteraction if it doesn't exist
          if (!state.currentVideo.userInteraction) {
            state.currentVideo.userInteraction = {
              liked: false,
              disliked: false
            };
          }
          
          // Toggle dislike state - if already disliked, remove dislike, otherwise add dislike
          const wasDisliked = state.currentVideo.userInteraction.disliked;
          state.currentVideo.userInteraction.disliked = !wasDisliked;
          // If we're disliking, remove any like
          if (!wasDisliked) {
            state.currentVideo.userInteraction.liked = false;
          }
        }
      });
  },
});

export const {
  setVideos,
  appendVideos,
  addVideo,
  updateVideoInList,
  removeVideo,
  setCurrentVideo,
  setLoading,
  setUploading,
  setUploadProgress,
  clearError,
  clearCurrentVideo,
} = videoSlice.actions;

export default videoSlice.reducer;