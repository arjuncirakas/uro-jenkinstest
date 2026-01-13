import apiClient from '../config/axios.js';

/**
 * Breach Notification Service
 * Handles API calls for breach incident management
 */

class BreachNotificationService {
  /**
   * Create a breach incident
   * @param {Object} data - Incident data
   */
  async createIncident(data) {
    try {
      const response = await apiClient.post('/superadmin/breach-incidents', data);
      return response.data;
    } catch (error) {
      console.error('Error creating incident:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create incident'
      };
    }
  }

  /**
   * Get incidents with filters
   * @param {Object} filters - Filter options
   */
  async getIncidents(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await apiClient.get(`/superadmin/breach-incidents?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch incidents',
        data: [],
        pagination: {}
      };
    }
  }

  /**
   * Update incident status
   * @param {number} incidentId - Incident ID
   * @param {string} status - New status
   */
  async updateIncidentStatus(incidentId, status) {
    try {
      const response = await apiClient.put(`/superadmin/breach-incidents/${incidentId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating incident status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update incident status'
      };
    }
  }

  /**
   * Create a notification record
   * @param {number} incidentId - Incident ID
   * @param {Object} data - Notification data
   */
  async createNotification(incidentId, data) {
    try {
      const response = await apiClient.post(`/superadmin/breach-incidents/${incidentId}/notifications`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create notification'
      };
    }
  }

  /**
   * Send notification email (manual trigger)
   * @param {number} notificationId - Notification ID
   */
  async sendNotification(notificationId) {
    try {
      const response = await apiClient.post(`/superadmin/breach-notifications/${notificationId}/send`);
      return response.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send notification'
      };
    }
  }

  /**
   * Get all notifications for an incident
   * @param {number} incidentId - Incident ID
   */
  async getNotifications(incidentId) {
    try {
      const response = await apiClient.get(`/superadmin/breach-incidents/${incidentId}/notifications`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch notifications',
        data: []
      };
    }
  }

  /**
   * Add remediation action
   * @param {number} incidentId - Incident ID
   * @param {Object} data - Remediation data
   */
  async addRemediation(incidentId, data) {
    try {
      const response = await apiClient.post(`/superadmin/breach-incidents/${incidentId}/remediations`, data);
      return response.data;
    } catch (error) {
      console.error('Error adding remediation:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add remediation'
      };
    }
  }

  /**
   * Get remediations for an incident
   * @param {number} incidentId - Incident ID
   */
  async getRemediations(incidentId) {
    try {
      const response = await apiClient.get(`/superadmin/breach-incidents/${incidentId}/remediations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching remediations:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch remediations',
        data: []
      };
    }
  }
}

export default new BreachNotificationService();
