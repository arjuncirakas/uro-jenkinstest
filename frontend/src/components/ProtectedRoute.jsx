import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import tokenService from '../services/tokenService';

/**
 * ProtectedRoute Component
 * Protects routes from unauthorized access
 * Checks authentication and role-based authorization
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is authenticated
      const isAuthenticated = tokenService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log('🔒 ProtectedRoute: User not authenticated, redirecting to login');
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // Check if user has required role
      if (allowedRoles.length > 0) {
        const userRole = tokenService.getUserRole();
        const hasRole = allowedRoles.includes(userRole);
        
        if (!hasRole) {
          console.log(`🔒 ProtectedRoute: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`);
          setIsAuthorized(false);
          setIsChecking(false);
          return;
        }
      }

      // Check if tokens are expired
      const accessToken = tokenService.getAccessToken();
      const refreshToken = tokenService.getRefreshToken();
      
      if (tokenService.isTokenExpired(accessToken) && tokenService.isTokenExpired(refreshToken)) {
        console.log('🔒 ProtectedRoute: Both tokens expired, redirecting to login');
        tokenService.clearAuth();
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // All checks passed
      console.log('✅ ProtectedRoute: User authorized');
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [allowedRoles, location.pathname]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authorized, redirect to login or unauthorized page
  if (!isAuthorized) {
    const isAuthenticated = tokenService.isAuthenticated();
    
    if (!isAuthenticated) {
      // Not logged in - redirect to login
      return <Navigate to="/login" state={{ from: location }} replace />;
    } else {
      // Logged in but wrong role - redirect to unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authorized, render the protected content
  return children;
};

export default ProtectedRoute;

















