import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  User,
  Stethoscope,
  Heart,
  MessageSquare,
  Activity,
  Save,
  Loader2
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { patientService } from '../services/patientService.js';
import { bookingService } from '../services/bookingService.js';
import { 
  validateNameInput, 
  validatePhoneInput, 
  validateNumericInput,
  validatePatientForm,
  sanitizeInput
} from '../utils/inputValidation.js';

const AddPatientModal = ({ isOpen, onClose, onPatientAdded, onError, isUrologist = false }) => {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    postcode: '',
    city: '',
    state: '',
    
    // Medical Information
    referringDepartment: '',
    referralDate: '',
    initialPSA: '',
    initialPSADate: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: '',
    assignedUrologist: '',
    referringGP: '', // Added for GP selection
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Initial Assessment
    priority: 'Normal',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [urologists, setUrologists] = useState([]);
  const [loadingUrologists, setLoadingUrologists] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');


  // Fetch urologists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUrologists();
      // Get current user role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUserRole(user.role || '');
      // If user is GP, auto-set referring GP to current user
      if (user.role === 'gp') {
        setFormData(prev => ({ ...prev, referringGP: user.id?.toString() || '' }));
      }
    }
  }, [isOpen]);

  const fetchUrologists = async () => {
    setLoadingUrologists(true);
    try {
      const result = await bookingService.getAvailableUrologists();
      console.log('📋 Fetched urologists:', result);
      if (result.success) {
        // The service returns urologists directly in data
        const urologistsList = Array.isArray(result.data) ? result.data : [];
        console.log('📋 Urologists list:', urologistsList);
        setUrologists(urologistsList);
      } else {
        console.error('Failed to fetch urologists:', result.error);
        setUrologists([]);
      }
    } catch (error) {
      console.error('Error fetching urologists:', error);
      setUrologists([]);
    } finally {
      setLoadingUrologists(false);
    }
  };

  // fetchGPs removed - nurses add patients at hospital without referring GP selection

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Apply input validation based on field type
    let isValid = true;
    let sanitizedValue = value;
    
    // Name fields - only allow letters, spaces, hyphens, apostrophes
    if (['firstName', 'lastName', 'emergencyContactName', 'city', 'state'].includes(name)) {
      isValid = validateNameInput(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Phone fields - only allow digits, spaces, hyphens, parentheses, plus
    if (['phone', 'emergencyContactPhone'].includes(name)) {
      isValid = validatePhoneInput(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Numeric fields - only allow digits and decimal point
    if (['initialPSA'].includes(name)) {
      isValid = validateNumericInput(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Postcode field - only allow digits (no letters)
    if (name === 'postcode') {
      const postcodeRegex = /^\d*$/;
      isValid = postcodeRegex.test(value);
      if (!isValid) return; // Don't update if invalid characters
    }
    
    // Sanitize text inputs to prevent XSS
    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    // Use comprehensive validation from utilities
    const newErrors = validatePatientForm(formData);
    
    // Additional date of birth validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
      
      if (age < 0) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      } else if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    // Referring GP validation removed - nurses add patients at hospital without referring GP
    
    setErrors(newErrors);
    
    // Scroll to first error if validation fails
    if (Object.keys(newErrors).length > 0) {
      // Use timeout to ensure errors are rendered before scrolling
      setTimeout(() => {
        const firstErrorField = document.querySelector('.border-red-300');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      }, 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Helper function to convert date to ISO format
      const convertToISODate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Date conversion error:', error);
          return dateString; // Return original if conversion fails
        }
      };

      // Prepare patient data for API
      const patientData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: convertToISODate(formData.dateOfBirth),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email || '',
        address: formData.address || '',
        postcode: formData.postcode || '',
        city: formData.city || '',
        state: formData.state || '',
        referringDepartment: formData.referringDepartment || '',
        referralDate: convertToISODate(formData.referralDate),
        initialPSA: parseFloat(formData.initialPSA),
        initialPSADate: convertToISODate(formData.initialPSADate),
        medicalHistory: formData.medicalHistory || '',
        currentMedications: formData.currentMedications || '',
        allergies: formData.allergies || '',
        assignedUrologist: formData.assignedUrologist || '',
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactPhone: formData.emergencyContactPhone || '',
        emergencyContactRelationship: formData.emergencyContactRelationship || '',
        priority: formData.priority || 'Normal',
        notes: formData.notes || '',
        referredByGpId: formData.referringGP || null // Add referring GP ID
      };

      // Call the API
      const result = await patientService.addPatient(patientData);
      
      if (result.success) {
        // Call the callback function to notify parent component
        if (onPatientAdded) {
          onPatientAdded(result.data);
        }
        
        // Reset form and close modal
        resetForm();
        onClose();
      } else {
        // Handle API errors
        console.error('API Error:', result.error);
        if (result.details) {
          // Show error modal with validation errors
          if (onError) {
            onError({
              title: 'Validation Failed',
              message: 'Please correct the following errors and try again',
              errors: result.details
            });
          } else {
            // Fallback to form errors if no error handler
            const apiErrors = {};
            result.details.forEach(error => {
              apiErrors[error.field] = error.message;
            });
            setErrors(apiErrors);
          }
        } else {
          // Show error modal for general errors
          if (onError) {
            onError({
              title: 'Error',
              message: result.error || 'An unexpected error occurred. Please try again.',
              errors: []
            });
          } else {
            setErrors({ submit: result.error });
          }
        }
      }
      
    } catch (error) {
      console.error('Error creating patient:', error);
      if (onError) {
        onError({
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          errors: []
        });
      } else {
        setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes before closing
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      // Reset form and close
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      postcode: '',
      city: '',
      state: '',
      referringDepartment: '',
      referralDate: '',
      initialPSA: '',
      initialPSADate: '',
      medicalHistory: '',
      currentMedications: '',
      allergies: '',
      assignedUrologist: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      priority: 'Normal',
      notes: ''
    });
    setErrors({});
  };

  // Check if there are unsaved changes - simplified logic
  const hasUnsavedChanges = formData.firstName.trim() !== '' || 
                           formData.lastName.trim() !== '' || 
                           formData.dateOfBirth !== '' || 
                           formData.gender !== '' || 
                           formData.phone.trim() !== '' || 
                           formData.email.trim() !== '' || 
                           formData.address.trim() !== '' || 
                           formData.initialPSA !== '' || 
                           formData.medicalHistory.trim() !== '' || 
                           formData.notes.trim() !== '';

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    handleSubmit();
  };

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in AddPatientModal!');
        console.log('hasUnsavedChanges:', hasUnsavedChanges);
        
        event.preventDefault();
        event.stopPropagation();

        // Call handleCancel which will check for unsaved changes
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges]);

  // Handle confirmation modal actions
  const handleConfirmModalAction = (shouldSave) => {
    if (shouldSave) {
      handleSubmit();
    } else {
      resetForm();
      onClose();
    }
    setShowConfirmModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] border border-gray-200 flex flex-col">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Add New Patient</h3>
              <p className="text-teal-50 text-sm mt-0.5">Create a comprehensive patient record for the urology department</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Personal Information */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Personal Information</h4>
                  <p className="text-sm text-gray-600">Basic patient details and contact information</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.firstName 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.lastName 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.dateOfBirth 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.gender 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.gender}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.phone 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                    placeholder="+61 412 345 678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.email 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                    placeholder="patient@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Street address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="2000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Sydney"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select state</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
              </div>
              
              {/* Referring Department field removed - not needed */}
            </div>

            {/* PSA Information */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">PSA Information</h4>
                  <p className="text-sm text-gray-600">Prostate-specific antigen levels and testing details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial PSA Level *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="initialPSA"
                    value={formData.initialPSA}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.initialPSA 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                    placeholder="4.5"
                  />
                  {errors.initialPSA && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.initialPSA}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PSA Test Date
                  </label>
                  <input
                    type="date"
                    name="initialPSADate"
                    value={formData.initialPSADate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>


            {/* Medical Information */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Medical Information</h4>
                  <p className="text-sm text-gray-600">Clinical details and treatment pathway</p>
                </div>
              </div>
                
              {/* Referring GP dropdown removed - nurses add patients at hospital */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Urologist
                  </label>
                  <select
                    name="assignedUrologist"
                    value={formData.assignedUrologist}
                    onChange={handleInputChange}
                    disabled={loadingUrologists}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      loadingUrologists ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  >
                    <option value="">
                      {loadingUrologists ? 'Loading urologists...' : 'Select urologist'}
                    </option>
                    {urologists.map((urologist) => (
                      <option key={urologist.id} value={urologist.name}>
                        {urologist.name}
                      </option>
                    ))}
                  </select>
                  {urologists.length === 0 && !loadingUrologists && (
                    <p className="mt-1 text-sm text-gray-500">
                      No urologists available. Please contact administrator.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Date
                  </label>
                  <input
                    type="date"
                    name="referralDate"
                    value={formData.referralDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Previous medical conditions, surgeries, etc."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    name="currentMedications"
                    value={formData.currentMedications}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="List current medications"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Known allergies"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <Heart className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Emergency Contact</h4>
                  <p className="text-sm text-gray-600">Emergency contact information for the patient</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Emergency contact name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="+61 412 345 678"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <input
                    type="text"
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Spouse, Child, etc."
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Additional Notes</h4>
                  <p className="text-sm text-gray-600">Any additional notes or special considerations</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Any additional notes or special considerations"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-6 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors mr-3"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Patient...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    
    {/* Confirmation Modal */}
    <ConfirmModal
      isOpen={showConfirmModal}
      onConfirm={handleConfirmModalAction}
      onCancel={() => setShowConfirmModal(false)}
      title="Unsaved Changes"
      message="You have unsaved changes. Do you want to save before closing?"
    />
    </>
  );
};

export default AddPatientModal;

