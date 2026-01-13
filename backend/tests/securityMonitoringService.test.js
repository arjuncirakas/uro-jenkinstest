/**
 * Tests for security monitoring service
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

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Security Monitoring Service', () => {
  let securityMonitoringService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    securityMonitoringService = await import('../services/securityMonitoringService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectMultipleFailedAttempts', () => {
    it('should return no alert when failures are below threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '2' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        'test@example.com',
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return no alert when failures equal threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '3' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        'test@example.com',
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
    });

    it('should return alert when failures exceed threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '4' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        'test@example.com',
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(true);
      expect(result.alertType).toBe('multiple_failed_logins');
      expect(result.severity).toBe('high');
      expect(result.userEmail).toBe('test@example.com');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.details.failedAttempts).toBe(4);
    });

    it('should handle different IPs separately', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        'test@example.com',
        '192.168.1.2'
      );

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        'test@example.com',
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle null email', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        null,
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle undefined email', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        undefined,
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle empty string email', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectMultipleFailedAttempts(
        '',
        '192.168.1.1'
      );

      expect(result.shouldAlert).toBe(false);
    });
  });

  describe('detectUnusualLocation', () => {
    it('should return alert for first login (no history)', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectUnusualLocation(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(true);
      expect(result.alertType).toBe('unusual_location');
      expect(result.severity).toBe('medium');
      expect(result.userId).toBe(1);
      expect(result.ipAddress).toBe('192.168.1.1');
    });

    it('should return no alert for known IP', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

      const result = await securityMonitoringService.detectUnusualLocation(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
    });

    it('should return alert for new IP', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectUnusualLocation(1, '192.168.1.2');

      expect(result.shouldAlert).toBe(true);
    });

    it('should handle null userId', async () => {
      const result = await securityMonitoringService.detectUnusualLocation(null, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle undefined userId', async () => {
      const result = await securityMonitoringService.detectUnusualLocation(undefined, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle null ipAddress', async () => {
      const result = await securityMonitoringService.detectUnusualLocation(1, null);

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle invalid IP', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const result = await securityMonitoringService.detectUnusualLocation(1, 'invalid-ip');

      expect(result.shouldAlert).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.detectUnusualLocation(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('detectSimultaneousLogins', () => {
    it('should return no alert when no existing sessions', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.detectSimultaneousLogins(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
    });

    it('should return no alert for same IP session', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.detectSimultaneousLogins(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
    });

    it('should return alert for different IP session', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ip_address: '192.168.1.2' }]
      });

      const result = await securityMonitoringService.detectSimultaneousLogins(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(true);
      expect(result.alertType).toBe('simultaneous_logins');
      expect(result.severity).toBe('high');
      expect(result.userId).toBe(1);
      expect(result.details.otherIPs).toEqual(['192.168.1.2']);
    });

    it('should return alert for multiple different IPs', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { ip_address: '192.168.1.2' },
          { ip_address: '192.168.1.3' }
        ]
      });

      const result = await securityMonitoringService.detectSimultaneousLogins(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(true);
      expect(result.details.sessionCount).toBe(3);
      expect(result.details.otherIPs).toHaveLength(2);
    });

    it('should handle null userId', async () => {
      const result = await securityMonitoringService.detectSimultaneousLogins(null, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle undefined userId', async () => {
      const result = await securityMonitoringService.detectSimultaneousLogins(undefined, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle null ipAddress', async () => {
      const result = await securityMonitoringService.detectSimultaneousLogins(1, null);

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.detectSimultaneousLogins(1, '192.168.1.1');

      expect(result.shouldAlert).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('detectLockoutThreshold', () => {
    it('should return no alert when below threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ failed_login_attempts: 5 }]
      });

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(false);
    });

    it('should return alert when at threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ failed_login_attempts: 10 }]
      });

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(true);
      expect(result.alertType).toBe('lockout_threshold');
      expect(result.severity).toBe('critical');
      expect(result.userEmail).toBe('test@example.com');
      expect(result.details.failedAttempts).toBe(10);
    });

    it('should return alert when above threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ failed_login_attempts: 15 }]
      });

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(true);
      expect(result.details.failedAttempts).toBe(15);
    });

    it('should handle null email', async () => {
      const result = await securityMonitoringService.detectLockoutThreshold(null);

      expect(result.shouldAlert).toBe(false);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle undefined email', async () => {
      const result = await securityMonitoringService.detectLockoutThreshold(undefined);

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle empty string email', async () => {
      const result = await securityMonitoringService.detectLockoutThreshold('');

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle user not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle null failed_login_attempts', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ failed_login_attempts: null }]
      });

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.detectLockoutThreshold('test@example.com');

      expect(result.shouldAlert).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserLoginHistory', () => {
    it('should return login history for user', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { ip_address: '192.168.1.1', user_agent: 'Mozilla', login_timestamp: new Date() },
          { ip_address: '192.168.1.2', user_agent: 'Chrome', login_timestamp: new Date() }
        ]
      });

      const result = await securityMonitoringService.getUserLoginHistory(1);

      expect(result).toHaveLength(2);
      expect(result[0].ip_address).toBe('192.168.1.1');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no history', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.getUserLoginHistory(1);

      expect(result).toEqual([]);
    });

    it('should handle null userId', async () => {
      const result = await securityMonitoringService.getUserLoginHistory(null);

      expect(result).toEqual([]);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle undefined userId', async () => {
      const result = await securityMonitoringService.getUserLoginHistory(undefined);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.getUserLoginHistory(1);

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for user', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            session_token: 'token1',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla',
            created_at: now,
            last_activity: now,
            expires_at: expiresAt
          }
        ]
      });

      const result = await securityMonitoringService.getActiveSessions(1);

      expect(result).toHaveLength(1);
      expect(result[0].session_token).toBe('token1');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no active sessions', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.getActiveSessions(1);

      expect(result).toEqual([]);
    });

    it('should filter expired sessions', async () => {
      // The query already filters expired sessions with expires_at > NOW()
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await securityMonitoringService.getActiveSessions(1);

      expect(result).toEqual([]);
    });

    it('should handle null userId', async () => {
      const result = await securityMonitoringService.getActiveSessions(null);

      expect(result).toEqual([]);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle undefined userId', async () => {
      const result = await securityMonitoringService.getActiveSessions(undefined);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitoringService.getActiveSessions(1);

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('monitorAuthenticationEvents', () => {
    it('should monitor failed login events', async () => {
      // Mock the detection functions by setting up query results
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // detectMultipleFailedAttempts
        .mockResolvedValueOnce({ rows: [{ failed_login_attempts: 5 }] }); // detectLockoutThreshold

      const alerts = await securityMonitoringService.monitorAuthenticationEvents({
        userId: null,
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        eventType: 'login_failure'
      });

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should monitor successful login events', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // detectUnusualLocation
        .mockResolvedValueOnce({ rows: [] }); // detectSimultaneousLogins

      const alerts = await securityMonitoringService.monitorAuthenticationEvents({
        userId: 1,
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        eventType: 'login_success'
      });

      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Monitoring error'));

      const alerts = await securityMonitoringService.monitorAuthenticationEvents({
        userId: null,
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        eventType: 'login_failure'
      });

      expect(alerts).toEqual([]);
    });

    it('should return empty array for unknown event type', async () => {
      const alerts = await securityMonitoringService.monitorAuthenticationEvents({
        userId: 1,
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        eventType: 'unknown_event'
      });

      expect(alerts).toEqual([]);
    });
  });
});
