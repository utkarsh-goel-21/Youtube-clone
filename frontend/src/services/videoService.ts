import api, { uploadApi } from './api';
import type {
  Video,
  VideoResponse,
  SingleVideoResponse,
  VideoUploadData,
  VideoUploadResponse,
  VideoUpdateResponse,
  VideoInteractionResponse,
  VideoSearchParams
} from '../types/video';

export const videoService = {
  async getVideos(params: {
    page?: number;
    limit?: number;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<VideoResponse> {
    const response = await api.get('/videos', { params });
    return response.data;
  },

  async getTrendingVideos(params: {
    limit?: number;
    category?: string;
  } = {}): Promise<VideoResponse> {
    const response = await api.get('/videos/trending', { params });
    return response.data;
  },

  async getRecommendedVideos(): Promise<VideoResponse> {
    const response = await api.get('/videos/recommended');
    return response.data;
  },

  async getVideoById(videoId: string): Promise<SingleVideoResponse> {
    const response = await api.get(`/videos/${videoId}`);
    return response.data;
  },

  async getRelatedVideos(videoId: string, limit: number = 10): Promise<VideoResponse> {
    const response = await api.get(`/videos/${videoId}/related`, { params: { limit } });
    return response.data;
  },

  async getChannelVideos(
    channelId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<VideoResponse> {
    const response = await api.get(`/videos/channel/${channelId}`, { params });
    return response.data;
  },

  async searchVideos(params: VideoSearchParams): Promise<any> {
    const response = await api.get('/search', { params });
    return response.data;
  },

  async uploadVideo(
    videoData: VideoUploadData,
    videoFile: File,
    thumbnailFile?: File,
    onProgress?: (progress: number) => void
  ): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', videoData.title);
    
    if (videoData.description) {
      formData.append('description', videoData.description);
    }
    
    formData.append('category', videoData.category);
    formData.append('isPublic', videoData.isPublic.toString());
    
    if (videoData.tags && videoData.tags.length > 0) {
      formData.append('tags', JSON.stringify(videoData.tags));
    }
    
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    const response = await uploadApi.post('/videos/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  async updateVideo(videoId: string, data: Partial<VideoUploadData>): Promise<VideoUpdateResponse> {
    const response = await api.put(`/videos/${videoId}`, data);
    return response.data;
  },

  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await api.delete(`/videos/${videoId}`);
    return response.data;
  },

  async likeVideo(videoId: string): Promise<VideoInteractionResponse> {
    const response = await api.post(`/videos/${videoId}/like`);
    return response.data;
  },

  async dislikeVideo(videoId: string): Promise<VideoInteractionResponse> {
    const response = await api.post(`/videos/${videoId}/dislike`);
    return response.data;
  },

  // Search suggestions
  async getSearchSuggestions(query: string, limit: number = 5): Promise<any> {
    const response = await api.get('/search/suggestions', {
      params: { q: query, limit }
    });
    return response.data;
  },

  // Advanced search
  async advancedSearch(params: VideoSearchParams): Promise<any> {
    const response = await api.get('/search/advanced', { params });
    return response.data;
  },

  // Watch History
  async getWatchHistory(params: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'today' | 'week' | 'month';
  } = {}): Promise<VideoResponse> {
    console.log('VIDEO SERVICE: getWatchHistory called with filter:', params.filter);
    const response = await api.get('/users/history', { params });
    console.log('VIDEO SERVICE: Response has', response.data?.videos?.length || 0, 'videos');
    return response.data;
  },

  async clearWatchHistory(): Promise<{ message: string }> {
    const response = await api.delete('/users/history');
    return response.data;
  },

  async removeFromHistory(videoId: string): Promise<{ message: string }> {
    const response = await api.delete(`/users/history/${videoId}`);
    return response.data;
  },

  async addToWatchHistory(videoId: string, watchTime: number): Promise<{ message: string }> {
    const response = await api.post(`/users/history/${videoId}`, { watchTime });
    return response.data;
  }
};