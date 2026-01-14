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
 * Get breach notification recipients (superadmin + security team + DPO)
 * @returns {Promise<Array>} Array of email addresses
 */
const getBreachNotificationRecipients = async () => {
  try {
    const client = await pool.connect();
    
    try {
      const emailSet = new Set();
      
      // Get superadmin emails
      const superadminResult = await client.query(`
        SELECT email
        FROM users
        WHERE role = 'superadmin'
          AND email IS NOT NULL
      `);
      
      superadminResult.rows.forEach(row => {
        if (row.email) {
          emailSet.add(row.email);
        }
      });
      
      // Get security team member emails
      const teamResult = await client.query(`
        SELECT email
        FROM security_team_members
        WHERE email IS NOT NULL
      `);
      
      teamResult.rows.forEach(row => {
        if (row.email) {
          emailSet.add(row.email);
        }
      });
      
      // Get DPO email
      const dpoResult = await client.query(`
        SELECT email
        FROM dpo_contact_info
        WHERE email IS NOT NULL
        LIMIT 1
      `);
      
      if (dpoResult.rows.length > 0 && dpoResult.rows[0]?.email) {
        emailSet.add(dpoResult.rows[0].email);
      }
      
      return Array.from(emailSet);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting breach notification recipients:', error);
    return [];
  }
};

/**
 * Send breach incident notification email
 * @param {Object} incident - Incident object
 * @returns {Promise<Object>} Email send result
 */
const sendBreachIncidentEmail = async (incident) => {
  try {
    // Check if email notifications are enabled
    const emailEnabled = process.env.ALERT_EMAIL_ENABLED || process.env.BREACH_EMAIL_ENABLED;
    if (emailEnabled !== 'true') {
      console.log('⚠️  [Breach Email] Email notifications are DISABLED');
      return { success: false, message: 'Email notifications disabled' };
    }

    const recipients = await getBreachNotificationRecipients();
    
    if (recipients.length === 0) {
      console.warn('⚠️  [Breach Email] No recipients found!');
      return { success: false, message: 'No recipients found' };
    }

    const incidentType = incident.incident_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Security Incident';
    const severity = incident.severity?.toUpperCase() || 'UNKNOWN';
    const detectedAt = new Date(incident.detected_at || incident.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `[${severity}] Breach Incident #${incident.id}: ${incidentType}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Breach Incident Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Breach Incident Notification</h1>
        </div>
        
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Incident ID:</td>
                <td style="padding: 8px 0;">#${incident.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Incident Type:</td>
                <td style="padding: 8px 0;">${incidentType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Severity:</td>
                <td style="padding: 8px 0;">
                  <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; ${(() => {
                    if (incident.severity === 'high') return 'background-color: #fee2e2; color: #991b1b;';
                    if (incident.severity === 'medium') return 'background-color: #fef3c7; color: #92400e;';
                    return 'background-color: #d1fae5; color: #065f46;';
                  })()}">
                    ${severity}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Detected At:</td>
                <td style="padding: 8px 0;">${detectedAt}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">${incident.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Draft'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; border-bottom: 2px solid #14b8a6; padding-bottom: 10px;">Incident Description</h2>
            <p style="margin: 0; white-space: pre-wrap; color: #374151;">${incident.description || 'No description provided.'}</p>
          </div>

          ${incident.affected_data_types?.length > 0 ? `
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: bold; color: #1e40af;">Affected Data Types:</p>
            <p style="margin: 5px 0 0 0; color: #1e40af;">${incident.affected_data_types.join(', ')}</p>
          </div>
          ` : ''}

          ${incident.affected_users?.length > 0 ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">Affected Users:</p>
            <p style="margin: 5px 0 0 0; color: #92400e;">${incident.affected_users.length} individual(s)</p>
          </div>
          ` : ''}

          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">
              <strong>Action Required:</strong><br>
              Please review this incident in the Breach Management section and take appropriate action.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
            This is an automated notification from the Urology Patient Management System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `.trim();

    // Send email to all recipients
    const emailResults = [];
    for (const recipient of recipients) {
      try {
        const result = await sendNotificationEmail(recipient, subject, emailHtml, true);
        emailResults.push({ recipient, ...result });
      } catch (error) {
        console.error(`Error sending breach email to ${recipient}:`, error);
        emailResults.push({ recipient, success: false, error: error.message });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    return {
      success: successCount > 0,
      sent: successCount,
      total: recipients.length,
      results: emailResults
    };
  } catch (error) {
    console.error('Error sending breach incident email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a breach incident
 * @param {Object} incidentData - Incident data { incident_type, severity, description, affected_users, affected_data_types, reported_by, anomaly_id }
 * @returns {Promise<Object>} Created incident object
 */
export const createIncident = async (incidentData) => {
  if (!incidentData?.incident_type || !incidentData?.severity || !incidentData?.description) {
    throw new Error('incident_type, severity, and description are required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO breach_incidents (
        incident_type, severity, description, affected_users, affected_data_types,
        detected_at, reported_by, status, anomaly_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      incidentData.incident_type,
      incidentData.severity,
      incidentData.description,
      incidentData.affected_users || [],
      incidentData.affected_data_types || [],
      incidentData.detected_at || new Date(),
      incidentData.reported_by || null,
      incidentData.status || 'draft',
      incidentData.anomaly_id || null
    ]);

    const incident = result.rows[0];

    // Send email notifications to superadmin, security team, and DPO
    try {
      const emailResult = await sendBreachIncidentEmail(incident);
      if (emailResult.success) {
        console.log(`✅ [Breach Email] Sent notifications to ${emailResult.sent}/${emailResult.total} recipients for incident #${incident.id}`);
      } else {
        console.warn(`⚠️  [Breach Email] Failed to send notifications for incident #${incident.id}: ${emailResult.error || emailResult.message}`);
      }
    } catch (emailError) {
      // Don't fail the incident creation if email fails
      console.error('Error sending breach incident email (non-fatal):', emailError);
    }

    await client.query('COMMIT');
    return incident;
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
  if (!incidentId || !notificationData?.notification_type || !notificationData?.recipient_email) {
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

    // Fetch DPO contact information for GDPR supervisory notifications
    let dpoInfo = null;
    if (notification.notification_type === 'gdpr_supervisory') {
      try {
        const dpoResult = await client.query(`
          SELECT name, email, contact_number
          FROM dpo_contact_info
          ORDER BY updated_at DESC
          LIMIT 1
        `);
        if (dpoResult.rows.length > 0) {
          dpoInfo = dpoResult.rows[0];
        }
      } catch (dpoError) {
        console.warn('Could not fetch DPO contact information:', dpoError.message);
        // Continue without DPO info - template will handle it gracefully
      }
    }

    // Select appropriate template
    let emailContent;
    let templateUsed;

    if (notification.notification_type === 'gdpr_supervisory') {
      emailContent = renderGDPRSupervisoryTemplate(incident, recipient, dpoInfo);
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
        emailContent.html,
        true // isHtml = true to send as HTML instead of plain text
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
  if (!incidentId || !remediationData?.action_taken) {
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

/**
 * Update remediation action
 * @param {number} remediationId - Remediation ID
 * @param {Object} remediationData - Remediation data { action_taken, effectiveness, notes }
 * @returns {Promise<Object>} Updated remediation object
 */
export const updateRemediation = async (remediationId, remediationData) => {
  if (!remediationId || !remediationData) {
    throw new Error('remediationId and remediationData are required');
  }

  if (!remediationData.action_taken) {
    throw new Error('action_taken is required');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      UPDATE breach_remediations
      SET action_taken = $1,
          effectiveness = $2,
          notes = $3,
          taken_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [
      remediationData.action_taken,
      remediationData.effectiveness || null,
      remediationData.notes || null,
      remediationId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Remediation not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating remediation:', error);
    throw error;
  } finally {
    client.release();
  }
};
