import api from './api';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  thumbnail?: string;
  actionUrl?: string;
  read: boolean;
  timeAgo: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
    channelName: string;
  };
  metadata?: {
    videoTitle?: string;
    channelName?: string;
    commentText?: string;
    subscriberCount?: number;
    viewCount?: number;
    likeCount?: number;
  };
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface NotificationPreferences {
  email: {
    newVideo: boolean;
    commentReply: boolean;
    videoComment: boolean;
    newSubscriber: boolean;
    milestone: boolean;
  };
  push: {
    newVideo: boolean;
    commentReply: boolean;
    videoComment: boolean;
    newSubscriber: boolean;
    milestone: boolean;
    liveStream: boolean;
  };
  inApp: {
    newVideo: boolean;
    commentReply: boolean;
    videoComment: boolean;
    videoLike: boolean;
    commentLike: boolean;
    newSubscriber: boolean;
    playlistAdd: boolean;
    mention: boolean;
    milestone: boolean;
    liveStream: boolean;
  };
}

class NotificationService {
  async getNotifications(page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<NotificationResponse> {
    const response = await api.get('/notifications', {
      params: { page, limit, unreadOnly }
    });
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.unreadCount;
  }

  async markAsRead(notificationIds: string[]): Promise<{ unreadCount: number }> {
    const response = await api.put('/notifications/mark-read', {
      notificationIds
    });
    return response.data;
  }

  async markAllAsRead(): Promise<{ unreadCount: number }> {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  }

  async markAsClicked(notificationId: string): Promise<{ unreadCount: number }> {
    const response = await api.put(`/notifications/${notificationId}/click`);
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<{ unreadCount: number }> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async clearAllNotifications(): Promise<{ unreadCount: number }> {
    const response = await api.delete('/notifications/clear/all');
    return response.data;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const response = await api.put('/notifications/preferences', {
      preferences
    });
    return response.data.preferences;
  }
}

export default new NotificationService();