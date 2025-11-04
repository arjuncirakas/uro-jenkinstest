import rateLimit from 'express-rate-limit';

// Check if rate limiting is enabled
const isRateLimitingEnabled = process.env.ENABLE_RATE_LIMITING === 'true';

// Log rate limiting status
console.log(`🛡️  Rate Limiting: ${isRateLimitingEnabled ? 'ENABLED' : 'DISABLED'}`);

// No-op middleware when rate limiting is disabled
const noOpMiddleware = (req, res, next) => {
  next();
};

// General rate limiter
export const generalLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
}) : noOpMiddleware;

// Strict rate limiter for auth endpoints
export const authLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 900
    });
  }
}) : noOpMiddleware;

// OTP rate limiter
export const otpLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3, // limit each IP to 3 OTP requests per 5 minutes
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
    retryAfter: 300 // 5 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests, please try again later.',
      retryAfter: 300
    });
  }
}) : noOpMiddleware;

// Registration rate limiter
export const registrationLimiter = isRateLimitingEnabled ? rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.REGISTRATION_RATE_LIMIT_MAX) || 3, // limit each IP to 3 registration attempts per hour
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.',
    retryAfter: 3600 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts, please try again later.',
      retryAfter: 3600
    });
  }
}) : noOpMiddleware;
