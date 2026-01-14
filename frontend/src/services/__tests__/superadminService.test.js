import { describe, it, expect, vi, beforeEach } from 'vitest';
import superadminService from '../superadminService';
import apiClient, { handleApiError } from '../config/axios';

// Mock axios and handleApiError
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  handleApiError: vi.fn((error) => {
    throw error;
  })
}));

describe('SuperadminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getDashboardStats', () => {
    it('should fetch dashboard stats successfully', async () => {
      const mockResponse = { data: { success: true, data: { totalUsers: 100 } } };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await superadminService.getDashboardStats();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/dashboard-stats');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.getDashboardStats()).rejects.toThrow('Network error');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllUsers', () => {
    it('should fetch users with default pagination', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await superadminService.getAllUsers();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/users?page=1&limit=10');
    });

    it('should use custom pagination', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ page: 2, limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/users?page=2&limit=20');
    });

    it('should include category filter', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ category: 'urologist' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('category=urologist');
    });

    it('should include role filter when category is not provided', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ role: 'urologist' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('role=urologist');
    });

    it('should prefer category over role', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ category: 'urologist', role: 'gp' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('category=urologist');
      expect(callUrl).not.toContain('role=gp');
    });

    it('should include search filter', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ search: 'John' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('search=John');
    });

    it('should include status filter when not "all"', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ status: 'active' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('status=active');
    });

    it('should not include status filter when "all"', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ status: 'all' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).not.toContain('status=');
    });

    it('should include department_id filter', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ department_id: 1 });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('department_id=1');
    });

    it('should call filterUsers when category is doctor and department_id is provided', async () => {
      const mockFilterResponse = {
        success: true,
        data: {
          users: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalUsers: 0,
            limit: 0
          }
        }
      };
      apiClient.get.mockResolvedValue({ data: mockFilterResponse });

      const result = await superadminService.getAllUsers({ category: 'doctor', department_id: 1 });

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/superadmin/users/filter'));
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from filter values', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ search: '  John  ', status: '  active  ' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('search=John');
      expect(callUrl).toContain('status=active');
    });

    it('should not include empty string filters', async () => {
      const mockResponse = { data: { success: true, data: { users: [] } } };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.getAllUsers({ search: '', status: '', category: '' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).not.toContain('search=');
      expect(callUrl).not.toContain('status=');
      expect(callUrl).not.toContain('category=');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.getAllUsers()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalled();
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('filterUsers', () => {
    it('should filter users with category', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            users: [],
            count: 0
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await superadminService.filterUsers({ category: 'urologist' });

      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('category=urologist'));
    });

    it('should filter users with role when category not provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            users: [],
            count: 0
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.filterUsers({ role: 'gp' });

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('role=gp'));
    });

    it('should not include department_id when "all"', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            users: [],
            count: 0
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await superadminService.filterUsers({ department_id: 'all' });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).not.toContain('department_id=');
    });

    it('should format response correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            users: [{ id: 1 }, { id: 2 }],
            count: 2
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await superadminService.filterUsers({});

      expect(result.success).toBe(true);
      expect(result.data.users).toHaveLength(2);
      expect(result.data.pagination.totalUsers).toBe(2);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.filterUsers({})).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalled();
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID', async () => {
      const mockResponse = { data: { success: true, data: { id: 1, email: 'test@example.com' } } };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await superadminService.getUserById(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/users/1');
    });

    it('should handle errors', async () => {
      const error = new Error('User not found');
      apiClient.get.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.getUserById(999)).rejects.toThrow('User not found');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('createUser', () => {
    it('should create new user', async () => {
      const userData = { email: 'new@example.com', role: 'urologist' };
      const mockResponse = { data: { success: true, data: { id: 1, ...userData } } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await superadminService.createUser(userData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/users', userData);
    });

    it('should handle errors', async () => {
      const error = new Error('Validation failed');
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.createUser({})).rejects.toThrow('Validation failed');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const userData = { email: 'updated@example.com' };
      const mockResponse = { data: { success: true, data: { id: 1, ...userData } } };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await superadminService.updateUser(1, userData);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.put).toHaveBeenCalledWith('/superadmin/users/1', userData);
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      apiClient.put.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.updateUser(1, {})).rejects.toThrow('Update failed');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const mockResponse = { data: { success: true, message: 'User deleted' } };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await superadminService.deleteUser(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.delete).toHaveBeenCalledWith('/superadmin/users/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      apiClient.delete.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.deleteUser(1)).rejects.toThrow('Delete failed');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('resendPasswordSetup', () => {
    it('should resend password setup email', async () => {
      const mockResponse = { data: { success: true, message: 'Email sent' } };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await superadminService.resendPasswordSetup(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/users/1/resend-password-setup');
    });

    it('should handle errors', async () => {
      const error = new Error('Send failed');
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(superadminService.resendPasswordSetup(1)).rejects.toThrow('Send failed');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });
});
