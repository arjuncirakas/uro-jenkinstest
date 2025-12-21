import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  X,
  XCircle,
  UserPlus,
  Shield,
  Activity
} from 'lucide-react';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal';
import { gpService } from '../../services/gpService';
import {
  validateNameInput,
  validatePhoneInput,
  sanitizeInput
} from '../../utils/inputValidation';

const AddGPModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    role: 'gp' // Default role to GP
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form data
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organization: '',
        role: 'gp' // Always default to GP
      });
      setErrors({});
      setShowErrorModal(false);
      setShowSuccessModal(false);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);


  const validateField = (name, value, formDataToValidate = formData, isBlur = false) => {
    let error = '';

    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          error = 'First name is required';
        } else if (isBlur && value !== value.trim()) {
          error = 'First name cannot start or end with a space';
        } else if (value.trim().length < 2) {
          error = 'First name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s'.-]+$/.test(value.trim())) {
          error = 'First name can only contain letters, spaces, hyphens, apostrophes, and periods';
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          error = 'Last name is required';
        } else if (isBlur && value !== value.trim()) {
          error = 'Last name cannot start or end with a space';
        } else if (!/^[a-zA-Z\s'.-]+$/.test(value.trim())) {
          error = 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else {
          if (/[a-zA-Z]/.test(value)) {
            error = 'Phone number cannot contain letters. Please enter only digits (8-12 numbers).';
          }
          const cleanedPhone = value.replace(/[\s\-\(\)]/g, '');
          const digitsOnly = cleanedPhone.replace(/^\+/, '');

          if (!/^[\+\d\s\-\(\)]+$/.test(value)) {
            error = 'Phone number can only contain digits (0-9), spaces, hyphens, parentheses, and + symbol. Letters are not allowed.';
          }
          else if (digitsOnly.length < 8) {
            error = 'Phone number must contain at least 8 digits. Please enter 8 to 12 numbers.';
          }
          else if (digitsOnly.length > 12) {
            error = 'Phone number cannot exceed 12 digits. Please enter 8 to 12 numbers.';
          }
          else if (!/^[\+]?[1-9][\d]{7,11}$/.test(cleanedPhone)) {
            error = 'Please enter a valid phone number. Must be 8 to 12 digits and cannot start with 0.';
          }
        }
        break;
      case 'organization':
        if (!value.trim()) {
          error = 'Organization is required';
        } else if (value.trim().length < 2) {
          error = 'Organization name must be at least 2 characters';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let isValid = true;
    let sanitizedValue = value;

    // Name fields - allow letters, spaces, hyphens, apostrophes, periods
    if (['firstName', 'lastName'].includes(name)) {
      const nameRegex = /^[a-zA-Z\s'.-]*$/;
      const regexTest = nameRegex.test(value);
      
      if (!regexTest) {
        return;
      }
    }

    // Phone field - only allow digits, spaces, hyphens, parentheses, plus
    if (name === 'phone') {
      isValid = validatePhoneInput(value);
      if (!isValid) {
        setErrors(prev => ({
          ...prev,
          phone: 'Phone number cannot contain letters. Please enter only digits (8-12 numbers).'
        }));
        return;
      }
    }

    // Organization field - allow spaces and common characters
    if (name === 'organization') {
      const orgRegex = /^[a-zA-Z0-9\s'.,()&-]*$/;
      const regexTest = orgRegex.test(value);
      
      if (!regexTest) {
        return;
      }
    }

    if (['firstName', 'lastName', 'organization'].includes(name)) {
      sanitizedValue = value;
    } else if (typeof value === 'string' && !['email', 'phone'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }

    const updatedFormData = {
      ...formData,
      [name]: sanitizedValue
    };

    setFormData(updatedFormData);

    // Validate field and update errors
    const error = validateField(name, sanitizedValue, updatedFormData, false);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleKeyDown = (e) => {
    const { name, key } = e.target;
    
    if (['firstName', 'lastName', 'organization'].includes(name)) {
      if (key === ' ' || key === 'Spacebar' || e.keyCode === 32) {
        return;
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (['firstName', 'lastName', 'organization'].includes(name)) {
      const sanitized = sanitizeInput(value, { preserveWhitespace: true });
      const trimmedValue = sanitized.trim();
      
      if (trimmedValue !== value) {
        const updatedFormData = {
          ...formData,
          [name]: trimmedValue
        };
        setFormData(updatedFormData);
        
        const error = validateField(name, trimmedValue, updatedFormData, true);
        setErrors(prev => ({
          ...prev,
          [name]: error
        }));
      } else {
        const sanitizedValue = sanitizeInput(value, { preserveWhitespace: true });
        if (sanitizedValue !== value) {
          const updatedFormData = {
            ...formData,
            [name]: sanitizedValue
          };
          setFormData(updatedFormData);
        }
        const error = validateField(name, sanitizedValue || value, formData, true);
        setErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    Object.keys(formData).forEach(key => {
      if (key !== 'role') { // Skip role validation as it's always 'gp'
        const error = validateField(key, formData[key], formData, true);
        if (error) {
          newErrors[key] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setShowErrorModal(false);
    setShowSuccessModal(false);
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for submission - sanitize and trim name fields, convert to snake_case for API
      const submitData = {
        first_name: sanitizeInput(formData.firstName.trim(), { preserveWhitespace: true }),
        last_name: sanitizeInput(formData.lastName.trim(), { preserveWhitespace: true }),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organization: sanitizeInput(formData.organization.trim(), { preserveWhitespace: true })
      };

      const result = await gpService.createGP(submitData);

      if (result.success) {
        const newGPData = {
          userId: result.data.userId,
          email: result.data.email,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          emailSent: result.data.emailSent
        };

        setCreatedUser({
          ...formData,
          id: result.data.userId,
          emailSent: result.data.emailSent
        });

        const message = result.data.emailSent
          ? `GP ${formData.firstName} ${formData.lastName} has been created successfully. Login credentials have been sent to ${formData.email}.`
          : `GP ${formData.firstName} ${formData.lastName} has been created successfully. However, the email could not be sent. Please contact support.`;

        setSuccessMessage(message);
        setShowSuccessModal(true);
        setShowErrorModal(false);
        
        // Call onSuccess immediately with the new GP data (before closing modal)
        // This allows the parent to refresh the list and select the new GP
        if (onSuccess) {
          onSuccess(newGPData);
        }
      } else {
        const message = result.error || result.message || 'GP creation failed. Please check all fields and try again.';
        setErrorMessage(message);
        setShowSuccessModal(false);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error creating GP:', error);
      const message = error.response?.data?.error || error.response?.data?.message || error?.message || error?.toString() || 'An unexpected error occurred while creating the GP. Please try again.';
      setErrorMessage(message);
      setShowSuccessModal(false);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // onSuccess was already called when GP was created successfully
    // Just close the modal
    onClose();
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New GP</h2>
                <p className="text-sm text-gray-500">Create a new General Practitioner account and send password setup email</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="bg-white rounded-lg">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 text-teal-600 mr-2" />
                  GP Information
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* First Name */}
                  <div>
                    <label htmlFor="gp-modal-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="gp-modal-firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        autoComplete="given-name"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter first name"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="gp-modal-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="gp-modal-lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        autoComplete="family-name"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter last name"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="gp-modal-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="gp-modal-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter email address"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="gp-modal-phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="gp-modal-phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter phone number"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Organization */}
                  <div>
                    <label htmlFor="gp-modal-organization" className="block text-sm font-medium text-gray-700 mb-2">
                      Organization/Hospital <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="gp-modal-organization"
                        name="organization"
                        type="text"
                        value={formData.organization}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        autoComplete="organization"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${errors.organization ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter organization"
                      />
                    </div>
                    {errors.organization && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.organization}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating GP...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Create GP
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="GP Created Successfully!"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleErrorModalClose}
        message={errorMessage || 'An error occurred while creating the GP. Please check all fields and try again.'}
        title="Create GP Error"
      />
    </>
  );
};

export default AddGPModal;
