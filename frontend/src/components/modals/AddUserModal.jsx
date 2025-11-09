import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  UserCircle, 
  Activity, 
  Stethoscope,
  X,
  CheckCircle,
  XCircle,
  UserPlus,
  Shield,
  Loader2
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createUser, clearError } from '../../store/slices/superadminSlice';
import ErrorModal from './ErrorModal';
import SuccessModal from './SuccessModal';
import { doctorsService } from '../../services/doctorsService';
import { 
  validateNameInput, 
  validatePhoneInput,
  sanitizeInput
} from '../../utils/inputValidation';

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.superadmin);
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
    role: '',
    department_id: ''
  });
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  
  useEffect(() => {
    if (error && !showSuccessModal && !isLoading) {
      const message = typeof error === 'string' ? error : (error?.message || 'An error occurred while creating the user.');
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  }, [error, showSuccessModal, isLoading]);

  // Fetch departments on component mount
  useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
          const response = await doctorsService.getAllDepartments({ is_active: true });
          if (response.success) {
            setDepartments(response.data);
          }
        } catch (err) {
          console.error('Error fetching departments:', err);
        } finally {
          setLoadingDepartments(false);
        }
      };
      fetchDepartments();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        organization: '',
        role: '',
        department_id: ''
      });
      setErrors({});
      setShowErrorModal(false);
      setShowSuccessModal(false);
      setErrorMessage('');
      setSuccessMessage('');
      dispatch(clearError());
    }
  }, [isOpen, dispatch]);

  const roleIcons = {
    gp: <Activity className="h-4 w-4" />,
    urology_nurse: <Stethoscope className="h-4 w-4" />,
    doctor: <UserCircle className="h-4 w-4" />
  };

  const validateField = (name, value, formDataToValidate = formData) => {
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
          error = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!/^[0-9+\-\s()]+$/.test(value.trim())) {
          error = 'Phone number can only contain numbers, spaces, hyphens, parentheses, and plus signs';
        } else if (value.trim().length < 10) {
          error = 'Phone number must be at least 10 digits';
        }
        break;
      case 'organization':
        if (!value.trim()) {
          error = 'Organization/Hospital is required';
        }
        break;
      case 'role':
        if (!value) {
          error = 'Role is required';
        }
        break;
      case 'department_id':
        if (formDataToValidate.role === 'doctor' && !value) {
          error = 'Department is required when role is doctor';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    
    // Update form data
    const updatedFormData = {
      ...formData,
      [name]: sanitizedValue
    };
    
    // Reset department_id when role changes from doctor
    if (name === 'role' && value !== 'doctor') {
      updatedFormData.department_id = '';
      // Clear department error if role is not doctor
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.department_id;
        return newErrors;
      });
    }
    
    setFormData(updatedFormData);
    
    // Validate field and update errors
    const error = validateField(name, sanitizedValue, updatedFormData);
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
    setErrorMessage('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data for submission - convert department_id to number if present
      const submitData = {
        ...formData,
        department_id: formData.role === 'doctor' && formData.department_id 
          ? parseInt(formData.department_id, 10) 
          : undefined
      };
      
      const result = await dispatch(createUser(submitData));
      
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
        setShowErrorModal(false);
        dispatch(clearError());
      } else if (result.type.endsWith('/rejected')) {
        const rejectedError = result.payload || result.error || 'Failed to create user. Please try again.';
        const message = typeof rejectedError === 'string' ? rejectedError : (rejectedError?.message || 'Failed to create user. Please try again.');
        setErrorMessage(message);
        setShowSuccessModal(false);
        setShowErrorModal(true);
      } else {
        console.error('Create user action fulfilled but not successful:', result.payload);
        const message = result.payload?.message || 'User creation failed. Please check all fields and try again.';
        setErrorMessage(message);
        setShowSuccessModal(false);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      const message = error?.message || error?.toString() || 'An unexpected error occurred while creating the user. Please try again.';
      setErrorMessage(message);
      setShowSuccessModal(false);
      setShowErrorModal(true);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (onUserAdded) {
      onUserAdded(createdUser);
    }
    onClose();
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    dispatch(clearError());
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                <p className="text-sm text-gray-500">Create a new user account and send password setup email</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900 flex items-center mb-4">
                <Shield className="h-5 w-5 text-teal-600 mr-2" />
                User Information
              </h3>
            </div>

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
                      {formData.role && roleIcons[formData.role] ? roleIcons[formData.role] : <Stethoscope className="h-4 w-4" />}
                    </div>
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-8 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer hover:border-gray-400 ${
                      errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Role</option>
                    <option value="gp">General Practitioner</option>
                    <option value="urology_nurse">Urology Clinical Nurse</option>
                    <option value="doctor">Doctor</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" />
                    {errors.role}
                  </p>
                )}
              </div>

              {/* Department - Only show when role is doctor */}
              {formData.role === 'doctor' && (
                <div>
                  <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="department_id"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      disabled={loadingDepartments}
                      className={`block w-full pl-10 pr-8 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer hover:border-gray-400 ${
                        errors.department_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      } ${loadingDepartments ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.department_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.department_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
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

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleErrorModalClose}
        title="Error Creating User"
        message={errorMessage || 'An error occurred while creating the user. Please try again.'}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="User Created Successfully"
        message={successMessage}
      />
    </>
  );
};

export default AddUserModal;

