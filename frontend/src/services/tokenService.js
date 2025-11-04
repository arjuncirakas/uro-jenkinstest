// Token management service
class TokenService {
  constructor() {
    this.ACCESS_TOKEN_KEY = 'accessToken';
    this.REFRESH_TOKEN_KEY = 'refreshToken';
    this.USER_KEY = 'user';
  }

  // Set tokens in localStorage
  setTokens(accessToken, refreshToken) {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      return true;
    } catch (error) {
      console.error('Error setting tokens:', error);
      return false;
    }
  }

  // Get access token
  getAccessToken() {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get refresh token
  getRefreshToken() {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    return !!(accessToken && refreshToken);
  }

  // Check if refresh token is valid (not expired)
  isRefreshTokenValid() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    
    try {
      const payload = JSON.parse(atob(refreshToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error checking refresh token validity:', error);
      return false;
    }
  }

  // Get user data
  getUser() {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Set user data
  setUser(user) {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error setting user data:', error);
      return false;
    }
  }

  // Clear all tokens and user data
  clearAuth() {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }

  // Check if token is expired (basic check)
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // Decode JWT token (basic decode, not verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Get token expiration time
  getTokenExpiration(token) {
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  }

  // Check if token needs refresh (refresh 5 minutes before expiry)
  needsRefresh() {
    const accessToken = this.getAccessToken();
    if (!accessToken) return false;
    
    const expiration = this.getTokenExpiration(accessToken);
    if (!expiration) return true;
    
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration < fiveMinutesFromNow;
  }

  // Proactively refresh token if needed
  async refreshIfNeeded() {
    if (this.needsRefresh()) {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            this.setTokens(data.data.accessToken, data.data.refreshToken);
            return true;
          }
        }
        throw new Error('Token refresh failed');
      } catch (error) {
        console.error('Proactive token refresh failed:', error);
        this.clearAuth();
        return false;
      }
    }
    return true;
  }

  // Get user role
  getUserRole() {
    const user = this.getUser();
    return user?.role || null;
  }

  // Check if user has specific role
  hasRole(role) {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    const userRole = this.getUserRole();
    return roles.includes(userRole);
  }

  // Get user ID
  getUserId() {
    const user = this.getUser();
    return user?.id || null;
  }

  // Get user email
  getUserEmail() {
    const user = this.getUser();
    return user?.email || null;
  }

  // Get user full name
  getUserFullName() {
    const user = this.getUser();
    if (!user) return null;
    
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || null;
  }

  // Check if user is verified
  isUserVerified() {
    const user = this.getUser();
    return user?.isVerified || false;
  }

  // Check if user is active
  isUserActive() {
    const user = this.getUser();
    return user?.isActive || false;
  }

  // Get authentication status with details
  getAuthStatus() {
    const isAuthenticated = this.isAuthenticated();
    const user = this.getUser();
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    return {
      isAuthenticated,
      user,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      isVerified: user?.isVerified || false,
      isActive: user?.isActive || false,
      role: user?.role || null,
      needsRefresh: this.needsRefresh()
    };
  }
}

// Create and export singleton instance
const tokenService = new TokenService();
export default tokenService;
