/**
 * Comprehensive tests for Notification Service
 * Tests all functions and code paths to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Notification Service', () => {
  let notificationService;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    
    notificationService = await import('../services/notificationService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationTypes', () => {
    it('should export all notification types', () => {
      expect(notificationService.NotificationTypes).toBeDefined();
      expect(notificationService.NotificationTypes.PATHWAY_TRANSFER).toBe('pathway_transfer');
      expect(notificationService.NotificationTypes.APPOINTMENT).toBe('appointment');
      expect(notificationService.NotificationTypes.LAB_RESULTS).toBe('lab_results');
      expect(notificationService.NotificationTypes.URGENT).toBe('urgent');
      expect(notificationService.NotificationTypes.TASK).toBe('task');
      expect(notificationService.NotificationTypes.DISCHARGE).toBe('discharge');
      expect(notificationService.NotificationTypes.REFERRAL).toBe('referral');
      expect(notificationService.NotificationTypes.GENERAL).toBe('general');
    });
  });

  describe('initializeNotificationsTable', () => {
    it('should create notifications table successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await notificationService.initializeNotificationsTable();

      expect(mockClient.query).toHaveBeenCalled();
      const queryCall = mockClient.query.mock.calls[0][0];
      expect(queryCall).toContain('CREATE TABLE IF NOT EXISTS notifications');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      // Should not throw
      await notificationService.initializeNotificationsTable();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createNotification', () => {
    const notificationData = {
      userId: 1,
      type: 'general',
      title: 'Test Notification',
      message: 'This is a test',
      patientName: 'John Doe',
      patientId: 123,
      priority: 'normal',
      metadata: { key: 'value' }
    };

    it('should create notification successfully', async () => {
      const mockNotification = {
        id: 1,
        user_id: 1,
        type: 'general',
        title: 'Test Notification',
        message: 'This is a test',
        patient_name: 'John Doe',
        patient_id: 123,
        priority: 'normal',
        metadata: { key: 'value' }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockNotification] });

      const result = await notificationService.createNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([1, 'general', 'Test Notification', 'This is a test'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      const result = await notificationService.createNotification(notificationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default values when optional fields are not provided', async () => {
      const minimalData = {
        userId: 1,
        title: 'Test',
        message: 'Test message'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await notificationService.createNotification(minimalData);

      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[1]).toContain(1); // userId
      expect(queryCall[1]).toContain('general'); // default type
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createPathwayTransferNotification', () => {
    const transferData = {
      gpUserId: 1,
      patientName: 'John Doe',
      patientId: 123,
      pathway: 'Active Monitoring',
      urologistName: 'Dr. Smith',
      reason: 'Test reason'
    };

    it('should create pathway transfer notification successfully', async () => {
      const mockNotification = { id: 1 };
      mockClient.query.mockResolvedValueOnce({ rows: [mockNotification] });

      const result = await notificationService.createPathwayTransferNotification(transferData);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalled();
      const queryCall = mockClient.query.mock.calls[0][1];
      expect(queryCall[0]).toBe(1); // userId
      expect(queryCall[1]).toBe('pathway_transfer');
      expect(queryCall[4]).toBe('John Doe'); // patientName
      expect(queryCall[5]).toBe(123); // patientId
      expect(queryCall[6]).toBe('high'); // priority
    });

    it('should create notification without reason', async () => {
      const dataWithoutReason = {
        gpUserId: 1,
        patientName: 'John Doe',
        patientId: 123,
        pathway: 'Active Monitoring',
        urologistName: 'Dr. Smith'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await notificationService.createPathwayTransferNotification(dataWithoutReason);

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    const userId = 1;

    it('should get all notifications for user', async () => {
      const mockNotifications = [
        { id: 1, title: 'Notification 1' },
        { id: 2, title: 'Notification 2' }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockNotifications })
        .mockResolvedValueOnce({ rows: [{ unread_count: '5' }] });

      const result = await notificationService.getUserNotifications(userId);

      expect(result.success).toBe(true);
      expect(result.data.notifications).toEqual(mockNotifications);
      expect(result.data.unreadCount).toBe(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should get unread notifications only', async () => {
      const mockNotifications = [{ id: 1, title: 'Unread Notification' }];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockNotifications })
        .mockResolvedValueOnce({ rows: [{ unread_count: '1' }] });

      const result = await notificationService.getUserNotifications(userId, { unreadOnly: true });

      expect(result.success).toBe(true);
      expect(result.data.notifications).toEqual(mockNotifications);
      expect(result.data.unreadCount).toBe(1);
    });

    it('should respect limit and offset', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ unread_count: '0' }] });

      await notificationService.getUserNotifications(userId, { limit: 10, offset: 20 });

      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[1]).toContain(10); // limit
      expect(queryCall[1]).toContain(20); // offset
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      const result = await notificationService.getUserNotifications(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('markNotificationAsRead', () => {
    const notificationId = 1;
    const userId = 1;

    it('should mark notification as read successfully', async () => {
      const mockNotification = {
        id: 1,
        user_id: 1,
        is_read: true
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockNotification] });

      const result = await notificationService.markNotificationAsRead(notificationId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotification);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [notificationId, userId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error when notification not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.markNotificationAsRead(notificationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found or unauthorized');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      const result = await notificationService.markNotificationAsRead(notificationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('markAllNotificationsAsRead', () => {
    const userId = 1;

    it('should mark all notifications as read successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.markAllNotificationsAsRead(userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('All notifications marked as read');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [userId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      const result = await notificationService.markAllNotificationsAsRead(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    const notificationId = 1;
    const userId = 1;

    it('should delete notification successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification deleted');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error when notification not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found or unauthorized');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

