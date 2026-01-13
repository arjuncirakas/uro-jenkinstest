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
  checkSession,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword
} from '../controllers/authController.js';
import { getDPOContactInfo } from '../controllers/securityDashboardController.js';
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
router.get('/check-session', 
  generalLimiter, 
  authenticateToken, 
  checkSession
);

router.get('/profile', 
  generalLimiter, 
  authenticateToken, 
  getProfile
);

// DPO contact information (accessible to all authenticated users)
router.get('/dpo-contact', 
  generalLimiter, 
  authenticateToken, 
  getDPOContactInfo
);

// Test endpoint to get OTP (only for testing)
// This should be disabled in production or protected with a secret
router.get('/test/get-otp/:email', generalLimiter, async (req, res) => {
  // Allow in all environments for testing (can be restricted later with proper auth)
  // For now, allow it since we need it for E2E tests
  // TODO: Add proper authentication/authorization for this endpoint
  
  const { email } = req.params;
  const { type = 'login_verification' } = req.query;
  
  // Import pool here to avoid circular dependencies
  const pool = (await import('../config/database.js')).default;
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT otp_code, expires_at, is_used, created_at 
       FROM otp_verifications 
       WHERE email = $1 AND type = $2 
       AND expires_at > NOW() AND is_used = false
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, type]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No valid OTP found for this email' 
      });
    }
    
    res.json({ 
      success: true, 
      otp: result.rows[0].otp_code,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error getting test OTP:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;
