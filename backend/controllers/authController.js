import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateTokens, verifyRefreshToken, getCookieOptions } from '../utils/jwt.js';
import { storeOTP, verifyOTP, incrementOTPAttempts } from '../services/otpService.js';
import { logFailedAccess, logAuthEvent } from '../services/auditLogger.js';
import { checkAccountLockout, incrementFailedAttempts, resetFailedAttempts } from '../middleware/accountLockout.js';

// Register a new user (Step 1: Send OTP)
export const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password, firstName, lastName, phone, organization, role } = req.body;

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      if (existingUser.rows[0].is_verified) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      } else {
        // User exists but not verified, delete and allow re-registration
        await client.query('DELETE FROM users WHERE id = $1', [existingUser.rows[0].id]);
      }
    }

    // Check if phone number is already in use (if provided)
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );

      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Phone number is already in use'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user (not verified yet)
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, firstName, lastName, phone, organization, role]
    );

    const newUser = result.rows[0];

    // Generate and store OTP (email is sent automatically)
    const otpResult = await storeOTP(newUser.id, email, 'registration');

    res.status(201).json({
      success: true,
      message: otpResult.emailSent
        ? 'Registration initiated. Please check your email for OTP verification.'
        : 'Registration initiated. OTP stored but email sending failed. Please contact support.',
      data: {
        userId: newUser.id,
        email: newUser.email,
        requiresVerification: true,
        emailSent: otpResult.emailSent
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Verify OTP and complete registration
export const verifyRegistrationOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, otp } = req.body;

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, 'registration');

    if (!otpResult.success) {
      // Increment attempt count
      await incrementOTPAttempts(email, otp, 'registration');

      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Activate user account
    await client.query(
      'UPDATE users SET is_active = true, is_verified = true, email_verified_at = NOW() WHERE id = $1',
      [otpResult.data.userId]
    );

    // Get updated user data
    const userResult = await client.query(
      'SELECT id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at FROM users WHERE id = $1',
      [otpResult.data.userId]
    );

    const user = userResult.rows[0];

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token in database
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          organization: user.organization,
          role: user.role,
          isActive: user.is_active,
          isVerified: user.is_verified,
          createdAt: user.created_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Resend OTP for registration
export const resendRegistrationOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    // Check if user exists and is not verified
    const userResult = await client.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userResult.rows[0].is_verified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Generate and store new OTP (email is sent automatically)
    const otpResult = await storeOTP(userResult.rows[0].id, email, 'registration');

    res.json({
      success: true,
      message: otpResult.emailSent
        ? 'OTP resent successfully. Please check your email.'
        : 'OTP resent but email sending failed. Please contact support.',
      emailSent: otpResult.emailSent
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Login user (Step 1: Send OTP)
export const login = async (req, res) => {
  // Check account lockout first
  let lockoutBlocked = false;
  await new Promise((resolve) => {
    const mockNext = () => {
      resolve();
    };
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      lockoutBlocked = true;
      return originalJson(data);
    };
    checkAccountLockout(req, res, mockNext);
  });

  // If lockout check blocked the request, it already sent a response
  if (lockoutBlocked || res.headersSent) {
    return;
  }

  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    // Find user by email
    const result = await client.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Login failed: User not found - ${email}`);
      await logFailedAccess(req, 'User not found');
      await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      console.log(`❌ Login failed: Account deactivated - ${email}`);
      await logFailedAccess(req, 'Account deactivated');
      await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is verified
    if (!user.is_verified) {
      console.log(`❌ Login failed: Account not verified - ${email}`);
      await logFailedAccess(req, 'Account not verified');
      await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your email first.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${email}`);
      await logFailedAccess(req, 'Invalid password');
      await incrementFailedAttempts(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Password is valid - reset failed attempts and log success
    await resetFailedAttempts(user.id);
    await logAuthEvent(req, 'login.password_verified', 'success');

    console.log(`✅ Password verified for: ${email}, role: ${user.role}`);

    // All roles now require OTP verification (including superadmin and department_admin)
    console.log(`📧 OTP required for role: ${user.role} - ${email}`);

    try {
      // Generate and store OTP for login verification
      const otpResult = await storeOTP(user.id, email, 'login_verification');

      console.log(`✅ OTP stored for ${email}, email sent: ${otpResult.emailSent}`);

      res.json({
        success: true,
        message: otpResult.emailSent
          ? 'Login initiated. Please check your email for OTP verification.'
          : 'Login initiated. OTP stored but email sending failed. Please contact support.',
        data: {
          userId: user.id,
          email: user.email,
          requiresOTPVerification: true,
          emailSent: otpResult.emailSent
        }
      });
    } catch (otpError) {
      console.error('❌ Error storing OTP:', otpError);
      console.error('❌ OTP Error stack:', otpError.stack);
      throw otpError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Login error message:', error.message);
    console.error('❌ Login error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Verify login OTP and complete login
export const verifyLoginOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, otp } = req.body;

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, 'login_verification');

    if (!otpResult.success) {
      // Increment attempt count
      await incrementOTPAttempts(email, otp, 'login_verification');

      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Get user data
    const userResult = await client.query(
      'SELECT id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at FROM users WHERE id = $1',
      [otpResult.data.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Check if account is still active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token in database
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

    res.json({
      success: true,
      message: 'Login completed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          organization: user.organization,
          role: user.role,
          isActive: user.is_active,
          isVerified: user.is_verified,
          createdAt: user.created_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Resend login OTP
export const resendLoginOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    // Check if user exists and is verified
    const userResult = await client.query(
      'SELECT id, is_verified, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'User is not verified. Please verify your email first.'
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate and store new OTP (email is sent automatically)
    const otpResult = await storeOTP(user.id, email, 'login_verification');

    res.json({
      success: true,
      message: otpResult.emailSent
        ? 'Login OTP resent successfully. Please check your email.'
        : 'Login OTP resent but email sending failed. Please contact support.',
      emailSent: otpResult.emailSent
    });

  } catch (error) {
    console.error('Resend login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  const client = await pool.connect();

  try {
    const { refreshToken } = req.body;

    console.log('🔄 Token refresh attempt received');

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    console.log(`🔄 Token decoded for user ID: ${decoded.id}`);

    // Check if refresh token exists in database and is not revoked
    const result = await client.query(
      `SELECT rt.*, u.id, u.email, u.first_name, u.last_name, u.role, u.is_active 
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const tokenData = result.rows[0];

    if (!tokenData.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate new tokens
    const user = {
      id: tokenData.id,
      email: tokenData.email,
      role: tokenData.role
    };

    const tokens = generateTokens(user);

    // Revoke old refresh token
    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE id = $1',
      [tokenData.id]
    );

    // Store new refresh token
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    console.log(`✅ Token refreshed successfully for user ${user.id} (${user.email})`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error.message);
    console.error('Error type:', error.name);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Logout user
export const logout = async (req, res) => {
  const client = await pool.connect();

  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const { password_hash, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Request password reset (Step 1: Send OTP)
export const requestPasswordReset = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    // Check if user exists and is active
    const userResult = await client.query(
      'SELECT id, email, first_name, is_active, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Your account is not verified. Please contact support.'
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Your account is deactivated. Please contact support.'
      });
    }

    // Generate and store OTP
    await storeOTP(user.id, email, 'password_reset');

    res.json({
      success: true,
      message: 'Password reset OTP has been sent to your email'
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Verify password reset OTP (Step 2: Verify OTP)
export const verifyPasswordResetOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, otp } = req.body;

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, 'password_reset');

    if (!otpResult.success) {
      // Increment attempt count
      await incrementOTPAttempts(email, otp, 'password_reset');

      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Generate a temporary reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await client.query(
      'INSERT INTO password_reset_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [otpResult.data.userId, email, resetToken, expiresAt]
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken
      }
    });

  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Reset password (Step 3: Set new password)
export const resetPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const { resetToken, newPassword } = req.body;

    // Validate password
    if (!newPassword || newPassword.length < 14) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 14 characters long'
      });
    }

    // Find valid reset token
    const tokenResult = await client.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND expires_at > NOW() AND is_used = false`,
      [resetToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const resetData = tokenResult.rows[0];
    const userId = resetData.user_id;

    // Check if new password matches any of the last 5 passwords
    const passwordHistoryResult = await client.query(
      `SELECT password_hash FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    // Check against last 5 passwords
    for (const historyEntry of passwordHistoryResult.rows) {
      const isMatch = await bcrypt.compare(newPassword, historyEntry.password_hash);
      if (isMatch) {
        return res.status(400).json({
          success: false,
          message: 'You cannot reuse any of your last 5 passwords. Please choose a different password.'
        });
      }
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Add to password history
    await client.query(
      'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
      [userId, passwordHash]
    );

    // Keep only last 5 passwords in history
    await client.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5
       )`,
      [userId]
    );

    // Mark reset token as used
    await client.query(
      'UPDATE password_reset_tokens SET is_used = true WHERE id = $1',
      [resetData.id]
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};
