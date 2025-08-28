const Stream = require('../models/Stream');
const ChatMessage = require('../models/ChatMessage');
const NotificationHelper = require('./notificationHelper');

class StreamManager {
  constructor(io) {
    this.io = io;
    this.streams = new Map(); // streamId -> stream data
    this.streamers = new Map(); // userId -> streamId
    this.viewers = new Map(); // streamId -> Set of viewer socket ids
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      // Stream-specific events
      socket.on('start-stream', async (data) => {
        await this.handleStartStream(socket, data);
      });

      socket.on('end-stream', async (data) => {
        await this.handleEndStream(socket, data);
      });

      socket.on('join-stream', async (data) => {
        await this.handleJoinStream(socket, data);
      });

      socket.on('leave-stream', async (data) => {
        await this.handleLeaveStream(socket, data);
      });

      // WebRTC signaling
      socket.on('webrtc-offer', async (data) => {
        await this.handleWebRTCOffer(socket, data);
      });

      socket.on('webrtc-answer', async (data) => {
        await this.handleWebRTCAnswer(socket, data);
      });

      socket.on('webrtc-ice-candidate', async (data) => {
        await this.handleICECandidate(socket, data);
      });

      // Chat messages
      socket.on('stream-chat-message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      socket.on('delete-chat-message', async (data) => {
        await this.handleDeleteChatMessage(socket, data);
      });

      socket.on('pin-chat-message', async (data) => {
        await this.handlePinChatMessage(socket, data);
      });

      // Stream interactions
      socket.on('stream-like', async (data) => {
        await this.handleStreamLike(socket, data);
      });

      socket.on('stream-donation', async (data) => {
        await this.handleDonation(socket, data);
      });
    });
  }

  async handleStartStream(socket, data) {
    try {
      const { userId, title, description, category, thumbnail } = data;
      
      // Check if user is already streaming
      if (this.streamers.has(userId)) {
        socket.emit('stream-error', { message: 'You are already streaming' });
        return;
      }

      // Create new stream in database
      const stream = new Stream({
        streamer: userId,
        title,
        description,
        category,
        thumbnail,
        streamKey: Stream.generateStreamKey(),
        status: 'live',
        actualStartTime: new Date()
      });

      await stream.save();
      await stream.populate('streamer', 'username channelName avatar subscriberCount');

      // Store stream data
      this.streams.set(stream._id.toString(), {
        stream,
        streamerSocket: socket.id,
        viewers: new Set()
      });
      this.streamers.set(userId, stream._id.toString());

      // Join stream room
      socket.join(`stream-${stream._id}`);
      socket.join(`stream-${stream._id}-chat`);

      // Emit success response
      socket.emit('stream-started', {
        streamId: stream._id,
        streamKey: stream.streamKey,
        stream: stream
      });

      // Notify subscribers about live stream
      await this.notifySubscribersAboutLiveStream(stream);

      console.log(`Stream started: ${stream._id} by ${userId}`);
    } catch (error) {
      console.error('Error starting stream:', error);
      socket.emit('stream-error', { message: 'Failed to start stream' });
    }
  }

  async handleEndStream(socket, data) {
    try {
      const { userId, streamId } = data;
      
      const streamData = this.streams.get(streamId);
      if (!streamData) {
        socket.emit('stream-error', { message: 'Stream not found' });
        return;
      }

      // Update stream in database
      const stream = await Stream.findById(streamId);
      if (stream) {
        await stream.endStream();
      }

      // Notify all viewers
      this.io.to(`stream-${streamId}`).emit('stream-ended', { streamId });

      // Clean up
      this.streams.delete(streamId);
      this.streamers.delete(userId);
      
      // Clear viewer tracking
      if (this.viewers.has(streamId)) {
        this.viewers.delete(streamId);
      }

      console.log(`Stream ended: ${streamId}`);
    } catch (error) {
      console.error('Error ending stream:', error);
      socket.emit('stream-error', { message: 'Failed to end stream' });
    }
  }

  async handleJoinStream(socket, data) {
    try {
      const { streamId, userId } = data;
      
      const streamData = this.streams.get(streamId);
      if (!streamData) {
        socket.emit('stream-error', { message: 'Stream not found or ended' });
        return;
      }

      // Add viewer to stream
      streamData.viewers.add(socket.id);
      
      // Update viewer count in database
      const stream = await Stream.findById(streamId);
      if (stream) {
        await stream.updateViewerCount(userId, 'join');
      }

      // Join stream rooms
      socket.join(`stream-${streamId}`);
      socket.join(`stream-${streamId}-chat`);

      // Store viewer's stream for cleanup on disconnect
      socket.streamId = streamId;
      socket.isViewer = true;

      // Send stream info to viewer
      socket.emit('stream-joined', {
        stream: streamData.stream,
        viewerCount: stream.viewers.current
      });

      // Notify streamer about new viewer
      const streamerSocket = this.io.sockets.sockets.get(streamData.streamerSocket);
      if (streamerSocket) {
        streamerSocket.emit('viewer-joined', {
          viewerCount: stream.viewers.current,
          userId
        });
      }

      // Broadcast updated viewer count
      this.io.to(`stream-${streamId}`).emit('viewer-count-update', {
        viewerCount: stream.viewers.current
      });

      // Get recent chat messages
      const recentMessages = await ChatMessage.getRecentMessages(streamId, 50);
      socket.emit('chat-history', { messages: recentMessages.reverse() });

      console.log(`Viewer joined stream: ${streamId}`);
    } catch (error) {
      console.error('Error joining stream:', error);
      socket.emit('stream-error', { message: 'Failed to join stream' });
    }
  }

  async handleLeaveStream(socket, data) {
    try {
      const { streamId, userId } = data;
      
      const streamData = this.streams.get(streamId);
      if (streamData) {
        streamData.viewers.delete(socket.id);
        
        // Update viewer count in database
        const stream = await Stream.findById(streamId);
        if (stream) {
          await stream.updateViewerCount(userId, 'leave');
          
          // Broadcast updated viewer count
          this.io.to(`stream-${streamId}`).emit('viewer-count-update', {
            viewerCount: stream.viewers.current
          });
        }
      }

      // Leave stream rooms
      socket.leave(`stream-${streamId}`);
      socket.leave(`stream-${streamId}-chat`);
      
      delete socket.streamId;
      delete socket.isViewer;

      console.log(`Viewer left stream: ${streamId}`);
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  }

  async handleWebRTCOffer(socket, data) {
    try {
      const { streamId, offer, userId } = data;
      
      const streamData = this.streams.get(streamId);
      if (!streamData) {
        socket.emit('webrtc-error', { message: 'Stream not found' });
        return;
      }

      // Store offer in stream data
      streamData.offer = offer;

      // If this is from the streamer, broadcast to viewers
      if (socket.id === streamData.streamerSocket) {
        socket.to(`stream-${streamId}`).emit('webrtc-offer', { offer });
      }
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      socket.emit('webrtc-error', { message: 'Failed to process offer' });
    }
  }

  async handleWebRTCAnswer(socket, data) {
    try {
      const { streamId, answer } = data;
      
      const streamData = this.streams.get(streamId);
      if (!streamData) {
        socket.emit('webrtc-error', { message: 'Stream not found' });
        return;
      }

      // Send answer to the streamer
      const streamerSocket = this.io.sockets.sockets.get(streamData.streamerSocket);
      if (streamerSocket) {
        streamerSocket.emit('webrtc-answer', { answer, from: socket.id });
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      socket.emit('webrtc-error', { message: 'Failed to process answer' });
    }
  }

  async handleICECandidate(socket, data) {
    try {
      const { streamId, candidate, target } = data;
      
      const streamData = this.streams.get(streamId);
      if (!streamData) {
        return;
      }

      // Relay ICE candidate
      if (target) {
        // Send to specific peer
        const targetSocket = this.io.sockets.sockets.get(target);
        if (targetSocket) {
          targetSocket.emit('webrtc-ice-candidate', { candidate, from: socket.id });
        }
      } else {
        // Broadcast to all peers in stream
        socket.to(`stream-${streamId}`).emit('webrtc-ice-candidate', { 
          candidate, 
          from: socket.id 
        });
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async handleChatMessage(socket, data) {
    try {
      const { streamId, userId, message, replyTo } = data;
      
      // Validate stream exists
      const stream = await Stream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        socket.emit('chat-error', { message: 'Stream not available' });
        return;
      }

      // Check if chat is enabled
      if (!stream.chat.enabled) {
        socket.emit('chat-error', { message: 'Chat is disabled' });
        return;
      }

      // Create chat message
      const chatMessage = new ChatMessage({
        stream: streamId,
        user: userId,
        message,
        replyTo,
        type: 'message'
      });

      await chatMessage.save();
      await chatMessage.populate('user', 'username channelName avatar');
      
      if (replyTo) {
        await chatMessage.populate('replyTo', 'user message');
      }

      // Broadcast message to all users in stream
      this.io.to(`stream-${streamId}-chat`).emit('new-chat-message', {
        message: chatMessage
      });

      console.log(`Chat message in stream ${streamId}: ${message}`);
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('chat-error', { message: 'Failed to send message' });
    }
  }

  async handleDeleteChatMessage(socket, data) {
    try {
      const { messageId, userId } = data;
      
      const message = await ChatMessage.findById(messageId).populate('stream');
      if (!message) {
        socket.emit('chat-error', { message: 'Message not found' });
        return;
      }

      // Check permissions (message author, streamer, or moderator)
      const isAuthor = message.user.toString() === userId;
      const isStreamer = message.stream.streamer.toString() === userId;
      const isModerator = message.stream.chat.moderators.includes(userId);

      if (!isAuthor && !isStreamer && !isModerator) {
        socket.emit('chat-error', { message: 'No permission to delete message' });
        return;
      }

      // Soft delete the message
      await message.softDelete(userId);

      // Notify all users in stream
      this.io.to(`stream-${message.stream._id}-chat`).emit('chat-message-deleted', {
        messageId
      });
    } catch (error) {
      console.error('Error deleting chat message:', error);
      socket.emit('chat-error', { message: 'Failed to delete message' });
    }
  }

  async handlePinChatMessage(socket, data) {
    try {
      const { messageId, streamId, userId } = data;
      
      const stream = await Stream.findById(streamId);
      if (!stream) {
        socket.emit('chat-error', { message: 'Stream not found' });
        return;
      }

      // Only streamer can pin messages
      if (stream.streamer.toString() !== userId) {
        socket.emit('chat-error', { message: 'Only streamer can pin messages' });
        return;
      }

      // Unpin previous message if any
      await ChatMessage.updateMany(
        { stream: streamId, isPinned: true },
        { isPinned: false }
      );

      // Pin new message
      const message = await ChatMessage.findByIdAndUpdate(
        messageId,
        { isPinned: true },
        { new: true }
      ).populate('user', 'username channelName avatar');

      // Notify all users in stream
      this.io.to(`stream-${streamId}-chat`).emit('chat-message-pinned', {
        message
      });
    } catch (error) {
      console.error('Error pinning chat message:', error);
      socket.emit('chat-error', { message: 'Failed to pin message' });
    }
  }

  async handleStreamLike(socket, data) {
    try {
      const { streamId, userId, action } = data;
      
      const stream = await Stream.findById(streamId);
      if (!stream) {
        socket.emit('stream-error', { message: 'Stream not found' });
        return;
      }

      if (action === 'like') {
        if (!stream.likes.includes(userId)) {
          stream.likes.push(userId);
          stream.dislikes.pull(userId);
        }
      } else if (action === 'dislike') {
        if (!stream.dislikes.includes(userId)) {
          stream.dislikes.push(userId);
          stream.likes.pull(userId);
        }
      } else if (action === 'remove') {
        stream.likes.pull(userId);
        stream.dislikes.pull(userId);
      }

      await stream.save();

      // Broadcast updated like/dislike counts
      this.io.to(`stream-${streamId}`).emit('stream-likes-update', {
        likes: stream.likes.length,
        dislikes: stream.dislikes.length
      });
    } catch (error) {
      console.error('Error handling stream like:', error);
      socket.emit('stream-error', { message: 'Failed to update likes' });
    }
  }

  async handleDonation(socket, data) {
    try {
      const { streamId, userId, amount, currency, message } = data;
      
      const stream = await Stream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        socket.emit('donation-error', { message: 'Stream not available' });
        return;
      }

      // Add donation to stream
      stream.donations.push({
        user: userId,
        amount,
        currency,
        message,
        timestamp: new Date()
      });
      await stream.save();

      // Create special chat message for donation
      const chatMessage = new ChatMessage({
        stream: streamId,
        user: userId,
        message: message || `Donated ${amount} ${currency}`,
        type: 'donation',
        donation: { amount, currency },
        isHighlighted: true
      });

      await chatMessage.save();
      await chatMessage.populate('user', 'username channelName avatar');

      // Broadcast donation to all users in stream
      this.io.to(`stream-${streamId}`).emit('new-donation', {
        donation: chatMessage,
        totalDonations: stream.donations.reduce((sum, d) => sum + d.amount, 0)
      });

      console.log(`Donation received for stream ${streamId}: ${amount} ${currency}`);
    } catch (error) {
      console.error('Error handling donation:', error);
      socket.emit('donation-error', { message: 'Failed to process donation' });
    }
  }

  async notifySubscribersAboutLiveStream(stream) {
    try {
      // Implementation would use NotificationHelper
      // This is a placeholder for the notification logic
      console.log(`Notifying subscribers about live stream: ${stream.title}`);
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }

  // Clean up when socket disconnects
  handleDisconnect(socket) {
    // Handle viewer disconnect
    if (socket.streamId && socket.isViewer) {
      this.handleLeaveStream(socket, {
        streamId: socket.streamId,
        userId: socket.userId
      });
    }

    // Handle streamer disconnect (end stream)
    const streamId = Array.from(this.streamers.values()).find(
      id => this.streams.get(id)?.streamerSocket === socket.id
    );
    
    if (streamId) {
      const userId = Array.from(this.streamers.entries()).find(
        ([_, id]) => id === streamId
      )?.[0];
      
      if (userId) {
        this.handleEndStream(socket, { userId, streamId });
      }
    }
  }
}

module.exports = StreamManager;