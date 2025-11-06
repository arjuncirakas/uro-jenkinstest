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
 * Enhanced CORS options with better logging
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (e.g., mobile apps, Postman, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    
    // If allowedOrigins is false, only allow same-origin
    if (allowedOrigins === false) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️  CORS: Allowing origin in dev mode: ${origin}`);
        return callback(null, true);
      }
      
      console.warn(`❌ CORS: Blocked request from ${origin} - FRONTEND_URL not configured`);
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    // Check if origin is in allowed list
    const isAllowed = Array.isArray(allowedOrigins) 
      ? allowedOrigins.includes(origin)
      : allowedOrigins === origin;
    
    if (isAllowed) {
      console.log(`✅ CORS: Allowed request from ${origin}`);
      return callback(null, true);
    } else {
      console.warn(`❌ CORS: Blocked request from ${origin}`);
      console.warn(`   Allowed origins: ${JSON.stringify(allowedOrigins)}`);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  
  // Allow credentials (cookies, authorization headers)
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
      console.error('❌ ERROR: FRONTEND_URL is set to localhost in production!');
      console.error(`   Current: ${frontendUrl}`);
      console.error('   This will cause CORS errors and token refresh will fail.');
      return false;
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






