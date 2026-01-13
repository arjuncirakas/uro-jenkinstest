/**
 * Tests for Auth Middleware Session Validation
 * Ensures 100% coverage for single device login validation
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0
};

const mockJwt = {
  verify: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt
}));

describe('Auth Middleware - Session Validation', () => {
  let authMiddleware;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);

    authMiddleware = await import('../middleware/auth.js');
  });

  describe('authenticateToken - Session Validation', () => {
    it('should allow request when valid session exists', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        path: '/api/test'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { userId: 1, email: 'test@example.com', role: 'urologist' };
      mockJwt.verify.mockReturnValue(decoded);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'urologist', is_active: true }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Valid session exists
        });

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request when no active session exists', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        path: '/api/test'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { userId: 1, email: 'test@example.com', role: 'urologist' };
      mockJwt.verify.mockReturnValue(decoded);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'urologist', is_active: true }]
        })
        .mockResolvedValueOnce({
          rows: [] // No active session (user logged in from another device)
        });

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('logged in from another device'),
          code: 'SESSION_TERMINATED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should continue with authentication if session check fails (fail open)', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        path: '/api/test'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { userId: 1, email: 'test@example.com', role: 'urologist' };
      mockJwt.verify.mockReturnValue(decoded);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'urologist', is_active: true }]
        })
        .mockRejectedValueOnce(new Error('Database error')); // Session check fails

      await authMiddleware.authenticateToken(req, res, next);

      // Should continue (fail open) if session check fails
      expect(next).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('verifyRefreshToken - Session Validation', () => {
    it('should allow refresh when session token matches', async () => {
      const req = {
        body: { refreshToken: 'valid-refresh-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { id: 1, type: 'refresh' };
      mockJwt.verify.mockReturnValue(decoded);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            token: 'valid-refresh-token',
            is_revoked: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'urologist',
            is_active: true
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Session exists with matching token
        });

      await authMiddleware.verifyRefreshToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject refresh when session token does not match', async () => {
      const req = {
        body: { refreshToken: 'old-refresh-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { id: 1, type: 'refresh' };
      mockJwt.verify.mockReturnValue(decoded);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            token: 'old-refresh-token',
            is_revoked: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'urologist',
            is_active: true
          }]
        })
        .mockResolvedValueOnce({
          rows: [] // No matching session (user logged in from another device)
        });

      await authMiddleware.verifyRefreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('logged in from another device'),
          code: 'SESSION_TERMINATED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject refresh when session is expired', async () => {
      const req = {
        body: { refreshToken: 'expired-refresh-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const decoded = { id: 1, type: 'refresh' };
      mockJwt.verify.mockReturnValue(decoded);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            token: 'expired-refresh-token',
            is_revoked: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'urologist',
            is_active: true
          }]
        })
        .mockResolvedValueOnce({
          rows: [] // Session expired (expires_at check in query)
        });

      await authMiddleware.verifyRefreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'SESSION_TERMINATED'
        })
      );
    });
  });
});
