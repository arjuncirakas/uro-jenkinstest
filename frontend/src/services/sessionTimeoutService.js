// Session timeout service for HIPAA/GDPR compliance
// Automatically logs out users after 30 minutes of inactivity
import tokenService from './tokenService.js';
import authService from './authService.js';

class SessionTimeoutService {
  constructor() {
    // 30 minutes in milliseconds (HIPAA/GDPR standard)
    this.TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
    // Show warning 5 minutes before timeout
    this.WARNING_TIME = 25 * 60 * 1000; // 25 minutes (5 min before)
    
    // Throttle mousemove to avoid excessive events
    this.MOUSE_MOVE_THROTTLE = 5000; // Only process mousemove every 5 seconds
    
    this.timeoutTimer = null;
    this.warningTimer = null;
    this.lastActivityTime = null;
    this.lastResetTime = null;
    this.isActive = false;
    this.onWarningCallback = null;
    this.onTimeoutCallback = null;
    
    // Throttle tracking for mousemove
    this.lastMouseMoveTime = 0;
    this.throttledHandleActivity = null;
    
    // Activity events to track
    // Immediate events (clicks, keypresses) - fire immediately
    this.immediateEvents = [
      'mousedown',
      'keypress',
      'keydown',
      'click',
      'touchstart',
      'scroll',
      'wheel'
    ];
    
    // Throttled events (mousemove) - fire only every few seconds
    this.throttledEvents = [
      'mousemove'
    ];
  }

  // Start monitoring user activity
  start(onWarning, onTimeout) {
    if (this.isActive) {
      this.stop();
    }

    // Only start if user is authenticated
    if (!tokenService.isAuthenticated()) {
      return;
    }

    this.onWarningCallback = onWarning;
    this.onTimeoutCallback = onTimeout;
    this.isActive = true;
    this.lastActivityTime = Date.now();
    this.lastResetTime = Date.now();
    this.lastMouseMoveTime = 0;

    // Create throttled handler for mousemove
    this.throttledHandleActivity = this.throttle(
      this.handleActivity.bind(this),
      this.MOUSE_MOVE_THROTTLE
    );

    // Set up activity listeners
    this.setupActivityListeners();

    // Set initial timers
    this.resetTimers();

    console.log('⏱️ [Session Timeout] Started - 30 minute inactivity timeout');
  }

  // Stop monitoring
  stop() {
    this.isActive = false;
    this.clearTimers();
    this.removeActivityListeners();
    this.onWarningCallback = null;
    this.onTimeoutCallback = null;
    this.throttledHandleActivity = null;
    console.log('⏱️ [Session Timeout] Stopped');
  }

  // Throttle function - limits how often a function can be called
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Set up event listeners for user activity
  setupActivityListeners() {
    // Immediate events - fire right away
    this.immediateEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), true);
    });

    // Throttled events - fire only every few seconds
    this.throttledEvents.forEach(event => {
      document.addEventListener(event, this.throttledHandleActivity, true);
    });
  }

  // Remove event listeners
  removeActivityListeners() {
    this.immediateEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity.bind(this), true);
    });

    if (this.throttledHandleActivity) {
      this.throttledEvents.forEach(event => {
        document.removeEventListener(event, this.throttledHandleActivity, true);
      });
    }
  }

  // Handle user activity - reset timers
  handleActivity() {
    if (!this.isActive || !tokenService.isAuthenticated()) {
      return;
    }

    // Update last activity time
    this.lastActivityTime = Date.now();
    
    // Reset timers only if significant time has passed (avoid excessive resets)
    // This prevents timer resets on every tiny movement
    const timeSinceLastReset = Date.now() - (this.lastResetTime || 0);
    if (timeSinceLastReset > 1000) { // Only reset if at least 1 second has passed
      this.resetTimers();
      this.lastResetTime = Date.now();
    }
  }

  // Reset both warning and timeout timers
  resetTimers() {
    this.clearTimers();

    if (!this.isActive || !tokenService.isAuthenticated()) {
      return;
    }

    // Set warning timer (5 minutes before timeout)
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.WARNING_TIME);

    // Set timeout timer (30 minutes total)
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.TIMEOUT_DURATION);
  }

  // Clear all timers
  clearTimers() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  // Show warning to user
  showWarning() {
    if (!this.isActive || !tokenService.isAuthenticated()) {
      return;
    }

    console.log('⚠️ [Session Timeout] Warning: 5 minutes until automatic logout');
    
    if (this.onWarningCallback) {
      this.onWarningCallback();
    }
  }

  // Handle timeout - logout user
  async handleTimeout() {
    if (!this.isActive) {
      return;
    }

    console.log('🔒 [Session Timeout] Timeout reached - logging out user');

    // Stop the service
    this.stop();

    // Call timeout callback if provided
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    } else {
      // Default: logout user
      try {
        await authService.logout();
        // Redirect to login page
        globalThis.location.href = '/login';
      } catch (error) {
        console.error('❌ [Session Timeout] Error during logout:', error);
        // Force clear and redirect even if logout fails
        tokenService.clearAuth();
        globalThis.location.href = '/login';
      }
    }
  }

  // Extend session (called when user interacts with warning modal)
  extendSession() {
    if (!this.isActive || !tokenService.isAuthenticated()) {
      return;
    }

    console.log('✅ [Session Timeout] Session extended by user');
    this.lastActivityTime = Date.now();
    this.lastResetTime = Date.now();
    this.resetTimers();
  }

  // Get time remaining until timeout
  getTimeRemaining() {
    if (!this.lastActivityTime) {
      return this.TIMEOUT_DURATION;
    }

    const elapsed = Date.now() - this.lastActivityTime;
    const remaining = this.TIMEOUT_DURATION - elapsed;
    return Math.max(0, remaining);
  }

  // Get minutes remaining
  getMinutesRemaining() {
    return Math.ceil(this.getTimeRemaining() / (60 * 1000));
  }

  // Check if service is active
  getActive() {
    return this.isActive;
  }
}

// Create singleton instance
const sessionTimeoutService = new SessionTimeoutService();

export default sessionTimeoutService;
