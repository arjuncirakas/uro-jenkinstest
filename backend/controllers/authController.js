import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateTokens, verifyRefreshToken, getCookieOptions } from '../utils/jwt.js';
import { storeOTP, verifyOTP, incrementOTPAttempts } from '../services/otpService.js';
import { logFailedAccess, logAuthEvent } from '../services/auditLogger.js';
import { checkAccountLockout, incrementFailedAttempts, resetFailedAttempts } from '../middleware/accountLockout.js';
import { encrypt, decryptFields, createSearchableHash } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';
import { monitorAuthenticationEvents } from '../services/securityMonitoringService.js';
import { createAlert, sendAlertNotification } from '../services/alertService.js';

// Register a new user (Step 1: Send OTP)
export const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password, firstName, lastName, phone, organization, role } = req.body;

    // Check if user already exists (using hash for encrypted search, fallback to direct email)
    const emailHash = createSearchableHash(email);
    let existingUser = await client.query(
      'SELECT id, is_verified FROM users WHERE email_hash = $1',
      [emailHash]
    );
    
    // Fallback to direct email search for backward compatibility
    if (existingUser.rows.length === 0) {
      existingUser = await client.query(
        'SELECT id, is_verified FROM users WHERE email = $1',
        [email]
      );
    }

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

    // Check if phone number is already in use (if provided, using hash with fallback)
    let phoneHash = null;
    if (phone) {
      phoneHash = createSearchableHash(phone);
      let existingPhone = await client.query(
        'SELECT id FROM users WHERE phone_hash = $1',
        [phoneHash]
      );
      
      // Fallback to direct phone search for backward compatibility
      if (existingPhone.rows.length === 0) {
        existingPhone = await client.query(
          'SELECT id FROM users WHERE phone = $1',
          [phone]
        );
      }

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

    // Encrypt email and phone
    const encryptedEmail = encrypt(email);
    const encryptedPhone = phone ? encrypt(phone) : null;
    // emailHash and phoneHash already declared above

    // Insert new user (not verified yet) with encrypted data
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified, email_hash, phone_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [encryptedEmail, passwordHash, firstName, lastName, encryptedPhone, organization, role, emailHash, phoneHash]
    );

    const newUser = result.rows[0];
    
    // Decrypt for response
    const decryptedUser = decryptFields(newUser, USER_ENCRYPTED_FIELDS);

    // Generate and store OTP (email is sent automatically)
    const otpResult = await storeOTP(newUser.id, email, 'registration');

    res.status(201).json({
      success: true,
      message: otpResult.emailSent
        ? 'Registration initiated. Please check your email for OTP verification.'
        : 'Registration initiated. OTP stored but email sending failed. Please contact support.',
      data: {
        userId: decryptedUser.id,
        email: decryptedUser.email, // Decrypted
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

    // Check if user exists and is not verified (with backward compatibility)
    const emailHash = createSearchableHash(email);
    let userResult = await client.query(
      'SELECT id, is_verified FROM users WHERE email_hash = $1',
      [emailHash]
    );
    
    // Fallback to direct email search for backward compatibility
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'SELECT id, is_verified FROM users WHERE email = $1',
        [email]
      );
    }

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

    // Find user by email (using hash for encrypted search, fallback to direct email for backward compatibility)
    const emailHash = createSearchableHash(email);
    
    // Try hash-based search first (for encrypted users)
    let result = await client.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email_hash = $1',
      [emailHash]
    );
    
    // If not found, try direct email search (for backward compatibility with unencrypted users)
    if (result.rows.length === 0) {
      result = await client.query(
        'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = $1',
        [email]
      );
      
      // If found via direct email, update the hash for future searches
      if (result.rows.length > 0) {
        await client.query(
          'UPDATE users SET email_hash = $1 WHERE id = $2',
          [emailHash, result.rows[0].id]
        );
        console.log(`✅ Updated email_hash for user ${result.rows[0].id} during login`);
      }
    }

    if (result.rows.length === 0) {
      console.log(`❌ Login failed: User not found - ${email}`);
      await logFailedAccess(req, 'User not found');
      await incrementFailedAttempts(email);
      
      // Monitor failed login attempt
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      try {
        const alerts = await monitorAuthenticationEvents({
          userId: null,
          userEmail: email,
          ipAddress,
          eventType: 'login_failure'
        });
        
        // Create and send alerts if any detected
        for (const alertData of alerts) {
          if (alertData.shouldAlert) {
            try {
              const alert = await createAlert(alertData);
              sendAlertNotification(alert).catch(err => {
                console.error('Failed to send alert notification:', err);
              });
            } catch (alertError) {
              console.error('Failed to create alert:', alertError);
            }
          }
        }
      } catch (monitoringError) {
        console.error('Error in authentication monitoring:', monitoringError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];
    
    // Decrypt user email for logging and response (password_hash doesn't need decryption)
    const decryptedUser = decryptFields(user, USER_ENCRYPTED_FIELDS);

    // Check if account is active
    if (!user.is_active) {
      console.log(`❌ Login failed: Account deactivated - ${decryptedUser.email}`);
      await logFailedAccess(req, 'Account deactivated');
      await incrementFailedAttempts(decryptedUser.email);
      
      // Monitor failed login attempt
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      try {
        const alerts = await monitorAuthenticationEvents({
          userId: user.id,
          userEmail: decryptedUser.email,
          ipAddress,
          eventType: 'login_failure'
        });
        
        // Create and send alerts if any detected
        for (const alertData of alerts) {
          if (alertData.shouldAlert) {
            try {
              const alert = await createAlert(alertData);
              sendAlertNotification(alert).catch(err => {
                console.error('Failed to send alert notification:', err);
              });
            } catch (alertError) {
              console.error('Failed to create alert:', alertError);
            }
          }
        }
      } catch (monitoringError) {
        console.error('Error in authentication monitoring:', monitoringError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is verified
    if (!user.is_verified) {
      console.log(`❌ Login failed: Account not verified - ${decryptedUser.email}`);
      await logFailedAccess(req, 'Account not verified');
      await incrementFailedAttempts(decryptedUser.email);
      
      // Monitor failed login attempt
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      try {
        const alerts = await monitorAuthenticationEvents({
          userId: user.id,
          userEmail: decryptedUser.email,
          ipAddress,
          eventType: 'login_failure'
        });
        
        // Create and send alerts if any detected
        for (const alertData of alerts) {
          if (alertData.shouldAlert) {
            try {
              const alert = await createAlert(alertData);
              sendAlertNotification(alert).catch(err => {
                console.error('Failed to send alert notification:', err);
              });
            } catch (alertError) {
              console.error('Failed to create alert:', alertError);
            }
          }
        }
      } catch (monitoringError) {
        console.error('Error in authentication monitoring:', monitoringError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your email first.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${decryptedUser.email}`);
      await logFailedAccess(req, 'Invalid password');
      await incrementFailedAttempts(decryptedUser.email);
      
      // Monitor failed login attempt
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      try {
        const alerts = await monitorAuthenticationEvents({
          userId: user.id,
          userEmail: decryptedUser.email,
          ipAddress,
          eventType: 'login_failure'
        });
        
        // Create and send alerts if any detected
        for (const alertData of alerts) {
          if (alertData.shouldAlert) {
            try {
              const alert = await createAlert(alertData);
              sendAlertNotification(alert).catch(err => {
                console.error('Failed to send alert notification:', err);
              });
            } catch (alertError) {
              console.error('Failed to create alert:', alertError);
            }
          }
        }
      } catch (monitoringError) {
        console.error('Error in authentication monitoring:', monitoringError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Password is valid - reset failed attempts and log success
    await resetFailedAttempts(user.id);
    await logAuthEvent(req, 'login.password_verified', 'success');

    console.log(`✅ Password verified for: ${decryptedUser.email}, role: ${user.role}`);

    // All roles now require OTP verification (including superadmin and department_admin)
    console.log(`📧 OTP required for role: ${user.role} - ${decryptedUser.email}`);

    try {
      // Generate and store OTP for login verification (use decrypted email)
      const otpResult = await storeOTP(user.id, decryptedUser.email, 'login_verification');

      console.log(`✅ OTP stored for ${decryptedUser.email}, email sent: ${otpResult.emailSent}`);

      res.json({
        success: true,
        message: otpResult.emailSent
          ? 'Login initiated. Please check your email for OTP verification.'
          : 'Login initiated. OTP stored but email sending failed. Please contact support.',
        data: {
          userId: decryptedUser.id,
          email: decryptedUser.email, // Decrypted
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

    // Get IP address and user agent for monitoring
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // INVALIDATE ALL PREVIOUS SESSIONS (Single Device Login)
    // Revoke all previous refresh tokens for this user
    try {
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
        [user.id]
      );
      console.log(`🔒 [Single Device] Revoked all previous refresh tokens for user ${user.id}`);
    } catch (revokeError) {
      console.error('Error revoking previous refresh tokens:', revokeError);
    }

    // Delete all previous active sessions for this user
    try {
      await client.query(
        'DELETE FROM active_sessions WHERE user_id = $1',
        [user.id]
      );
      console.log(`🔒 [Single Device] Deleted all previous active sessions for user ${user.id}`);
    } catch (sessionDeleteError) {
      console.error('Error deleting previous active sessions:', sessionDeleteError);
    }

    // Store new refresh token in database
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );
    
    // Record login in user_login_history
    try {
      await client.query(`
        INSERT INTO user_login_history (user_id, ip_address, user_agent)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, ip_address) DO UPDATE
        SET login_timestamp = CURRENT_TIMESTAMP, user_agent = $3
      `, [user.id, ipAddress, userAgent]);
    } catch (historyError) {
      console.error('Error recording login history:', historyError);
    }
    
    // Record new active session with session hash
    try {
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Match refresh token expiry
      // Create session hash from refresh token for validation
      const crypto = await import('node:crypto');
      const sessionHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex').substring(0, 16);
      
      await client.query(`
        INSERT INTO active_sessions (user_id, session_token, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, tokens.refreshToken, ipAddress, userAgent, sessionExpiresAt]);
      
      // Store session hash in a separate column or use it for validation
      // For now, we'll use the session_token (refresh token) for validation
      console.log(`✅ [Single Device] Created new active session for user ${user.id} with hash ${sessionHash}`);
    } catch (sessionError) {
      console.error('Error recording active session:', sessionError);
    }

    // Monitor successful login for security threats
    try {
      const alerts = await monitorAuthenticationEvents({
        userId: user.id,
        userEmail: user.email,
        ipAddress,
        eventType: 'login_success'
      });
      
      // Create and send alerts if any detected
      for (const alertData of alerts) {
        if (alertData.shouldAlert) {
          try {
            const alert = await createAlert(alertData);
            sendAlertNotification(alert).catch(err => {
              console.error('Failed to send alert notification:', err);
            });
          } catch (alertError) {
            console.error('Failed to create alert:', alertError);
          }
        }
      }
    } catch (monitoringError) {
      console.error('Error in authentication monitoring:', monitoringError);
    }

    // Non-blocking behavioral anomaly detection
    try {
      const { detectAnomalies } = await import('../services/behavioralAnalyticsService.js');
      detectAnomalies(user.id, {
        ipAddress,
        timestamp: new Date(),
        eventType: 'login_success'
      }).catch(err => {
        console.error('Anomaly detection error:', err);
      });
    } catch (anomalyError) {
      console.error('Error importing anomaly detection:', anomalyError);
    }

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
      'SELECT id, is_verified, is_active FROM users WHERE email_hash = $1',
      [createSearchableHash(email)]
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

    // Generate new tokens (with session hash linking)
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

    // Delete old active session
    await client.query(
      'DELETE FROM active_sessions WHERE session_token = $1',
      [refreshToken]
    );

    // Store new refresh token
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    // Update active session with new refresh token
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Match refresh token expiry
    
    // Update existing session or insert new one
    await client.query(
      `UPDATE active_sessions 
       SET session_token = $1, ip_address = $2, user_agent = $3, expires_at = $4, last_activity = CURRENT_TIMESTAMP
       WHERE user_id = $5`,
      [tokens.refreshToken, ipAddress, userAgent, sessionExpiresAt, user.id]
    );

    // If no session was updated, insert a new one
    const updateResult = await client.query('SELECT id FROM active_sessions WHERE user_id = $1', [user.id]);
    if (updateResult.rows.length === 0) {
      await client.query(
        `INSERT INTO active_sessions (user_id, session_token, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokens.refreshToken, ipAddress, userAgent, sessionExpiresAt]
      );
    }

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
      
      // Remove from active_sessions
      try {
        await client.query(
          'DELETE FROM active_sessions WHERE session_token = $1',
          [refreshToken]
        );
      } catch (sessionError) {
        console.error('Error removing session from active_sessions:', sessionError);
      }
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
// Check if current session is still valid (for single device login)
export const checkSession = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;

    // Check if user has any valid active session
    const sessionCheck = await client.query(
      `SELECT id, session_token, expires_at, last_activity 
       FROM active_sessions 
       WHERE user_id = $1 
       AND expires_at > NOW() 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been terminated. You have been logged in from another device.',
        code: 'SESSION_TERMINATED',
        valid: false
      });
    }

    // Update last activity
    await client.query(
      'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [sessionCheck.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Session is valid',
      valid: true,
      data: {
        expiresAt: sessionCheck.rows[0].expires_at,
        lastActivity: sessionCheck.rows[0].last_activity
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      valid: false
    });
  } finally {
    client.release();
  }
};

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
// SECURITY FIX: Always returns the same response to prevent user enumeration
export const requestPasswordReset = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    // Generic success message - always return this to prevent user enumeration
    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists with this email address, a password reset OTP will be sent.'
    };

    // Check if user exists and is active
    const userResult = await client.query(
      'SELECT id, email, first_name, is_active, is_verified FROM users WHERE email_hash = $1',
      [createSearchableHash(email)]
    );
    
    // Fallback to direct email search for backward compatibility
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'SELECT id, email, first_name, is_active, is_verified FROM users WHERE email = $1',
        [email]
      );
    }

    // SECURITY: If user doesn't exist, return generic success (don't reveal non-existence)
    if (userResult.rows.length === 0) {
      console.log(`[Password Reset] Attempted for non-existent email: ${email}`);
      return res.json(genericSuccessResponse);
    }

    const user = userResult.rows[0];

    // SECURITY: If user is not verified, return generic success (don't reveal status)
    if (!user.is_verified) {
      console.log(`[Password Reset] Attempted for unverified account: ${email}`);
      return res.json(genericSuccessResponse);
    }

    // SECURITY: If user is deactivated, return generic success (don't reveal status)
    if (!user.is_active) {
      console.log(`[Password Reset] Attempted for deactivated account: ${email}`);
      return res.json(genericSuccessResponse);
    }

    // User exists and is valid - actually send the OTP
    try {
      await storeOTP(user.id, email, 'password_reset');
      console.log(`[Password Reset] OTP sent successfully to: ${email}`);
    } catch (otpError) {
      // Log the error but still return generic success to prevent enumeration
      console.error(`[Password Reset] Error sending OTP to ${email}:`, otpError);
    }

    // Always return the same generic success message
    res.json(genericSuccessResponse);

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
