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
      // If filtering by department with category 'doctor', use the dedicated filter endpoint
      if (params.category === 'doctor' && params.department_id && String(params.department_id).trim() !== '') {
        return this.filterUsers(params);
      }
      
      const queryParams = new URLSearchParams();
      
      // Always include page and limit
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 10);
      
      // Only add filters if they have non-empty values
      // Prefer category over role (for backward compatibility)
      if (params.category && String(params.category).trim() !== '') {
        queryParams.append('category', String(params.category).trim());
      } else if (params.role && String(params.role).trim() !== '') {
        queryParams.append('role', String(params.role).trim());
      }
      if (params.search && String(params.search).trim() !== '') {
        queryParams.append('search', String(params.search).trim());
      }
      if (params.status && String(params.status).trim() !== '' && String(params.status).trim() !== 'all') {
        queryParams.append('status', String(params.status).trim().toLowerCase());
      }
      if (params.department_id && String(params.department_id).trim() !== '') {
        queryParams.append('department_id', String(params.department_id).trim());
      }

      const queryString = queryParams.toString();
      const response = await apiClient.get(`/superadmin/users?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Frontend getAllUsers - Error:', error);
      throw handleApiError(error);
    }
  }

  // Filter users with department support
  async filterUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Only add filters if they have non-empty values
      // Prefer category over role (for backward compatibility)
      if (params.category && String(params.category).trim() !== '') {
        queryParams.append('category', String(params.category).trim());
      } else if (params.role && String(params.role).trim() !== '') {
        queryParams.append('role', String(params.role).trim());
      }
      if (params.search && String(params.search).trim() !== '') {
        queryParams.append('search', String(params.search).trim());
      }
      if (params.status && String(params.status).trim() !== '' && String(params.status).trim() !== 'all') {
        queryParams.append('status', String(params.status).trim().toLowerCase());
      }
      // Only add department_id if it's not empty and not "All Departments"
      const deptId = params.department_id ? String(params.department_id).trim() : '';
      if (deptId !== '' && deptId !== 'all') {
        queryParams.append('department_id', deptId);
      }

      const queryString = queryParams.toString();
      const response = await apiClient.get(`/superadmin/users/filter?${queryString}`);
      
      // Format response to match getAllUsers format
      return {
        success: response.data.success,
        data: {
          users: response.data.data.users,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalUsers: response.data.data.count,
            limit: response.data.data.count
          }
        }
      };
    } catch (error) {
      console.error('❌ Frontend filterUsers - Error:', error);
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
      console.log('🚀 [SuperadminService] Creating user with data:', userData);
      console.log('🚀 [SuperadminService] API endpoint: /superadmin/users');
      console.log('🚀 [SuperadminService] Request payload:', JSON.stringify(userData, null, 2));
      
      const response = await apiClient.post('/superadmin/users', userData);
      
      console.log('✅ [SuperadminService] User created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SuperadminService] Error creating user:', error);
      console.error('❌ [SuperadminService] Error response:', error.response?.data);
      console.error('❌ [SuperadminService] Error status:', error.response?.status);
      console.error('❌ [SuperadminService] Error message:', error.message);
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
