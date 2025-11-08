import apiClient, { handleApiError } from '../config/axios.js';

class SuperadminService {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/superadmin/dashboard-stats');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get all users with pagination and filters
  async getAllUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Always include page and limit
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 10);
      
      // Only add filters if they have non-empty values
      if (params.role && String(params.role).trim() !== '') {
        queryParams.append('role', String(params.role).trim());
      }
      if (params.search && String(params.search).trim() !== '') {
        queryParams.append('search', String(params.search).trim());
      }
      if (params.status && String(params.status).trim() !== '' && String(params.status).trim() !== 'all') {
        queryParams.append('status', String(params.status).trim().toLowerCase());
      }

      const queryString = queryParams.toString();
      const response = await apiClient.get(`/superadmin/users?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Frontend getAllUsers - Error:', error);
      throw handleApiError(error);
    }
  }

  // Get user by ID
  async getUserById(id) {
    try {
      const response = await apiClient.get(`/superadmin/users/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      const response = await apiClient.post('/superadmin/users', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Update user
  async updateUser(id, userData) {
    try {
      const response = await apiClient.put(`/superadmin/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const response = await apiClient.delete(`/superadmin/users/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Resend password setup email
  async resendPasswordSetup(id) {
    try {
      const response = await apiClient.post(`/superadmin/users/${id}/resend-password-setup`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Create and export singleton instance
const superadminService = new SuperadminService();
export default superadminService;
