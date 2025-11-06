// Token refresh utility for proactive token management
import tokenService from '../services/tokenService.js';

class TokenRefreshManager {
  constructor() {
    this.refreshInterval = null;
    this.isRefreshing = false;
  }

  // Start periodic token refresh check
  start() {
    console.log('🚀 [Token Refresh Manager] Starting - will check every 4 minutes');
    // Check every 4 minutes (tokens expire in 15 minutes, refresh 5 minutes before)
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefresh();
    }, 4 * 60 * 1000); // 4 minutes
    
    // Run initial check after 10 seconds
    setTimeout(async () => {
      console.log('🔄 [Token Refresh Manager] Running initial check...');
      await this.checkAndRefresh();
    }, 10000);
  }

  // Stop periodic token refresh check
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Check if token needs refresh and refresh if needed
  async checkAndRefresh() {
    if (this.isRefreshing) return;
    
    try {
      this.isRefreshing = true;
      
      // Only refresh if user is authenticated and token needs refresh
      if (tokenService.isAuthenticated()) {
        if (tokenService.needsRefresh()) {
          console.log('🔄 [Token Refresh Manager] Token needs refresh - attempting proactive refresh...');
          const success = await tokenService.refreshIfNeeded();
          
          if (!success) {
            console.warn('⚠️ [Token Refresh Manager] Proactive token refresh failed, user will be logged out on next API call');
          } else {
            console.log('✅ [Token Refresh Manager] Token refreshed successfully');
          }
        } else {
          console.log('✓ [Token Refresh Manager] Token is still valid, no refresh needed');
        }
      } else {
        console.log('ℹ️ [Token Refresh Manager] User not authenticated, skipping refresh check');
      }
    } catch (error) {
      console.error('❌ [Token Refresh Manager] Error during proactive token refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // Force refresh token (useful for critical operations)
  async forceRefresh() {
    if (this.isRefreshing) {
      // Wait for current refresh to complete
      while (this.isRefreshing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    return await this.checkAndRefresh();
  }
}

// Create singleton instance
const tokenRefreshManager = new TokenRefreshManager();

export default tokenRefreshManager;

