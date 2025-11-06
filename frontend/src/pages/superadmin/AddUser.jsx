import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  UserCircle, 
  Activity, 
  Stethoscope,
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserPlus,
  Shield
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createUser, clearError } from '../../store/slices/superadminSlice';
import ErrorModal from '../../components/modals/ErrorModal';
import SuccessModal from '../../components/modals/SuccessModal';
import { 
  validateNameInput, 
  validatePhoneInput,
  sanitizeInput
} from '../../utils/inputValidation';

const AddUser = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.superadmin);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    role: 'urology_nurse'
  });
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    if (error && !showSuccessModal && !isLoading) {
      setShowErrorModal(true);
    }
  }, [error, showSuccessModal, isLoading]);

  const roleIcons = {
    gp: <Activity className="h-4 w-4" />,
    urology_nurse: <Stethoscope className="h-4 w-4" />,
    urologist: <UserCircle className="h-4 w-4" />
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          error = 'First name is required';
        } else if (value.trim().length < 2) {
          error = 'First name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          error = 'First name can only contain letters and spaces';
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          error = 'Last name is required';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          error = 'Last name can only contain letters and spaces';
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
          // Remove spaces, hyphens, parentheses for validation
          const cleanedPhone = value.replace(/[\s\-\(\)]/g, '');
          // Remove optional + prefix for digit count
          const digitsOnly = cleanedPhone.replace(/^\+/, '');
          
          // Check if it contains only valid characters (digits, +, spaces, hyphens, parentheses)
          if (!/^[\+\d\s\-\(\)]+$/.test(value)) {
            error = 'Phone number can only contain digits, spaces, hyphens, parentheses, and + symbol';
          }
          // Check digit count (must be between 8 and 12)
          else if (digitsOnly.length < 8) {
            error = 'Phone number must be at least 8 digits';
          }
          else if (digitsOnly.length > 12) {
            error = 'Phone number cannot exceed 12 digits';
          }
          // Check valid format (optional +, then digits)
          else if (!/^[\+]?[1-9][\d]{7,11}$/.test(cleanedPhone)) {
            error = 'Please enter a valid phone number (8-12 digits)';
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
    
    // Apply input validation based on field type
    let isValid = true;
    let sanitizedValue = value;
    
    // Name fields - only allow letters, spaces, hyphens, apostrophes
    if (['firstName', 'lastName'].includes(name)) {
      isValid = validateNameInput(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Phone field - only allow digits, spaces, hyphens, parentheses, plus
    if (name === 'phone') {
      isValid = validatePhoneInput(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Sanitize text inputs to prevent XSS
    if (typeof value === 'string' && !['email', 'phone'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData({
      ...formData,
      [name]: sanitizedValue
    });
    
    // Validate field and update errors
    const error = validateField(name, sanitizedValue);
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
    
    // Clear any existing error state
    dispatch(clearError());
    setShowErrorModal(false);
    setShowSuccessModal(false);
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(createUser(formData));
      
      console.log('Create user result:', result);
      
      // Check if the action was fulfilled and successful
      if (result.type.endsWith('/fulfilled') && result.payload && result.payload.success) {
        setCreatedUser({
          ...formData,
          id: result.payload.data.userId,
          emailSent: result.payload.data.emailSent
        });
        
        const message = result.payload.data.emailSent 
          ? `User ${formData.firstName} ${formData.lastName} has been created successfully. Password setup email has been sent to ${formData.email}.`
          : `User ${formData.firstName} ${formData.lastName} has been created successfully. However, the password setup email could not be sent. Please contact support.`;
        
        setSuccessMessage(message);
        setShowSuccessModal(true);
        setShowErrorModal(false); // Ensure error modal is closed
        dispatch(clearError()); // Clear any Redux error state
      } else if (result.type.endsWith('/rejected')) {
        // Handle rejected action
        setShowSuccessModal(false); // Ensure success modal is closed
        setShowErrorModal(true);
      } else {
        // Handle case where action is fulfilled but not successful
        console.error('Create user action fulfilled but not successful:', result.payload);
        setShowSuccessModal(false);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setShowSuccessModal(false); // Ensure success modal is closed
      setShowErrorModal(true);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/superadmin/users');
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    dispatch(clearError());
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <div className="flex items-center space-x-4 mb-2">
              <button
                onClick={() => navigate('/superadmin/users')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add New User</h1>
                  <p className="text-gray-500 text-sm mt-1">Create a new user account and send password setup email</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="max-w-4xl mx-auto">
            {/* Form Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 text-teal-600 mr-2" />
                  User Information
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        autoComplete="given-name"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
                          errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        autoComplete="family-name"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
                          errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
                          errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
                          errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                    <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                      Organization/Hospital <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        value={formData.organization}
                        onChange={handleChange}
                        autoComplete="organization"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 ${
                          errors.organization ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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

                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="text-gray-400">
                          {roleIcons[formData.role]}
                        </div>
                      </div>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer hover:border-gray-400"
                      >
                        <option value="gp">General Practitioner</option>
                        <option value="urology_nurse">Urology Clinical Nurse</option>
                        <option value="urologist">Urologist</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate('/superadmin/users')}
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
                        Creating User...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="User Created Successfully!"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleErrorModalClose}
        error={error}
        title="Create User Error"
      />
    </div>
  );
};

export default AddUser;
