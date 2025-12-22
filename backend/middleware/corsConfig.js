/**
 * Enhanced CORS Configuration with Better Error Handling
 * Fixes token refresh issues in production
 */

/**
 * Get allowed origins based on environment
 * @returns {string|string[]|function} Allowed origins
 */
export const getAllowedOrigins = () => {
  const environment = process.env.NODE_ENV || 'development';
  
  // In development, allow localhost
  if (environment === 'development') {
    return [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
  }
  
  // In production, use FRONTEND_URL from environment
  if (process.env.FRONTEND_URL) {
    // Support multiple origins separated by comma
    const origins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
    
    console.log('✅ CORS: Allowed origins:', origins);
    return origins;
  }
  
  console.warn('⚠️  CORS: FRONTEND_URL not set, defaulting to same-origin only');
  return false; // Same-origin only
};

/**
 * Enhanced CORS options with proper origin validation
 * Restricts access to only allowed origins for security
 */
export const corsOptions = {
  // Validate origin against allowed list
  origin: function (origin, callback) {
    // Get allowed origins based on environment
    const allowedOrigins = getAllowedOrigins();
    
    // Handle requests with no origin (same-origin requests, mobile apps, Postman, server-to-server)
    if (!origin) {
      // Allow requests with no origin because:
      // 1. Same-origin requests don't send Origin header (normal browser behavior)
      // 2. CORS only applies to cross-origin requests
      // 3. Server-to-server requests may not have Origin header
      // Security: We still validate all requests that DO have an origin header
      console.log('✅ CORS: Allowing request with no origin (same-origin or server-to-server)');
      return callback(null, true);
    }
    
    // If allowedOrigins is false, only allow same-origin requests
    if (!allowedOrigins) {
      console.warn(`⚠️  CORS: Rejecting origin ${origin} - no allowed origins configured`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins)) {
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ CORS: Allowing origin: ${origin}`);
        return callback(null, origin);
      } else {
        console.warn(`⚠️  CORS: Rejecting unauthorized origin: ${origin}`);
        console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    // If allowedOrigins is a string (single origin)
    if (typeof allowedOrigins === 'string') {
      if (allowedOrigins === origin) {
        console.log(`✅ CORS: Allowing origin: ${origin}`);
        return callback(null, origin);
      } else {
        console.warn(`⚠️  CORS: Rejecting unauthorized origin: ${origin}`);
        console.warn(`   Allowed origin: ${allowedOrigins}`);
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    // Fallback: reject if we can't determine allowed origins
    console.error('❌ CORS: Unable to determine allowed origins');
    return callback(new Error('Not allowed by CORS'));
  },
  
  // Enable credentials to work with withCredentials: true from frontend
  credentials: true,
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  
  // Exposed headers (so frontend can read them)
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization'
  ],
  
  // Preflight cache time (in seconds) - 24 hours
  maxAge: 86400,
  
  // Success status for OPTIONS requests
  optionsSuccessStatus: 200,
  
  // Continue to next handler
  preflightContinue: false
};

/**
 * Middleware to log CORS-related information
 */
export const corsLoggingMiddleware = (req, res, next) => {
  // Only log in development or when debugging
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_CORS === 'true') {
    const origin = req.headers.origin || 'no-origin';
    const method = req.method;
    const path = req.path;
    
    if (method === 'OPTIONS') {
      console.log(`🔍 CORS Preflight: ${method} ${path} from ${origin}`);
    } else if (origin !== 'no-origin') {
      console.log(`🌐 CORS Request: ${method} ${path} from ${origin}`);
    }
  }
  
  next();
};

/**
 * Validate CORS configuration on startup
 */
export const validateCorsConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const frontendUrl = process.env.FRONTEND_URL;
  
  console.log('\n🔐 CORS Configuration Check:');
  console.log(`   Environment: ${env}`);
  console.log(`   Frontend URL: ${frontendUrl || 'NOT SET'}`);
  
  if (env === 'production' && !frontendUrl) {
    console.error('❌ ERROR: FRONTEND_URL must be set in production!');
    console.error('   Token refresh will NOT work without proper CORS configuration.');
    console.error('   Set FRONTEND_URL in your .env file to your production frontend URL.');
    console.error('   Example: FRONTEND_URL=https://uroprep.ahimsa.global');
    return false;
  }
  
  if (frontendUrl) {
    // Check for common mistakes
    if (frontendUrl.endsWith('/')) {
      console.warn('⚠️  WARNING: FRONTEND_URL should not end with a slash (/)');
      console.warn(`   Current: ${frontendUrl}`);
      console.warn(`   Should be: ${frontendUrl.slice(0, -1)}`);
    }
    
    if (env === 'production' && frontendUrl.startsWith('http://')) {
      console.warn('⚠️  WARNING: Using HTTP in production. Should use HTTPS.');
      console.warn(`   Current: ${frontendUrl}`);
      console.warn(`   Should be: ${frontendUrl.replace('http://', 'https://')}`);
    }
    
    if (env === 'production' && frontendUrl.includes('localhost')) {
      console.warn('⚠️  WARNING: FRONTEND_URL includes localhost in production!');
      console.warn(`   Current: ${frontendUrl}`);
      console.warn('   This should only be used for local development testing.');
      console.warn('   Remove localhost from FRONTEND_URL before final production deployment.');
      // Don't block - allow for local testing but warn
    }
  }
  
  const allowedOrigins = getAllowedOrigins();
  console.log(`   Allowed Origins: ${JSON.stringify(allowedOrigins)}\n`);
  
  return true;
};

export default {
  corsOptions,
  getAllowedOrigins,
  validateCorsConfig,
  corsLoggingMiddleware
};






