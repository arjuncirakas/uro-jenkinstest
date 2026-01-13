import React, { useState, useEffect, useRef } from 'react';
import { X, Cookie, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import tokenService from '../services/tokenService';

const COOKIE_CONSENT_KEY = 'cookieConsent';
const SHOW_BANNER_FLAG = 'showCookieBanner';

const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isVisibleRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    // Don't show banner on auth-related pages (login, register, etc.)
    const authRoutes = ['/login', '/register', '/setup-password', '/unauthorized'];
    const isAuthRoute = authRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));
    
    // Hide banner immediately if on auth route
    if (isAuthRoute) {
      setIsVisible(false);
      return;
    }

    const checkAndShowBanner = () => {
      // Don't check if already visible
      if (isVisibleRef.current) return false;

      // Check if user is authenticated
      const isAuthenticated = tokenService.isAuthenticated();
      
      // Check if user has already given consent (persists across sessions)
      const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
      
      // Check if banner should be shown in this session (only set on login)
      const shouldShowBanner = sessionStorage.getItem(SHOW_BANNER_FLAG) === 'true';
      
      // Show banner only if:
      // 1. User is authenticated
      // 2. User hasn't given consent yet
      // 3. Banner flag is set (user just logged in, not a page refresh)
      // 4. Not on an auth route (already checked above)
      if (isAuthenticated && !hasConsented && shouldShowBanner) {
        // Small delay to ensure smooth page load
        setTimeout(() => {
          setIsVisible(true);
        }, 300);
        return true; // Banner will be shown
      }
      return false; // Banner won't be shown
    };

    // Check immediately on mount and route changes
    const shouldStopPolling = checkAndShowBanner();
    
    // If banner is already set to show, no need to poll
    if (shouldStopPolling) return;

    // Set up a short polling interval to catch sessionStorage changes
    // This handles cases where the flag is set after navigation
    const intervalId = setInterval(() => {
      // Stop polling if banner becomes visible
      if (isVisibleRef.current) {
        clearInterval(intervalId);
        return;
      }
      const shown = checkAndShowBanner();
      if (shown) {
        clearInterval(intervalId);
      }
    }, 200);

    // Clear interval after 5 seconds (enough time for login to complete)
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    // Clear the session flag so banner doesn't show on page refresh
    sessionStorage.removeItem(SHOW_BANNER_FLAG);
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    // Clear the session flag so banner doesn't show on page refresh
    sessionStorage.removeItem(SHOW_BANNER_FLAG);
    setIsVisible(false);
  };

  const handlePrivacyPolicy = () => {
    // Clear the session flag so banner doesn't show on page refresh
    sessionStorage.removeItem(SHOW_BANNER_FLAG);
    navigate('/privacy-policy');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] animate-slideUp">
      <div className="bg-white border-t-2 border-teal-600 shadow-2xl mx-auto max-w-7xl">
        <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left side - Icon and message */}
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <Cookie className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Cookie Consent
                </h3>
                <p className="text-sm text-gray-600">
                  We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                  By clicking "Accept All", you consent to our use of cookies.{' '}
                  <button
                    onClick={handlePrivacyPolicy}
                    className="text-teal-600 hover:text-teal-700 underline font-medium inline-flex items-center gap-1"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </p>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleDecline}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg"
              >
                Accept All
              </button>
              <button
                onClick={() => {
                  // Clear the session flag so banner doesn't show on page refresh
                  sessionStorage.removeItem(SHOW_BANNER_FLAG);
                  setIsVisible(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
