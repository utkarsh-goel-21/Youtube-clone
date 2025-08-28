import api, { uploadApi } from './api';
import type { 
  UserProfile, 
  UserSettings, 
  User,
  Playlist
} from '../types/user';

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  async getMyChannel(): Promise<UserProfile> {
    const response = await api.get('/users/channel/me');
    return response.data;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<{ message: string; user: UserProfile }> {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<{ message: string; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await uploadApi.post('/users/avatar', formData);
    return response.data;
  },

  async subscribeToUser(userId: string): Promise<{ message: string; subscribersCount: number }> {
    const response = await api.post(`/users/${userId}/subscribe`);
    return response.data;
  },

  async unsubscribeFromUser(userId: string): Promise<{ message: string; subscribersCount: number }> {
    const response = await api.delete(`/users/${userId}/subscribe`);
    return response.data;
  },

  async getSubscriptions(): Promise<{ subscriptions: User[] }> {
    const response = await api.get('/users/subscriptions/me');
    return response.data;
  },

  async getSubscriptionFeed(params: { 
    page?: number; 
    limit?: number; 
  } = {}): Promise<any> {
    const response = await api.get('/users/feed/subscriptions', { params });
    return response.data;
  },

  async getWatchHistory(params: { 
    page?: number; 
    limit?: number; 
  } = {}): Promise<any> {
    const response = await api.get('/users/history/watch', { params });
    return response.data;
  },

  async clearWatchHistory(): Promise<{ message: string }> {
    const response = await api.delete('/users/history/watch');
    return response.data;
  },

  async createPlaylist(data: { 
    name: string; 
    description?: string; 
    isPublic?: boolean; 
  }): Promise<{ message: string; playlist: Playlist }> {
    const response = await api.post('/users/playlists', data);
    return response.data;
  },

  async getPlaylists(): Promise<{ playlists: Playlist[] }> {
    const response = await api.get('/users/playlists/me');
    return response.data;
  },

  async addVideoToPlaylist(
    playlistId: string, 
    videoId: string
  ): Promise<{ message: string; playlist: Playlist }> {
    const response = await api.post(`/users/playlists/${playlistId}/videos/${videoId}`);
    return response.data;
  },

  async getUserSettings(): Promise<{ settings: UserSettings }> {
    const response = await api.get('/users/settings/me');
    return response.data;
  },

  async updateUserSettings(
    settings: Partial<UserSettings>
  ): Promise<{ message: string; settings: UserSettings }> {
    const response = await api.put('/users/settings', settings);
    return response.data;
  }
};