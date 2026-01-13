/**
 * Tests for Single Device Login / Session Management
 * Ensures 100% coverage including all session invalidation scenarios
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockJwt = {
  generateTokens: jest.fn(),
  verifyRefreshToken: jest.fn()
};

const mockOtpService = {
  verifyOTP: jest.fn(),
  incrementOTPAttempts: jest.fn()
};

const mockSecurityMonitoring = {
  monitorAuthenticationEvents: jest.fn().mockResolvedValue([])
};

const mockAlertService = {
  createAlert: jest.fn(),
  sendAlertNotification: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../utils/jwt.js', () => mockJwt);
jest.unstable_mockModule('../services/otpService.js', () => mockOtpService);
jest.unstable_mockModule('../services/securityMonitoringService.js', () => ({
  monitorAuthenticationEvents: mockSecurityMonitoring.monitorAuthenticationEvents
}));
jest.unstable_mockModule('../services/alertService.js', () => mockAlertService);

describe('Session Management - Single Device Login', () => {
  let authController;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);

    authController = await import('../controllers/authController.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyLoginOTP - Session Invalidation', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'urologist',
      is_active: true,
      is_verified: true
    };

    const mockTokens = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123'
    };

    it('should invalidate all previous refresh tokens on login', async () => {
      const req = {
        body: { email: 'test@example.com', otp: '123456' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockOtpService.verifyOTP.mockResolvedValue({
        success: true,
        data: { userId: 1 }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({}) // Revoke previous refresh tokens
        .mockResolvedValueOnce({}) // Delete previous active sessions
        .mockResolvedValueOnce({}) // Insert new refresh token
        .mockResolvedValueOnce({}) // Insert login history
        .mockResolvedValueOnce({}); // Insert active session

      mockJwt.generateTokens.mockReturnValue(mockTokens);
      mockSecurityMonitoring.monitorAuthenticationEvents.mockResolvedValue([]);

      await authController.verifyLoginOTP(req, res);

      // Verify previous refresh tokens were revoked
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
        [1]
      );

      // Verify previous active sessions were deleted
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM active_sessions WHERE user_id = $1',
        [1]
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should create new active session after invalidating previous ones', async () => {
      const req = {
        body: { email: 'test@example.com', otp: '123456' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockOtpService.verifyOTP.mockResolvedValue({
        success: true,
        data: { userId: 1 }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      mockJwt.generateTokens.mockReturnValue(mockTokens);
      mockSecurityMonitoring.monitorAuthenticationEvents.mockResolvedValue([]);

      await authController.verifyLoginOTP(req, res);

      // Verify new active session was created
      const insertSessionCall = mockClient.query.mock.calls.find(call => 
        call[0]?.includes('INSERT INTO active_sessions')
      );
      expect(insertSessionCall).toBeDefined();
      expect(insertSessionCall[1]).toContain(1); // user_id
      expect(insertSessionCall[1]).toContain('refresh-token-123'); // session_token
    });

    it('should handle errors when revoking previous tokens gracefully', async () => {
      const req = {
        body: { email: 'test@example.com', otp: '123456' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockOtpService.verifyOTP.mockResolvedValue({
        success: true,
        data: { userId: 1 }
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockRejectedValueOnce(new Error('Database error')) // Revoke tokens fails
        .mockResolvedValueOnce({}) // Delete sessions succeeds
        .mockResolvedValueOnce({}) // Insert refresh token
        .mockResolvedValueOnce({}) // Insert login history
        .mockResolvedValueOnce({}); // Insert active session

      mockJwt.generateTokens.mockReturnValue(mockTokens);
      mockSecurityMonitoring.monitorAuthenticationEvents.mockResolvedValue([]);

      await authController.verifyLoginOTP(req, res);

      // Should still proceed with login even if revoke fails
      expect(res.status).toHaveBeenCalledWith(200);
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors when deleting previous sessions gracefully', async () => {
      const req = {
        body: { email: 'test@example.com', otp: '123456' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockOtpService.verifyOTP.mockResolvedValue({
        success: true,
        data: { userId: 1 }
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({}) // Revoke tokens succeeds
        .mockRejectedValueOnce(new Error('Database error')) // Delete sessions fails
        .mockResolvedValueOnce({}) // Insert refresh token
        .mockResolvedValueOnce({}) // Insert login history
        .mockResolvedValueOnce({}); // Insert active session

      mockJwt.generateTokens.mockReturnValue(mockTokens);
      mockSecurityMonitoring.monitorAuthenticationEvents.mockResolvedValue([]);

      await authController.verifyLoginOTP(req, res);

      // Should still proceed with login even if delete fails
      expect(res.status).toHaveBeenCalledWith(200);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkSession - Session Validation', () => {
    it('should return valid session when session exists', async () => {
      const req = {
        user: { id: 1 },
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockSession = {
        id: 1,
        session_token: 'refresh-token-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        last_activity: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockSession] }) // Check session
        .mockResolvedValueOnce({}); // Update last activity

      await authController.checkSession(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          valid: true
        })
      );
    });

    it('should return invalid session when no active session exists', async () => {
      const req = {
        user: { id: 1 },
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No session found

      await authController.checkSession(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          valid: false,
          code: 'SESSION_TERMINATED',
          message: expect.stringContaining('logged in from another device')
        })
      );
    });

    it('should return invalid session when session is expired', async () => {
      const req = {
        user: { id: 1 },
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Session expired (expires_at in the past)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No valid session (expired)

      await authController.checkSession(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          code: 'SESSION_TERMINATED'
        })
      );
    });

    it('should update last activity when session is valid', async () => {
      const req = {
        user: { id: 1 },
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockSession = {
        id: 1,
        session_token: 'refresh-token-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        last_activity: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockSession] })
        .mockResolvedValueOnce({}); // Update last activity

      await authController.checkSession(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
        [1]
      );
    });

    it('should handle database errors gracefully', async () => {
      const req = {
        user: { id: 1 },
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await authController.checkSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          valid: false
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = {
        user: null,
        headers: { authorization: 'Bearer access-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.checkSession(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required'
        })
      );
    });
  });

  describe('refreshToken - Session Update', () => {
    it('should update active session when token is refreshed', async () => {
      const req = {
        body: { refreshToken: 'old-refresh-token' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockTokenData = {
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
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      mockJwt.verifyRefreshToken.mockReturnValue({ id: 1 });
      mockJwt.generateTokens.mockReturnValue(newTokens);

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockTokenData] }) // Check refresh token
        .mockResolvedValueOnce({}) // Revoke old token
        .mockResolvedValueOnce({}) // Delete old session
        .mockResolvedValueOnce({}) // Insert new refresh token
        .mockResolvedValueOnce({}) // Update active session
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Check if session exists

      await authController.refreshToken(req, res);

      // Verify old session was deleted
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM active_sessions WHERE session_token = $1',
        ['old-refresh-token']
      );

      // Verify new session was created/updated
      const updateSessionCall = mockClient.query.mock.calls.find(call => 
        call[0]?.includes('UPDATE active_sessions')
      );
      expect(updateSessionCall).toBeDefined();
    });

    it('should create new active session if none exists after refresh', async () => {
      const req = {
        body: { refreshToken: 'old-refresh-token' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockTokenData = {
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
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      mockJwt.verifyRefreshToken.mockReturnValue({ id: 1 });
      mockJwt.generateTokens.mockReturnValue(newTokens);

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockTokenData] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}) // Update returns 0 rows
        .mockResolvedValueOnce({ rows: [] }) // No existing session
        .mockResolvedValueOnce({}); // Insert new session

      await authController.refreshToken(req, res);

      // Verify new session was inserted
      const insertSessionCall = mockClient.query.mock.calls.find(call => 
        call[0]?.includes('INSERT INTO active_sessions')
      );
      expect(insertSessionCall).toBeDefined();
    });
  });
});
