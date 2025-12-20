import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import authService from '../services/authService.js';

const SetupPassword = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  // Handle token securely - get from URL, store in sessionStorage, then clear URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = sessionStorage.getItem('setupToken');

    if (urlToken) {
      // Store token in sessionStorage
      sessionStorage.setItem('setupToken', urlToken);
      setToken(urlToken);

      // Clear token from URL to hide it from address bar
      console.log('🔒 Token received and stored securely, clearing from URL...');
      navigate('/setup-password', { replace: true });
    } else if (storedToken) {
      // Use token from sessionStorage if URL doesn't have it
      setToken(storedToken);
      console.log('🔒 Using token from secure storage');
    } else {
      // No token available
      console.log('❌ No token found');
      setErrorMessage('Invalid or missing setup token. Please use the link from your email.');
      setIsTokenInvalid(true);
      setShowErrorModal(true);
    }
  }, [searchParams, navigate]);

  // Cleanup token when component unmounts or on successful setup
  useEffect(() => {
    return () => {
      if (showSuccessModal) {
        sessionStorage.removeItem('setupToken');
      }
    };
  }, [showSuccessModal]);

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    let requirements = {
      lowercase: /(?=.*[a-z])/.test(password),
      uppercase: /(?=.*[A-Z])/.test(password),
      number: /(?=.*\d)/.test(password),
      special: /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password),
      noSpaces: !/\s/.test(password),
      minLength: password.length >= 14
    };

    Object.values(requirements).forEach(met => {
      if (met) strength++;
    });

    return { strength, requirements };
  };

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 14) {
          error = 'Password must be at least 14 characters long';
        } else if (!/(?=.*[a-z])/.test(value)) {
          error = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(value)) {
          error = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(value)) {
          error = 'Password must contain at least one number';
        } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) {
          error = 'Password must contain at least one special character';
        } else if (/\s/.test(value)) {
          error = 'Password cannot contain spaces';
        }
        break;
      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // Validate field and update errors
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate all fields
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting password setup with token:', token);
      // Call password setup API
      const response = await authService.setupPassword(token, formData.password);
      console.log('Password setup response:', response);

      if (response.success) {
        setShowSuccessModal(true);
        setShowErrorModal(false); // Ensure error modal is closed
        setIsTokenInvalid(false); // Reset token invalid flag on success
      } else {
        // Check if error is due to invalid/expired token
        // Be very specific - only mark as token error if message explicitly mentions both "invalid/expired" AND "token"
        const errorMsg = (response.message || '').toLowerCase();
        const isInvalidToken = (errorMsg.includes('invalid') && errorMsg.includes('token')) ||
          (errorMsg.includes('expired') && errorMsg.includes('token'));

        // Default to false - only set true if we're certain it's a token error
        setIsTokenInvalid(isInvalidToken);
        setErrorMessage(response.message || 'Failed to setup password. Please try again.');
        setShowErrorModal(true);
        setShowSuccessModal(false); // Ensure success modal is closed
      }
    } catch (error) {
      console.error('Password setup error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Extract error message from different error formats
      // handleApiError returns { message, type, ... }
      let errorMessage = 'Failed to setup password. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      // Check if error is due to invalid/expired token
      // Backend returns: "Invalid or expired token" for token errors
      const errorMsgLower = errorMessage.toLowerCase();
      const responseMsg = error.response?.data?.message?.toLowerCase() || '';

      // More comprehensive check for token errors
      // Be VERY conservative - only mark as token error if message explicitly mentions both "invalid/expired" AND "token"
      const isInvalidToken =
        (errorMsgLower.includes('invalid') && errorMsgLower.includes('token')) ||
        (errorMsgLower.includes('expired') && errorMsgLower.includes('token')) ||
        (responseMsg.includes('invalid') && responseMsg.includes('token')) ||
        (responseMsg.includes('expired') && responseMsg.includes('token'));

      console.log('Error analysis:', {
        errorMessage,
        errorMsgLower,
        responseMsg,
        isInvalidToken,
        hasToken: !!token,
        willNavigate: isInvalidToken || !token
      });

      // CRITICAL: Only set isTokenInvalid to true if we're 100% certain it's a token error
      // For ALL other errors (validation, network, server, password reuse, etc.), keep it false
      // This ensures user stays on page for retry unless token is definitely invalid
      setIsTokenInvalid(isInvalidToken);
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
      setShowSuccessModal(false); // Ensure success modal is closed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Clear token from storage on success
    sessionStorage.removeItem('setupToken');
    navigate('/login');
  };

  const handleErrorModalClose = () => {
    console.log('Error modal close triggered:', {
      isTokenInvalid,
      hasToken: !!token,
      willNavigate: isTokenInvalid || !token
    });

    // Only navigate to login if token is invalid/expired or missing
    // For other errors (validation, network, etc.), keep user on page to retry
    if (isTokenInvalid || !token) {
      // Clear token and redirect if token is invalid or missing
      console.log('Navigating to login due to invalid/missing token');
      sessionStorage.removeItem('setupToken');
      navigate('/login');
    } else {
      // If token is valid but there was another error, just close modal and stay on page
      console.log('Keeping user on setup password page - token is valid');
      setShowErrorModal(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  console.log('SetupPassword render state:', {
    token,
    showSuccessModal,
    showErrorModal,
    isSubmitting,
    errorMessage
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
            Set Up Your Password
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Complete your account setup by creating a secure password
          </p>
        </div>

        {/* Password Setup Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Password Input */}
            <div className="relative group">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}

              {/* Password Requirements Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Password Requirements</h4>
                    <span className="text-xs text-gray-500">
                      {passwordStrength.strength}/6 complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(passwordStrength.requirements).map(([key, met]) => {
                    const labels = {
                      lowercase: 'Lowercase letter',
                      uppercase: 'Uppercase letter',
                      number: 'Number',
                      special: 'Special character',
                      noSpaces: 'No spaces',
                      minLength: 'At least 14 characters'
                    };

                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${met ? 'bg-teal-100' : 'bg-gray-100'}`}>
                          {met ? (
                            <CheckCircle className="w-3 h-3 text-teal-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <span className={`text-xs ${met ? 'text-teal-700 font-medium' : 'text-gray-600'}`}>
                          {labels[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {passwordStrength.strength === 6 && (
                  <div className="mt-3 p-2 bg-teal-50 border border-teal-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                      <span className="text-sm text-teal-700 font-medium">Excellent! Your password meets all requirements.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up password...
                </span>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleSuccessModalClose}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Password Setup Complete!
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Your password has been set up successfully. You can now login to your account.
                  </p>
                  <button
                    onClick={handleSuccessModalClose}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-base font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => {
                // Only allow closing by clicking outside if token is invalid
                // For other errors, user must click the button to stay on page
                if (isTokenInvalid || !token) {
                  handleErrorModalClose();
                }
              }}
            ></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Setup Failed
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {errorMessage}
                  </p>
                  <button
                    onClick={handleErrorModalClose}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-base font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    {isTokenInvalid || !token ? 'Go to Login' : 'Try Again'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupPassword;
