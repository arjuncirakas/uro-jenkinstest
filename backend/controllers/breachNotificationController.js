import {
  createIncident,
  getIncidents,
  updateIncidentStatus,
  createNotification,
  sendNotification,
  getNotifications,
  getRemediations,
  addRemediation,
  updateRemediation
} from '../services/breachNotificationService.js';

/**
 * Breach Notification Controller
 * Handles API endpoints for breach incident management
 */

/**
 * Create a breach incident
 * POST /api/superadmin/breach-incidents
 */
export const createIncidentController = async (req, res) => {
  try {
    const {
      incident_type,
      severity,
      description,
      affected_users,
      affected_data_types,
      detected_at,
      anomaly_id
    } = req.body;

    if (!incident_type || !severity || !description) {
      return res.status(400).json({
        success: false,
        message: 'incident_type, severity, and description are required'
      });
    }

    const incidentData = {
      incident_type,
      severity,
      description,
      affected_users: affected_users || [],
      affected_data_types: affected_data_types || [],
      detected_at: detected_at ? new Date(detected_at) : new Date(),
      reported_by: req.user?.id || null,
      status: 'draft',
      anomaly_id: anomaly_id || null
    };

    const incident = await createIncident(incidentData);

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident created successfully'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get incidents with filters
 * GET /api/superadmin/breach-incidents?status=confirmed&severity=high&limit=50&offset=0
 */
export const getIncidentsController = async (req, res) => {
  try {
    const {
      status,
      severity,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await getIncidents(filters);

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset
      }
    });
  } catch (error) {
    console.error('Error getting incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve incidents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update incident status
 * PUT /api/superadmin/breach-incidents/:id/status
 */
export const updateIncidentStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const incident = await updateIncidentStatus(parseInt(id), status);

    res.json({
      success: true,
      data: incident,
      message: 'Incident status updated successfully'
    });
  } catch (error) {
    console.error('Error updating incident status:', error);
    
    if (error.message === 'Incident not found') {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update incident status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a notification record
 * POST /api/superadmin/breach-incidents/:id/notifications
 */
export const createNotificationController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      notification_type,
      recipient_type,
      recipient_email,
      recipient_name
    } = req.body;

    if (!notification_type || !recipient_email) {
      return res.status(400).json({
        success: false,
        message: 'notification_type and recipient_email are required'
      });
    }

    const notificationData = {
      notification_type,
      recipient_type: (() => {
        if (recipient_type) return recipient_type;
        if (notification_type === 'gdpr_supervisory') return 'supervisory_authority';
        if (notification_type === 'hipaa_hhs') return 'hhs';
        return 'individual';
      })(),
      recipient_email,
      recipient_name: recipient_name || null,
      sent_by: req.user?.id || null
    };

    const notification = await createNotification(parseInt(id), notificationData);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send notification email (manual trigger)
 * POST /api/superadmin/breach-notifications/:id/send
 */
export const sendNotificationController = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await sendNotification(parseInt(id));

    res.json({
      success: notification.status === 'sent',
      data: notification,
      message: notification.status === 'sent' 
        ? 'Notification sent successfully' 
        : `Notification failed: ${notification.error_message || 'Unknown error'}`
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all notifications for an incident
 * GET /api/superadmin/breach-incidents/:id/notifications
 */
export const getNotificationsController = async (req, res) => {
  try {
    const { id } = req.params;

    const notifications = await getNotifications(parseInt(id));

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add remediation action
 * POST /api/superadmin/breach-incidents/:id/remediations
 */
export const addRemediationController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action_taken,
      effectiveness,
      notes
    } = req.body;

    if (!action_taken) {
      return res.status(400).json({
        success: false,
        message: 'action_taken is required'
      });
    }

    const remediationData = {
      action_taken,
      taken_by: req.user?.id || null,
      effectiveness: effectiveness || null,
      notes: notes || null
    };

    const remediation = await addRemediation(parseInt(id), remediationData);

    res.status(201).json({
      success: true,
      data: remediation,
      message: 'Remediation added successfully'
    });
  } catch (error) {
    console.error('Error adding remediation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add remediation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get remediations for an incident
 * GET /api/superadmin/breach-incidents/:id/remediations
 */
export const getRemediationsController = async (req, res) => {
  try {
    const { id } = req.params;

    const remediations = await getRemediations(parseInt(id));

    res.json({
      success: true,
      data: remediations
    });
  } catch (error) {
    console.error('Error getting remediations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve remediations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update remediation action
 * PUT /api/superadmin/breach-remediations/:id
 */
export const updateRemediationController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action_taken,
      effectiveness,
      notes
    } = req.body;

    if (!action_taken) {
      return res.status(400).json({
        success: false,
        message: 'action_taken is required'
      });
    }

    const remediationData = {
      action_taken,
      effectiveness: effectiveness || null,
      notes: notes || null
    };

    const remediation = await updateRemediation(parseInt(id), remediationData);

    res.json({
      success: true,
      data: remediation,
      message: 'Remediation updated successfully'
    });
  } catch (error) {
    console.error('Error updating remediation:', error);
    
    if (error.message === 'Remediation not found') {
      return res.status(404).json({
        success: false,
        message: 'Remediation not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update remediation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
