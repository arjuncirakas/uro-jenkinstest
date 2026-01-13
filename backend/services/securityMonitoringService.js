import pool from '../config/database.js';

/**
 * Security Monitoring Service
 * Real-time monitoring of authentication events for security threats
 */

const FAILED_LOGIN_THRESHOLD = 3;
const FAILED_LOGIN_WINDOW_MINUTES = 15;
const LOCKOUT_THRESHOLD = 10;

/**
 * Detect multiple failed login attempts
 * @param {string} userEmail - User email address
 * @param {string} ipAddress - IP address of the login attempt
 * @returns {Promise<Object|null>} Alert data if threshold exceeded, null otherwise
 */
export const detectMultipleFailedAttempts = async (userEmail, ipAddress) => {
  try {
    const client = await pool.connect();
    
    try {
      // Count failed login attempts in the last 15 minutes for this email/IP combination
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'login'
          AND status = 'failure'
          AND user_email = $1
          AND ip_address = $2
          AND timestamp > NOW() - INTERVAL '${FAILED_LOGIN_WINDOW_MINUTES} minutes'
      `, [userEmail, ipAddress]);
      
      const failureCount = parseInt(result.rows[0].count);
      
      if (failureCount > FAILED_LOGIN_THRESHOLD) {
        return {
          shouldAlert: true,
          alertType: 'multiple_failed_logins',
          severity: 'high',
          userEmail,
          ipAddress,
          message: `Multiple failed login attempts detected: ${failureCount} attempts in the last ${FAILED_LOGIN_WINDOW_MINUTES} minutes`,
          details: {
            failedAttempts: failureCount,
            timeWindow: `${FAILED_LOGIN_WINDOW_MINUTES} minutes`
          }
        };
      }
      
      return { shouldAlert: false };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error detecting multiple failed attempts:', error);
    return { shouldAlert: false };
  }
};

/**
 * Detect login from unusual location (new IP address)
 * @param {number} userId - User ID
 * @param {string} ipAddress - IP address of the login attempt
 * @returns {Promise<Object|null>} Alert data if IP is new, null otherwise
 */
export const detectUnusualLocation = async (userId, ipAddress) => {
  try {
    if (!userId || !ipAddress) {
      return { shouldAlert: false };
    }
    
    const client = await pool.connect();
    
    try {
      // Check if this IP has been used by this user before
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM user_login_history
        WHERE user_id = $1 AND ip_address = $2
      `, [userId, ipAddress]);
      
      const ipCount = parseInt(result.rows[0].count);
      
      if (ipCount === 0) {
        // This is a new IP address for this user
        return {
          shouldAlert: true,
          alertType: 'unusual_location',
          severity: 'medium',
          userId,
          ipAddress,
          message: `Login from unusual location detected: New IP address ${ipAddress}`,
          details: {
            previousIPs: []
          }
        };
      }
      
      return { shouldAlert: false };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error detecting unusual location:', error);
    return { shouldAlert: false };
  }
};

/**
 * Detect simultaneous logins from different IP addresses
 * @param {number} userId - User ID
 * @param {string} ipAddress - IP address of the current login
 * @returns {Promise<Object|null>} Alert data if simultaneous logins detected, null otherwise
 */
export const detectSimultaneousLogins = async (userId, ipAddress) => {
  try {
    if (!userId || !ipAddress) {
      return { shouldAlert: false };
    }
    
    const client = await pool.connect();
    
    try {
      // Check for active sessions from different IP addresses
      const result = await client.query(`
        SELECT DISTINCT ip_address
        FROM active_sessions
        WHERE user_id = $1
          AND ip_address != $2
          AND expires_at > NOW()
      `, [userId, ipAddress]);
      
      if (result.rows.length > 0) {
        const differentIPs = result.rows.map(row => row.ip_address);
        
        return {
          shouldAlert: true,
          alertType: 'simultaneous_logins',
          severity: 'high',
          userId,
          ipAddress,
          message: `Simultaneous logins detected from different IP addresses`,
          details: {
            currentIP: ipAddress,
            otherIPs: differentIPs,
            sessionCount: result.rows.length + 1
          }
        };
      }
      
      return { shouldAlert: false };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error detecting simultaneous logins:', error);
    return { shouldAlert: false };
  }
};

/**
 * Detect account lockout threshold reached (monitoring only, no actual lockout)
 * @param {string} userEmail - User email address
 * @returns {Promise<Object|null>} Alert data if threshold reached, null otherwise
 */
export const detectLockoutThreshold = async (userEmail) => {
  try {
    if (!userEmail) {
      return { shouldAlert: false };
    }
    
    const client = await pool.connect();
    
    try {
      // Check failed login attempts count
      const result = await client.query(`
        SELECT failed_login_attempts
        FROM users
        WHERE email = $1
      `, [userEmail]);
      
      if (result.rows.length === 0) {
        return { shouldAlert: false };
      }
      
      const failedAttempts = result.rows[0].failed_login_attempts || 0;
      
      if (failedAttempts >= LOCKOUT_THRESHOLD) {
        return {
          shouldAlert: true,
          alertType: 'lockout_threshold',
          severity: 'critical',
          userEmail,
          message: `Account lockout threshold reached: ${failedAttempts} failed login attempts`,
          details: {
            failedAttempts,
            threshold: LOCKOUT_THRESHOLD
          }
        };
      }
      
      return { shouldAlert: false };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error detecting lockout threshold:', error);
    return { shouldAlert: false };
  }
};

/**
 * Get user login history (IP addresses)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of login history records
 */
export const getUserLoginHistory = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT ip_address, user_agent, login_timestamp
        FROM user_login_history
        WHERE user_id = $1
        ORDER BY login_timestamp DESC
      `, [userId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting user login history:', error);
    return [];
  }
};

/**
 * Get active sessions for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of active session records
 */
export const getActiveSessions = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, session_token, ip_address, user_agent, created_at, last_activity, expires_at
        FROM active_sessions
        WHERE user_id = $1
          AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
};

/**
 * Monitor authentication events and generate alerts
 * @param {Object} eventData - Event data (userId, userEmail, ipAddress, eventType)
 * @returns {Promise<Array>} Array of alerts generated
 */
export const monitorAuthenticationEvents = async (eventData) => {
  const alerts = [];
  
  try {
    const { userId, userEmail, ipAddress, eventType } = eventData;
    
    if (eventType === 'login_failure') {
      // Check for multiple failed attempts
      const failedAttemptsAlert = await detectMultipleFailedAttempts(userEmail, ipAddress);
      if (failedAttemptsAlert?.shouldAlert) {
        alerts.push(failedAttemptsAlert);
      }
      
      // Check for lockout threshold
      const lockoutAlert = await detectLockoutThreshold(userEmail);
      if (lockoutAlert?.shouldAlert) {
        alerts.push(lockoutAlert);
      }
    } else if (eventType === 'login_success') {
      // Check for unusual location
      const locationAlert = await detectUnusualLocation(userId, ipAddress);
      if (locationAlert?.shouldAlert) {
        alerts.push(locationAlert);
      }
      
      // Check for simultaneous logins
      const simultaneousAlert = await detectSimultaneousLogins(userId, ipAddress);
      if (simultaneousAlert?.shouldAlert) {
        alerts.push(simultaneousAlert);
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error monitoring authentication events:', error);
    return alerts;
  }
};
