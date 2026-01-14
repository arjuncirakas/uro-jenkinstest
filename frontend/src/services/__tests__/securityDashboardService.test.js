import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityDashboardService } from '../securityDashboardService';
import apiClient from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('SecurityDashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getSecurityAlerts', () => {
    it('should fetch security alerts without filters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            alerts: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.getSecurityAlerts();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/security-alerts?');
    });

    it('should include status filter when provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            alerts: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await securityDashboardService.getSecurityAlerts({ status: 'new' });

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/security-alerts?status=new');
    });

    it('should include severity filter when provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            alerts: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await securityDashboardService.getSecurityAlerts({ severity: 'high' });

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/security-alerts?severity=high');
    });

    it('should include limit and offset when provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            alerts: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await securityDashboardService.getSecurityAlerts({ limit: 20, offset: 10 });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=20');
      expect(callUrl).toContain('offset=10');
    });

    it('should include multiple filters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            alerts: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await securityDashboardService.getSecurityAlerts({
        status: 'new',
        severity: 'high',
        limit: 20
      });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('status=new');
      expect(callUrl).toContain('severity=high');
      expect(callUrl).toContain('limit=20');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Unauthorized'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getSecurityAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getSecurityAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch security alerts');
    });
  });

  describe('getAlertStats', () => {
    it('should fetch alert statistics successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            total: 100,
            new: 10,
            acknowledged: 50,
            resolved: 40
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.getAlertStats();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/security-alerts/stats');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Server error'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getAlertStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getAlertStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch alert statistics');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Alert acknowledged'
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.acknowledgeAlert(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/security-alerts/1/acknowledge');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Alert not found'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.acknowledgeAlert(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Alert not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.acknowledgeAlert(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to acknowledge alert');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Alert resolved'
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.resolveAlert(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/security-alerts/1/resolve');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Alert not found'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.resolveAlert(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Alert not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.resolveAlert(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to resolve alert');
    });
  });

  describe('getSecurityTeamMembers', () => {
    it('should fetch security team members successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            members: [
              { id: 1, name: 'John Doe', email: 'john@example.com' }
            ]
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.getSecurityTeamMembers();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/security-team');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Unauthorized'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getSecurityTeamMembers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getSecurityTeamMembers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch security team members');
    });
  });

  describe('addSecurityTeamMember', () => {
    it('should add security team member successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.addSecurityTeamMember('John Doe', 'john@example.com');

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/security-team', {
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Email already exists'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.addSecurityTeamMember('John Doe', 'john@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.addSecurityTeamMember('John Doe', 'john@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add security team member');
    });
  });

  describe('removeSecurityTeamMember', () => {
    it('should remove security team member successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Member removed'
        }
      };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.removeSecurityTeamMember(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.delete).toHaveBeenCalledWith('/superadmin/security-team/1');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Member not found'
          }
        }
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await securityDashboardService.removeSecurityTeamMember(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.delete.mockRejectedValue(error);

      const result = await securityDashboardService.removeSecurityTeamMember(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove security team member');
    });
  });

  describe('getDPOContactInfo', () => {
    it('should fetch DPO contact info successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            name: 'DPO Name',
            email: 'dpo@example.com',
            contact_number: '1234567890'
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.getDPOContactInfo();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/dpo-contact');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'DPO info not found'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getDPOContactInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('DPO info not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await securityDashboardService.getDPOContactInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch DPO contact information');
    });
  });

  describe('setDPOContactInfo', () => {
    it('should set DPO contact info successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'DPO contact info saved'
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await securityDashboardService.setDPOContactInfo(
        'DPO Name',
        'dpo@example.com',
        '1234567890'
      );

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/dpo-contact', {
        name: 'DPO Name',
        email: 'dpo@example.com',
        contact_number: '1234567890'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.setDPOContactInfo('', '', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await securityDashboardService.setDPOContactInfo('Name', 'email@example.com', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save DPO contact information');
    });
  });
});
