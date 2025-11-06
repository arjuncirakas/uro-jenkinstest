import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Home, LogOut } from 'lucide-react';
import authService from '../services/authService';

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    // Get user role and redirect to appropriate dashboard
    const role = authService.getUserRole();
    const dashboardRoutes = {
      superadmin: '/superadmin/dashboard',
      urologist: '/urologist/dashboard',
      gp: '/gp/dashboard',
      urology_nurse: '/nurse/opd-management'
    };
    
    navigate(dashboardRoutes[role] || '/login');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            This area is restricted to authorized users only. If you believe you should have access, please contact your administrator.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Need help? Contact support at{' '}
              <a href="mailto:techsupport@ahimsa.global" className="text-teal-600 hover:underline">
                techsupport@ahimsa.global
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Error Code: 403 - Forbidden
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;






