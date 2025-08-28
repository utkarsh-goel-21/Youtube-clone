import type { User } from './user';

export interface Comment {
  _id: string;
  content: string;
  author: User;
  video: string;
  parentComment?: string;
  replies: Comment[];
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  isHearted: boolean;
  createdAt: string;
  updatedAt: string;
  userInteraction?: {
    isLiked: boolean;
    isDisliked: boolean;
  };
}

export interface CreateCommentData {
  content: string;
  videoId: string;
  parentCommentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface CommentResponse {
  comments: Comment[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

export interface RepliesResponse {
  replies: Comment[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

export interface CreateCommentResponse {
  message: string;
  comment: Comment;
}

export interface UpdateCommentResponse {
  message: string;
  comment: Comment;
}

export interface CommentInteractionResponse {
  message: string;
  likesCount: number;
  dislikesCount: number;
}