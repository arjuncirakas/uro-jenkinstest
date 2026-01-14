import apiClient from '../config/axios.js';

/**
 * Data Audit Service
 * Handles all API calls for data audit functionality
 */
export const dataAuditService = {
  /**
   * Get data inventory - all data types, storage locations, and volumes
   */
  getDataInventory: async () => {
    try {
      const response = await apiClient.get('/superadmin/data-audit/inventory');
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Error fetching data inventory:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch data inventory',
        data: null
      };
    }
  },

  /**
   * Get access logs with optional filters
   * @param {Object} filters - Filter options (userId, startDate, endDate, actionType, resourceType, page, limit)
   */
  getAccessLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await apiClient.get(`/superadmin/data-audit/access-logs?${params.toString()}`);
      return {
        success: true,
        data: response.data.data || { logs: [], pagination: {} }
      };
    } catch (error) {
      console.error('Error fetching access logs:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch access logs',
        data: { logs: [], pagination: {} }
      };
    }
  },

  /**
   * Get processing activities aggregated by action type
   * @param {Object} filters - Filter options (startDate, endDate, actionType, resourceType)
   */
  getProcessingActivities: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);

      const response = await apiClient.get(`/superadmin/data-audit/processing-activities?${params.toString()}`);
      return {
        success: true,
        data: response.data.data || { activities: [] }
      };
    } catch (error) {
      console.error('Error fetching processing activities:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch processing activities',
        data: { activities: [] }
      };
    }
  },

  /**
   * Get retention information and lifecycle data
   */
  getRetentionInfo: async () => {
    try {
      const response = await apiClient.get('/superadmin/data-audit/retention');
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Error fetching retention info:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch retention information',
        data: null
      };
    }
  },

  /**
   * Get third-party sharing events
   * @param {Object} filters - Filter options (startDate, endDate, userId)
   */
  getThirdPartySharing: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await apiClient.get(`/superadmin/data-audit/third-party-sharing?${params.toString()}`);
      return {
        success: true,
        data: response.data.data || { sharingEvents: [] }
      };
    } catch (error) {
      console.error('Error fetching third-party sharing:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch third-party sharing data',
        data: { sharingEvents: [] }
      };
    }
  },

  /**
   * Get compliance metrics and overall compliance status
   */
  getComplianceMetrics: async () => {
    try {
      const response = await apiClient.get('/superadmin/data-audit/compliance-metrics');
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch compliance metrics',
        data: null
      };
    }
  },

  /**
   * Get chart data for visualization (time-series data)
   */
  getChartData: async () => {
    try {
      const response = await apiClient.get('/superadmin/data-audit/chart-data');
      return {
        success: true,
        data: response.data.data || { loginTrends: [], phiAccessTrends: [], exportTrends: [] }
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch chart data',
        data: { loginTrends: [], phiAccessTrends: [], exportTrends: [] }
      };
    }
  },

  /**
   * Get verified users list
   */
  getVerifiedUsers: async () => {
    try {
      const response = await apiClient.get('/superadmin/users?status=active&limit=1000');
      return {
        success: true,
        data: response.data.data?.users || response.data.users || []
      };
    } catch (error) {
      console.error('Error fetching verified users:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch verified users',
        data: []
      };
    }
  },

  /**
   * Export audit report in specified format
   * @param {string} format - Export format ('csv' or 'pdf')
   * @param {Object} options - Export options (section, filters, etc.)
   */
  exportAuditReport: async (format = 'csv', options = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (options.section) params.append('section', options.section);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.userId) params.append('userId', options.userId);

      const responseType = 'blob';
      const response = await apiClient.get(`/superadmin/data-audit/export?${params.toString()}`, {
        responseType
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-audit-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Report exported successfully'
      };
    } catch (error) {
      console.error('Error exporting audit report:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to export audit report'
      };
    }
  }
};

export default dataAuditService;

