import apiClient, { handleApiError, API_ENDPOINTS } from '../config/axios.js';
import tokenService from './tokenService.js';

class AuthService {
  // Register a new user
  async register(userData) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Verify OTP for registration
  async verifyOTP(email, otp, type = 'registration') {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        email,
        otp,
        type
      });
      
      // If verification successful, store tokens and user data
      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken } = response.data.data;
        
        // Store tokens and user data
        tokenService.setTokens(accessToken, refreshToken);
        tokenService.setUser(user);
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Resend OTP
  async resendOTP(email, type = 'registration') {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_OTP, {
        email,
        type
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Login user (Step 1: Send OTP or direct login for superadmin)
  async login(email, password) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password
      });
      
      // Check if it's a direct login (tokens returned) or OTP flow
      if (response.data.success && response.data.data && response.data.data.accessToken) {
        // Direct login successful - store tokens and user data
        const { user, accessToken, refreshToken } = response.data.data;
        tokenService.setTokens(accessToken, refreshToken);
        tokenService.setUser(user);
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Verify login OTP (Step 2: Complete login)
  async verifyLoginOTP(email, otp) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_LOGIN_OTP, {
        email,
        otp
      });
      
      // Store tokens and user data after successful OTP verification
      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken } = response.data.data;
        
        tokenService.setTokens(accessToken, refreshToken);
        tokenService.setUser(user);
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Resend login OTP
  async resendLoginOTP(email) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_LOGIN_OTP, {
        email
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Logout user
  async logout() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      
      if (refreshToken) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
          refreshToken
        });
      }
      
      // Clear local storage
      tokenService.clearAuth();
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      // Even if logout fails on server, clear local storage
      tokenService.clearAuth();
      throw handleApiError(error);
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      
      // Update user data in storage
      if (response.data.success && response.data.data) {
        tokenService.setUser(response.data.data.user);
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refreshToken
      });
      
      // Update tokens
      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        tokenService.setTokens(accessToken, newRefreshToken);
      }
      
      return response.data;
    } catch (error) {
      // If refresh fails, clear auth data
      tokenService.clearAuth();
      throw handleApiError(error);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return tokenService.isAuthenticated();
  }

  // Get current user
  getCurrentUser() {
    return tokenService.getUser();
  }

  // Get user role
  getUserRole() {
    return tokenService.getUserRole();
  }

  // Check if user has specific role
  hasRole(role) {
    return tokenService.hasRole(role);
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    return tokenService.hasAnyRole(roles);
  }

  // Get authentication status
  getAuthStatus() {
    return tokenService.getAuthStatus();
  }

  // Check if token needs refresh
  needsTokenRefresh() {
    return tokenService.needsRefresh();
  }

  // Auto-refresh token if needed
  async autoRefreshToken() {
    if (this.needsTokenRefresh()) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.error('Auto refresh failed:', error);
        return false;
      }
    }
    return true;
  }

  // Validate user session
  async validateSession() {
    try {
      if (!this.isAuthenticated()) {
        return { valid: false, reason: 'Not authenticated' };
      }

      // Check if token needs refresh
      if (this.needsTokenRefresh()) {
        const refreshed = await this.autoRefreshToken();
        if (!refreshed) {
          return { valid: false, reason: 'Token refresh failed' };
        }
      }

      // Get fresh profile data
      await this.getProfile();
      
      return { valid: true };
    } catch (error) {
      console.error('Session validation failed:', error);
      return { valid: false, reason: 'Session validation failed' };
    }
  }

  // Get role-based navigation routes
  getRoleRoutes() {
    const role = this.getUserRole();
    
    const roleRoutes = {
      superadmin: '/superadmin/dashboard',
      urologist: '/urologist/dashboard',
      doctor: '/urologist/dashboard', // Doctors use the same routes as urologists
      gp: '/gp/dashboard',
      urology_nurse: '/nurse/opd-management'
    };
    
    return roleRoutes[role] || '/login';
  }

  // Check if user can access a specific route
  canAccessRoute(route) {
    const role = this.getUserRole();
    
    if (!role) return false;
    
    // Define role-based access rules
    const accessRules = {
      superadmin: ['/superadmin', '/dashboard', '/profile'],
      urologist: ['/urologist', '/dashboard', '/profile'],
      doctor: ['/urologist', '/dashboard', '/profile'], // Doctors have same access as urologists
      gp: ['/gp', '/dashboard', '/profile'],
      urology_nurse: ['/nurse', '/dashboard', '/profile']
    };
    
    const allowedRoutes = accessRules[role] || [];
    return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute));
  }

  // Setup password for new user
  async setupPassword(token, password) {
    try {
      const response = await apiClient.post('/superadmin/setup-password', {
        token,
        password
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Request password reset (send OTP)
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Verify password reset OTP
  async verifyPasswordResetOTP(email, otp) {
    try {
      const response = await apiClient.post('/auth/verify-reset-otp', {
        email,
        otp
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Reset password with token
  async resetPassword(resetToken, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        resetToken,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;
