const compression = require('compression');

// Compression middleware configuration
const compressionMiddleware = compression({
  level: 6, // Compression level (0-9, 6 is default balance)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression for text-based responses
    return compression.filter(req, res);
  }
});

// Response time tracking middleware
const responseTimeMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Set header before response is sent
    if (!res.headersSent) {
      res.set('X-Response-Time', `${duration}ms`);
    }
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
    
    // Call the original end function
    originalEnd.apply(res, args);
  };
  
  next();
};

// Rate limiting per endpoint (to prevent cache stampede)
const rateLimitMap = new Map();

const endpointRateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const limit = rateLimitMap.get(key);
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }
    
    if (limit.count >= maxRequests) {
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.resetTime - now) / 1000)
      });
    }
    
    limit.count++;
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - limit.count);
    next();
  };
};

// ETags for static content caching
const etagMiddleware = (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour browser cache
  }
  next();
};

// Optimize JSON responses by removing null values
const optimizeJsonMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Remove null and undefined values for smaller payloads
    const optimized = JSON.parse(JSON.stringify(data, (key, value) => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      return value;
    }));
    
    originalJson.call(res, optimized);
  };
  
  next();
};

module.exports = {
  compressionMiddleware,
  responseTimeMiddleware,
  endpointRateLimit,
  etagMiddleware,
  optimizeJsonMiddleware
};