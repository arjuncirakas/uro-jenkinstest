import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import OTPModal from '../modals/OTPModal';
import SuccessModal from '../modals/SuccessModal';
import FailureModal from '../modals/FailureModal';
import ForgotPasswordModal from '../modals/ForgotPasswordModal';
import authService from '../../services/authService.js';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otpData, setOtpData] = useState({
    userId: null,
    email: ''
  });

  // Modal states
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: ''
  });

  // Track if fields have been touched
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  // Validation functions
  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    return '';
  };

  const validatePassword = (password) => {
    if (!password || password.trim() === '') {
      return 'Password is required';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    return '';
  };

  const validateForm = () => {
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    setFieldErrors({
      email: emailError,
      password: passwordError
    });

    return !emailError && !passwordError;
  };

  // Check for success message from registration
  React.useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing the message on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  // Prevent automatic redirect if user has old tokens but is on login page
  // This ensures OTP flow works correctly
  React.useEffect(() => {
    // Only clear tokens if we're explicitly on the login page and not in OTP flow
    if (!showOTPModal && authService.isAuthenticated()) {
      // Don't auto-clear, but log for debugging
      console.log('⚠️ User has existing tokens but is on login page. OTP flow will handle token clearing.');
    }
  }, [showOTPModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true
    });

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors below before submitting');
      return;
    }

    // Clear any existing tokens before login attempt (prevent auto-redirect from old tokens)
    authService.logout().catch(() => {
      // Ignore errors if logout fails (user might not be logged in)
    });

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Call login API (may require OTP based on role)
      const response = await authService.login(formData.email, formData.password);
      console.log('🔍 Full Login response:', JSON.stringify(response, null, 2));
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 requiresOTPVerification:', response.data?.requiresOTPVerification);
      console.log('🔍 has accessToken:', !!response.data?.accessToken);
      console.log('🔍 has user:', !!response.data?.user);

      if (response.success) {
        // PRIORITY 1: Check if OTP verification is required (for all roles including superadmin and department_admin)
        // This must be checked FIRST before checking for direct login
        if (response.data && response.data.requiresOTPVerification === true) {
          console.log('📧 OTP verification required - showing OTP modal');
          console.log('📧 OTP Data - userId:', response.data.userId, 'email:', response.data.email);

          // Show OTP modal for verification
          setOtpData({
            userId: response.data.userId,
            email: response.data.email
          });
          setShowOTPModal(true);
          setSuccessMessage(response.message || 'Please check your email for OTP verification.');
          setIsLoading(false); // Stop loading since we're showing OTP modal

          // CRITICAL: Return early to prevent any redirect
          return;
        }
        // PRIORITY 2: Check if direct login (tokens already returned)
        // Only check this if requiresOTPVerification is NOT true (legacy support)
        else if (response.data && response.data.user && response.data.accessToken) {
          console.log('✅ Direct login successful, user role:', response.data.user.role);

          // Verify tokens are set before navigation
          const token = authService.isAuthenticated();
          const user = authService.getCurrentUser();
          console.log('🔐 Token set:', !!token, 'User loaded:', !!user);

          if (!token || !user) {
            console.error('❌ Tokens not properly set, retrying...');
            // Wait a bit more for token to be set
            setTimeout(() => {
              const retryToken = authService.isAuthenticated();
              const retryUser = authService.getCurrentUser();
              if (retryToken && retryUser) {
                setSuccessMessage('Login successful! Redirecting to your dashboard...');
                const dashboardRoute = authService.getRoleRoutes();
                console.log('📍 Navigating to:', dashboardRoute);
                navigate(dashboardRoute);
              } else {
                setModalMessage('Login successful but authentication setup failed. Please refresh the page.');
                setShowFailureModal(true);
              }
            }, 500);
            return;
          }

          setSuccessMessage('Login successful! Redirecting to your dashboard...');

          // Use authService to get the correct route for the user's role
          const dashboardRoute = authService.getRoleRoutes();
          console.log('📍 Navigating to:', dashboardRoute);

          // Navigate to appropriate dashboard based on user role
          // Small delay to ensure token is fully set in localStorage
          setTimeout(() => {
            navigate(dashboardRoute);
          }, 300);
        } else {
          // Unexpected response format
          console.error('❌ Unexpected response format:', response);
          console.error('❌ Response data keys:', response.data ? Object.keys(response.data) : 'no data');
          setModalMessage('Unexpected response from server. Please try again.');
          setShowFailureModal(true);
        }
      } else {
        // Login failed - show modal with error message
        setModalMessage(response.message || 'Invalid email or password. Please check your credentials and try again.');
        setShowFailureModal(true);
      }
    } catch (err) {
      // Network or other error - show modal
      console.error('❌ Login error:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setModalMessage(err.message || 'Login failed. Please check your credentials and try again.');
      setShowFailureModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp) => {
    setOtpLoading(true);
    setOtpError(null);

    try {
      // Call login OTP verification API
      const response = await authService.verifyLoginOTP(otpData.email, otp);

      if (response.success) {
        // Close OTP modal
        setShowOTPModal(false);
        setOtpLoading(false);

        // Verify tokens are set before navigation
        const token = authService.isAuthenticated();
        const user = authService.getCurrentUser();
        console.log('🔐 OTP - Token set:', !!token, 'User loaded:', !!user);

        if (!token || !user) {
          console.error('❌ OTP - Tokens not properly set, retrying...');
          // Wait a bit more for token to be set
          setTimeout(() => {
            const retryToken = authService.isAuthenticated();
            const retryUser = authService.getCurrentUser();
            if (retryToken && retryUser) {
              setModalMessage('Login successful! Redirecting to your dashboard...');
              setShowSuccessModal(true);
              const dashboardRoute = authService.getRoleRoutes();
              console.log('📍 Navigating to:', dashboardRoute);
              navigate(dashboardRoute);
            } else {
              setModalMessage('Login successful but authentication setup failed. Please refresh the page.');
              setShowFailureModal(true);
            }
          }, 500);
          return;
        }

        // Show success modal
        setModalMessage('Login successful! Redirecting to your dashboard...');
        setShowSuccessModal(true);

        // Use authService to get the correct route for the user's role
        const dashboardRoute = authService.getRoleRoutes();
        console.log('✅ OTP login successful, user role:', response.data.user.role);
        console.log('📍 Navigating to:', dashboardRoute);

        // Navigate to appropriate dashboard based on user role
        // Small delay to ensure token is fully set in localStorage
        setTimeout(() => {
          navigate(dashboardRoute);
        }, 500);
      } else {
        throw new Error(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setOtpLoading(false);
      setOtpError(err.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    try {
      setOtpLoading(true);
      setOtpError(null);

      // Call resend login OTP API
      const response = await authService.resendLoginOTP(otpData.email);

      if (response.success) {
        setSuccessMessage(response.message);
      } else {
        throw new Error(response.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOTPModalClose = () => {
    setShowOTPModal(false);
    setOtpData({ userId: null, email: '' });
    setOtpError(null);
    setError('');
    setFieldErrors({ email: '', password: '' });
    setTouched({ email: false, password: false });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // Validate field if it has been touched
    if (touched[name]) {
      let error = '';
      if (name === 'email') {
        error = validateEmail(value);
      } else if (name === 'password') {
        error = validatePassword(value);
      }

      setFieldErrors({
        ...fieldErrors,
        [name]: error
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    // Mark field as touched
    setTouched({
      ...touched,
      [name]: true
    });

    // Validate on blur
    let error = '';
    if (name === 'email') {
      error = validateEmail(value);
    } else if (name === 'password') {
      error = validatePassword(value);
    }

    setFieldErrors({
      ...fieldErrors,
      [name]: error
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center mb-4">
            <img
              src="/logo-uroprep.png"
              alt="Uro - Urology Care System"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to your Urology Care System
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} method="post">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${fieldErrors.email && touched.email ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 transition-colors ${fieldErrors.email && touched.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                    }`}
                  placeholder="Enter your email address"
                />
              </div>
              {fieldErrors.email && touched.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${fieldErrors.password && touched.password ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 transition-colors ${fieldErrors.password && touched.password
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                    }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {fieldErrors.password && touched.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowForgotPasswordModal(true)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOTPModal}
        onClose={handleOTPModalClose}
        onVerify={handleOTPVerify}
        onResend={handleResendOTP}
        email={otpData.email}
        loading={otpLoading}
        error={otpError}
        type="login"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Login Successful!"
        message={modalMessage}
        autoClose={true}
        autoCloseDelay={1500}
      />

      {/* Failure Modal */}
      <FailureModal
        isOpen={showFailureModal}
        onClose={() => {
          setShowFailureModal(false);
          setError('');
          setModalMessage('');
          // Focus back on email input
          document.getElementById('email')?.focus();
        }}
        title="Login Failed"
        message={modalMessage}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setShowForgotPasswordModal(false);
        }}
      />
    </div>
  );
};

export default Login;

