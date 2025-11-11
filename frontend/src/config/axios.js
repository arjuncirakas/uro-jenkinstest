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
    } else {
      console.warn(`[Axios] Request to ${config.url} - No token found in localStorage`);
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('[Axios] Request interceptor error:', error);
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
      console.log(`API Request to ${response.config.url} took ${duration}ms`);
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
      originalRequest._retry = true;
      
      // Check if this is a file request - don't redirect for file requests, let the service handle it
      const isFileRequest = originalRequest.url?.includes('/files/') || 
                           originalRequest.responseType === 'blob';
      
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
        // Refresh failed, clear auth data
        const { default: tokenService } = await import('../services/tokenService.js');
        tokenService.clearAuth();
        
        // Only redirect to login if it's NOT a file request
        // File requests should show an error message instead
        if (!isFileRequest) {
          // Redirect to login page
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || 60;
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
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
