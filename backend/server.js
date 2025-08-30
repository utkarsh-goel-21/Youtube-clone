const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const channelRoutes = require('./routes/channels');
const searchRoutes = require('./routes/search');
const playlistRoutes = require('./routes/playlists');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const streamRoutes = require('./routes/streams');
const moderationRoutes = require('./routes/moderation');
const StreamManager = require('./utils/streamManager');
const cacheManager = require('./utils/cacheManager');
const { 
  compressionMiddleware, 
  responseTimeMiddleware, 
  etagMiddleware, 
  optimizeJsonMiddleware 
} = require('./middleware/performance');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? 
      [process.env.FRONTEND_URL] : 
      ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
  }
});

// Performance middleware
app.use(compressionMiddleware);
app.use(responseTimeMiddleware);
app.use(etagMiddleware);
app.use(optimizeJsonMiddleware);

// CORS configuration - Allow all origins in production for now
app.use(cors({
  origin: function(origin, callback) {
    // In production, allow ALL origins (we can restrict later)
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    // In development, allow localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002'
    ];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files with cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4') || path.endsWith('.webm')) {
      res.set('Cache-Control', 'public, max-age=604800'); // 7 days for videos
    } else {
      res.set('Cache-Control', 'public, max-age=86400'); // 1 day for images
    }
  }
}));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails'), {
  maxAge: '30d',
  etag: true,
  lastModified: true
}));

// Make cache manager available globally
app.set('cache', cacheManager);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/moderation', moderationRoutes);

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    status: 'OK',
    timestamp: Date.now(),
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  };
  res.status(200).json(healthcheck);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'YouTube Clone API Server',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      videos: '/api/videos',
      users: '/api/users'
    }
  });
});

// Store socket connections by user ID
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle user authentication for socket
  socket.on('authenticate', (userId) => {
    if (userId) {
      socket.userId = userId;
      userSockets.set(userId, socket.id);
      socket.join(`user-${userId}`);
      console.log(`User ${userId} connected with socket ${socket.id}`);
    }
  });
  
  socket.on('join-video', (videoId) => {
    socket.join(`video-${videoId}`);
  });
  
  socket.on('leave-video', (videoId) => {
    socket.leave(`video-${videoId}`);
  });
  
  socket.on('new-comment', (data) => {
    io.to(`video-${data.videoId}`).emit('comment-added', data);
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('Client disconnected');
  });
});

// Export io for use in other modules
app.set('io', io);
app.set('userSockets', userSockets);

// Initialize StreamManager
const streamManager = new StreamManager(io);
app.set('streamManager', streamManager);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Auto-ping to keep server warm on Render free tier
  // Run on Render or in production
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    console.log('Server is ready to accept connections');
    console.log('Health check available at: /api/health');
    
    const serverUrl = process.env.RENDER_EXTERNAL_URL || 'https://youtube-clone-backend-utkarsh.onrender.com';
    const https = require('https');
    
    console.log('Starting auto-ping to keep server warm...');
    console.log('Ping URL:', `${serverUrl}/api/health`);
    
    setInterval(() => {
      https.get(`${serverUrl}/api/health`, (res) => {
        console.log(`Auto-ping successful: ${res.statusCode} at ${new Date().toISOString()}`);
      }).on('error', (err) => {
        console.error('Auto-ping error:', err.message);
      });
    }, 4 * 60 * 1000); // Ping every 4 minutes
    
    // Initial ping after 30 seconds
    setTimeout(() => {
      https.get(`${serverUrl}/api/health`, (res) => {
        console.log(`Initial ping: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('Initial ping error:', err.message);
      });
    }, 30000);
  }
});