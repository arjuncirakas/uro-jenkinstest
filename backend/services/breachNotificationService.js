import pool from '../config/database.js';
import { sendNotificationEmail } from './emailService.js';
import {
  renderGDPRSupervisoryTemplate,
  renderHIPAAHHSTemplate,
  renderIndividualPatientTemplate
} from './notificationTemplates.js';

/**
 * Breach Notification Service
 * Manages breach incidents, notifications, and remediations
 */

/**
 * Create a breach incident
 * @param {Object} incidentData - Incident data { incident_type, severity, description, affected_users, affected_data_types, reported_by }
 * @returns {Promise<Object>} Created incident object
 */
export const createIncident = async (incidentData) => {
  if (!incidentData || !incidentData.incident_type || !incidentData.severity || !incidentData.description) {
    throw new Error('incident_type, severity, and description are required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO breach_incidents (
        incident_type, severity, description, affected_users, affected_data_types,
        detected_at, reported_by, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      incidentData.incident_type,
      incidentData.severity,
      incidentData.description,
      incidentData.affected_users || [],
      incidentData.affected_data_types || [],
      incidentData.detected_at || new Date(),
      incidentData.reported_by || null,
      incidentData.status || 'draft'
    ]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating incident:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get incidents with filters
 * @param {Object} filters - Filter options { status, severity, startDate, endDate, limit, offset }
 * @returns {Promise<Object>} Object with incidents array and total count
 */
export const getIncidents = async (filters = {}) => {
  const client = await pool.connect();

  try {
    const {
      status,
      severity,
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
      whereClause += ` AND bi.status = $${paramCount}`;
      params.push(status);
    }

    if (severity) {
      paramCount++;
      whereClause += ` AND bi.severity = $${paramCount}`;
      params.push(severity);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND bi.detected_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND bi.detected_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM breach_incidents bi
      LEFT JOIN users u ON bi.reported_by = u.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Build main query
    let query = `
      SELECT bi.*, u.email as reported_by_email, u.first_name, u.last_name
      FROM breach_incidents bi
      LEFT JOIN users u ON bi.reported_by = u.id
      ${whereClause}
    `;

    // Get paginated results
    query += ` ORDER BY bi.detected_at DESC`;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await client.query(query, params);

    return {
      incidents: result.rows,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting incidents:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update incident status
 * @param {number} incidentId - Incident ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated incident object
 */
export const updateIncidentStatus = async (incidentId, status) => {
  if (!incidentId || !status) {
    throw new Error('incidentId and status are required');
  }

  if (!['draft', 'confirmed', 'under_investigation', 'contained', 'resolved'].includes(status)) {
    throw new Error('Invalid status. Must be: draft, confirmed, under_investigation, contained, or resolved');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      UPDATE breach_incidents
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, incidentId]);

    if (result.rows.length === 0) {
      throw new Error('Incident not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating incident status:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create a notification record
 * @param {number} incidentId - Incident ID
 * @param {Object} notificationData - Notification data { notification_type, recipient_type, recipient_email, recipient_name, sent_by }
 * @returns {Promise<Object>} Created notification object
 */
export const createNotification = async (incidentId, notificationData) => {
  if (!incidentId || !notificationData || !notificationData.notification_type || !notificationData.recipient_email) {
    throw new Error('incidentId, notification_type, and recipient_email are required');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      INSERT INTO breach_notifications (
        incident_id, notification_type, recipient_type, recipient_email,
        recipient_name, sent_by, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      incidentId,
      notificationData.notification_type,
      notificationData.recipient_type,
      notificationData.recipient_email,
      notificationData.recipient_name || null,
      notificationData.sent_by || null
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Send notification email (manual trigger)
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification object with send status
 */
export const sendNotification = async (notificationId) => {
  if (!notificationId) {
    throw new Error('notificationId is required');
  }

  const client = await pool.connect();

  try {
    // Get notification record
    const notificationResult = await client.query(`
      SELECT bn.*, bi.*
      FROM breach_notifications bn
      JOIN breach_incidents bi ON bn.incident_id = bi.id
      WHERE bn.id = $1
    `, [notificationId]);

    if (notificationResult.rows.length === 0) {
      throw new Error('Notification not found');
    }

    const notification = notificationResult.rows[0];
    const incident = {
      id: notification.incident_id,
      incident_type: notification.incident_type,
      severity: notification.severity,
      description: notification.description,
      affected_users: notification.affected_users,
      affected_data_types: notification.affected_data_types,
      detected_at: notification.detected_at
    };

    const recipient = {
      name: notification.recipient_name,
      email: notification.recipient_email
    };

    // Select appropriate template
    let emailContent;
    let templateUsed;

    if (notification.notification_type === 'gdpr_supervisory') {
      emailContent = renderGDPRSupervisoryTemplate(incident, recipient);
      templateUsed = 'gdpr_supervisory';
    } else if (notification.notification_type === 'hipaa_hhs') {
      emailContent = renderHIPAAHHSTemplate(incident, recipient);
      templateUsed = 'hipaa_hhs';
    } else if (notification.notification_type === 'individual_patient') {
      emailContent = renderIndividualPatientTemplate(incident, recipient);
      templateUsed = 'individual_patient';
    } else {
      throw new Error(`Unknown notification type: ${notification.notification_type}`);
    }

    // Send email
    let emailResult;
    let errorMessage = null;

    try {
      emailResult = await sendNotificationEmail(
        recipient.email,
        emailContent.subject,
        emailContent.html
      );

      if (!emailResult.success) {
        errorMessage = emailResult.message || 'Email sending failed';
        throw new Error(errorMessage);
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      errorMessage = emailError.message || 'Email sending failed';

      // Update notification status to failed
      const updateResult = await client.query(`
        UPDATE breach_notifications
        SET status = 'failed',
            error_message = $1,
            template_used = $2
        WHERE id = $3
        RETURNING *
      `, [errorMessage, templateUsed, notificationId]);

      return updateResult.rows[0];
    }

    // Update notification status to sent
    const updateResult = await client.query(`
      UPDATE breach_notifications
      SET status = 'sent',
          sent_at = CURRENT_TIMESTAMP,
          template_used = $1,
          error_message = NULL
      WHERE id = $2
      RETURNING *
    `, [templateUsed, notificationId]);

    return updateResult.rows[0];
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all notifications for an incident
 * @param {number} incidentId - Incident ID
 * @returns {Promise<Array>} Array of notification objects
 */
export const getNotifications = async (incidentId) => {
  if (!incidentId) {
    throw new Error('incidentId is required');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT bn.*, u.email as sent_by_email, u.first_name, u.last_name
      FROM breach_notifications bn
      LEFT JOIN users u ON bn.sent_by = u.id
      WHERE bn.incident_id = $1
      ORDER BY bn.created_at DESC
    `, [incidentId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get remediations for an incident
 * @param {number} incidentId - Incident ID
 * @returns {Promise<Array>} Array of remediation objects
 */
export const getRemediations = async (incidentId) => {
  if (!incidentId) {
    throw new Error('incidentId is required');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT br.*, u.email as taken_by_email, u.first_name, u.last_name
      FROM breach_remediations br
      LEFT JOIN users u ON br.taken_by = u.id
      WHERE br.incident_id = $1
      ORDER BY br.taken_at DESC
    `, [incidentId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting remediations:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Add remediation action
 * @param {number} incidentId - Incident ID
 * @param {Object} remediationData - Remediation data { action_taken, taken_by, effectiveness, notes }
 * @returns {Promise<Object>} Created remediation object
 */
export const addRemediation = async (incidentId, remediationData) => {
  if (!incidentId || !remediationData || !remediationData.action_taken) {
    throw new Error('incidentId and action_taken are required');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      INSERT INTO breach_remediations (
        incident_id, action_taken, taken_by, taken_at, effectiveness, notes
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      RETURNING *
    `, [
      incidentId,
      remediationData.action_taken,
      remediationData.taken_by || null,
      remediationData.effectiveness || null,
      remediationData.notes || null
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error adding remediation:', error);
    throw error;
  } finally {
    client.release();
  }
};
