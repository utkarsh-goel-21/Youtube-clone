const NodeCache = require('node-cache');
const crypto = require('crypto');

class CacheManager {
  constructor() {
    // In-memory cache with TTL (time to live)
    this.cache = new NodeCache({
      stdTTL: 600, // Default 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // For better performance
    });

    // Cache configuration for different data types
    this.ttlConfig = {
      videos: 300,        // 5 minutes for video lists
      video: 600,         // 10 minutes for single video
      user: 1800,         // 30 minutes for user data
      channel: 1800,      // 30 minutes for channel data
      comments: 180,      // 3 minutes for comments
      search: 300,        // 5 minutes for search results
      trending: 3600,     // 1 hour for trending content
      analytics: 60,      // 1 minute for analytics (more dynamic)
      subscriptions: 300, // 5 minutes for subscription feed
      playlists: 600,     // 10 minutes for playlists
      notifications: 30   // 30 seconds for notifications (real-time)
    };
  }

  // Generate cache key based on request parameters
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
    
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex')
      .substring(0, 8);
    
    return `${prefix}:${hash}`;
  }

  // Get data from cache
  get(key) {
    try {
      const data = this.cache.get(key);
      if (data) {
        console.log(`Cache hit: ${key}`);
        return data;
      }
      console.log(`Cache miss: ${key}`);
      return null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  }

  // Set data in cache with custom TTL
  set(key, data, ttl = null) {
    try {
      const success = this.cache.set(key, data, ttl);
      if (success) {
        console.log(`Cache set: ${key} (TTL: ${ttl || this.cache.options.stdTTL}s)`);
      }
      return success;
    } catch (err) {
      console.error('Cache set error:', err);
      return false;
    }
  }

  // Delete specific key from cache
  delete(key) {
    try {
      const deleted = this.cache.del(key);
      console.log(`Cache deleted: ${key} (${deleted} keys)`);
      return deleted;
    } catch (err) {
      console.error('Cache delete error:', err);
      return 0;
    }
  }

  // Delete keys by pattern
  deletePattern(pattern) {
    try {
      const keys = this.cache.keys();
      const keysToDelete = keys.filter(key => key.includes(pattern));
      const deleted = this.cache.del(keysToDelete);
      console.log(`Cache pattern deleted: ${pattern} (${deleted} keys)`);
      return deleted;
    } catch (err) {
      console.error('Cache pattern delete error:', err);
      return 0;
    }
  }

  // Alias for deletePattern for compatibility
  flushPattern(pattern) {
    return this.deletePattern(pattern);
  }

  // Clear specific cache types
  clearVideoCache(videoId = null) {
    if (videoId) {
      this.deletePattern(`video:${videoId}`);
      this.deletePattern(`comments:${videoId}`);
      this.deletePattern(`analytics:video:${videoId}`);
    } else {
      this.deletePattern('videos:');
      this.deletePattern('video:');
      this.deletePattern('trending:');
    }
  }

  // Clear user-related cache
  clearUserCache(userId) {
    this.deletePattern(`user:${userId}`);
    this.deletePattern(`channel:${userId}`);
    this.deletePattern(`subscriptions:${userId}`);
    this.deletePattern(`playlists:user:${userId}`);
    this.deletePattern(`notifications:${userId}`);
  }

  // Clear all cache
  flush() {
    try {
      this.cache.flushAll();
      console.log('Cache flushed');
      return true;
    } catch (err) {
      console.error('Cache flush error:', err);
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    return this.cache.getStats();
  }

  // Middleware for caching API responses
  middleware(type = 'default', customTTL = null) {
    return async (req, res, next) => {
      // Skip cache for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip cache if user wants fresh data
      if (req.headers['cache-control'] === 'no-cache' || req.query.fresh === 'true') {
        return next();
      }

      // Generate cache key
      const cacheKey = this.generateKey(
        `${type}:${req.path}`,
        { ...req.query, userId: req.user?.id }
      );

      // Try to get from cache
      const cachedData = this.get(cacheKey);
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache the response
      res.json = function(data) {
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Cache successful responses only
        if (res.statusCode === 200) {
          const ttl = customTTL || this.ttlConfig[type] || this.cache.options.stdTTL;
          this.set(cacheKey, data, ttl);
        }
        
        // Call original json method
        originalJson.call(res, data);
      }.bind(this);

      next();
    };
  }

  // Invalidation helper for related caches
  invalidateRelated(type, id) {
    switch (type) {
      case 'video':
        this.clearVideoCache(id);
        this.deletePattern('trending:');
        this.deletePattern('subscriptions:');
        break;
      case 'comment':
        this.deletePattern(`comments:${id}`);
        break;
      case 'user':
        this.clearUserCache(id);
        break;
      case 'playlist':
        this.deletePattern(`playlist:${id}`);
        this.deletePattern(`playlists:user:`);
        break;
      case 'notification':
        this.deletePattern(`notifications:${id}`);
        break;
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();