// Session validation service for single device login
// Periodically checks if the current session is still valid
// Automatically logs out if session was terminated (user logged in from another device)
import apiClient, { API_ENDPOINTS } from '../config/axios.js';
import tokenService from './tokenService.js';
import authService from './authService.js';

class SessionValidationService {
  constructor() {
    this.checkInterval = null;
    this.isActive = false;
    this.onSessionTerminated = null;
    this.CHECK_INTERVAL = 30000; // Check every 30 seconds
  }

  // Start periodic session validation
  start(onSessionTerminated) {
    if (this.isActive) {
      this.stop();
    }

    // Only start if user is authenticated
    if (!tokenService.isAuthenticated()) {
      return;
    }

    this.onSessionTerminated = onSessionTerminated;
    this.isActive = true;

    // Run initial check after 5 seconds
    setTimeout(() => {
      this.checkSession();
    }, 5000);

    // Check periodically
    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL);

    console.log('🔍 [Session Validation] Started - checking every 30 seconds');
  }

  // Stop periodic session validation
  stop() {
    this.isActive = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.onSessionTerminated = null;
    console.log('🔍 [Session Validation] Stopped');
  }

  // Check if current session is still valid
  async checkSession() {
    if (!this.isActive || !tokenService.isAuthenticated()) {
      return;
    }

    try {
      const response = await apiClient.get('/auth/check-session');

      if (response.data.success && response.data.valid) {
        // Session is valid
        return { valid: true };
      } else {
        // Session is invalid
        console.warn('⚠️ [Session Validation] Session terminated - user logged in from another device');
        this.handleSessionTerminated();
        return { valid: false, reason: 'SESSION_TERMINATED' };
      }
    } catch (error) {
      // Check if error is due to session termination
      if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_TERMINATED') {
        console.warn('⚠️ [Session Validation] Session terminated - user logged in from another device');
        this.handleSessionTerminated();
        return { valid: false, reason: 'SESSION_TERMINATED' };
      }

      // Other errors (network, etc.) - don't log out, just log the error
      console.error('❌ [Session Validation] Error checking session:', error.message);
      return { valid: true, error: error.message }; // Assume valid on error to avoid false logouts
    }
  }

  // Handle session termination
  async handleSessionTerminated() {
    if (!this.isActive) {
      return;
    }

    // Stop the service
    this.stop();

    // Call callback if provided
    if (this.onSessionTerminated) {
      this.onSessionTerminated();
    } else {
      // Default: logout user
      try {
        await authService.logout();
        // Redirect to login page
        globalThis.location.href = '/login';
      } catch (error) {
        console.error('❌ [Session Validation] Error during logout:', error);
        // Force clear and redirect even if logout fails
        tokenService.clearAuth();
        globalThis.location.href = '/login';
      }
    }
  }

  // Force check session (useful for critical operations)
  async forceCheck() {
    return await this.checkSession();
  }

  // Check if service is active
  getActive() {
    return this.isActive;
  }
}

// Create singleton instance
const sessionValidationService = new SessionValidationService();

export default sessionValidationService;
