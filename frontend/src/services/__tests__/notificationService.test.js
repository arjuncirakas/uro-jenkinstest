import { describe, it, expect, vi, beforeEach } from 'vitest';
import notificationService from '../notificationService';
import apiClient, { handleApiError } from '../config/axios';

// Mock axios and handleApiError
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  handleApiError: vi.fn((error) => {
    throw error;
  })
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getNotifications', () => {
    it('should fetch notifications with default params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            notifications: [],
            unreadCount: 0
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await notificationService.getNotifications();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 50, offset: 0, unreadOnly: false }
      });
    });

    it('should use custom params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            notifications: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await notificationService.getNotifications({ limit: 20, offset: 10, unreadOnly: true });

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 20, offset: 10, unreadOnly: true }
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(notificationService.getNotifications()).rejects.toThrow('Network error');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Notification marked as read'
        }
      };
      apiClient.patch.mockResolvedValue(mockResponse);

      const result = await notificationService.markAsRead(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/1/read');
    });

    it('should handle errors', async () => {
      const error = new Error('Notification not found');
      apiClient.patch.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(notificationService.markAsRead(999)).rejects.toThrow('Notification not found');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'All notifications marked as read'
        }
      };
      apiClient.patch.mockResolvedValue(mockResponse);

      const result = await notificationService.markAllAsRead();

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/mark-all-read');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.patch.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(notificationService.markAllAsRead()).rejects.toThrow('Network error');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Notification deleted'
        }
      };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await notificationService.deleteNotification(1);

      expect(result).toEqual(mockResponse.data);
      expect(apiClient.delete).toHaveBeenCalledWith('/notifications/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      apiClient.delete.mockRejectedValue(error);
      handleApiError.mockReturnValue(error);

      await expect(notificationService.deleteNotification(1)).rejects.toThrow('Delete failed');
      expect(handleApiError).toHaveBeenCalledWith(error);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count from response', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            notifications: [],
            unreadCount: 5
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const count = await notificationService.getUnreadCount();

      expect(count).toBe(5);
      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 1, unreadOnly: false }
      });
    });

    it('should return 0 when unreadCount is missing', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            notifications: []
          }
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const count = await notificationService.getUnreadCount();

      expect(count).toBe(0);
    });

    it('should return 0 when data is missing', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const count = await notificationService.getUnreadCount();

      expect(count).toBe(0);
    });

    it('should return 0 on error', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const count = await notificationService.getUnreadCount();

      expect(count).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Error getting unread count:', error);
    });

    it('should handle errors without throwing', async () => {
      const error = {
        response: {
          data: {
            message: 'Unauthorized'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const count = await notificationService.getUnreadCount();

      expect(count).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
