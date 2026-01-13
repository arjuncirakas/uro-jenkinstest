import apiClient from '../config/axios.js';

/**
 * Behavioral Analytics Service
 * Handles API calls for behavioral analytics functionality
 */

class BehavioralAnalyticsService {
  /**
   * Get all baselines for a user
   * @param {number|string} userIdOrEmail - User ID or email address
   */
  async getBaselines(userIdOrEmail) {
    try {
      // Check if it's an email (contains @) or user ID
      const isEmail = typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@');
      const param = isEmail ? `email=${encodeURIComponent(userIdOrEmail)}` : `userId=${userIdOrEmail}`;
      const response = await apiClient.get(`/superadmin/behavioral-analytics/baselines?${param}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching baselines:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch baselines',
        data: []
      };
    }
  }

  /**
   * Get anomalies with filters
   * @param {Object} filters - Filter options { status, severity, userId, startDate, endDate, limit, offset }
   */
  async getAnomalies(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await apiClient.get(`/superadmin/behavioral-analytics/anomalies?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch anomalies',
        data: [],
        pagination: {}
      };
    }
  }

  /**
   * Update anomaly status
   * @param {number} anomalyId - Anomaly ID
   * @param {string} status - New status
   * @param {number} reviewedBy - User ID of reviewer
   */
  async updateAnomalyStatus(anomalyId, status, reviewedBy = null) {
    try {
      const response = await apiClient.put(`/superadmin/behavioral-analytics/anomalies/${anomalyId}`, {
        status,
        reviewedBy
      });
      return response.data;
    } catch (error) {
      console.error('Error updating anomaly status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update anomaly status'
      };
    }
  }

  /**
   * Calculate baseline for a user
   * @param {number|string} userIdOrEmail - User ID or email address
   * @param {string} baselineType - Type: 'location', 'time', or 'access_pattern'
   */
  async calculateBaseline(userIdOrEmail, baselineType) {
    try {
      // Check if it's an email (contains @) or user ID
      const isEmail = typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@');
      const requestBody = isEmail 
        ? { email: userIdOrEmail, baselineType }
        : { userId: userIdOrEmail, baselineType };
      
      const response = await apiClient.post('/superadmin/behavioral-analytics/baselines/calculate', requestBody);
      return response.data;
    } catch (error) {
      console.error('Error calculating baseline:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to calculate baseline'
      };
    }
  }

  /**
   * Get anomaly statistics
   */
  async getStatistics() {
    try {
      const response = await apiClient.get('/superadmin/behavioral-analytics/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch statistics',
        data: {}
      };
    }
  }
}

export default new BehavioralAnalyticsService();
