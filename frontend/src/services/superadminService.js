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
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.role) queryParams.append('role', params.role);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);

      const response = await apiClient.get(`/superadmin/users?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
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
