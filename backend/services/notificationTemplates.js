/**
 * Notification Templates Service
 * Provides GDPR, HIPAA, and individual patient notification email templates
 */

/**
 * Clean incident description by removing technical debug information
 * @param {string} description - Raw incident description
 * @returns {string} Cleaned description
 */
const cleanIncidentDescription = (description) => {
  if (!description) return 'No description provided.';
  
  // Remove technical debug patterns like "Event Hour: 17:00 | Average Hour: 2:00 | Expected Hours: 2:00"
  let cleaned = description
    .replace(/Event Hour:\s*\d{1,2}:\d{2}\s*\|\s*/gi, '')
    .replace(/Average Hour:\s*\d{1,2}:\d{2}\s*\|\s*/gi, '')
    .replace(/Expected Hours:\s*[\d:,\s]+\s*\|\s*/gi, '')
    .replace(/\|\s*$/g, '')
    .trim();
  
  // If description becomes empty after cleaning, provide a default
  if (!cleaned || cleaned.length === 0) {
    return 'A data security incident has been detected. Investigation and remediation measures are in progress.';
  }
  
  return cleaned;
};

/**
 * Render GDPR Supervisory Authority notification template (72-hour requirement)
 * @param {Object} incident - Breach incident object
 * @param {Object} recipient - Recipient information { name, email }
 * @param {Object} dpoInfo - DPO contact information { name, email, contact_number } (optional)
 * @returns {Object} Email object with subject and HTML body
 */
export const renderGDPRSupervisoryTemplate = (incident, recipient, dpoInfo = null) => {
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
  const cleanedDescription = cleanIncidentDescription(incident.description);

  // Format incident type for display
  const formatIncidentType = (type) => {
    if (!type) return 'Not specified';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const subject = `GDPR Data Breach Notification - Incident #${incident.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GDPR Data Breach Notification</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table role="presentation" style="max-width: 800px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                    GDPR Data Breach Notification
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.95;">
                    Article 33 Compliance - 72-Hour Notification Requirement
                  </p>
                </td>
              </tr>

              <!-- Compliance Notice -->
              <tr>
                <td style="padding: 20px 40px; background-color: #fff3cd; border-bottom: 1px solid #ffc107;">
                  <p style="margin: 0; font-size: 13px; color: #856404; line-height: 1.5;">
                    <strong>Compliance Notice:</strong> This notification is sent in compliance with Article 33 of the General Data Protection Regulation (GDPR), which requires data controllers to notify the supervisory authority of a personal data breach within 72 hours of becoming aware of it.
                  </p>
                </td>
              </tr>

              <!-- Incident Details -->
              <tr>
                <td style="padding: 30px 40px;">
                  <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
                    Incident Details
                  </h2>
                  <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; width: 220px; color: #495057; vertical-align: top;">Incident ID:</td>
                      <td style="padding: 10px 0; color: #212529;">#${incident.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #495057; vertical-align: top;">Incident Type:</td>
                      <td style="padding: 10px 0; color: #212529;">${formatIncidentType(incident.incident_type)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #495057; vertical-align: top;">Severity Level:</td>
                      <td style="padding: 10px 0;">
                        <span style="display: inline-block; background-color: ${getSeverityColor(incident.severity)}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${incident.severity?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #495057; vertical-align: top;">Date & Time Detected:</td>
                      <td style="padding: 10px 0; color: #212529;">${incidentDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #495057; vertical-align: top;">Affected Data Types:</td>
                      <td style="padding: 10px 0; color: #212529;">${affectedDataTypes}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; font-weight: 600; color: #495057; vertical-align: top;">Number of Affected Individuals:</td>
                      <td style="padding: 10px 0; color: #212529;">${affectedUsersCount} individual(s)</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Description -->
              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d;">
                    <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Incident Description</h3>
                    <p style="margin: 0; color: #212529; white-space: pre-wrap; line-height: 1.7;">${cleanedDescription}</p>
                  </div>
                </td>
              </tr>

              <!-- Remediation Actions -->
              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <div style="background-color: #e7f3ff; padding: 25px; border-radius: 8px; border-left: 4px solid #0066cc;">
                    <h3 style="color: #004085; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Remediation Actions & Next Steps</h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #004085;">
                          <strong>1. Immediate Containment:</strong> The incident has been contained to prevent further unauthorized access or data exposure.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #004085;">
                          <strong>2. Investigation:</strong> A comprehensive investigation is currently underway to determine the full scope and impact of the breach.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #004085;">
                          <strong>3. Remediation Measures:</strong> Appropriate technical and organizational measures are being implemented to address the vulnerabilities identified.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #004085;">
                          <strong>4. Individual Notification:</strong> Affected data subjects will be notified without undue delay, in accordance with Article 34 of the GDPR, where the breach is likely to result in a high risk to their rights and freedoms.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #004085;">
                          <strong>5. Ongoing Monitoring:</strong> Enhanced monitoring and security measures have been implemented to prevent similar incidents in the future.
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Contact Information -->
              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <div style="background-color: #d1ecf1; padding: 25px; border-radius: 8px; border-left: 4px solid #0c5460;">
                    <h3 style="color: #0c5460; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Contact Information</h3>
                    ${dpoInfo && dpoInfo.name ? `
                      <p style="margin: 0 0 12px 0; color: #0c5460; font-size: 15px;">
                        <strong>Data Protection Officer:</strong><br>
                        ${dpoInfo.name}
                      </p>
                      <p style="margin: 0 0 12px 0; color: #0c5460; font-size: 15px;">
                        <strong>Email:</strong> <a href="mailto:${dpoInfo.email}" style="color: #0066cc; text-decoration: none;">${dpoInfo.email}</a>
                      </p>
                      ${dpoInfo.contact_number ? `
                        <p style="margin: 0; color: #0c5460; font-size: 15px;">
                          <strong>Phone:</strong> ${dpoInfo.contact_number}
                        </p>
                      ` : ''}
                    ` : `
                      <p style="margin: 0; color: #0c5460; font-size: 15px; line-height: 1.6;">
                        For questions regarding this incident, please contact our Data Protection Officer using the contact details provided in our privacy policy or through our official communication channels.
                      </p>
                    `}
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                    This is an automated notification sent in compliance with GDPR Article 33.<br>
                    <strong>Please do not reply to this email.</strong> For inquiries, please use the contact information provided above.
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 11px; color: #adb5bd;">
                    Urology Patient Management System | Data Protection & Compliance
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
