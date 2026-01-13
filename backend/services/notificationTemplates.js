/**
 * Notification Templates Service
 * Provides GDPR, HIPAA, and individual patient notification email templates
 */

/**
 * Render GDPR Supervisory Authority notification template (72-hour requirement)
 * @param {Object} incident - Breach incident object
 * @param {Object} recipient - Recipient information { name, email }
 * @returns {Object} Email object with subject and HTML body
 */
export const renderGDPRSupervisoryTemplate = (incident, recipient) => {
  if (!incident || !recipient) {
    throw new Error('incident and recipient are required');
  }

  const incidentDate = new Date(incident.detected_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const affectedDataTypes = incident.affected_data_types?.join(', ') || 'Not specified';
  const affectedUsersCount = incident.affected_users?.length || 0;

  const subject = `GDPR Data Breach Notification - Incident #${incident.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GDPR Data Breach Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 4px solid #dc3545;">
        <h1 style="color: #dc3545; margin-top: 0;">GDPR Data Breach Notification</h1>
        <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
          This notification is sent in compliance with Article 33 of the GDPR (72-hour notification requirement).
        </p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Incident Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 200px;">Incident ID:</td>
              <td style="padding: 8px 0;">#${incident.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Incident Type:</td>
              <td style="padding: 8px 0;">${incident.incident_type || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Severity:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${getSeverityColor(incident.severity)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${incident.severity?.toUpperCase() || 'UNKNOWN'}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Detected At:</td>
              <td style="padding: 8px 0;">${incidentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Affected Data Types:</td>
              <td style="padding: 8px 0;">${affectedDataTypes}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Affected Individuals:</td>
              <td style="padding: 8px 0;">${affectedUsersCount} individual(s)</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Description</h2>
          <p style="margin: 0; white-space: pre-wrap;">${incident.description || 'No description provided.'}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <h3 style="color: #856404; margin-top: 0; font-size: 16px;">⚠️ Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            <li>Investigation is ongoing</li>
            <li>Remediation measures are being implemented</li>
            <li>Affected individuals will be notified as required</li>
            <li>Additional information will be provided as it becomes available</li>
          </ul>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #004085;">
            <strong>Contact Information:</strong><br>
            For questions regarding this incident, please contact our Data Protection Officer at the contact details provided in our privacy policy.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          This is an automated notification sent in compliance with GDPR Article 33.<br>
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

/**
 * Render HIPAA HHS notification template (60-day requirement)
 * @param {Object} incident - Breach incident object
 * @param {Object} recipient - Recipient information { name, email }
 * @returns {Object} Email object with subject and HTML body
 */
export const renderHIPAAHHSTemplate = (incident, recipient) => {
  if (!incident || !recipient) {
    throw new Error('incident and recipient are required');
  }

  const incidentDate = new Date(incident.detected_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const affectedDataTypes = incident.affected_data_types?.join(', ') || 'Not specified';
  const affectedUsersCount = incident.affected_users?.length || 0;

  const subject = `HIPAA Breach Notification - Incident #${incident.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HIPAA Breach Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 4px solid #0066cc;">
        <h1 style="color: #0066cc; margin-top: 0;">HIPAA Breach Notification</h1>
        <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
          This notification is sent in compliance with HIPAA Breach Notification Rule (45 CFR §§ 164.400-414).
        </p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Breach Incident Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 200px;">Incident ID:</td>
              <td style="padding: 8px 0;">#${incident.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Breach Type:</td>
              <td style="padding: 8px 0;">${incident.incident_type || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Severity:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${getSeverityColor(incident.severity)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${incident.severity?.toUpperCase() || 'UNKNOWN'}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date of Breach:</td>
              <td style="padding: 8px 0;">${incidentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Protected Health Information (PHI) Affected:</td>
              <td style="padding: 8px 0;">${affectedDataTypes}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Number of Individuals Affected:</td>
              <td style="padding: 8px 0;">${affectedUsersCount} individual(s)</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Breach Description</h2>
          <p style="margin: 0; white-space: pre-wrap;">${incident.description || 'No description provided.'}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <h3 style="color: #856404; margin-top: 0; font-size: 16px;">⚠️ Remediation Actions</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            <li>Immediate containment measures have been implemented</li>
            <li>Investigation is ongoing to determine the full scope</li>
            <li>Affected individuals are being notified as required</li>
            <li>Security measures are being enhanced to prevent future breaches</li>
          </ul>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #004085;">
            <strong>Contact Information:</strong><br>
            For questions regarding this breach, please contact our Privacy Officer at the contact details provided in our Notice of Privacy Practices.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          This is an automated notification sent in compliance with HIPAA Breach Notification Rule.<br>
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

/**
 * Render individual patient notification template
 * @param {Object} incident - Breach incident object
 * @param {Object} patient - Patient information { name, email }
 * @returns {Object} Email object with subject and HTML body
 */
export const renderIndividualPatientTemplate = (incident, patient) => {
  if (!incident || !patient) {
    throw new Error('incident and patient are required');
  }

  const incidentDate = new Date(incident.detected_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const patientName = patient.name || 'Valued Patient';
  const affectedDataTypes = incident.affected_data_types?.join(', ') || 'your personal information';

  const subject = `Important: Data Security Incident Notification`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Data Security Incident Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 4px solid #dc3545;">
        <h1 style="color: #dc3545; margin-top: 0;">Important Security Notice</h1>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Dear ${patientName},
        </p>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          We are writing to inform you of a data security incident that may have affected your personal information.
        </p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What Happened?</h2>
          <p style="margin: 0; white-space: pre-wrap;">${incident.description || 'A security incident was detected that may have involved your personal information.'}</p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What Information Was Involved?</h2>
          <p style="margin: 0;">The following types of information may have been affected: <strong>${affectedDataTypes}</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Date of incident: ${incidentDate}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #0066cc; margin-top: 0; font-size: 18px;">What We Are Doing</h2>
          <ul style="margin: 0; padding-left: 20px;">
            <li>We have taken immediate steps to contain the incident</li>
            <li>We are conducting a thorough investigation</li>
            <li>We are implementing additional security measures</li>
            <li>We are notifying all affected individuals</li>
            <li>We are working with relevant authorities as required</li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin-top: 0; font-size: 18px;">What You Can Do</h2>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            <li>Monitor your accounts and statements for any unusual activity</li>
            <li>Review your credit reports regularly</li>
            <li>Be cautious of suspicious emails or phone calls</li>
            <li>Consider placing a fraud alert on your credit file</li>
            <li>Report any suspicious activity immediately</li>
          </ul>
        </div>

        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #0c5460; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #0c5460;">
            <strong>For More Information:</strong><br>
            If you have questions or concerns about this incident, please contact us using the contact information provided in our privacy policy or patient portal.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            We sincerely apologize for any concern this may cause. The security and privacy of your information is of the utmost importance to us.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          This notification is sent in compliance with applicable data protection regulations.<br>
          Please do not reply to this email. For questions, please use the contact information provided above.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

/**
 * Get severity color for badges
 * @param {string} severity - Severity level
 * @returns {string} Hex color code
 */
const getSeverityColor = (severity) => {
  const colors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };
  return colors[severity?.toLowerCase()] || '#6c757d';
};
