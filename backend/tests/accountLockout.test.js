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

jest.unstable_mockModule('../services/auditLogger.js', () => ({
  logFailedAccess: mockAuditLogger.logFailedAccess
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
    
    accountLockout = await import('../middleware/accountLockout.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccountLockout', () => {
    it('should call next() when email is not provided', async () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should call next() when user is not found', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test@example.com']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 423 when account is locked', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          failed_login_attempts: 10,
          locked_until: lockedUntil
        }]
      });

      mockAuditLogger.logFailedAccess.mockResolvedValueOnce();

      await accountLockout.checkAccountLockout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Account is temporarily locked')
      });
      expect(mockAuditLogger.logFailedAccess).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reset failed attempts when lockout period has expired', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      const lockedUntil = new Date(Date.now() - 1000); // Past date
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            failed_login_attempts: 10,
            locked_until: lockedUntil
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      await accountLockout.checkAccountLockout(req, res, next);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE'),
        [1]
      );
      expect(next).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle case where locked_until is exactly now', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      const lockedUntil = new Date(); // Current time
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            failed_login_attempts: 10,
            locked_until: lockedUntil
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      await accountLockout.checkAccountLockout(req, res, next);

      // Should reset since locked_until <= now
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should call next() when account is not locked', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          failed_login_attempts: 0,
          locked_until: null
        }]
      });

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should call next() on error', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      mockPool.connect.mockRejectedValueOnce(new Error('Database error'));

      await accountLockout.checkAccountLockout(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 5,
          locked_until: null
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([10, 'test@example.com'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should lock account when max attempts reached', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          failed_login_attempts: 10,
          locked_until: expect.any(Date)
        }]
      });

      await accountLockout.incrementFailedAttempts('test@example.com');

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
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
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Database error'));

      await accountLockout.resetFailedAttempts(1);

      // When connect fails, release won't be called
      expect(mockClient.release).not.toHaveBeenCalled();
    });
  });
});

