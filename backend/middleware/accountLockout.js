import pool from '../config/database.js';
import { logFailedAccess } from '../services/auditLogger.js';

/**
 * Account Lockout Policy
 * Locks accounts after multiple failed login attempts
 */

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Check if account is locked
 */
export const checkAccountLockout = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next();
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, email, failed_login_attempts, locked_until 
         FROM users 
         WHERE email = $1`,
        [email]
      );
      
      if (result.rows.length === 0) {
        return next();
      }
      
      const user = result.rows[0];
      
      // Check if account is currently locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesRemaining = Math.ceil(
          (new Date(user.locked_until) - new Date()) / (1000 * 60)
        );
        
        await logFailedAccess(req, `Account locked - ${minutesRemaining} minutes remaining`);
        
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`
        });
      }
      
      // If lockout period has expired, reset failed attempts
      if (user.locked_until && new Date(user.locked_until) <= new Date()) {
        await client.query(
          `UPDATE users 
           SET failed_login_attempts = 0, locked_until = NULL 
           WHERE id = $1`,
          [user.id]
        );
      }
      
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Account lockout check error:', error);
    next(); // Don't block on error
  }
};

/**
 * Increment failed login attempts
 */
export const incrementFailedAttempts = async (email) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE 
               WHEN failed_login_attempts + 1 >= $1 
               THEN NOW() + INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'
               ELSE locked_until
             END
         WHERE email = $2
         RETURNING failed_login_attempts, locked_until`,
        [MAX_FAILED_ATTEMPTS, email]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
          console.log(`🔒 Account locked: ${email} - ${MAX_FAILED_ATTEMPTS} failed attempts`);
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to increment failed attempts:', error);
  }
};

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedAttempts = async (userId) => {
  try {
    const client = await pool.connect();
    
    await client.query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           locked_until = NULL,
           last_login_at = NOW()
       WHERE id = $1`,
      [userId]
    );
    
    client.release();
  } catch (error) {
    console.error('Failed to reset failed attempts:', error);
  }
};




