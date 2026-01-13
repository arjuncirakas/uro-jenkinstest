import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRoutes from './AppRoutes';
import tokenRefreshManager from './utils/tokenRefresh';
import sessionTimeoutService from './services/sessionTimeoutService';
import sessionValidationService from './services/sessionValidationService';
import CookieConsentBanner from './components/CookieConsentBanner';
import SessionTimeoutWarning from './components/modals/SessionTimeoutWarning';
import tokenService from './services/tokenService';
import authService from './services/authService';
import './App.css';

const AppContent = () => {
  const navigate = useNavigate();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    // Start token refresh manager
    tokenRefreshManager.start();

    // Start session timeout service if user is authenticated
    const checkAndStartSessionTimeout = () => {
      if (tokenService.isAuthenticated()) {
        sessionTimeoutService.start(
          () => {
            // Warning callback
            setShowTimeoutWarning(true);
          },
          async () => {
            // Timeout callback
            try {
              await authService.logout();
              setShowTimeoutWarning(false);
              navigate('/login', { 
                state: { 
                  message: 'Your session has expired due to inactivity. Please log in again.' 
                } 
              });
            } catch (error) {
              console.error('Session timeout logout error:', error);
              tokenService.clearAuth();
              navigate('/login');
            }
          }
        );
      } else {
        sessionTimeoutService.stop();
      }
    };

    // Start session validation service if user is authenticated (Single Device Login)
    const checkAndStartSessionValidation = () => {
      if (tokenService.isAuthenticated()) {
        sessionValidationService.start(
          async () => {
            // Session terminated callback (user logged in from another device)
            try {
              await authService.logout();
              navigate('/login', { 
                state: { 
                  message: 'You have been logged out because you logged in from another device. Only one device can be logged in at a time.' 
                } 
              });
            } catch (error) {
              console.error('Session validation logout error:', error);
              tokenService.clearAuth();
              navigate('/login');
            }
          }
        );
      } else {
        sessionValidationService.stop();
      }
    };

    // Initial checks
    checkAndStartSessionTimeout();
    checkAndStartSessionValidation();

    // Check periodically if authentication status changes
    const authCheckInterval = setInterval(() => {
      const wasAuthenticated = sessionTimeoutService.getActive() || sessionValidationService.getActive();
      const isAuthenticated = tokenService.isAuthenticated();
      
      if (isAuthenticated && !wasAuthenticated) {
        checkAndStartSessionTimeout();
        checkAndStartSessionValidation();
      } else if (!isAuthenticated && wasAuthenticated) {
        sessionTimeoutService.stop();
        sessionValidationService.stop();
        setShowTimeoutWarning(false);
      }
    }, 5000); // Check every 5 seconds

    // Cleanup
    return () => {
      tokenRefreshManager.stop();
      sessionTimeoutService.stop();
      sessionValidationService.stop();
      clearInterval(authCheckInterval);
    };
  }, [navigate]);

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
  };

  return (
    <>
      <AppRoutes />
      <CookieConsentBanner />
      <SessionTimeoutWarning 
        isOpen={showTimeoutWarning} 
        onExtendSession={handleExtendSession}
      />
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;
