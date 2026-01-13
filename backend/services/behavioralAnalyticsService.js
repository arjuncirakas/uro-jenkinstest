import pool from '../config/database.js';
import { createSearchableHash } from './encryptionService.js';
import { batchGetLocationsFromIPs } from './geolocationService.js';

/**
 * Behavioral Analytics Service
 * Calculates user behavior baselines and detects anomalies
 */

/**
 * Calculate baseline behavior for a user
 * @param {number|string} userIdOrEmail - User ID or email address
 * @param {string} baselineType - Type of baseline: 'location', 'time', or 'access_pattern'
 * @returns {Promise<Object>} Baseline data object
 */
export const calculateBaseline = async (userIdOrEmail, baselineType) => {
  if (!userIdOrEmail || !baselineType) {
    throw new Error('userId/email and baselineType are required');
  }

  if (!['location', 'time', 'access_pattern'].includes(baselineType)) {
    throw new Error('Invalid baselineType. Must be: location, time, or access_pattern');
  }

  const client = await pool.connect();

  try {
    let userId;
    
    // Check if input is email (contains @) or numeric ID
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      // It's an email - look up user ID (support both encrypted and plain email)
      const emailHash = createSearchableHash(userIdOrEmail);
      const emailResult = await client.query(
        `SELECT id FROM users 
         WHERE email_hash = $1 
         OR LOWER(email) = LOWER($2)`,
        [emailHash, userIdOrEmail]
      );
      if (emailResult.rows.length === 0) {
        throw new Error(`User with email ${userIdOrEmail} does not exist`);
      }
      userId = emailResult.rows[0].id;
    } else {
      // It's a user ID
      userId = typeof userIdOrEmail === 'string' ? parseInt(userIdOrEmail) : userIdOrEmail;
      
      // Verify user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new Error(`User with ID ${userId} does not exist`);
      }
    }

    let baselineData = {};

    if (baselineType === 'location') {
      // Calculate location baseline from user_login_history
      const locationResult = await client.query(`
        SELECT ip_address, COUNT(*) as count
        FROM user_login_history
        WHERE user_id = $1
          AND login_timestamp > NOW() - INTERVAL '30 days'
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 10
      `, [userId]);

      const ipAddresses = locationResult.rows.map(row => row.ip_address).filter(ip => ip && ip !== 'unknown');
      
      // Get location names for IP addresses (non-blocking, continue if lookup fails)
      let locationMap = new Map();
      try {
        locationMap = await batchGetLocationsFromIPs(ipAddresses);
      } catch (error) {
        console.error('Error fetching geolocation data:', error);
        // Continue without location names if lookup fails
      }

      const locations = locationResult.rows.map(row => {
        const ip = row.ip_address || 'unknown';
        const locationInfo = locationMap.get(ip);
        
        // Always include IP address, even if location lookup failed
        return {
          ip: ip,
          location: locationInfo?.location || null,
          frequency: parseInt(row.count)
        };
      });

      const totalLogins = locations.reduce((sum, loc) => sum + loc.frequency, 0);

      baselineData = {
        commonLocations: locations,
        totalLogins: totalLogins,
        uniqueLocations: locations.length,
        message: totalLogins === 0 ? 'No login history found in the last 30 days. Baseline will be calculated once the user has login activity.' : null
      };
    } else if (baselineType === 'time') {
      // Calculate time baseline from user_login_history
      const timeResult = await client.query(`
        SELECT 
          EXTRACT(HOUR FROM login_timestamp) as hour,
          COUNT(*) as count
        FROM user_login_history
        WHERE user_id = $1
          AND login_timestamp > NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM login_timestamp)
        ORDER BY count DESC
      `, [userId]);

      const hours = timeResult.rows.map(row => ({
        hour: parseInt(row.hour),
        frequency: parseInt(row.count)
      }));

      const totalLogins = hours.reduce((sum, h) => sum + h.frequency, 0);

      // Calculate most common login hours (top 3)
      const topHours = hours.slice(0, 3).map(h => h.hour);
      const avgHour = totalLogins > 0
        ? Math.round(hours.reduce((sum, h) => sum + (h.hour * h.frequency), 0) / totalLogins)
        : null;

      baselineData = {
        commonHours: topHours,
        averageHour: avgHour,
        hourDistribution: hours,
        totalLogins: totalLogins,
        message: totalLogins === 0 ? 'No login history found in the last 30 days. Baseline will be calculated once the user has login activity.' : null
      };
    } else if (baselineType === 'access_pattern') {
      // Calculate access pattern baseline from audit_logs
      const accessResult = await client.query(`
        SELECT 
          action,
          COUNT(*) as count
        FROM audit_logs
        WHERE user_id = $1
          AND timestamp > NOW() - INTERVAL '30 days'
        GROUP BY action
        ORDER BY count DESC
      `, [userId]);

      const patterns = accessResult.rows.map(row => ({
        action: row.action,
        frequency: parseInt(row.count)
      }));

      const totalActions = patterns.reduce((sum, p) => sum + p.frequency, 0);

      baselineData = {
        commonActions: patterns,
        totalActions: totalActions,
        uniqueActions: patterns.length,
        message: totalActions === 0 ? 'No access activity found in the last 30 days. Baseline will be calculated once the user has activity.' : null
      };
    }

    // Upsert baseline record
    const upsertResult = await client.query(`
      INSERT INTO user_behavior_baselines (user_id, baseline_type, baseline_data, calculated_at, last_updated)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, baseline_type)
      DO UPDATE SET
        baseline_data = $3,
        last_updated = CURRENT_TIMESTAMP,
        calculated_at = CASE 
          WHEN user_behavior_baselines.calculated_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE user_behavior_baselines.calculated_at
        END
      RETURNING *
    `, [userId, baselineType, JSON.stringify(baselineData)]);

    return upsertResult.rows[0];
  } catch (error) {
    console.error('Error calculating baseline:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Detect anomalies for a user event
 * @param {number} userId - User ID
 * @param {Object} eventData - Event data { ipAddress, timestamp, eventType }
 * @returns {Promise<Object|null>} Anomaly object if detected, null otherwise
 */
export const detectAnomalies = async (userId, eventData) => {
  if (!userId || !eventData) {
    return null;
  }

  const client = await pool.connect();

  try {
    const { ipAddress, timestamp, eventType } = eventData;

    // Get all baselines for this user
    const baselineResult = await client.query(`
      SELECT baseline_type, baseline_data
      FROM user_behavior_baselines
      WHERE user_id = $1
    `, [userId]);

    if (baselineResult.rows.length === 0) {
      // No baseline exists, skip detection
      return null;
    }

    const baselines = {};
    baselineResult.rows.forEach(row => {
      // PostgreSQL JSONB columns are automatically parsed, but handle both cases
      baselines[row.baseline_type] = typeof row.baseline_data === 'string' 
        ? JSON.parse(row.baseline_data) 
        : row.baseline_data;
    });

    const anomalies = [];

    // Check location anomaly
    if (ipAddress && baselines.location) {
      const locationBaseline = baselines.location;
      const isKnownLocation = locationBaseline.commonLocations?.some(
        loc => loc.ip === ipAddress
      );

      if (!isKnownLocation && locationBaseline.totalLogins > 5) {
        // Only flag as anomaly if user has enough login history
        anomalies.push({
          type: 'unusual_location',
          severity: 'medium',
          details: {
            ipAddress,
            expectedLocations: locationBaseline.commonLocations?.map(l => l.ip) || [],
            eventType
          }
        });
      }
    }

    // Check time anomaly
    if (timestamp && baselines.time) {
      const timeBaseline = baselines.time;
      const eventHour = new Date(timestamp).getHours();

      if (timeBaseline.commonHours && timeBaseline.commonHours.length > 0) {
        const isNormalHour = timeBaseline.commonHours.includes(eventHour);
        const avgHour = timeBaseline.averageHour;

        if (!isNormalHour && avgHour !== null) {
          // Check if outside ±2 hours from average
          const hourDiff = Math.abs(eventHour - avgHour);
          if (hourDiff > 2 && hourDiff < 22) {
            // Not within ±2 hours, but not on opposite side of clock
            anomalies.push({
              type: 'unusual_time',
              severity: 'low',
              details: {
                eventHour,
                expectedHours: timeBaseline.commonHours,
                averageHour: avgHour,
                eventType
              }
            });
          }
        }
      }
    }

    // Check access pattern anomaly (if eventType is provided)
    if (eventType && baselines.access_pattern) {
      const accessBaseline = baselines.access_pattern;
      const isCommonAction = accessBaseline.commonActions?.some(
        action => action.action === eventType
      );

      if (!isCommonAction && accessBaseline.totalActions > 10) {
        // Only flag if user has enough action history
        anomalies.push({
          type: 'unusual_access',
          severity: 'low',
          details: {
            action: eventType,
            expectedActions: accessBaseline.commonActions?.map(a => a.action) || [],
            eventType
          }
        });
      }
    }

    // Create anomaly records for each detected anomaly
    const createdAnomalies = [];
    for (const anomaly of anomalies) {
      const insertResult = await client.query(`
        INSERT INTO behavioral_anomalies (
          user_id, anomaly_type, severity, details, detected_at, status
        )
        VALUES ($1, $2, $3, $4, $5, 'new')
        RETURNING *
      `, [
        userId,
        anomaly.type,
        anomaly.severity,
        JSON.stringify(anomaly.details),
        timestamp || new Date()
      ]);

      createdAnomalies.push(insertResult.rows[0]);
    }

    return createdAnomalies.length > 0 ? createdAnomalies : null;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    // Return null on error to not block the calling function
    return null;
  } finally {
    client.release();
  }
};

/**
 * Get all baselines for a user
 * @param {number|string} userIdOrEmail - User ID or email address
 * @returns {Promise<Array>} Array of baseline objects
 */
export const getUserBaselines = async (userIdOrEmail) => {
  if (!userIdOrEmail) {
    throw new Error('userId/email is required');
  }

  const client = await pool.connect();

  try {
    let userId;
    
    // Check if input is email (contains @) or numeric ID
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      // It's an email - look up user ID (support both encrypted and plain email)
      const emailHash = createSearchableHash(userIdOrEmail);
      const emailResult = await client.query(
        `SELECT id FROM users 
         WHERE email_hash = $1 
         OR LOWER(email) = LOWER($2)`,
        [emailHash, userIdOrEmail]
      );
      if (emailResult.rows.length === 0) {
        throw new Error(`User with email ${userIdOrEmail} does not exist`);
      }
      userId = emailResult.rows[0].id;
    } else {
      // It's a user ID
      userId = typeof userIdOrEmail === 'string' ? parseInt(userIdOrEmail) : userIdOrEmail;
      
      // Verify user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new Error(`User with ID ${userId} does not exist`);
      }
    }

    const result = await client.query(`
      SELECT *
      FROM user_behavior_baselines
      WHERE user_id = $1
      ORDER BY baseline_type
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting user baselines:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get anomalies with filters
 * @param {Object} filters - Filter options { status, severity, userId, startDate, endDate, limit, offset }
 * @returns {Promise<Object>} Object with anomalies array and total count
 */
export const getAnomalies = async (filters = {}) => {
  const client = await pool.connect();

  try {
    const {
      status,
      severity,
      userId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND ba.status = $${paramCount}`;
      params.push(status);
    }

    if (severity) {
      paramCount++;
      whereClause += ` AND ba.severity = $${paramCount}`;
      params.push(severity);
    }

    if (userId) {
      paramCount++;
      whereClause += ` AND ba.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND ba.detected_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND ba.detected_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM behavioral_anomalies ba
      LEFT JOIN users u ON ba.user_id = u.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Build main query
    let query = `
      SELECT ba.*, u.email as user_email, u.first_name, u.last_name
      FROM behavioral_anomalies ba
      LEFT JOIN users u ON ba.user_id = u.id
      ${whereClause}
    `;

    // Get paginated results
    query += ` ORDER BY ba.detected_at DESC`;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await client.query(query, params);

    return {
      anomalies: result.rows,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting anomalies:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update anomaly status
 * @param {number} anomalyId - Anomaly ID
 * @param {string} status - New status: 'new', 'reviewed', 'dismissed', 'escalated'
 * @param {number} reviewedBy - User ID of reviewer
 * @returns {Promise<Object>} Updated anomaly object
 */
export const updateAnomalyStatus = async (anomalyId, status, reviewedBy) => {
  if (!anomalyId || !status) {
    throw new Error('anomalyId and status are required');
  }

  if (!['new', 'reviewed', 'dismissed', 'escalated'].includes(status)) {
    throw new Error('Invalid status. Must be: new, reviewed, dismissed, or escalated');
  }

  // Ensure anomalyId is an integer
  const anomalyIdInt = parseInt(anomalyId, 10);
  if (isNaN(anomalyIdInt)) {
    throw new Error('anomalyId must be a valid integer');
  }

  // Ensure reviewedBy is an integer or null
  const reviewedByInt = reviewedBy ? parseInt(reviewedBy, 10) : null;
  if (reviewedBy && isNaN(reviewedByInt)) {
    throw new Error('reviewedBy must be a valid integer');
  }

  const client = await pool.connect();

  try {
    // Build query based on whether status is 'new' to avoid parameter reuse issues
    let result;
    if (status === 'new') {
      // If status is 'new', don't update reviewed_at
      result = await client.query(`
        UPDATE behavioral_anomalies
        SET status = $1,
            reviewed_by = $2
        WHERE id = $3
        RETURNING *
      `, [status, reviewedByInt, anomalyIdInt]);
    } else {
      // If status is not 'new', update reviewed_at
      result = await client.query(`
        UPDATE behavioral_anomalies
        SET status = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [status, reviewedByInt, anomalyIdInt]);
    }

    if (result.rows.length === 0) {
      throw new Error('Anomaly not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating anomaly status:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get anomaly statistics for dashboard
 * @returns {Promise<Object>} Statistics object
 */
export const getAnomalyStatistics = async () => {
  const client = await pool.connect();

  try {
    // Total anomalies
    const totalResult = await client.query(`
      SELECT COUNT(*) as total
      FROM behavioral_anomalies
    `);

    // By status
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM behavioral_anomalies
      GROUP BY status
    `);

    // By severity
    const severityResult = await client.query(`
      SELECT severity, COUNT(*) as count
      FROM behavioral_anomalies
      GROUP BY severity
    `);

    // By type
    const typeResult = await client.query(`
      SELECT anomaly_type, COUNT(*) as count
      FROM behavioral_anomalies
      GROUP BY anomaly_type
    `);

    // Recent anomalies (last 7 days)
    const recentResult = await client.query(`
      SELECT COUNT(*) as count
      FROM behavioral_anomalies
      WHERE detected_at > NOW() - INTERVAL '7 days'
    `);

    return {
      total: parseInt(totalResult.rows[0].total),
      byStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      bySeverity: severityResult.rows.reduce((acc, row) => {
        acc[row.severity] = parseInt(row.count);
        return acc;
      }, {}),
      byType: typeResult.rows.reduce((acc, row) => {
        acc[row.anomaly_type] = parseInt(row.count);
        return acc;
      }, {}),
      recent: parseInt(recentResult.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting anomaly statistics:', error);
    throw error;
  } finally {
    client.release();
  }
};
