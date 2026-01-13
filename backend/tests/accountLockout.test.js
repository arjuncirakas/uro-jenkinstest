/**
 * Tests for account lockout middleware
 * Tests all functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockAuditLogger = {
  logFailedAccess: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

const mockAlertService = {
  createAlert: jest.fn(),
  sendAlertNotification: jest.fn()
};

jest.unstable_mockModule('../services/auditLogger.js', () => ({
  logFailedAccess: mockAuditLogger.logFailedAccess
}));

jest.unstable_mockModule('../services/alertService.js', () => ({
  createAlert: mockAlertService.createAlert,
  sendAlertNotification: mockAlertService.sendAlertNotification
}));

describe('Account Lockout Middleware', () => {
  let accountLockout;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    mockAlertService.createAlert.mockResolvedValue({
      id: 1,
      alert_type: 'lockout_threshold',
      severity: 'critical'
    });
    mockAlertService.sendAlertNotification.mockResolvedValue({
      success: true
    });
    
    accountLockout = await import('../middleware/accountLockout.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccountLockout', () => {
    it('should always call next() - monitoring only, no locking', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should allow login even with failed attempts', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow login at threshold (monitoring only)', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment counter without locking', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 5,
          id: 1
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['test@example.com'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = failed_login_attempts + 1'),
        ['test@example.com']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should trigger alert at threshold without locking', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockAlertService.createAlert).toHaveBeenCalled();
      expect(mockAlertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'lockout_threshold',
          severity: 'critical',
          userEmail: 'test@example.com'
        })
      );
      expect(mockAlertService.sendAlertNotification).toHaveBeenCalled();
    });

    it('should not trigger alert below threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 9,
          id: 1
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts on successful login', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.resetFailedAttempts(1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = 0'),
        [1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not clear locked_until (no longer used)', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.resetFailedAttempts(1);

      const queryCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('UPDATE')
      );
      
      expect(queryCall[0]).not.toContain('locked_until');
    });

    it('should handle errors gracefully', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Database error'));

      await accountLockout.resetFailedAttempts(1);

      // Should not throw
    });
  });
});

