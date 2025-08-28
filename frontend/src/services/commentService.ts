import api from './api';
import type {
  Comment,
  CommentResponse,
  RepliesResponse,
  CreateCommentData,
  CreateCommentResponse,
  UpdateCommentResponse,
  CommentInteractionResponse
} from '../types/comment';

export const commentService = {
  async getComments(params: {
    videoId: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<CommentResponse> {
    const { videoId, ...queryParams } = params;
    const response = await api.get(`/comments/video/${videoId}`, {
      params: queryParams
    });
    return response.data;
  },

  async getReplies(params: {
    commentId: string;
    page?: number;
    limit?: number;
  }): Promise<RepliesResponse> {
    const { commentId, ...queryParams } = params;
    const response = await api.get(`/comments/${commentId}/replies`, {
      params: queryParams
    });
    return response.data;
  },

  async createComment(data: CreateCommentData): Promise<CreateCommentResponse> {
    // Ensure videoId is included in the request
    const requestData = {
      ...data,
      videoId: data.videoId
    };
    const response = await api.post('/comments', requestData);
    return response.data;
  },

  async updateComment(commentId: string, content: string): Promise<UpdateCommentResponse> {
    const response = await api.put(`/comments/${commentId}`, { content });
    return response.data;
  },

  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },

  async likeComment(commentId: string): Promise<CommentInteractionResponse> {
    const response = await api.post(`/comments/${commentId}/like`);
    return response.data;
  },

  async dislikeComment(commentId: string): Promise<CommentInteractionResponse> {
    const response = await api.post(`/comments/${commentId}/dislike`);
    return response.data;
  },

  async removeLike(commentId: string): Promise<CommentInteractionResponse> {
    const response = await api.delete(`/comments/${commentId}/like`);
    return response.data;
  },

  async removeDislike(commentId: string): Promise<CommentInteractionResponse> {
    const response = await api.delete(`/comments/${commentId}/dislike`);
    return response.data;
  },

  async pinComment(commentId: string): Promise<{ message: string }> {
    const response = await api.post(`/comments/${commentId}/pin`);
    return response.data;
  },

  async heartComment(commentId: string): Promise<{ message: string; isHearted: boolean }> {
    const response = await api.post(`/comments/${commentId}/heart`);
    return response.data;
  }
};