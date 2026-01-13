import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n🔐 [Auth ${requestId}] Starting authentication`);
  console.log(`🔐 [Auth ${requestId}] Method: ${req.method}, Path: ${req.path}`);
  console.log(`🔐 [Auth ${requestId}] Origin: ${req.headers.origin || 'none'}`);
  
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log(`❌ [Auth ${requestId}] No token provided`);
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    console.log(`✅ [Auth ${requestId}] Token found, length: ${token.length}`);

    // Verify the token
    let decoded;
    try {
      console.log(`🔐 [Auth ${requestId}] Verifying JWT token...`);
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`✅ [Auth ${requestId}] Token verified, userId: ${decoded.userId}`);
    } catch (jwtError) {
      console.error(`❌ [Auth ${requestId}] JWT verification failed:`, jwtError.name, jwtError.message);
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      throw jwtError;
    }
    
    // Get user from database to ensure they still exist and are active
    let client;
    try {
      console.log(`🔐 [Auth ${requestId}] Connecting to database...`);
      console.log(`🔐 [Auth ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
      const connectStart = Date.now();
      client = await pool.connect();
      const connectTime = Date.now() - connectStart;
      console.log(`✅ [Auth ${requestId}] Database connection successful (took ${connectTime}ms)`);
    } catch (dbError) {
      console.error(`❌ [Auth ${requestId}] Database connection error:`, dbError.message);
      console.error(`❌ [Auth ${requestId}] Database error code:`, dbError.code);
      console.error(`❌ [Auth ${requestId}] Database error stack:`, dbError.stack);
      console.error(`❌ [Auth ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.'
      });
    }

    try {
      console.log(`🔐 [Auth ${requestId}] Querying user with id: ${decoded.userId}`);
      const result = await client.query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ [Auth ${requestId}] User not found in database`);
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];
      console.log(`✅ [Auth ${requestId}] User found: ${user.email}, role: ${user.role}, active: ${user.is_active}`);
      
      if (!user.is_active) {
        console.log(`❌ [Auth ${requestId}] User account is deactivated`);
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check if session is still valid (Single Device Login)
      // Check if user has any valid active session
      // Since we delete all previous sessions on login, there should only be one session per user
      try {
        const sessionCheck = await client.query(
          `SELECT id FROM active_sessions 
           WHERE user_id = $1 
           AND expires_at > NOW() 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [user.id]
        );

        // If no active session found, user was logged out from another device
        if (sessionCheck.rows.length === 0) {
          console.log(`❌ [Auth ${requestId}] No active session found - user logged in from another device`);
          return res.status(401).json({
            success: false,
            message: 'Your session has been terminated. You have been logged in from another device.',
            code: 'SESSION_TERMINATED'
          });
        }
      } catch (sessionError) {
        console.error(`❌ [Auth ${requestId}] Error checking active session:`, sessionError);
        // Continue with authentication if session check fails (fail open for now)
        // In production, you might want to fail closed
      }

      // Add user info to request object
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      };

      console.log(`✅ [Auth ${requestId}] Authentication successful, proceeding to next middleware`);
      next();
    } catch (queryError) {
      console.error(`❌ [Auth ${requestId}] Database query error:`, queryError.message);
      console.error(`❌ [Auth ${requestId}] Query error stack:`, queryError.stack);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    } finally {
      if (client) {
        console.log(`🔐 [Auth ${requestId}] Releasing database connection`);
        client.release();
      }
    }
  } catch (error) {
    // JWT errors are already handled above
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      // Already handled, but just in case
      return res.status(401).json({
        success: false,
        message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
      });
    }

    console.error(`❌ [Auth ${requestId}] Unexpected error:`, error.message);
    console.error(`❌ [Auth ${requestId}] Error stack:`, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware to check user role
export const requireRole = (roles) => {
  return (req, res, next) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`\n🔒 [RequireRole ${requestId}] Checking role permissions`);
    console.log(`🔒 [RequireRole ${requestId}] Path: ${req.path}, Method: ${req.method}`);
    console.log(`🔒 [RequireRole ${requestId}] Required roles:`, roles);
    
    try {
      if (!req.user) {
        console.warn(`❌ [RequireRole ${requestId}] No user in request object`);
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Normalize roles: treat 'doctor' as 'urologist' for permission checks
      // Doctors registered under urology department should have same access as urologists
      const userRole = req.user.role;
      console.log(`🔒 [RequireRole ${requestId}] User role: ${userRole}`);
      const normalizedRoles = [...roles];
      
      // If 'urologist' is in allowed roles, also allow 'doctor'
      if (roles.includes('urologist') && !normalizedRoles.includes('doctor')) {
        normalizedRoles.push('doctor');
      }
      // If 'doctor' is in allowed roles, also allow 'urologist'
      if (roles.includes('doctor') && !normalizedRoles.includes('urologist')) {
        normalizedRoles.push('urologist');
      }

      console.log(`🔒 [RequireRole ${requestId}] Normalized allowed roles:`, normalizedRoles);

      if (!normalizedRoles.includes(userRole)) {
        console.warn(`❌ [RequireRole ${requestId}] User role "${userRole}" not in allowed roles:`, normalizedRoles);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      console.log(`✅ [RequireRole ${requestId}] Role check passed, proceeding to controller`);
      next();
    } catch (error) {
      console.error('[RequireRole] Error:', error);
      console.error('[RequireRole] Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// Middleware to verify refresh token
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists in database and is not revoked
    const client = await pool.connect();
    try {
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

      // Check if session is still active (Single Device Login)
      const sessionCheck = await client.query(
        `SELECT id FROM active_sessions 
         WHERE user_id = $1 
         AND session_token = $2 
         AND expires_at > NOW()`,
        [tokenData.id, refreshToken]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Your session has been terminated. You have been logged in from another device.',
          code: 'SESSION_TERMINATED'
        });
      }

      // Add user info to request object
      req.user = {
        id: tokenData.id,
        email: tokenData.email,
        firstName: tokenData.first_name,
        lastName: tokenData.last_name,
        role: tokenData.role
      };

      req.refreshTokenId = tokenData.id;

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    console.error('Refresh token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
