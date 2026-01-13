import { describe, it, expect, vi, beforeEach } from 'vitest';
import breachNotificationService from '../breachNotificationService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('breachNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIncident', () => {
    it('should create incident successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 1,
            incident_type: 'data_breach',
            severity: 'high',
            description: 'Test breach'
          },
          message: 'Incident created successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.createIncident({
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach'
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/superadmin/breach-incidents',
        expect.objectContaining({
          incident_type: 'data_breach',
          severity: 'high',
          description: 'Test breach'
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to create incident'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.createIncident({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create incident');
      consoleSpy.mockRestore();
    });
  });

  describe('getIncidents', () => {
    it('should fetch incidents successfully with default filters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, incident_type: 'data_breach', severity: 'high' }
          ],
          pagination: { total: 1, limit: 50, offset: 0 }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.getIncidents();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/breach-incidents?');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { total: 0, limit: 10, offset: 0 }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.getIncidents({
        status: 'confirmed',
        severity: 'high'
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=confirmed')
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch incidents'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.getIncidents();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch incidents');
      consoleSpy.mockRestore();
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, status: 'confirmed' },
          message: 'Incident status updated successfully'
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.updateIncidentStatus(1, 'confirmed');

      expect(apiClient.put).toHaveBeenCalledWith(
        '/superadmin/breach-incidents/1/status',
        { status: 'confirmed' }
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to update incident status'
          }
        }
      };

      apiClient.put.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.updateIncidentStatus(1, 'confirmed');

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 1,
            incident_id: 1,
            notification_type: 'gdpr_supervisory',
            status: 'pending'
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.createNotification(1, {
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com'
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/superadmin/breach-incidents/1/notifications',
        expect.objectContaining({
          notification_type: 'gdpr_supervisory',
          recipient_email: 'test@example.com'
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to create notification'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.createNotification(1, {});

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, status: 'sent', sent_at: new Date() },
          message: 'Notification sent successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.sendNotification(1);

      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/breach-notifications/1/send');
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to send notification'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.sendNotification(1);

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, notification_type: 'gdpr_supervisory', status: 'sent' }
          ]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.getNotifications(1);

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/breach-incidents/1/notifications');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch notifications'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.getNotifications(1);

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('addRemediation', () => {
    it('should add remediation successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 1,
            incident_id: 1,
            action_taken: 'Fixed security issue',
            effectiveness: 'effective'
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.addRemediation(1, {
        action_taken: 'Fixed security issue',
        effectiveness: 'effective'
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/superadmin/breach-incidents/1/remediations',
        expect.objectContaining({
          action_taken: 'Fixed security issue'
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to add remediation'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.addRemediation(1, {});

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getRemediations', () => {
    it('should fetch remediations successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, action_taken: 'Fixed issue', effectiveness: 'effective' }
          ]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await breachNotificationService.getRemediations(1);

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/breach-incidents/1/remediations');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch remediations'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await breachNotificationService.getRemediations(1);

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
