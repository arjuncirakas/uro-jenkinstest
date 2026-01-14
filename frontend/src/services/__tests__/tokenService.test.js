import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import tokenService from '../tokenService.js';

describe('TokenService', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      })
    };
  })();

  beforeEach(() => {
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    // Clear all stored data
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should set access and refresh tokens successfully', () => {
      const result = tokenService.setTokens('access-token', 'refresh-token');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = tokenService.setTokens('access-token', 'refresh-token');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error setting tokens:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle null tokens', () => {
      const result = tokenService.setTokens(null, null);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'null');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'null');
    });

    it('should handle undefined tokens', () => {
      const result = tokenService.setTokens(undefined, undefined);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'undefined');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'undefined');
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when it exists', () => {
      localStorageMock.getItem.mockReturnValue('test-access-token');
      
      const token = tokenService.getAccessToken();
      
      expect(token).toBe('test-access-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken');
    });

    it('should return null when token does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const token = tokenService.getAccessToken();
      
      expect(token).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const token = tokenService.getAccessToken();
      
      expect(token).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error getting access token:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token when it exists', () => {
      localStorageMock.getItem.mockReturnValue('test-refresh-token');
      
      const token = tokenService.getRefreshToken();
      
      expect(token).toBe('test-refresh-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should return null when token does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const token = tokenService.getRefreshToken();
      
      expect(token).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const token = tokenService.getRefreshToken();
      
      expect(token).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error getting refresh token:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both tokens exist', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'access-token';
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });
      
      const isAuth = tokenService.isAuthenticated();
      
      expect(isAuth).toBe(true);
    });

    it('should return false when access token is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return null;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });
      
      const isAuth = tokenService.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });

    it('should return false when refresh token is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'access-token';
        if (key === 'refreshToken') return null;
        return null;
      });
      
      const isAuth = tokenService.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });

    it('should return false when both tokens are missing', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const isAuth = tokenService.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });
  });

  describe('isRefreshTokenValid', () => {
    it('should return true for valid non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(true);
    });

    it('should return false for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(false);
    });

    it('should return false when refresh token is null', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(false);
    });

    it('should return false for invalid token format', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return false for token with invalid base64 payload', () => {
      localStorageMock.getItem.mockReturnValue('header.invalid-base64.signature');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return false for token without exp field', () => {
      const payload = { userId: 1 };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const isValid = tokenService.isRefreshTokenValid();
      
      expect(isValid).toBe(false);
    });
  });

  describe('getUser', () => {
    it('should return user data when it exists', () => {
      const userData = { id: 1, email: 'test@example.com', role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const user = tokenService.getUser();
      
      expect(user).toEqual(userData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    it('should return null when user data does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const user = tokenService.getUser();
      
      expect(user).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = tokenService.getUser();
      
      expect(user).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = tokenService.getUser();
      
      expect(user).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('setUser', () => {
    it('should set user data successfully', () => {
      const userData = { id: 1, email: 'test@example.com' };
      
      const result = tokenService.setUser(userData);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData));
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = tokenService.setUser({ id: 1 });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error setting user data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle circular reference errors', () => {
      const userData = { id: 1 };
      userData.self = userData; // Create circular reference
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = tokenService.setUser(userData);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data successfully', () => {
      const result = tokenService.clearAuth();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = tokenService.clearAuth();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error clearing auth data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for null token', () => {
      const isExpired = tokenService.isTokenExpired(null);
      expect(isExpired).toBe(true);
    });

    it('should return true for undefined token', () => {
      const isExpired = tokenService.isTokenExpired(undefined);
      expect(isExpired).toBe(true);
    });

    it('should return true for empty string token', () => {
      const isExpired = tokenService.isTokenExpired('');
      expect(isExpired).toBe(true);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const isExpired = tokenService.isTokenExpired(token);
      expect(isExpired).toBe(true);
    });

    it('should return false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const isExpired = tokenService.isTokenExpired(token);
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token format', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const isExpired = tokenService.isTokenExpired('invalid-token');
      
      expect(isExpired).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return true for token with invalid base64', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const isExpired = tokenService.isTokenExpired('header.invalid-base64.signature');
      
      expect(isExpired).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return true for token without exp field', () => {
      const payload = { userId: 1 };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const isExpired = tokenService.isTokenExpired(token);
      
      expect(isExpired).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: expTime };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const expiration = tokenService.getTokenExpiration(token);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBe(expTime * 1000);
    });

    it('should return null for null token', () => {
      const expiration = tokenService.getTokenExpiration(null);
      expect(expiration).toBeNull();
    });

    it('should return null for undefined token', () => {
      const expiration = tokenService.getTokenExpiration(undefined);
      expect(expiration).toBeNull();
    });

    it('should return null for invalid token format', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const expiration = tokenService.getTokenExpiration('invalid-token');
      
      expect(expiration).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return null for token with invalid base64', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const expiration = tokenService.getTokenExpiration('header.invalid-base64.signature');
      
      expect(expiration).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('needsRefresh', () => {
    it('should return false when access token does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const needs = tokenService.needsRefresh();
      
      expect(needs).toBe(false);
    });

    it('should return true when token expiration cannot be determined', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      
      const needs = tokenService.needsRefresh();
      
      expect(needs).toBe(true);
    });

    it('should return false when token expires more than 5 minutes from now', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const needs = tokenService.needsRefresh();
      
      expect(needs).toBe(false);
    });

    it('should return true when token expires within 5 minutes', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const needs = tokenService.needsRefresh();
      
      expect(needs).toBe(true);
    });

    it('should return true when token is already expired', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const needs = tokenService.needsRefresh();
      
      expect(needs).toBe(true);
    });
  });

  describe('refreshIfNeeded', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      vi.stubGlobal('import.meta', { env: { VITE_API_URL: 'https://test-api.com/api' } });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should not refresh when token does not need refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });
      
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should refresh token when needed and succeed', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
      
      consoleSpy.mockRestore();
    });

    it('should clear auth when refresh token is missing', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return null;
        return null;
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should clear auth when refresh fails', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized')
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should clear auth when response is not successful', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: false
        }),
        text: vi.fn().mockResolvedValue('Error')
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      global.fetch.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await tokenService.refreshIfNeeded();
      
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should use default API URL when VITE_API_URL is not set', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      vi.stubGlobal('import.meta', { env: {} });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await tokenService.refreshIfNeeded();
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://uroprep.ahimsa.global/api'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getUserRole', () => {
    it('should return user role when user exists', () => {
      const userData = { id: 1, role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const role = tokenService.getUserRole();
      
      expect(role).toBe('urologist');
    });

    it('should return null when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const role = tokenService.getUserRole();
      
      expect(role).toBeNull();
    });

    it('should return null when user has no role', () => {
      const userData = { id: 1 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const role = tokenService.getUserRole();
      
      expect(role).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const userData = { id: 1, role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const hasRole = tokenService.hasRole('urologist');
      
      expect(hasRole).toBe(true);
    });

    it('should return false when user has different role', () => {
      const userData = { id: 1, role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const hasRole = tokenService.hasRole('gp');
      
      expect(hasRole).toBe(false);
    });

    it('should return false when user has no role', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const hasRole = tokenService.hasRole('urologist');
      
      expect(hasRole).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const userData = { id: 1, role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const hasAny = tokenService.hasAnyRole(['urologist', 'gp']);
      
      expect(hasAny).toBe(true);
    });

    it('should return false when user has none of the specified roles', () => {
      const userData = { id: 1, role: 'nurse' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const hasAny = tokenService.hasAnyRole(['urologist', 'gp']);
      
      expect(hasAny).toBe(false);
    });

    it('should return false when user has no role', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const hasAny = tokenService.hasAnyRole(['urologist', 'gp']);
      
      expect(hasAny).toBe(false);
    });

    it('should return false when roles array is empty', () => {
      const userData = { id: 1, role: 'urologist' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const hasAny = tokenService.hasAnyRole([]);
      
      expect(hasAny).toBe(false);
    });
  });

  describe('getUserId', () => {
    it('should return user ID when user exists', () => {
      const userData = { id: 1, email: 'test@example.com' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const userId = tokenService.getUserId();
      
      expect(userId).toBe(1);
    });

    it('should return null when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const userId = tokenService.getUserId();
      
      expect(userId).toBeNull();
    });

    it('should return null when user has no id', () => {
      const userData = { email: 'test@example.com' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const userId = tokenService.getUserId();
      
      expect(userId).toBeNull();
    });
  });

  describe('getUserEmail', () => {
    it('should return user email when user exists', () => {
      const userData = { id: 1, email: 'test@example.com' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const email = tokenService.getUserEmail();
      
      expect(email).toBe('test@example.com');
    });

    it('should return null when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const email = tokenService.getUserEmail();
      
      expect(email).toBeNull();
    });

    it('should return null when user has no email', () => {
      const userData = { id: 1 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const email = tokenService.getUserEmail();
      
      expect(email).toBeNull();
    });
  });

  describe('getUserFullName', () => {
    it('should return full name when both first and last name exist', () => {
      const userData = { id: 1, firstName: 'John', lastName: 'Doe' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBe('John Doe');
    });

    it('should return trimmed name when extra spaces exist', () => {
      const userData = { id: 1, firstName: '  John  ', lastName: '  Doe  ' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBe('  John     Doe  ');
    });

    it('should return first name only when last name is missing', () => {
      const userData = { id: 1, firstName: 'John' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBe('John');
    });

    it('should return last name only when first name is missing', () => {
      const userData = { id: 1, lastName: 'Doe' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBe('Doe');
    });

    it('should return null when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBeNull();
    });

    it('should return null when both names are missing', () => {
      const userData = { id: 1 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBeNull();
    });

    it('should return null when both names are empty strings', () => {
      const userData = { id: 1, firstName: '', lastName: '' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const fullName = tokenService.getUserFullName();
      
      expect(fullName).toBeNull();
    });
  });

  describe('isUserVerified', () => {
    it('should return true when user is verified', () => {
      const userData = { id: 1, isVerified: true };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isVerified = tokenService.isUserVerified();
      
      expect(isVerified).toBe(true);
    });

    it('should return false when user is not verified', () => {
      const userData = { id: 1, isVerified: false };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isVerified = tokenService.isUserVerified();
      
      expect(isVerified).toBe(false);
    });

    it('should return false when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const isVerified = tokenService.isUserVerified();
      
      expect(isVerified).toBe(false);
    });

    it('should return false when isVerified field is missing', () => {
      const userData = { id: 1 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isVerified = tokenService.isUserVerified();
      
      expect(isVerified).toBe(false);
    });
  });

  describe('isUserActive', () => {
    it('should return true when user is active', () => {
      const userData = { id: 1, isActive: true };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isActive = tokenService.isUserActive();
      
      expect(isActive).toBe(true);
    });

    it('should return false when user is not active', () => {
      const userData = { id: 1, isActive: false };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isActive = tokenService.isUserActive();
      
      expect(isActive).toBe(false);
    });

    it('should return false when user does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const isActive = tokenService.isUserActive();
      
      expect(isActive).toBe(false);
    });

    it('should return false when isActive field is missing', () => {
      const userData = { id: 1 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const isActive = tokenService.isUserActive();
      
      expect(isActive).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return complete auth status when user is authenticated', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      const payload = { exp: futureExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const userData = {
        id: 1,
        email: 'test@example.com',
        role: 'urologist',
        isVerified: true,
        isActive: true
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        if (key === 'user') return JSON.stringify(userData);
        return null;
      });
      
      const status = tokenService.getAuthStatus();
      
      expect(status.isAuthenticated).toBe(true);
      expect(status.user).toEqual(userData);
      expect(status.hasAccessToken).toBe(true);
      expect(status.hasRefreshToken).toBe(true);
      expect(status.isVerified).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.role).toBe('urologist');
      expect(status.needsRefresh).toBe(false);
    });

    it('should return status when user is not authenticated', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const status = tokenService.getAuthStatus();
      
      expect(status.isAuthenticated).toBe(false);
      expect(status.user).toBeNull();
      expect(status.hasAccessToken).toBe(false);
      expect(status.hasRefreshToken).toBe(false);
      expect(status.isVerified).toBe(false);
      expect(status.isActive).toBe(false);
      expect(status.role).toBeNull();
    });

    it('should return needsRefresh true when token needs refresh', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const payload = { exp: pastExp };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      
      const userData = { id: 1, role: 'urologist' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return token;
        if (key === 'refreshToken') return 'refresh-token';
        if (key === 'user') return JSON.stringify(userData);
        return null;
      });
      
      const status = tokenService.getAuthStatus();
      
      expect(status.needsRefresh).toBe(true);
    });
  });
});
