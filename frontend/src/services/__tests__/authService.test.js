import { describe, it, expect, vi, beforeEach } from 'vitest';
import authService from '../authService.js';
import apiClient, { handleApiError, API_ENDPOINTS } from '../../config/axios.js';
import tokenService from '../tokenService.js';

// Mock dependencies
vi.mock('../../config/axios.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  handleApiError: vi.fn((error) => {
    throw error;
  }),
  API_ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/auth/register',
      VERIFY_OTP: '/api/auth/verify-otp',
      RESEND_OTP: '/api/auth/resend-otp',
      LOGIN: '/api/auth/login',
      VERIFY_LOGIN_OTP: '/api/auth/verify-login-otp',
      RESEND_LOGIN_OTP: '/api/auth/resend-login-otp',
      REFRESH_TOKEN: '/api/auth/refresh-token',
      LOGOUT: '/api/auth/logout',
      PROFILE: '/api/auth/profile'
    }
  }
}));

vi.mock('../tokenService.js', () => ({
  default: {
    setTokens: vi.fn(),
    setUser: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(() => 'mock-refresh-token'),
    getUser: vi.fn(() => ({ id: 1, email: 'test@example.com' })),
    clearTokens: vi.fn(),
    clearUser: vi.fn(),
    clearAuth: vi.fn(),
    isTokenExpired: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    getUserRole: vi.fn(() => 'urologist'),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    getAuthStatus: vi.fn(() => ({ authenticated: true })),
    needsRefresh: vi.fn(() => false)
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };
      const mockResponse = {
        data: {
          success: true,
          message: 'User registered successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REGISTER, userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle registration errors', async () => {
      const userData = { email: 'test@example.com' };
      const mockError = new Error('Registration failed');
      mockError.response = { data: { message: 'Email already exists' } };

      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.register(userData)).rejects.toThrow('Registration failed');
      expect(handleApiError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP and store tokens on success', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const type = 'registration';
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.verifyOTP(email, otp, type);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        email,
        otp,
        type
      });
      expect(tokenService.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(tokenService.setUser).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });

    it('should verify OTP without storing tokens if no data returned', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockResponse = {
        data: {
          success: true,
          data: null
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.verifyOTP(email, otp);

      expect(tokenService.setTokens).not.toHaveBeenCalled();
      expect(tokenService.setUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle OTP verification errors', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockError = new Error('Invalid OTP');

      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.verifyOTP(email, otp)).rejects.toThrow('Invalid OTP');
      expect(handleApiError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('resendOTP', () => {
    it('should resend OTP successfully', async () => {
      const email = 'test@example.com';
      const type = 'registration';
      const mockResponse = {
        data: {
          success: true,
          message: 'OTP resent successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.resendOTP(email, type);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.RESEND_OTP, {
        email,
        type
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use default type if not provided', async () => {
      const email = 'test@example.com';
      const mockResponse = {
        data: { success: true }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      await authService.resendOTP(email);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.RESEND_OTP, {
        email,
        type: 'registration'
      });
    });

    it('should handle resend OTP errors', async () => {
      const email = 'test@example.com';
      const mockError = new Error('Failed to resend OTP');

      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.resendOTP(email)).rejects.toThrow('Failed to resend OTP');
    });
  });

  describe('login', () => {
    it('should login with OTP required', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            requiresOTPVerification: true
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login(email, password);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password
      });
      expect(tokenService.setTokens).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should login directly (legacy support) and store tokens', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            requiresOTPVerification: false
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await authService.login(email, password);

      expect(tokenService.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(tokenService.setUser).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
      expect(consoleSpy).toHaveBeenCalledWith('✅ Tokens stored for direct login (legacy support)');
      consoleSpy.mockRestore();
    });
  });

  describe('verifyLoginOTP', () => {
    it('should verify login OTP and store tokens', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.verifyLoginOTP(email, otp);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.VERIFY_LOGIN_OTP, {
        email,
        otp
      });
      expect(tokenService.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(tokenService.setUser).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resendLoginOTP', () => {
    it('should resend login OTP', async () => {
      const email = 'test@example.com';
      const mockResponse = {
        data: {
          success: true,
          message: 'OTP resent'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.resendLoginOTP(email);

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.RESEND_LOGIN_OTP, {
        email
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      tokenService.getRefreshToken.mockReturnValue('mock-refresh-token');
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(tokenService.getRefreshToken).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refreshToken: 'mock-refresh-token'
      });
      expect(tokenService.setTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error if no refresh token available', async () => {
      tokenService.getRefreshToken.mockReturnValue(null);

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });

    it('should clear auth on refresh failure', async () => {
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      const mockError = new Error('Token expired');
      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.refreshToken()).rejects.toThrow('Token expired');
      expect(tokenService.clearAuth).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully with refresh token', async () => {
      tokenService.getRefreshToken.mockReturnValue('mock-refresh-token');
      const mockResponse = {
        data: {
          success: true
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.logout();

      expect(tokenService.getRefreshToken).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGOUT, {
        refreshToken: 'mock-refresh-token'
      });
      expect(tokenService.clearAuth).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Logged out successfully' });
    });

    it('should logout even without refresh token', async () => {
      tokenService.getRefreshToken.mockReturnValue(null);

      const result = await authService.logout();

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(tokenService.clearAuth).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Logged out successfully' });
    });

    it('should clear auth even if logout fails', async () => {
      tokenService.getRefreshToken.mockReturnValue('mock-refresh-token');
      const mockError = new Error('Logout failed');
      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.logout()).rejects.toThrow('Logout failed');
      expect(tokenService.clearAuth).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1, email: 'test@example.com', name: 'Test User' }
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await authService.getProfile();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.PROFILE);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle get profile errors', async () => {
      const mockError = new Error('Failed to get profile');

      apiClient.get.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.getProfile()).rejects.toThrow('Failed to get profile');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const email = 'test@example.com';
      const mockResponse = {
        data: {
          success: true,
          message: 'Password reset OTP sent'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.requestPasswordReset(email);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle request password reset errors', async () => {
      const email = 'test@example.com';
      const mockError = new Error('User not found');

      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.requestPasswordReset(email)).rejects.toThrow('User not found');
    });
  });

  describe('verifyPasswordResetOTP', () => {
    it('should verify password reset OTP successfully', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockResponse = {
        data: {
          success: true,
          message: 'OTP verified'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.verifyPasswordResetOTP(email, otp);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-reset-otp', {
        email,
        otp
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle verify password reset OTP errors', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockError = new Error('Invalid OTP');

      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });

      await expect(authService.verifyPasswordResetOTP(email, otp)).rejects.toThrow('Invalid OTP');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetToken = 'reset-token';
      const newPassword = 'newPassword123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Password reset successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        resetToken,
        newPassword
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('setupPassword', () => {
    it('should setup password successfully', async () => {
      const token = 'setup-token';
      const password = 'newPassword123';
      const mockResponse = {
        data: {
          success: true,
          message: 'Password setup successful'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.setupPassword(token, password);

      expect(apiClient.post).toHaveBeenCalledWith('/superadmin/setup-password', {
        token,
        password
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('token and user management methods', () => {
    it('should check if authenticated', () => {
      const result = authService.isAuthenticated();
      expect(tokenService.isAuthenticated).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should get current user', () => {
      const result = authService.getCurrentUser();
      expect(tokenService.getUser).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should get user role', () => {
      const result = authService.getUserRole();
      expect(tokenService.getUserRole).toHaveBeenCalled();
      expect(result).toBe('urologist');
    });

    it('should check if user has role', () => {
      const result = authService.hasRole('urologist');
      expect(tokenService.hasRole).toHaveBeenCalledWith('urologist');
      expect(result).toBe(true);
    });

    it('should check if user has any role', () => {
      const result = authService.hasAnyRole(['urologist', 'doctor']);
      expect(tokenService.hasAnyRole).toHaveBeenCalledWith(['urologist', 'doctor']);
      expect(result).toBe(true);
    });

    it('should get auth status', () => {
      const result = authService.getAuthStatus();
      expect(tokenService.getAuthStatus).toHaveBeenCalled();
      expect(result).toEqual({ authenticated: true });
    });

    it('should check if token needs refresh', () => {
      const result = authService.needsTokenRefresh();
      expect(tokenService.needsRefresh).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('autoRefreshToken', () => {
    it('should refresh token if needed', async () => {
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-token',
            refreshToken: 'new-refresh'
          }
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.autoRefreshToken();

      expect(result).toBe(true);
      expect(tokenService.setTokens).toHaveBeenCalledWith('new-token', 'new-refresh');
    });

    it('should return true if refresh not needed', async () => {
      tokenService.needsRefresh.mockReturnValue(false);

      const result = await authService.autoRefreshToken();

      expect(result).toBe(true);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should return false if refresh fails', async () => {
      tokenService.needsRefresh.mockReturnValue(true);
      const mockError = new Error('Refresh failed');
      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authService.autoRefreshToken();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      const mockProfileResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1, email: 'test@example.com' }
          }
        }
      };
      apiClient.get.mockResolvedValue(mockProfileResponse);

      const result = await authService.validateSession();

      expect(result).toEqual({ valid: true });
      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.PROFILE);
    });

    it('should return invalid if not authenticated', async () => {
      tokenService.isAuthenticated.mockReturnValue(false);

      const result = await authService.validateSession();

      expect(result).toEqual({ valid: false, reason: 'Not authenticated' });
    });

    it('should auto-refresh token if needed during validation', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      const mockRefreshResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-token',
            refreshToken: 'new-refresh'
          }
        }
      };
      const mockProfileResponse = {
        data: {
          success: true,
          data: {
            user: { id: 1 }
          }
        }
      };
      apiClient.post.mockResolvedValue(mockRefreshResponse);
      apiClient.get.mockResolvedValue(mockProfileResponse);

      const result = await authService.validateSession();

      expect(result).toEqual({ valid: true });
    });

    it('should return invalid if token refresh fails', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(true);
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      const mockError = new Error('Refresh failed');
      apiClient.post.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authService.validateSession();

      expect(result).toEqual({ valid: false, reason: 'Token refresh failed' });
      consoleSpy.mockRestore();
    });

    it('should handle session validation errors', async () => {
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.needsRefresh.mockReturnValue(false);
      const mockError = new Error('Profile fetch failed');
      apiClient.get.mockRejectedValue(mockError);
      handleApiError.mockImplementation((error) => {
        throw error;
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authService.validateSession();

      expect(result).toEqual({ valid: false, reason: 'Session validation failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('getRoleRoutes', () => {
    it('should return correct route for urologist', () => {
      tokenService.getUserRole.mockReturnValue('urologist');
      const result = authService.getRoleRoutes();
      expect(result).toBe('/urologist/dashboard');
    });

    it('should return correct route for gp', () => {
      tokenService.getUserRole.mockReturnValue('gp');
      const result = authService.getRoleRoutes();
      expect(result).toBe('/gp/dashboard');
    });

    it('should return login route for unknown role', () => {
      tokenService.getUserRole.mockReturnValue('unknown');
      const result = authService.getRoleRoutes();
      expect(result).toBe('/login');
    });
  });

  describe('canAccessRoute', () => {
    it('should allow access for valid route', () => {
      tokenService.getUserRole.mockReturnValue('urologist');
      const result = authService.canAccessRoute('/urologist/dashboard');
      expect(result).toBe(true);
    });

    it('should deny access for invalid route', () => {
      tokenService.getUserRole.mockReturnValue('urologist');
      const result = authService.canAccessRoute('/superadmin/users');
      expect(result).toBe(false);
    });

    it('should return false if no role', () => {
      tokenService.getUserRole.mockReturnValue(null);
      const result = authService.canAccessRoute('/urologist/dashboard');
      expect(result).toBe(false);
    });
  });
});

