/**
 * Tests for sessionValidationService.js
 * Ensures 100% coverage including all methods, branches, and edge cases
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sessionValidationService from '../sessionValidationService.js';
import apiClient from '../../config/axios.js';
import tokenService from '../tokenService.js';
import authService from '../authService.js';

// Mock dependencies
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('../tokenService.js', () => ({
  default: {
    isAuthenticated: vi.fn(() => true),
    clearAuth: vi.fn()
  }
}));

vi.mock('../authService.js', () => ({
  default: {
    logout: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('SessionValidationService', () => {
  const mockOnSessionTerminated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset service state
    sessionValidationService.stop();
    // Mock globalThis.location
    globalThis.location = { href: '' };
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionValidationService.stop();
  });

  describe('start', () => {
    it('should start service when user is authenticated', () => {
      tokenService.isAuthenticated.mockReturnValue(true);

      sessionValidationService.start(mockOnSessionTerminated);

      expect(sessionValidationService.getActive()).toBe(true);
    });

    it('should not start service when user is not authenticated', () => {
      tokenService.isAuthenticated.mockReturnValue(false);

      sessionValidationService.start(mockOnSessionTerminated);

      expect(sessionValidationService.getActive()).toBe(false);
    });

    it('should stop existing service before starting new one', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);
      expect(sessionValidationService.getActive()).toBe(true);

      const newOnTerminated = vi.fn();
      sessionValidationService.start(newOnTerminated);

      expect(sessionValidationService.getActive()).toBe(true);
    });

    it('should run initial check after 5 seconds', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: true, valid: true }
      });

      sessionValidationService.start(mockOnSessionTerminated);

      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/check-session');
    });

    it('should check session every 30 seconds', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: true, valid: true }
      });

      sessionValidationService.start(mockOnSessionTerminated);

      // Initial check
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      // Periodic checks
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop', () => {
    it('should stop the service and clear interval', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);
      expect(sessionValidationService.getActive()).toBe(true);

      sessionValidationService.stop();

      expect(sessionValidationService.getActive()).toBe(false);
    });

    it('should clear callbacks', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);

      sessionValidationService.stop();

      // Advance time - callback should not be called
      vi.advanceTimersByTime(30000);
      expect(mockOnSessionTerminated).not.toHaveBeenCalled();
    });
  });

  describe('checkSession', () => {
    it('should return valid when session is valid', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: true, valid: true }
      });

      sessionValidationService.start(mockOnSessionTerminated);

      vi.advanceTimersByTime(5000);
      const result = await sessionValidationService.checkSession();

      expect(result).toEqual({ valid: true });
      expect(mockOnSessionTerminated).not.toHaveBeenCalled();
    });

    it('should handle session termination when session is invalid', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: false, valid: false, code: 'SESSION_TERMINATED' }
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      sessionValidationService.start(mockOnSessionTerminated);

      vi.advanceTimersByTime(5000);
      const result = await sessionValidationService.checkSession();

      expect(result).toEqual({ valid: false, reason: 'SESSION_TERMINATED' });
      expect(mockOnSessionTerminated).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle 401 error with SESSION_TERMINATED code', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      const error = new Error('Session terminated');
      error.response = {
        status: 401,
        data: { code: 'SESSION_TERMINATED', message: 'Session terminated' }
      };
      apiClient.get.mockRejectedValue(error);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      sessionValidationService.start(mockOnSessionTerminated);

      vi.advanceTimersByTime(5000);
      const result = await sessionValidationService.checkSession();

      expect(result).toEqual({ valid: false, reason: 'SESSION_TERMINATED' });
      expect(mockOnSessionTerminated).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should not logout on network errors', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      const error = new Error('Network error');
      error.response = { status: 500 };
      apiClient.get.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      sessionValidationService.start(mockOnSessionTerminated);

      vi.advanceTimersByTime(5000);
      const result = await sessionValidationService.checkSession();

      expect(result).toEqual({ valid: true, error: 'Network error' });
      expect(mockOnSessionTerminated).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not check if service is not active', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.stop();

      const result = await sessionValidationService.checkSession();

      expect(result).toBeUndefined();
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should not check if user is not authenticated', async () => {
      tokenService.isAuthenticated.mockReturnValue(false);
      sessionValidationService.start(mockOnSessionTerminated);

      const result = await sessionValidationService.checkSession();

      expect(result).toBeUndefined();
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('handleSessionTerminated', () => {
    it('should call callback when session is terminated', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);

      // Manually trigger session termination
      await sessionValidationService.handleSessionTerminated();

      expect(mockOnSessionTerminated).toHaveBeenCalledTimes(1);
      expect(sessionValidationService.getActive()).toBe(false);
    });

    it('should logout user if no callback provided', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      globalThis.location.href = '';
      sessionValidationService.start(null);

      await sessionValidationService.handleSessionTerminated();

      expect(authService.logout).toHaveBeenCalled();
      expect(globalThis.location.href).toBe('/login');
    });

    it('should handle logout error gracefully', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      authService.logout.mockRejectedValue(new Error('Logout failed'));
      globalThis.location.href = '';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      sessionValidationService.start(null);

      await sessionValidationService.handleSessionTerminated();

      expect(tokenService.clearAuth).toHaveBeenCalled();
      expect(globalThis.location.href).toBe('/login');
      consoleErrorSpy.mockRestore();
    });

    it('should not handle termination if service is not active', async () => {
      sessionValidationService.stop();

      await sessionValidationService.handleSessionTerminated();

      expect(mockOnSessionTerminated).not.toHaveBeenCalled();
    });
  });

  describe('forceCheck', () => {
    it('should force check session immediately', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: true, valid: true }
      });

      sessionValidationService.start(mockOnSessionTerminated);

      const result = await sessionValidationService.forceCheck();

      expect(result).toEqual({ valid: true });
      expect(apiClient.get).toHaveBeenCalledWith('/auth/check-session');
    });
  });

  describe('getActive', () => {
    it('should return false when service is not active', () => {
      expect(sessionValidationService.getActive()).toBe(false);
    });

    it('should return true when service is active', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);
      expect(sessionValidationService.getActive()).toBe(true);
    });

    it('should return false after service is stopped', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(mockOnSessionTerminated);
      sessionValidationService.stop();
      expect(sessionValidationService.getActive()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple start/stop cycles', () => {
      tokenService.isAuthenticated.mockReturnValue(true);

      sessionValidationService.start(mockOnSessionTerminated);
      expect(sessionValidationService.getActive()).toBe(true);

      sessionValidationService.stop();
      expect(sessionValidationService.getActive()).toBe(false);

      sessionValidationService.start(mockOnSessionTerminated);
      expect(sessionValidationService.getActive()).toBe(true);
    });

    it('should handle null callback', () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      sessionValidationService.start(null);

      expect(sessionValidationService.getActive()).toBe(true);
    });

    it('should handle authentication status change during check', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      apiClient.get.mockResolvedValue({
        data: { success: true, valid: true }
      });

      sessionValidationService.start(mockOnSessionTerminated);

      // User logs out during check
      tokenService.isAuthenticated.mockReturnValue(false);

      vi.advanceTimersByTime(5000);
      const result = await sessionValidationService.checkSession();

      // Should return undefined if not authenticated
      expect(result).toBeUndefined();
    });
  });
});
