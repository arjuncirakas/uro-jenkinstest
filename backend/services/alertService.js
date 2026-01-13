import pool from '../config/database.js';
import { sendNotificationEmail } from './emailService.js';

/**
 * Alert Service
 * Manages security alerts and notifications
 */

/**
 * Get list of users who should receive security alerts
 * Returns: superadmin users + security team members
 * @returns {Promise<Array>} Array of email addresses
 */
export const getAlertRecipients = async () => {
  try {
    const client = await pool.connect();
    
    try {
      // Get superadmin emails
      const superadminResult = await client.query(`
        SELECT email
        FROM users
        WHERE role = 'superadmin'
          AND email IS NOT NULL
      `);
      
      // Get security team member emails
      const teamResult = await client.query(`
        SELECT email
        FROM security_team_members
        WHERE email IS NOT NULL
      `);
      
      // Combine and deduplicate emails
      const emailSet = new Set();
      
      console.log(`📧 [Alert Recipients] Found ${superadminResult.rows.length} superadmin user(s)`);
      superadminResult.rows.forEach(row => {
        if (row.email) {
          emailSet.add(row.email);
          console.log(`  📧 Superadmin: ${row.email}`);
        }
      });
      
      console.log(`📧 [Alert Recipients] Found ${teamResult.rows.length} security team member(s)`);
      teamResult.rows.forEach(row => {
        if (row.email) {
          emailSet.add(row.email);
          console.log(`  📧 Security Team: ${row.email}`);
        }
      });
      
      const recipients = Array.from(emailSet);
      console.log(`📧 [Alert Recipients] Total unique recipients: ${recipients.length} (${superadminResult.rows.length} superadmin + ${teamResult.rows.length} team members)`);
      
      return recipients;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ [Alert Recipients] Error getting alert recipients:', error);
    console.error('❌ [Alert Recipients] Error stack:', error.stack);
    return [];
  }
};

/**
 * Update an existing alert's details (for lockout threshold count updates)
 * @param {number} alertId - Alert ID
 * @param {Object} updates - Fields to update (message, details)
 * @returns {Promise<Object>} Updated alert
 */
export const updateAlert = async (alertId, updates) => {
  try {
    const { message, details } = updates;
    const client = await pool.connect();
    
    try {
      const updateFields = [];
      const params = [];
      let paramIndex = 1;
      
      if (message !== undefined) {
        updateFields.push(`message = $${paramIndex}`);
        params.push(message);
        paramIndex++;
      }
      
      if (details !== undefined) {
        updateFields.push(`details = $${paramIndex}`);
        params.push(details ? JSON.stringify(details) : null);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      params.push(alertId);
      
      const result = await client.query(`
        UPDATE security_alerts
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);
      
      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }
      
      const alert = result.rows[0];
      if (alert.details) {
        if (typeof alert.details === 'string') {
          alert.details = JSON.parse(alert.details);
        }
      } else {
        alert.details = null;
      }
      
      return alert;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
};

/**
 * Create and store a security alert
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Created alert
 */
export const createAlert = async (alertData) => {
  try {
    const {
      alertType,
      severity,
      userId,
      userEmail,
      ipAddress,
      message,
      details
    } = alertData;
    
    if (!alertType || !severity || !message) {
      throw new Error('Missing required alert fields: alertType, severity, message');
    }
    
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (!validSeverities.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}. Must be one of: ${validSeverities.join(', ')}`);
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO security_alerts (
          alert_type, severity, user_id, user_email, ip_address, message, details, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
        RETURNING *
      `, [
        alertType,
        severity,
        userId || null,
        userEmail || null,
        ipAddress || null,
        message,
        details ? JSON.stringify(details) : null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
};

/**
 * Send alert notification via email
 * Sends to: superadmin users + security team members
 * @param {Object} alert - Alert object
 * @returns {Promise<Object>} Email send result
 */
export const sendAlertNotification = async (alert) => {
  try {
    console.log(`📧 [Email Alert] Starting email notification for alert ID: ${alert.id}, type: ${alert.alert_type}`);
    
    if (!alert) {
      throw new Error('Alert data is required');
    }
    
    // Check if email notifications are enabled
    const alertEmailEnabled = process.env.ALERT_EMAIL_ENABLED;
    console.log(`📧 [Email Alert] ALERT_EMAIL_ENABLED = "${alertEmailEnabled}" (expected: "true")`);
    
    if (alertEmailEnabled !== 'true') {
      console.log('⚠️  [Email Alert] Email notifications are DISABLED');
      console.log('💡 [Email Alert] To enable, add ALERT_EMAIL_ENABLED=true to your .env file');
      return { success: false, message: 'Email notifications disabled' };
    }
    
    // Get alert recipients (superadmin + security team)
    console.log('📧 [Email Alert] Fetching alert recipients (superadmin users + security team members)...');
    const recipients = await getAlertRecipients();
    
    if (recipients.length === 0) {
      console.warn('⚠️  [Email Alert] No alert recipients found!');
      console.warn('💡 [Email Alert] Recipients are: superadmin users + security team members');
      console.warn('💡 [Email Alert] Ensure you have at least one superadmin user or security team member configured');
      return { success: false, message: 'No alert recipients found' };
    }
    
    console.log(`📧 [Email Alert] Will send email to ${recipients.length} recipient(s): ${recipients.join(', ')}`);
    
    // Format email subject
    const subject = `[${alert.severity.toUpperCase()}] Security Alert: ${alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    
    // Format alert type for display
    const formatAlertType = (type) => {
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    // Get severity color
    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'critical':
          return '#dc2626'; // red-600
        case 'high':
          return '#ea580c'; // orange-600
        case 'medium':
          return '#ca8a04'; // yellow-600
        case 'low':
          return '#14b8a6'; // teal-500
        default:
          return '#6b7280'; // gray-500
      }
    };
    
    // Format details for display (no raw JSON)
    const formatDetails = (details) => {
      if (!details || typeof details !== 'object') return '';
      
      let html = '';
      
      // Lockout threshold details
      if (details.failedAttempts !== undefined && details.threshold !== undefined) {
        html += `
          <div style="background-color: #fef2f2; padding: 12px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #dc2626;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>Failed Login Attempts:</strong> ${details.failedAttempts} / ${details.threshold}
            </p>
          </div>
        `;
      }
      
      // Multiple failed logins details
      if (details.failedAttempts !== undefined && details.timeWindow) {
        html += `
          <div style="background-color: #fff7ed; padding: 12px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #ea580c;">
            <p style="margin: 0; color: #9a3412; font-size: 14px;">
              <strong>Failed Attempts:</strong> ${details.failedAttempts} in ${details.timeWindow}
            </p>
          </div>
        `;
      }
      
      // Unusual location details
      if (details.previousIP) {
        html += `
          <div style="background-color: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #ca8a04;">
            <p style="margin: 0; color: #854d0e; font-size: 14px;">
              <strong>Previous IP Address:</strong> ${details.previousIP}
            </p>
          </div>
        `;
      }
      
      // Simultaneous login details
      if (details.activeSessions !== undefined) {
        html += `
          <div style="background-color: #f0fdf4; padding: 12px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #14b8a6;">
            <p style="margin: 0; color: #14532d; font-size: 14px;">
              <strong>Active Sessions:</strong> ${details.activeSessions}
            </p>
          </div>
        `;
      }
      
      return html;
    };
    
    // Parse details if it's a string
    let alertDetails = alert.details;
    if (alertDetails && typeof alertDetails === 'string') {
      try {
        alertDetails = JSON.parse(alertDetails);
      } catch (e) {
        alertDetails = null;
      }
    }
    
    // Create professional HTML email template
    const severityColor = getSeverityColor(alert.severity);
    const formattedTime = new Date(alert.created_at).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${severityColor} 0%, ${severityColor}dd 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                🔒 Security Alert Notification
              </h1>
            </td>
          </tr>
          
          <!-- Alert Badge -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <div style="display: inline-block; background-color: ${severityColor}15; color: ${severityColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${alert.severity}
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <!-- Alert Type -->
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
                ${formatAlertType(alert.alert_type)}
              </h2>
              
              <!-- Message -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${severityColor}; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  ${alert.message}
                </p>
              </div>
              
              <!-- Alert Information -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Time</strong>
                    <p style="margin: 4px 0 0 0; color: #111827; font-size: 15px;">${formattedTime}</p>
                  </td>
                </tr>
                ${alert.user_email ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Affected User</strong>
                    <p style="margin: 4px 0 0 0; color: #111827; font-size: 15px;">${alert.user_email}</p>
                  </td>
                </tr>
                ` : ''}
                ${alert.ip_address ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">IP Address</strong>
                    <p style="margin: 4px 0 0 0; color: #111827; font-size: 15px; font-family: monospace;">${alert.ip_address}</p>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Details Section (formatted, no raw JSON) -->
              ${alertDetails ? formatDetails(alertDetails) : ''}
              
              <!-- Action Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/superadmin/security-dashboard" 
                   style="display: inline-block; background-color: #14b8a6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
                  View in Security Dashboard
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                This is an automated security alert from the
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <strong>Urology Patient Management System</strong>
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">
                Please review this alert in the Security Dashboard for more details and to take appropriate action.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Note -->
        <table role="presentation" style="max-width: 600px; width: 100%; margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 16px;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                This email was sent to security administrators and designated security team members.<br>
                If you believe you received this email in error, please contact your system administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    
    // Plain text fallback
    const emailText = `
Security Alert Notification

Alert Type: ${formatAlertType(alert.alert_type)}
Severity: ${alert.severity.toUpperCase()}
Time: ${formattedTime}

${alert.message}

${alert.user_email ? `Affected User: ${alert.user_email}` : ''}
${alert.ip_address ? `IP Address: ${alert.ip_address}` : ''}
${alertDetails && alertDetails.failedAttempts !== undefined && alertDetails.threshold !== undefined ? `Failed Attempts: ${alertDetails.failedAttempts} / ${alertDetails.threshold}` : ''}

View this alert in the Security Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/superadmin/security-dashboard

This is an automated security alert from the Urology Patient Management System.
    `.trim();
    
    // Send email to all recipients
    console.log(`📧 [Email Alert] Attempting to send email to ${recipients.length} recipient(s)...`);
    const emailResults = [];
    for (const recipient of recipients) {
      try {
        console.log(`📧 [Email Alert] Sending email to: ${recipient}`);
        const result = await sendNotificationEmail(
          recipient,
          subject,
          emailHtml,
          true
        );
        if (result.success) {
          console.log(`✅ [Email Alert] Email sent successfully to ${recipient} (Message ID: ${result.messageId || 'N/A'})`);
        } else {
          console.error(`❌ [Email Alert] Failed to send email to ${recipient}: ${result.error || result.message}`);
        }
        emailResults.push({ recipient, ...result });
      } catch (error) {
        console.error(`❌ [Email Alert] Exception sending email to ${recipient}:`, error);
        console.error(`❌ [Email Alert] Error details:`, {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        emailResults.push({ recipient, success: false, error: error.message });
      }
    }
    
    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = recipients.length - successCount;
    
    if (successCount > 0) {
      console.log(`✅ [Email Alert] Successfully sent to ${successCount}/${recipients.length} recipient(s)`);
    }
    if (failureCount > 0) {
      console.error(`❌ [Email Alert] Failed to send to ${failureCount}/${recipients.length} recipient(s)`);
    }
    
    return {
      success: successCount > 0,
      recipientsCount: recipients.length,
      successCount,
      failureCount,
      results: emailResults
    };
  } catch (error) {
    console.error('❌ [Email Alert] Error sending alert notification:', error);
    console.error('❌ [Email Alert] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

/**
 * Get active (unresolved) alerts
 * @param {Object} filters - Filter options (status, severity, limit, offset)
 * @returns {Promise<Object>} Alerts and pagination info
 */
export const getActiveAlerts = async (filters = {}) => {
  try {
    const client = await pool.connect();
    
    try {
      let query = 'SELECT * FROM security_alerts WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      // Filter by status
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      } else {
        // Default: only new and acknowledged alerts (not resolved)
        query += ` AND status != 'resolved'`;
      }
      
      // Filter by severity
      if (filters.severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = await client.query(countQuery, params);
      const total = Number.parseInt(countResult.rows[0].total, 10);
      
      // Add ordering and pagination
      query += ' ORDER BY created_at DESC';
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // Parse JSONB details field
      const alerts = result.rows.map(row => {
        let details = null;
        if (row.details) {
          if (typeof row.details === 'string') {
            details = JSON.parse(row.details);
          } else {
            details = row.details;
          }
        }
        return {
          ...row,
          details
        };
      });
      
      return {
        alerts,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting active alerts:', error);
    throw error;
  }
};

/**
 * Acknowledge an alert
 * @param {number} alertId - Alert ID
 * @param {number} userId - User ID who acknowledged
 * @returns {Promise<Object>} Updated alert
 */
export const acknowledgeAlert = async (alertId, userId) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE security_alerts
        SET status = 'acknowledged',
            acknowledged_by = $1,
            acknowledged_at = NOW()
        WHERE id = $2
          AND status = 'new'
        RETURNING *
      `, [userId, alertId]);
      
      if (result.rows.length === 0) {
        throw new Error('Alert not found or already acknowledged/resolved');
      }
      
      const alert = result.rows[0];
      if (alert.details) {
        if (typeof alert.details === 'string') {
          alert.details = JSON.parse(alert.details);
        }
      } else {
        alert.details = null;
      }
      
      return alert;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
};

/**
 * Resolve an alert
 * For lockout_threshold alerts, also resets the user's failed_login_attempts
 * @param {number} alertId - Alert ID
 * @param {number} userId - User ID who resolved
 * @returns {Promise<Object>} Updated alert
 */
export const resolveAlert = async (alertId, userId) => {
  try {
    const client = await pool.connect();
    
    try {
      // First, get the alert to check if it's a lockout_threshold alert
      const alertResult = await client.query(`
        SELECT * FROM security_alerts WHERE id = $1
      `, [alertId]);
      
      if (alertResult.rows.length === 0) {
        throw new Error('Alert not found');
      }
      
      const alert = alertResult.rows[0];
      
      // Update alert status
      const result = await client.query(`
        UPDATE security_alerts
        SET status = 'resolved',
            resolved_by = $1,
            resolved_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [userId, alertId]);
      
      const updatedAlert = result.rows[0];
      
      // If this is a lockout_threshold alert, reset the user's failed_login_attempts
      if (alert.alert_type === 'lockout_threshold' && alert.user_id) {
        console.log(`🔄 [Alert Resolve] Resetting failed_login_attempts for user ID: ${alert.user_id}`);
        await client.query(`
          UPDATE users
          SET failed_login_attempts = 0
          WHERE id = $1
        `, [alert.user_id]);
        console.log(`✅ [Alert Resolve] Successfully reset failed_login_attempts for user ID: ${alert.user_id}`);
      }
      
      // Parse details if present
      if (updatedAlert.details) {
        if (typeof updatedAlert.details === 'string') {
          updatedAlert.details = JSON.parse(updatedAlert.details);
        }
      } else {
        updatedAlert.details = null;
      }
      
      return updatedAlert;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
};
