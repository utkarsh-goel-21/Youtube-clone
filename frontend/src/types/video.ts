import type { User } from './user';

export interface Video {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likesCount: number;
  dislikesCount: number;
  author: User;
  category: VideoCategory;
  tags: string[];
  isPublic: boolean;
  status: VideoStatus;
  uploadedAt: string;
  updatedAt: string;
}

export interface VideoWithInteraction extends Video {
  userInteraction?: {
    liked?: boolean;
    disliked?: boolean;
    isSubscribed?: boolean;
  };
  stats?: {
    likesCount: number;
    dislikesCount: number;
  };
}

export type VideoCategory = 
  | 'Music' 
  | 'Gaming' 
  | 'Education' 
  | 'Entertainment' 
  | 'Sports' 
  | 'News' 
  | 'Technology' 
  | 'Comedy' 
  | 'Film' 
  | 'Howto' 
  | 'Other';

export type VideoStatus = 'processing' | 'active' | 'deleted' | 'flagged' | 'private';

export interface VideoUploadData {
  title: string;
  description?: string;
  category: VideoCategory;
  tags?: string[];
  isPublic: boolean;
}

export interface VideoSearchParams {
  q: string;
  type?: 'all' | 'videos' | 'channels';
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'upload_date' | 'view_count' | 'rating';
  category?: VideoCategory | 'all';
  duration?: 'short' | 'medium' | 'long';
  uploadDate?: 'hour' | 'today' | 'week' | 'month' | 'year';
}

export interface VideoResponse {
  videos: Video[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

export interface SingleVideoResponse {
  video: VideoWithInteraction;
  userInteraction?: {
    isLiked: boolean;
    isDisliked: boolean;
    isSubscribed: boolean;
  };
}

export interface VideoUploadResponse {
  message: string;
  video: Video;
}

export interface VideoUpdateResponse {
  message: string;
  video: Video;
}

export interface VideoInteractionResponse {
  message: string;
  likesCount: number;
  dislikesCount: number;
}