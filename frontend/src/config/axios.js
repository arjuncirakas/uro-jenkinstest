import axios from 'axios';

// Base URL for API
const BASE_URL = import.meta.env.VITE_API_URL || 'https://uroprep.ahimsa.global/api';

// Log the API URL being used
console.log('🌐 [Axios Config] API Base URL:', BASE_URL);
console.log('🌐 [Axios Config] VITE_API_URL:', import.meta.env.VITE_API_URL);

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (always read fresh on each request)
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 [Axios] Request to ${config.url} - Token found`);
    } else {
      console.warn(`⚠️ [Axios] Request to ${config.url} - No token found in localStorage`);
    }
    
    // Log request details for POST requests to /superadmin/users
    if (config.method === 'post' && config.url?.includes('/superadmin/users')) {
      console.log('📤 [Axios] POST /superadmin/users request:', {
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        method: config.method,
        data: config.data,
        headers: config.headers
      });
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('❌ [Axios] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log response time for debugging
    if (response.config.metadata) {
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      console.log(`✅ [Axios] Request to ${response.config.url} took ${duration}ms`);
    }
    
    // Log response details for POST requests to /superadmin/users
    if (response.config.method === 'post' && response.config.url?.includes('/superadmin/users')) {
      console.log('📥 [Axios] POST /superadmin/users response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Don't try to refresh token for auth endpoints (login, register, etc.)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                           originalRequest.url?.includes('/auth/register') ||
                           originalRequest.url?.includes('/auth/verify') ||
                           originalRequest.url?.includes('/auth/forgot-password') ||
                           originalRequest.url?.includes('/auth/reset-password') ||
                           originalRequest.url?.includes('/auth/refresh-token');
    
    // Skip token refresh for auth endpoints - let them handle their own errors
    if (isAuthEndpoint && error.response?.status === 401) {
      console.log('🔐 Auth endpoint error - skipping token refresh, letting component handle it');
      return Promise.reject(error);
    }
    
    // Handle 401 errors (unauthorized) - but NOT for auth endpoints
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a SESSION_TERMINATED error (single device login)
      if (error.response?.data?.code === 'SESSION_TERMINATED' || 
          error.response?.data?.code === 'SESSION_VALIDATION_ERROR') {
        console.warn('🔒 [Axios] Session terminated - user logged in from another device');
        // Don't try to refresh - session is terminated
        // Let the session validation service handle the logout
        const { default: tokenService } = await import('../services/tokenService.js');
        tokenService.clearAuth();
        // Redirect will be handled by session validation service
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }

      originalRequest._retry = true;
      
      try {
        // Import tokenService dynamically to avoid circular imports
        const { default: tokenService } = await import('../services/tokenService.js');
        
        // Check if refresh token is valid before attempting refresh
        if (tokenService.isRefreshTokenValid()) {
          const refreshToken = tokenService.getRefreshToken();
          
          if (refreshToken) {
            // Use a separate axios instance to avoid infinite loops
            const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {
              refreshToken: refreshToken
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (refreshResponse.data.success && refreshResponse.data.data) {
              const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
              
              // Update tokens using tokenService
              tokenService.setTokens(accessToken, newRefreshToken);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return apiClient(originalRequest);
            } else {
              throw new Error('Invalid refresh response');
            }
          }
        } else {
          throw new Error('Refresh token expired');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Import tokenService dynamically
        const { default: tokenService } = await import('../services/tokenService.js');
        
        // Check if this is a network error (no response) vs actual auth failure
        const isNetworkError = !refreshError.response;
        const isAuthFailure = refreshError.response?.status === 401 || 
                              refreshError.response?.status === 403 ||
                              refreshError.message?.includes('expired') ||
                              refreshError.message?.includes('invalid');
        
        // Only logout on actual authentication failures, not network errors
        if (isNetworkError) {
          console.warn('⚠️ [Axios] Network error during token refresh - not logging out. Original request will fail.');
          // Don't logout on network errors - just reject the original request
          // The user can retry when network is back
          return Promise.reject(error);
        }
        
        // Check if refresh token is actually expired
        if (!tokenService.isRefreshTokenValid()) {
          console.warn('⚠️ [Axios] Refresh token expired - logging out');
          tokenService.clearAuth();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
        
        // If it's an auth failure but refresh token is still valid, logout
        if (isAuthFailure) {
          console.warn('⚠️ [Axios] Authentication failure during token refresh - logging out');
          tokenService.clearAuth();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
        
        // For other errors (server errors, etc.), don't logout - just reject
        console.warn('⚠️ [Axios] Token refresh failed but not logging out - may be temporary server issue');
        return Promise.reject(error);
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || 60;
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('❌ [Axios] Network error:', error.message);
      console.error('❌ [Axios] Network error details:', {
        message: error.message,
        code: error.code,
        config: error.config
      });
    }
    
    // Log error details for POST requests to /superadmin/users
    if (error.config?.method === 'post' && error.config?.url?.includes('/superadmin/users')) {
      console.error('❌ [Axios] POST /superadmin/users error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        request: error.config?.data
      });
    }
    
    return Promise.reject(error);
  }
);

// API endpoints configuration
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-registration-otp',
    RESEND_OTP: '/auth/resend-registration-otp',
    LOGIN: '/auth/login',
    VERIFY_LOGIN_OTP: '/auth/verify-login-otp',
    RESEND_LOGIN_OTP: '/auth/resend-login-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  
  // Health check
  HEALTH: '/health',
};

// Error handling utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          message: data.message || 'Bad request',
          errors: data.errors || [],
          type: 'validation'
        };
      case 401:
        return {
          message: data.message || 'Unauthorized',
          type: 'auth'
        };
      case 403:
        return {
          message: data.message || 'Forbidden',
          type: 'permission'
        };
      case 404:
        return {
          message: data.message || 'Not found',
          type: 'not_found'
        };
      case 409:
        return {
          message: data.message || 'Conflict',
          type: 'conflict'
        };
      case 429:
        return {
          message: data.message || 'Too many requests',
          retryAfter: data.retryAfter,
          type: 'rate_limit'
        };
      case 500:
        return {
          message: 'Internal server error',
          type: 'server'
        };
      default:
        return {
          message: data.message || 'An error occurred',
          type: 'unknown'
        };
    }
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error. Please check your connection.',
      type: 'network'
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      type: 'unknown'
    };
  }
};

export default apiClient;
