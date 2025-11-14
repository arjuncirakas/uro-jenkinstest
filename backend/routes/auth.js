import express from 'express';
import { 
  register, 
  verifyRegistrationOTP, 
  resendRegistrationOTP, 
  login, 
  verifyLoginOTP,
  resendLoginOTP,
  refreshToken, 
  logout, 
  getProfile,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword
} from '../controllers/authController.js';
// import { loginSimple } from '../controllers/authControllerSimple.js'; // Not used - using login with OTP instead
import { validateRequest } from '../utils/validation.js';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  otpVerificationSchema 
} from '../utils/validation.js';
import { authenticateToken, verifyRefreshToken } from '../middleware/auth.js';
import { 
  generalLimiter, 
  authLimiter, 
  otpLimiter, 
  registrationLimiter 
} from '../middleware/rateLimiter.js';
import { 
  validateRegistrationInput, 
  validateLoginInput, 
  validateOTPInput,
  xssProtection 
} from '../middleware/sanitizer.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Auth API info
router.get('/', generalLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication API',
    endpoints: {
      register: 'POST /api/auth/register',
      verifyRegistrationOTP: 'POST /api/auth/verify-registration-otp',
      resendRegistrationOTP: 'POST /api/auth/resend-registration-otp',
      login: 'POST /api/auth/login',
      verifyLoginOTP: 'POST /api/auth/verify-login-otp',
      resendLoginOTP: 'POST /api/auth/resend-login-otp',
      refreshToken: 'POST /api/auth/refresh-token',
      logout: 'POST /api/auth/logout',
      profile: 'GET /api/auth/profile (requires authentication)'
    }
  });
});

// Public routes with rate limiting and validation
router.post('/register', 
  registrationLimiter, 
  validateRegistrationInput, 
  register
);

router.post('/verify-registration-otp', 
  otpLimiter, 
  validateOTPInput, 
  verifyRegistrationOTP
);

router.post('/resend-registration-otp', 
  otpLimiter, 
  validateOTPInput, 
  resendRegistrationOTP
);

router.post('/login', 
  authLimiter, 
  validateLoginInput, 
  login
);

router.post('/verify-login-otp', 
  otpLimiter, 
  validateOTPInput, 
  verifyLoginOTP
);

router.post('/resend-login-otp', 
  otpLimiter, 
  validateOTPInput, 
  resendLoginOTP
);

router.post('/refresh-token', 
  generalLimiter, 
  validateRequest(refreshTokenSchema), 
  verifyRefreshToken, 
  refreshToken
);

router.post('/logout', 
  generalLimiter, 
  logout
);

// Forgot password routes
router.post('/forgot-password', 
  authLimiter, 
  requestPasswordReset
);

router.post('/verify-reset-otp', 
  otpLimiter, 
  validateOTPInput, 
  verifyPasswordResetOTP
);

router.post('/reset-password', 
  authLimiter, 
  resetPassword
);

// Protected routes
router.get('/profile', 
  generalLimiter, 
  authenticateToken, 
  getProfile
);

export default router;
