import api from './api';
import { io, Socket } from 'socket.io-client';

export interface Stream {
  _id: string;
  streamer: {
    _id: string;
    username: string;
    channelName: string;
    avatar?: string;
    subscriberCount: number;
  };
  title: string;
  description?: string;
  thumbnail?: string;
  streamKey: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;
  duration: number;
  viewers: {
    current: number;
    peak: number;
    total: number;
  };
  likes: string[];
  dislikes: string[];
  chat: {
    enabled: boolean;
    subscribersOnly: boolean;
  };
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  stream: string;
  user: {
    _id: string;
    username: string;
    channelName: string;
    avatar?: string;
  };
  message: string;
  type: 'message' | 'donation' | 'subscription' | 'moderator' | 'system';
  donation?: {
    amount: number;
    currency: string;
  };
  isPinned: boolean;
  isHighlighted: boolean;
  createdAt: string;
  timeAgo: string;
}

export interface StreamAnalytics {
  viewers: {
    current: number;
    peak: number;
    total: number;
    unique: number;
    avgWatchTime: number;
  };
  engagement: {
    likes: number;
    dislikes: number;
    chatMessages: number;
    donations: number;
    totalDonations: number;
  };
  performance: {
    duration: number;
    status: string;
    startTime: Date;
    endTime: Date;
  };
}

class StreamService {
  private socket: Socket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();

  // Stream API methods
  async getLiveStreams(params?: { category?: string; sort?: string; page?: number; limit?: number }) {
    const response = await api.get('/streams/live', { params });
    return response.data;
  }

  async getScheduledStreams(params?: { page?: number; limit?: number }) {
    const response = await api.get('/streams/scheduled', { params });
    return response.data;
  }

  async getStreamById(id: string) {
    const response = await api.get(`/streams/${id}`);
    return response.data;
  }

  async createStream(data: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    scheduledStartTime?: Date;
    visibility?: string;
  }) {
    const response = await api.post('/streams/create', data);
    return response.data;
  }

  async updateStream(id: string, data: any) {
    const response = await api.put(`/streams/${id}`, data);
    return response.data;
  }

  async uploadThumbnail(id: string, file: File) {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const response = await api.post(`/streams/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async startStream(id: string) {
    const response = await api.post(`/streams/${id}/start`);
    return response.data;
  }

  async endStream(id: string) {
    const response = await api.post(`/streams/${id}/end`);
    return response.data;
  }

  async getUserStreams(userId: string, params?: { status?: string; page?: number; limit?: number }) {
    const response = await api.get(`/streams/user/${userId}`, { params });
    return response.data;
  }

  async getStreamAnalytics(id: string) {
    const response = await api.get(`/streams/${id}/analytics`);
    return response.data;
  }

  async deleteStream(id: string) {
    const response = await api.delete(`/streams/${id}`);
    return response.data;
  }

  async getChatMessages(streamId: string, params?: { limit?: number; before?: string }) {
    const response = await api.get(`/streams/${streamId}/chat`, { params });
    return response.data;
  }

  // WebRTC and Socket methods
  connectToStream(streamId: string, userId: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true
    });

    this.socket.emit('authenticate', userId);
    
    return this.socket;
  }

  async startBroadcast(streamId: string, userId: string) {
    if (!this.socket) {
      this.socket = this.connectToStream(streamId, userId);
    }

    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Emit start stream event
      this.socket.emit('start-stream', {
        userId,
        streamId
      });

      return this.localStream;
    } catch (error) {
      console.error('Error starting broadcast:', error);
      throw error;
    }
  }

  async joinStream(streamId: string, userId: string) {
    if (!this.socket) {
      this.socket = this.connectToStream(streamId, userId);
    }

    this.socket.emit('join-stream', {
      streamId,
      userId
    });

    // Set up WebRTC handlers
    this.setupWebRTCHandlers(streamId);
  }

  private setupWebRTCHandlers(streamId: string) {
    if (!this.socket) return;

    this.socket.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit }) => {
      const pc = this.createPeerConnection(streamId, 'viewer');
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.socket!.emit('webrtc-answer', {
        streamId,
        answer
      });
    });

    this.socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      const pc = this.peerConnections.get(data.from) || this.peerConnections.values().next().value;
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  }

  private createPeerConnection(streamId: string, role: 'streamer' | 'viewer'): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc-ice-candidate', {
          streamId,
          candidate: event.candidate
        });
      }
    };

    if (role === 'streamer' && this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(streamId, remoteStream);
      
      // Dispatch event for UI update
      window.dispatchEvent(new CustomEvent('stream-received', {
        detail: { streamId, stream: remoteStream }
      }));
    };

    this.peerConnections.set(streamId, pc);
    return pc;
  }

  sendChatMessage(streamId: string, userId: string, message: string) {
    if (!this.socket) return;

    this.socket.emit('stream-chat-message', {
      streamId,
      userId,
      message
    });
  }

  likeStream(streamId: string, userId: string, action: 'like' | 'dislike' | 'remove') {
    if (!this.socket) return;

    this.socket.emit('stream-like', {
      streamId,
      userId,
      action
    });
  }

  sendDonation(streamId: string, userId: string, amount: number, currency: string, message?: string) {
    if (!this.socket) return;

    this.socket.emit('stream-donation', {
      streamId,
      userId,
      amount,
      currency,
      message
    });
  }

  leaveStream(streamId: string, userId: string) {
    if (!this.socket) return;

    this.socket.emit('leave-stream', {
      streamId,
      userId
    });

    this.cleanup();
  }

  stopBroadcast(streamId: string, userId: string) {
    if (!this.socket) return;

    this.socket.emit('end-stream', {
      streamId,
      userId
    });

    this.cleanup();
  }

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Clear remote streams
    this.remoteStreams.clear();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream(streamId: string) {
    return this.remoteStreams.get(streamId);
  }
}

export default new StreamService();