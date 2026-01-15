import rateLimit from 'express-rate-limit';

// Check if rate limiting is enabled
// SECURITY FIX: Enable by default in production to prevent the 503 infrastructure response
// The application should handle rate limiting at layer 7 with proper 429 responses
// TEMPORARILY DISABLED - Rate limiting turned off for now
const isProduction = process.env.NODE_ENV === 'production';
const rateLimitSetting = process.env.ENABLE_RATE_LIMITING;
const isRateLimitingEnabled = false; // TEMPORARILY DISABLED - Set to false to turn off rate limiting
// Original logic (commented out for now):
// const isRateLimitingEnabled = rateLimitSetting !== undefined
//   ? rateLimitSetting === 'true'
//   : isProduction; // Default: enabled in production

// Log rate limiting status
console.log(`🛡️  Rate Limiting: ${isRateLimitingEnabled ? 'ENABLED' : 'DISABLED'}`);

// No-op middleware when rate limiting is disabled
const noOpMiddleware = (req, res, next) => {
  next();
};

// Standard 429 response handler - consistent JSON format
const createRateLimitHandler = (message, retryAfterSeconds) => {
  return (req, res) => {
    // Set Retry-After header (required for 429 responses per RFC 6585)
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      success: false,
      message: message,
      error: 'TOO_MANY_REQUESTS',
      retryAfter: retryAfterSeconds
    });
  };
};

// General rate limiter
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

export const generalLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: windowMs,
  max: maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many requests from this IP, please try again later.',
    Math.ceil(windowMs / 1000)
  )
}) : noOpMiddleware;

// Strict rate limiter for auth endpoints
export const authLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many authentication attempts, please try again later.',
    900
  )
}) : noOpMiddleware;

// OTP rate limiter
export const otpLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many OTP requests, please try again later.',
    300
  )
}) : noOpMiddleware;

// Registration rate limiter
export const registrationLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.REGISTRATION_RATE_LIMIT_MAX) || 3,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many registration attempts, please try again later.',
    3600
  )
}) : noOpMiddleware;

