export interface User {
  _id: string;
  id: string;
  username: string;
  email: string;
  channelName: string;
  channelDescription?: string;
  avatar?: string;
  banner?: string;
  isVerified: boolean;
  subscriberCount: number;
  subscribers?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  subscribersCount: number;
  subscriptionsCount: number;
  videosCount: number;
  totalViews: number;
  isSubscribed: boolean;
  isOwner: boolean;
  playlists?: Playlist[];
}

export interface UserSettings {
  emailNotifications: boolean;
  privateAccount: boolean;
  showSubscriptions: boolean;
}

export interface Playlist {
  _id: string;
  name: string;
  description: string;
  videos: string[];
  videosCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  channelName: string;
  avatar?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}