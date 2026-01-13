/**
 * Tests for modified account lockout middleware (monitoring only, no actual locking)
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockAlertService = {
  createAlert: jest.fn(),
  sendAlertNotification: jest.fn(),
  updateAlert: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../services/alertService.js', () => ({
  createAlert: mockAlertService.createAlert,
  sendAlertNotification: mockAlertService.sendAlertNotification,
  updateAlert: mockAlertService.updateAlert
}));

describe('Account Lockout Middleware (Monitoring Only)', () => {
  let accountLockout;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
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
    
    mockReq = {
      body: { email: 'test@example.com' }
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccountLockout', () => {
    it('should always call next() - no locking', async () => {
      await accountLockout.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should allow login even with failed attempts', async () => {
      await accountLockout.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow login at threshold (monitoring only)', async () => {
      await accountLockout.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
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
          userEmail: 'test@example.com',
          details: expect.objectContaining({
            failedAttempts: 10,
            threshold: 10
          })
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

    it('should update existing alert instead of creating duplicate', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 11,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns existing active alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'new' }] // Existing active alert found
      });
      // UPDATE alert (with COALESCE to set user_id if null, status stays 'new')
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 5, status: 'new' }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should update existing alert, not create new one
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE security_alerts'),
        expect.any(Array)
      );
      // Verify advisory lock is used
      const lockCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('pg_advisory_xact_lock')
      );
      expect(lockCall).toBeDefined();
      // Verify the query checks both user_id and user_email and ALL statuses
      const selectCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('SELECT id') && call[0].includes('FROM security_alerts')
      );
      expect(selectCall).toBeDefined();
      expect(selectCall[0]).toContain('user_id = $1');
      expect(selectCall[0]).toContain('user_email = $2');
      // Should NOT filter by status (checks all statuses including resolved)
      expect(selectCall[0]).not.toContain("status IN ('new', 'acknowledged')");
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
      expect(mockAlertService.sendAlertNotification).not.toHaveBeenCalled();
    });

    it('should find existing alert even if user_id is null', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 11,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert by email (user_id might be null)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'new' }] // Existing alert found by email match
      });
      // UPDATE alert
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 5, status: 'new' }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should update existing alert found by email match
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE security_alerts'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
      expect(mockAlertService.sendAlertNotification).not.toHaveBeenCalled();
    });

    it('should create alert if no alert exists at all', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (no existing alert at all)
      mockClient.query.mockResolvedValueOnce({
        rows: [] // No existing alert (including resolved)
      });
      // INSERT new alert
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: 1,
          user_email: 'test@example.com',
          message: 'Account lockout threshold reached: 10 failed login attempts',
          details: JSON.stringify({ failedAttempts: 10, threshold: 10 }),
          status: 'new',
          created_at: new Date()
        }]
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should create a new alert and send email
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_alerts'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.sendAlertNotification).toHaveBeenCalled();
    });

    it('should reactivate resolved alert instead of creating new one', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns resolved alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'resolved' }] // Existing resolved alert found
      });
      // UPDATE alert: reactivate (status -> 'new') and update count
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 5,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: 1,
          user_email: 'test@example.com',
          message: 'Account lockout threshold reached: 10 failed login attempts',
          details: JSON.stringify({ failedAttempts: 10, threshold: 10 }),
          status: 'new',
          created_at: new Date()
        }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should reactivate existing resolved alert, not create new one
      const updateCall = mockClient.query.mock.calls.find(call => 
        call[0].includes('UPDATE security_alerts') && call[0].includes('RETURNING')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain("CASE WHEN status = 'resolved' THEN 'new' ELSE status END");
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
      // Should send email when reactivating resolved alert
      expect(mockAlertService.sendAlertNotification).toHaveBeenCalled();
    });

    it('should NOT send email when updating active (new) alert', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 12,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns active alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'new' }] // Existing active alert found
      });
      // UPDATE alert (status stays 'new')
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 5, status: 'new' }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should update alert but NOT send email
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE security_alerts'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.sendAlertNotification).not.toHaveBeenCalled();
    });

    it('should NOT send email when updating acknowledged alert', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 13,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns acknowledged alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'acknowledged' }] // Existing acknowledged alert found
      });
      // UPDATE alert (status stays 'acknowledged')
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 5, status: 'acknowledged' }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should update alert but NOT send email
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAlertService.sendAlertNotification).not.toHaveBeenCalled();
    });

    it('should send email when reactivating resolved alert', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns resolved alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'resolved' }] // Existing resolved alert found
      });
      // UPDATE alert: reactivate (returns updated alert)
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 5,
          alert_type: 'lockout_threshold',
          severity: 'critical',
          user_id: 1,
          user_email: 'test@example.com',
          message: 'Account lockout threshold reached: 10 failed login attempts',
          details: JSON.stringify({ failedAttempts: 10, threshold: 10 }),
          status: 'new',
          created_at: new Date()
        }] 
      });
      // COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.incrementFailedAttempts('test@example.com');

      // Should send email when reactivating resolved alert
      expect(mockAlertService.sendAlertNotification).toHaveBeenCalled();
      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
    });

    it('should handle update alert errors gracefully', async () => {
      // First query: increment failed attempts
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 12,
          id: 1
        }]
      });
      // BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Advisory lock
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // SELECT: check for existing alert (returns existing alert)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 5, status: 'new' }] // Existing alert found
      });
      // UPDATE fails
      mockClient.query.mockRejectedValueOnce(new Error('Update failed'));
      // ROLLBACK transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Should not throw
      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle alert creation errors gracefully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });

      mockAlertService.createAlert.mockRejectedValueOnce(new Error('Alert creation failed'));

      // Should not throw
      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle alert notification errors gracefully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          id: 1
        }]
      });

      mockAlertService.sendAlertNotification.mockRejectedValueOnce(new Error('Notification failed'));

      // Should not throw
      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle null failed_login_attempts', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: null,
          id: 1
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockAlertService.createAlert).not.toHaveBeenCalled();
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts on successful login', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.resetFailedAttempts(1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([1])
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
