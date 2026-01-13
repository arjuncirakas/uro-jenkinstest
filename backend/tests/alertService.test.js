/**
 * Tests for alert service
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
const mockPool = {
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock email service
const mockEmailService = {
  sendNotificationEmail: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
  sendNotificationEmail: mockEmailService.sendNotificationEmail
}));

describe('Alert Service', () => {
  let alertService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockEmailService.sendNotificationEmail.mockResolvedValue({
      success: true,
      messageId: 'test-message-id'
    });
    
    alertService = await import('../services/alertService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAlertRecipients', () => {
    it('should return superadmin users', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toHaveLength(2);
      expect(recipients).toContain('admin1@example.com');
      expect(recipients).toContain('admin2@example.com');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return security team members', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ email: 'security1@example.com' }, { email: 'security2@example.com' }]
        });

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toHaveLength(2);
      expect(recipients).toContain('security1@example.com');
      expect(recipients).toContain('security2@example.com');
    });

    it('should return combined list with no duplicates', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }]
        })
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }, { email: 'security@example.com' }]
        });

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toHaveLength(2);
      expect(recipients).toContain('admin@example.com');
      expect(recipients).toContain('security@example.com');
    });

    it('should handle empty results', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toEqual([]);
    });

    it('should filter out null emails', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }, { email: null }]
        })
        .mockResolvedValueOnce({
          rows: [{ email: 'security@example.com' }, { email: null }]
        });

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toHaveLength(2);
      expect(recipients).not.toContain(null);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const recipients = await alertService.getAlertRecipients();

      expect(recipients).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createAlert', () => {
    it('should create alert with valid data', async () => {
      const alertData = {
        alertType: 'multiple_failed_logins',
        severity: 'high',
        userId: 1,
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        message: 'Test alert',
        details: { failedAttempts: 4 }
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'multiple_failed_logins',
          severity: 'high',
          user_id: 1,
          user_email: 'test@example.com',
          ip_address: '192.168.1.1',
          message: 'Test alert',
          details: JSON.stringify({ failedAttempts: 4 }),
          status: 'new',
          created_at: new Date()
        }]
      });

      const alert = await alertService.createAlert(alertData);

      expect(alert).toBeDefined();
      expect(alert.alert_type).toBe('multiple_failed_logins');
      expect(alert.severity).toBe('high');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when missing required fields', async () => {
      const alertData = {
        severity: 'high',
        message: 'Test alert'
      };

      await expect(alertService.createAlert(alertData)).rejects.toThrow('Missing required alert fields');
    });

    it('should throw error when severity is invalid', async () => {
      const alertData = {
        alertType: 'test',
        severity: 'invalid',
        message: 'Test alert'
      };

      await expect(alertService.createAlert(alertData)).rejects.toThrow('Invalid severity');
    });

    it('should handle null userId', async () => {
      const alertData = {
        alertType: 'test',
        severity: 'high',
        message: 'Test alert',
        userId: null
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, alert_type: 'test', severity: 'high', message: 'Test alert', user_id: null }]
      });

      const alert = await alertService.createAlert(alertData);

      expect(alert).toBeDefined();
    });

    it('should handle null details', async () => {
      const alertData = {
        alertType: 'test',
        severity: 'high',
        message: 'Test alert',
        details: null
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, alert_type: 'test', severity: 'high', message: 'Test alert', details: null }]
      });

      const alert = await alertService.createAlert(alertData);

      expect(alert).toBeDefined();
    });

    it('should handle database errors', async () => {
      const alertData = {
        alertType: 'test',
        severity: 'high',
        message: 'Test alert'
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(alertService.createAlert(alertData)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('sendAlertNotification', () => {
    it('should send email to all recipients', async () => {
      const alert = {
        id: 1,
        alert_type: 'multiple_failed_logins',
        severity: 'high',
        user_email: 'test@example.com',
        ip_address: '192.168.1.1',
        message: 'Test alert',
        details: { failedAttempts: 4 },
        created_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }, { email: 'security@example.com' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      // Set environment variable
      process.env.ALERT_EMAIL_ENABLED = 'true';

      const result = await alertService.sendAlertNotification(alert);

      expect(result.success).toBe(true);
      expect(result.recipientsCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
    });

    it('should return false when email notifications disabled', async () => {
      process.env.ALERT_EMAIL_ENABLED = 'false';

      const alert = {
        id: 1,
        alert_type: 'test',
        severity: 'high',
        message: 'Test alert',
        created_at: new Date()
      };

      const result = await alertService.sendAlertNotification(alert);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email notifications disabled');
    });

    it('should return false when no recipients found', async () => {
      process.env.ALERT_EMAIL_ENABLED = 'true';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const alert = {
        id: 1,
        alert_type: 'test',
        severity: 'high',
        message: 'Test alert',
        created_at: new Date()
      };

      const result = await alertService.sendAlertNotification(alert);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No alert recipients found');
    });

    it('should handle email service failure', async () => {
      process.env.ALERT_EMAIL_ENABLED = 'true';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      mockEmailService.sendNotificationEmail.mockResolvedValueOnce({
        success: false,
        error: 'Email service error'
      });

      const alert = {
        id: 1,
        alert_type: 'test',
        severity: 'high',
        message: 'Test alert',
        created_at: new Date()
      };

      const result = await alertService.sendAlertNotification(alert);

      expect(result.success).toBe(true); // At least one attempt was made
      expect(result.successCount).toBe(0);
    });

    it('should throw error when alert is null', async () => {
      await expect(alertService.sendAlertNotification(null)).rejects.toThrow('Alert data is required');
    });

    it('should handle missing alert data', async () => {
      await expect(alertService.sendAlertNotification(undefined)).rejects.toThrow('Alert data is required');
    });

    it('should handle email sending errors gracefully', async () => {
      process.env.ALERT_EMAIL_ENABLED = 'true';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ email: 'admin@example.com' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      mockEmailService.sendNotificationEmail.mockRejectedValueOnce(new Error('Email error'));

      const alert = {
        id: 1,
        alert_type: 'test',
        severity: 'high',
        message: 'Test alert',
        created_at: new Date()
      };

      const result = await alertService.sendAlertNotification(alert);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return alerts with default filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '5' }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              alert_type: 'test',
              severity: 'high',
              status: 'new',
              details: JSON.stringify({ test: 'data' }),
              created_at: new Date()
            }
          ]
        });

      const result = await alertService.getActiveAlerts();

      expect(result.alerts).toHaveLength(1);
      expect(result.pagination.total).toBe(5);
      expect(result.alerts[0].details).toEqual({ test: 'data' });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '2' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, alert_type: 'test', severity: 'high', status: 'acknowledged', details: null, created_at: new Date() }
          ]
        });

      const result = await alertService.getActiveAlerts({ status: 'acknowledged' });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].status).toBe('acknowledged');
    });

    it('should filter by severity', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, alert_type: 'test', severity: 'critical', status: 'new', details: null, created_at: new Date() }
          ]
        });

      const result = await alertService.getActiveAlerts({ severity: 'critical' });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe('critical');
    });

    it('should handle pagination', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '10' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, alert_type: 'test', severity: 'high', status: 'new', details: null, created_at: new Date() }
          ]
        });

      const result = await alertService.getActiveAlerts({ limit: 5, offset: 0 });

      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should return empty array when no alerts', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      const result = await alertService.getActiveAlerts();

      expect(result.alerts).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(alertService.getActiveAlerts()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should parse JSONB details field', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              alert_type: 'test',
              severity: 'high',
              status: 'new',
              details: { failedAttempts: 4 }, // Already parsed
              created_at: new Date()
            }
          ]
        });

      const result = await alertService.getActiveAlerts();

      expect(result.alerts[0].details).toEqual({ failedAttempts: 4 });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          severity: 'high',
          status: 'acknowledged',
          acknowledged_by: 1,
          acknowledged_at: new Date(),
          details: null
        }]
      });

      const alert = await alertService.acknowledgeAlert(1, 1);

      expect(alert.status).toBe('acknowledged');
      expect(alert.acknowledged_by).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when alert not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(alertService.acknowledgeAlert(999, 1)).rejects.toThrow('Alert not found or already acknowledged/resolved');
    });

    it('should throw error when alert already acknowledged', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [] // UPDATE returns no rows when status != 'new'
      });

      await expect(alertService.acknowledgeAlert(1, 1)).rejects.toThrow('Alert not found or already acknowledged/resolved');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(alertService.acknowledgeAlert(1, 1)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateAlert', () => {
    it('should update alert message and details', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          message: 'Updated message',
          details: JSON.stringify({ failedAttempts: 12, threshold: 10 }),
          status: 'new'
        }]
      });

      const alert = await alertService.updateAlert(1, {
        message: 'Updated message',
        details: { failedAttempts: 12, threshold: 10 }
      });

      expect(alert.message).toBe('Updated message');
      expect(alert.details).toEqual({ failedAttempts: 12, threshold: 10 });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update only message', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          message: 'New message',
          details: null,
          status: 'new'
        }]
      });

      const alert = await alertService.updateAlert(1, {
        message: 'New message'
      });

      expect(alert.message).toBe('New message');
    });

    it('should update only details', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          message: 'Original message',
          details: JSON.stringify({ count: 5 }),
          status: 'new'
        }]
      });

      const alert = await alertService.updateAlert(1, {
        details: { count: 5 }
      });

      expect(alert.details).toEqual({ count: 5 });
    });

    it('should throw error when alert not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(alertService.updateAlert(999, { message: 'Test' })).rejects.toThrow('Alert not found');
    });

    it('should throw error when no fields to update', async () => {
      await expect(alertService.updateAlert(1, {})).rejects.toThrow('No fields to update');
    });

    it('should handle null details', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          message: 'Test',
          details: null,
          status: 'new'
        }]
      });

      const alert = await alertService.updateAlert(1, {
        details: null
      });

      expect(alert.details).toBeNull();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(alertService.updateAlert(1, { message: 'Test' })).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      // First query: get alert
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          severity: 'high',
          user_id: null,
          details: null
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          severity: 'high',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          details: null
        }]
      });

      const alert = await alertService.resolveAlert(1, 1);

      expect(alert.status).toBe('resolved');
      expect(alert.resolved_by).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reset failed_login_attempts when resolving lockout_threshold alert', async () => {
      // First query: get alert (lockout_threshold type)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: 5,
          details: null
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          user_id: 5,
          details: null
        }]
      });
      // Third query: reset failed_login_attempts
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const alert = await alertService.resolveAlert(1, 1);

      expect(alert.status).toBe('resolved');
      // Verify that failed_login_attempts reset query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([5])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = 0'),
        [5]
      );
    });

    it('should not reset failed_login_attempts for non-lockout_threshold alerts', async () => {
      // First query: get alert (not lockout_threshold)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'multiple_failed_logins',
          severity: 'high',
          user_id: 5,
          details: null
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'multiple_failed_logins',
          severity: 'high',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          user_id: 5,
          details: null
        }]
      });

      const alert = await alertService.resolveAlert(1, 1);

      expect(alert.status).toBe('resolved');
      // Verify that failed_login_attempts reset query was NOT called
      const updateUserCalls = mockClient.query.mock.calls.filter(call =>
        call[0].includes('UPDATE users') && call[0].includes('failed_login_attempts')
      );
      expect(updateUserCalls).toHaveLength(0);
    });

    it('should not reset failed_login_attempts when user_id is null', async () => {
      // First query: get alert (lockout_threshold but no user_id)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: null,
          details: null
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          user_id: null,
          details: null
        }]
      });

      const alert = await alertService.resolveAlert(1, 1);

      expect(alert.status).toBe('resolved');
      // Verify that failed_login_attempts reset query was NOT called (no user_id)
      const updateUserCalls = mockClient.query.mock.calls.filter(call =>
        call[0].includes('UPDATE users') && call[0].includes('failed_login_attempts')
      );
      expect(updateUserCalls).toHaveLength(0);
    });

    it('should throw error when alert not found', async () => {
      // First query: get alert (returns empty)
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(alertService.resolveAlert(999, 1)).rejects.toThrow('Alert not found');
    });

    it('should handle database errors when getting alert', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(alertService.resolveAlert(1, 1)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors when resetting failed attempts', async () => {
      // First query: get alert
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: 5,
          details: null
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          user_id: 5,
          details: null
        }]
      });
      // Third query: reset failed_login_attempts (fails)
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      // Should still throw the error
      await expect(alertService.resolveAlert(1, 1)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should parse details when present', async () => {
      // First query: get alert
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          severity: 'high',
          user_id: null,
          details: JSON.stringify({ test: 'data' })
        }]
      });
      // Second query: update alert status
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'test',
          severity: 'high',
          status: 'resolved',
          resolved_by: 1,
          resolved_at: new Date(),
          user_id: null,
          details: JSON.stringify({ test: 'data' })
        }]
      });

      const alert = await alertService.resolveAlert(1, 1);

      expect(alert.details).toEqual({ test: 'data' });
    });
  });
});
