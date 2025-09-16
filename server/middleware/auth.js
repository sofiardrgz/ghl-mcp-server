// middleware/auth.js
// Optional authentication middleware for future use

// Basic API key validation (if you want to add API keys later)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // If no API key is set in environment, skip validation
  if (!process.env.API_KEY) {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid API key' 
    });
  }
  
  next();
};

// Rate limiting middleware (simple in-memory implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    // Fix: Use req.ip with fallback, avoid deprecated req.connection
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const limit = rateLimitMap.get(key);
    
    if (now > limit.resetTime) {
      // Reset the limit
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (limit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((limit.resetTime - now) / 1000)
      });
    }
    
    limit.count++;
    next();
  };
};

// Validate GHL credentials format
const validateGHLCredentials = (req, res, next) => {
  const { ghlToken, locationId } = req.body;
  
  if (!ghlToken || !locationId) {
    return res.status(400).json({
      error: 'Missing required GHL credentials: token and locationId are required'
    });
  }
  
  // Basic format validation
  if (typeof ghlToken !== 'string' || ghlToken.length < 10) {
    return res.status(400).json({
      error: 'Invalid GHL token format'
    });
  }
  
  if (typeof locationId !== 'string' || locationId.length < 10) {
    return res.status(400).json({
      error: 'Invalid location ID format'
    });
  }
  
  next();
};

// CORS configuration for specific domains (if needed)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // If you want to restrict to specific domains, add them here
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-client-domain.com',
      'https://smartsquatch-ai.onrender.com'  // Add your actual Render URL
    ];
    
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

module.exports = {
  validateApiKey,
  rateLimit,
  validateGHLCredentials,
  corsOptions
};
