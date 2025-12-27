/**
 * Tests for tokenRefresh.js
 * Ensures 100% coverage including all methods and edge cases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import tokenRefreshManager from '../tokenRefresh';
import tokenService from '../../services/tokenService';

// Mock tokenService
vi.mock('../../services/tokenService', () => ({
  default: {
    isAuthenticated: vi.fn(),
    needsRefresh: vi.fn(),
    refreshIfNeeded: vi.fn()
  }
}));

describe('tokenRefresh', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let setIntervalSpy;
  let clearIntervalSpy;
  let setTimeoutSpy;
  let clearTimeoutSpy;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock timers
    vi.useFakeTimers();
    setIntervalSpy = vi.spyOn(global, 'setInterval');
    clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    // Reset tokenRefreshManager state
    tokenRefreshManager.stop();
    tokenRefreshManager.isRefreshing = false;
  });

  afterEach(() => {
    tokenRefreshManager.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start the refresh interval', () => {
      tokenRefreshManager.start();
      
      expect(setIntervalSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 [Token Refresh Manager] Starting - will check every 4 minutes'
      );
    });

    it('should schedule initial check after 10 seconds', () => {
      tokenRefreshManager.start();
      
      expect(setTimeoutSpy).toHaveBeenCalled();
      const setTimeoutCall = setTimeoutSpy.mock.calls.find(
        call => call[1] === 10000
      );
      expect(setTimeoutCall).toBeDefined();
    });

    it('should call checkAndRefresh on interval', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      
      tokenRefreshManager.start();
      
      // Fast-forward 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      
      await vi.runAllTimersAsync();
      
      expect(tokenService.isAuthenticated).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should clear the refresh interval', () => {
      tokenRefreshManager.start();
      expect(setIntervalSpy).toHaveBeenCalled();
      
      tokenRefreshManager.stop();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle stop when not started', () => {
      expect(() => tokenRefreshManager.stop()).not.toThrow();
    });
  });

  describe('checkAndRefresh', () => {
    it('should skip if already refreshing', async () => {
      tokenRefreshManager.isRefreshing = true;
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenService.isAuthenticated).not.toHaveBeenCalled();
    });

    it('should skip if user is not authenticated', async () => {
      tokenService.isAuthenticated.mockReturnValue(false);
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenService.isAuthenticated).toHaveBeenCalled();
      expect(tokenService.needsRefresh).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'ℹ️ [Token Refresh Manager] User not authenticated, skipping refresh check'
      );
    });

    it('should refresh if token needs refresh', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.refreshIfNeeded.mockResolvedValue(true);
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenService.needsRefresh).toHaveBeenCalled();
      expect(tokenService.refreshIfNeeded).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔄 [Token Refresh Manager] Token needs refresh - attempting proactive refresh...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ [Token Refresh Manager] Token refreshed successfully'
      );
    });

    it('should handle refresh failure', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.refreshIfNeeded.mockResolvedValue(false);
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [Token Refresh Manager] Proactive token refresh failed, user will be logged out on next API call'
      );
    });

    it('should skip refresh if token is still valid', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenService.needsRefresh).toHaveBeenCalled();
      expect(tokenService.refreshIfNeeded).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✓ [Token Refresh Manager] Token is still valid, no refresh needed'
      );
    });

    it('should handle errors during refresh', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.refreshIfNeeded.mockRejectedValue(new Error('Refresh failed'));
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [Token Refresh Manager] Error during proactive token refresh:',
        expect.any(Error)
      );
    });

    it('should reset isRefreshing flag after completion', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenRefreshManager.isRefreshing).toBe(false);
    });

    it('should reset isRefreshing flag after error', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockRejectedValue(new Error('Test error'));
      
      await tokenRefreshManager.checkAndRefresh();
      
      expect(tokenRefreshManager.isRefreshing).toBe(false);
    });
  });

  describe('forceRefresh', () => {
    it('should call checkAndRefresh', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      
      await tokenRefreshManager.forceRefresh();
      
      expect(tokenService.isAuthenticated).toHaveBeenCalled();
    });

    it('should wait if already refreshing', async () => {
      tokenRefreshManager.isRefreshing = true;
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      
      // Start a refresh that will complete
      const refreshPromise = tokenRefreshManager.checkAndRefresh();
      
      // Call forceRefresh while refreshing
      const forcePromise = tokenRefreshManager.forceRefresh();
      
      // Complete the refresh
      await refreshPromise;
      
      // Now forceRefresh should proceed
      await forcePromise;
      
      expect(tokenService.isAuthenticated).toHaveBeenCalled();
    });
  });
});


