import apiClient from '../config/axios.js';

/**
 * Security Dashboard Service
 * Handles API calls for security alerts and team management
 */

class SecurityDashboardService {
  /**
   * Get all security alerts
   */
  async getSecurityAlerts(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await apiClient.get(`/superadmin/security-alerts?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch security alerts'
      };
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    try {
      const response = await apiClient.get('/superadmin/security-alerts/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch alert statistics'
      };
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId) {
    try {
      const response = await apiClient.post(`/superadmin/security-alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to acknowledge alert'
      };
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId) {
    try {
      const response = await apiClient.post(`/superadmin/security-alerts/${alertId}/resolve`);
      return response.data;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resolve alert'
      };
    }
  }

  /**
   * Get all security team members
   */
  async getSecurityTeamMembers() {
    try {
      const response = await apiClient.get('/superadmin/security-team');
      return response.data;
    } catch (error) {
      console.error('Error fetching security team members:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch security team members'
      };
    }
  }

  /**
   * Add new security team member
   */
  async addSecurityTeamMember(name, email) {
    try {
      const response = await apiClient.post('/superadmin/security-team', { name, email });
      return response.data;
    } catch (error) {
      console.error('Error adding security team member:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add security team member'
      };
    }
  }

  /**
   * Remove security team member
   */
  async removeSecurityTeamMember(memberId) {
    try {
      const response = await apiClient.delete(`/superadmin/security-team/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing security team member:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove security team member'
      };
    }
  }

  /**
   * Get DPO contact information
   */
  async getDPOContactInfo() {
    try {
      const response = await apiClient.get('/auth/dpo-contact');
      return response.data;
    } catch (error) {
      console.error('Error fetching DPO contact info:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch DPO contact information'
      };
    }
  }

  /**
   * Set DPO contact information (add or update)
   */
  async setDPOContactInfo(name, email, contactNumber) {
    try {
      const response = await apiClient.post('/superadmin/dpo-contact', {
        name,
        email,
        contact_number: contactNumber
      });
      return response.data;
    } catch (error) {
      console.error('Error setting DPO contact info:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to save DPO contact information'
      };
    }
  }
}

export const securityDashboardService = new SecurityDashboardService();
export default securityDashboardService;
