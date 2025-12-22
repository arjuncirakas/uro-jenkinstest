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
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Upload,
  XCircle
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import AddGPModal from './modals/AddGPModal';
import { patientService } from '../services/patientService.js';
import { bookingService } from '../services/bookingService.js';
import authService from '../services/authService.js';
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
    age: '', // Added age field
    phone: '',
    email: '',
    address: '',
    postcode: '',
    city: '',
    state: 'QLD',

    // Medical Information
    referringDepartment: '',
    referralDate: '',
    initialPSA: '',
    initialPSADate: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: '',
    socialHistory: '',
    familyHistory: '',
    assignedUrologist: '',
    referringGP: '',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',

    // Initial Assessment
    priority: 'Normal',
    notes: '',

    // Exam & Prior Tests
    dreFindings: [],
    dreDone: false,
    priorBiopsy: 'no',
    priorBiopsyDate: '',
    gleasonScore: '',
    comorbidities: [],

  });

  // Predefined symptoms for triage
  const predefinedSymptoms = [
    'LUTS',
    'Hematuria',
    'Nocturia',
    'Erectile dysfunction',
    'Bone pain'
  ];

  // State for nurse triage symptoms
  const [triageSymptoms, setTriageSymptoms] = useState(
    predefinedSymptoms.map(symptom => ({
      name: symptom,
      checked: false,
      ipssScore: '',
      duration: '',
      durationUnit: 'months',
      frequency: '',
      notes: '',
      isCustom: false
    }))
  );

  const [showCustomSymptomModal, setShowCustomSymptomModal] = useState(false);
  const [customSymptomName, setCustomSymptomName] = useState('');
  const [customSymptomIpssScore, setCustomSymptomIpssScore] = useState('');
  const [customSymptomDuration, setCustomSymptomDuration] = useState('');
  const [customSymptomDurationUnit, setCustomSymptomDurationUnit] = useState('months');
  const [customSymptomNotes, setCustomSymptomNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [urologists, setUrologists] = useState([]);
  const [loadingUrologists, setLoadingUrologists] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [gps, setGps] = useState([]);
  const [loadingGPs, setLoadingGPs] = useState(false);
  const [isAddGPModalOpen, setIsAddGPModalOpen] = useState(false);



  // Fetch urologists and GPs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUrologists();
      fetchGPs();
      // Get current user info
      const user = authService.getCurrentUser() || JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUserRole(user.role || '');
      
      // If user is GP, auto-fill GP details after GPs are loaded
      if (user.role === 'gp') {
        setFormData(prev => ({ 
          ...prev, 
          referringGP: user.id?.toString() || ''
        }));
      }
    }
  }, [isOpen]);

  // Auto-fill GP details when GPs are loaded and user is GP
  useEffect(() => {
    if (gps.length > 0 && currentUserRole === 'gp' && isOpen) {
      const user = authService.getCurrentUser() || JSON.parse(localStorage.getItem('user') || '{}');
      const userGP = gps.find(gp => {
        const gpId = gp.id?.toString() || String(gp.id);
        const userId = user.id?.toString() || String(user.id);
        return gpId === userId;
      });
      
      if (userGP && !formData.referringGP) {
        setFormData(prev => ({
          ...prev,
          referringGP: userGP.id?.toString() || String(userGP.id)
        }));
      }
    }
  }, [gps, currentUserRole, isOpen]);

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

  const fetchGPs = async () => {
    setLoadingGPs(true);
    try {
      const result = await bookingService.getAvailableGPs();
      console.log('📋 Fetched GPs:', result);
      if (result.success) {
        // The service returns GPs in data.gps or data array
        const gpsList = Array.isArray(result.data?.gps) 
          ? result.data.gps 
          : (Array.isArray(result.data) ? result.data : []);
        console.log('📋 GPs list:', gpsList);
        setGps(gpsList);
      } else {
        console.error('Failed to fetch GPs:', result.error);
        setGps([]);
      }
    } catch (error) {
      console.error('Error fetching GPs:', error);
      setGps([]);
    } finally {
      setLoadingGPs(false);
    }
  };

  const handleGPSelect = (e) => {
    const selectedGPId = e.target.value;
    if (selectedGPId) {
      setFormData(prev => ({
        ...prev,
        referringGP: selectedGPId
      }));
      // Clear any errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.referringGP;
        return newErrors;
      });
    } else {
      // Clear GP field if "Select GP" is selected
      setFormData(prev => ({
        ...prev,
        referringGP: ''
      }));
    }
  };

  const handleGPAdded = (newGPData) => {
    // Refresh GP list after adding new GP
    fetchGPs().then(() => {
      // Auto-select the newly added GP if data is provided
      if (newGPData && newGPData.userId) {
        // Wait a bit for the list to update, then select the new GP
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            referringGP: newGPData.userId?.toString() || String(newGPData.userId)
          }));
        }, 300);
      }
    });
    setIsAddGPModalOpen(false);
  };


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

    // Age field - only allow integers
    if (name === 'age') {
      const ageRegex = /^\d*$/;
      isValid = ageRegex.test(value);
      if (!isValid) return;
    }

    // Postcode field - only allow digits (no letters)
    if (name === 'postcode') {
      const postcodeRegex = /^\d*$/;
      isValid = postcodeRegex.test(value);
      if (!isValid) return; // Don't update if invalid characters
    }

    // Textarea fields, address field, and name fields - check if this is a field that needs whitespace preserved
    const textareaFields = ['medicalHistory', 'currentMedications', 'allergies', 'socialHistory', 'familyHistory', 'notes', 'address'];
    const nameFields = ['firstName', 'lastName', 'emergencyContactName', 'city', 'state'];
    const preserveWhitespace = textareaFields.includes(name) || nameFields.includes(name);

    // Sanitize text inputs to prevent XSS
    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value, { preserveWhitespace });
    }

    // Handle priorBiopsy change - clear date if "no" is selected
    if (name === 'priorBiopsy' && sanitizedValue === 'no') {
      sanitizedValue = 'no';
      // Clear the priorBiopsyDate when "No" is selected
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue,
        priorBiopsyDate: ''
      }));
      return;
    }

    // Handle auto-calculation between DOB and Age
    let updatedFormData = { ...formData, [name]: sanitizedValue };

    // Only auto-calculate age when dateOfBirth is entered (not vice versa)
    if (name === 'dateOfBirth' && sanitizedValue) {
      const dob = new Date(sanitizedValue);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      updatedFormData.age = age.toString();
    } else if (name === 'dateOfBirth' && !sanitizedValue) {
      // Only clear age if dateOfBirth is cleared (not when age is cleared)
      updatedFormData.age = '';
    }
    // Note: We don't auto-calculate dateOfBirth when age is entered
    // User can enter either dateOfBirth or age, or both

    setFormData(updatedFormData);

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // Also clear the related field error
    if (name === 'dateOfBirth' && errors.age) {
      setErrors(prev => ({ ...prev, age: '' }));
    }
    if (name === 'age' && errors.dateOfBirth) {
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  const validateForm = () => {
    // Use comprehensive validation from utilities
    const newErrors = validatePatientForm(formData);

    // Date of Birth / Age validation
    if (!formData.dateOfBirth && !formData.age) {
      newErrors.dateOfBirth = 'Date of birth or Age is required';
      newErrors.age = 'Date of birth or Age is required';
    } else {
      // Remove standard DOB error if we are doing custom check
      delete newErrors.dateOfBirth;

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
      if (formData.age) {
        const age = parseInt(formData.age, 10);
        if (isNaN(age) || age < 0 || age > 120) {
          newErrors.age = 'Please enter a valid age (0-120)';
        }
      }
    }

    // Validate symptoms - IPSS score is required for LUTS and Nocturia
    triageSymptoms.forEach((symptom, index) => {
      if (symptom.checked && (symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
        // Store error using symptom index
        if (!newErrors.symptoms) {
          newErrors.symptoms = {};
        }
        newErrors.symptoms[`${index}_ipss`] = `IPSS score is required for ${symptom.name}`;
      }
    });

    // Validate GP selection - required
    if (!formData.referringGP || formData.referringGP.trim() === '') {
      newErrors.referringGP = 'Please select a GP';
    }

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
        // Return null for empty strings, null, undefined, or invalid values
        if (!dateString || dateString === '' || dateString === 'no' || dateString === 'No' || dateString === 'NO') {
          return null;
        }
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            return null; // Return null instead of original string for invalid dates
          }
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Date conversion error:', error);
          return null; // Return null instead of original string on error
        }
      };

      // Prepare triage symptoms data (only checked symptoms with required fields)
      const triageData = triageSymptoms
        .filter(symptom => {
          if (!symptom.checked || !symptom.duration) return false;
          // IPSS score is required for LUTS and Nocturia
          if (symptom.name === 'LUTS' || symptom.name === 'Nocturia') {
            return symptom.ipssScore;
          }
          return true;
        })
        .map(symptom => ({
          name: symptom.name,
          ipssScore: symptom.ipssScore || null, // Only include if it exists
          duration: symptom.duration,
          durationUnit: symptom.durationUnit,
          frequency: symptom.frequency || null, // Only include if it exists (for Nocturia)
          notes: symptom.notes || null, // Include notes for all symptoms if provided
          isCustom: symptom.isCustom || false
        }));

      // Prepare patient data for API
      const patientData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: convertToISODate(formData.dateOfBirth),
        age: formData.age ? parseInt(formData.age, 10) : null,
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
        socialHistory: formData.socialHistory || '',
        familyHistory: formData.familyHistory || '',
        assignedUrologist: formData.assignedUrologist || '',
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactPhone: formData.emergencyContactPhone || '',
        emergencyContactRelationship: formData.emergencyContactRelationship || '',
        priority: formData.priority || 'Normal',
        notes: formData.notes || '',
        referredByGpId: formData.referringGP || null, // Add referring GP ID
        triageSymptoms: triageData.length > 0 ? JSON.stringify(triageData) : null, // Add triage symptoms as JSON
        // Exam & Prior Tests
        dreDone: formData.dreDone || false,
        dreFindings: Array.isArray(formData.dreFindings) ? formData.dreFindings.join(', ') : (formData.dreFindings || ''),
        priorBiopsy: formData.priorBiopsy || 'no',
        gleasonScore: formData.gleasonScore || '',
        comorbidities: formData.comorbidities || []
      };

      // Only include priorBiopsyDate in payload if priorBiopsy is 'yes' and date is provided
      if (formData.priorBiopsy === 'yes' && formData.priorBiopsyDate) {
        patientData.priorBiopsyDate = convertToISODate(formData.priorBiopsyDate);
      }

      // Call the API
      const result = await patientService.addPatient(patientData);

      if (result.success) {
        const patientId = result.data.id || result.data._id;


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
      age: '',
      phone: '',
      email: '',
      address: '',
      postcode: '',
      city: '',
      state: 'QLD',
      referringDepartment: '',
      referralDate: '',
      initialPSA: '',
      initialPSADate: '',
      medicalHistory: '',
      currentMedications: '',
      allergies: '',
      socialHistory: '',
      familyHistory: '',
      assignedUrologist: '',
      referringGP: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      priority: 'Normal',
      notes: '',
      dreFindings: [],
      dreDone: false,
      priorBiopsy: 'no',
      priorBiopsyDate: '',
      gleasonScore: '',
      comorbidities: [],
    });
    setTriageSymptoms(
      predefinedSymptoms.map(symptom => ({
        name: symptom,
        checked: false,
        ipssScore: '',
        duration: '',
        durationUnit: 'months',
        frequency: '',
        notes: '',
        isCustom: false
      }))
    );
    setErrors({});
  };

  // Check if there are unsaved changes - simplified logic
  const hasUnsavedChanges = formData.firstName.trim() !== '' ||
    formData.lastName.trim() !== '' ||
    formData.dateOfBirth !== '' ||
    formData.age !== '' ||
    formData.phone.trim() !== '' ||
    formData.email.trim() !== '' ||
    formData.address.trim() !== '' ||
    formData.initialPSA !== '' ||
    formData.medicalHistory.trim() !== '' ||
    formData.notes.trim() !== '' ||
    triageSymptoms.some(s => s.checked || s.isCustom) ||
    formData.dreDone || formData.priorBiopsy === 'yes' || formData.comorbidities.length > 0;

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

  // Handle triage symptom checkbox change
  const handleSymptomCheckboxChange = (index) => {
    setTriageSymptoms(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        checked: !updated[index].checked
      };
      return updated;
    });
  };

  // Handle triage symptom field changes
  const handleSymptomFieldChange = (index, field, value) => {
    setTriageSymptoms(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });

    // Clear error when IPSS score is selected for LUTS or Nocturia
    if (field === 'ipssScore' && value) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.symptoms && newErrors.symptoms[`${index}_ipss`]) {
          delete newErrors.symptoms[`${index}_ipss`];
          if (Object.keys(newErrors.symptoms).length === 0) {
            delete newErrors.symptoms;
          }
        }
        return newErrors;
      });
    }
  };

  // Handle add custom symptom
  const handleAddCustomSymptom = () => {
    if (!customSymptomName.trim()) {
      return;
    }

    // Capitalize first letter of each word
    const capitalizeFirstLetter = (str) => {
      return str.trim().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };

    const capitalizedName = capitalizeFirstLetter(customSymptomName);

    // Validate IPSS score for LUTS and Nocturia
    if ((capitalizedName === 'LUTS' || capitalizedName === 'Nocturia') && !customSymptomIpssScore) {
      // Show error - you could add a state for custom symptom errors here
      alert(`IPSS score is required for ${capitalizedName}`);
      return;
    }

    const newSymptom = {
      name: capitalizedName,
      checked: true,
      ipssScore: customSymptomIpssScore,
      duration: customSymptomDuration,
      durationUnit: customSymptomDurationUnit,
      frequency: '',
      notes: customSymptomNotes || '',
      isCustom: true
    };

    setTriageSymptoms(prev => [...prev, newSymptom]);

    // Reset custom symptom form
    setCustomSymptomName('');
    setCustomSymptomIpssScore('');
    setCustomSymptomDuration('');
    setCustomSymptomDurationUnit('months');
    setCustomSymptomNotes('');
    setShowCustomSymptomModal(false);
  };

  // Handle remove custom symptom
  const handleRemoveCustomSymptom = (index) => {
    setTriageSymptoms(prev => prev.filter((_, i) => i !== index));
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

              {/* Personal Information - bg-gray-50 */}
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
                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.firstName
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.firstName
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.firstName
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.firstName ? '!text-red-500' : ''}`}
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.lastName
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.lastName
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.lastName
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.lastName ? '!text-red-500' : ''}`}
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.dateOfBirth && !formData.age
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.dateOfBirth
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.dateOfBirth
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.dateOfBirth && !formData.age ? '!text-red-500' : ''}`}
                    >
                      Date of Birth {formData.age ? '' : <span className="text-red-500">*</span>}
                    </label>
                    {errors.dateOfBirth && !formData.age && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="0"
                      max="120"
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.age && !formData.dateOfBirth
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.age
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.age
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.age && !formData.dateOfBirth ? '!text-red-500' : ''}`}
                    >
                      Age {formData.dateOfBirth ? '' : <span className="text-red-500">*</span>}
                    </label>
                    {errors.age && !formData.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.age}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.phone
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.phone
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.phone
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.phone ? '!text-red-500' : ''}`}
                    >
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.email
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.email
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.email
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.email ? '!text-red-500' : ''}`}
                    >
                      Email Address
                    </label>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 relative mb-3">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.address
                      ? 'border-red-500 focus:border-red-500 bg-red-50'
                      : formData.address
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.address
                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                      : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.address ? '!text-red-500' : ''}`}
                  >
                    Address <span className="text-red-500">*</span>
                  </label>
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${formData.postcode
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.postcode
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Postcode
                    </label>
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${formData.city
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.city
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      City
                    </label>
                  </div>

                  <div className="relative mb-3">
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${formData.state
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    >
                      <option value="" disabled hidden>Select state</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.state
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      State
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${formData.state ? 'text-teal-500' : 'text-gray-400'
                      }`} />
                  </div>
                </div>
              </div>

              {/* GP Information */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">GP Information</h4>
                    <p className="text-sm text-gray-600">Details of the General Practitioner</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GP Dropdown */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select GP <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          name="selectedGP"
                          value={formData.referringGP || ''}
                          onChange={handleGPSelect}
                          disabled={loadingGPs || currentUserRole === 'gp'}
                          required
                          className={`block w-full rounded border px-3 py-2 leading-[1.6] outline-none transition-all duration-200 ease-linear appearance-none pr-10 ${formData.referringGP
                            ? 'border-teal-500 focus:border-teal-500 bg-white'
                            : 'border-gray-300 focus:border-teal-500 bg-white'
                            } border focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        >
                          <option value="">Select GP</option>
                          {gps.map((gp) => {
                            const gpName = gp.fullName || 
                              (gp.firstName && gp.lastName ? `${gp.firstName} ${gp.lastName}`.trim() : '') ||
                              (gp.first_name && gp.last_name ? `${gp.first_name} ${gp.last_name}`.trim() : '') ||
                              gp.name || 'Unknown';
                            return (
                              <option key={gp.id} value={gp.id?.toString() || gp.id}>
                                {gpName}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${formData.referringGP ? 'text-teal-500' : 'text-gray-400'
                          }`} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddGPModalOpen(true)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                        Add GP
                      </button>
                    </div>
                    {loadingGPs && (
                      <p className="mt-1 text-sm text-gray-500">Loading GPs...</p>
                    )}
                    {errors.referringGP && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.referringGP}
                      </p>
                    )}
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
                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.emergencyContactName
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.emergencyContactName
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.emergencyContactName
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    {errors.emergencyContactName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.emergencyContactName}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.emergencyContactPhone
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.emergencyContactPhone
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.emergencyContactPhone
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.emergencyContactPhone ? '!text-red-500' : ''}`}
                    >
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    {errors.emergencyContactPhone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.emergencyContactPhone}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="text"
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.emergencyContactRelationship
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.emergencyContactRelationship
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.emergencyContactRelationship
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.emergencyContactRelationship ? '!text-red-500' : ''}`}
                    >
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    {errors.emergencyContactRelationship && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.emergencyContactRelationship}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Medical Information</h4>
                    <p className="text-sm text-gray-600">Clinical details and treatment pathway</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative mb-3">
                    <select
                      name="assignedUrologist"
                      value={formData.assignedUrologist}
                      onChange={handleInputChange}
                      disabled={loadingUrologists}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${loadingUrologists
                        ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                        : formData.assignedUrologist
                          ? 'bg-gray-50 border-teal-500 focus:border-teal-500'
                          : 'bg-gray-50 border-gray-300 focus:border-teal-500'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    >
                      <option value="" disabled hidden>{loadingUrologists ? 'Loading urologists...' : 'Select urologist'}</option>
                      {urologists.map((urologist) => (
                        <option key={urologist.id} value={urologist.name}>
                          {urologist.name}
                        </option>
                      ))}
                    </select>
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-gray-50 px-1 ${formData.assignedUrologist
                        ? 'text-teal-600'
                        : 'text-gray-500'
                        } peer-focus:text-teal-600 motion-reduce:transition-none ${loadingUrologists ? 'text-gray-400' : ''}`}
                    >
                      {loadingUrologists ? 'Loading urologists...' : 'Assigned Urologist'}
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${loadingUrologists ? 'text-gray-400' : formData.assignedUrologist ? 'text-teal-500' : 'text-gray-400'
                      }`} />
                    {urologists.length === 0 && !loadingUrologists && (
                      <p className="mt-1 text-sm text-gray-500">
                        No urologists available. Please contact administrator.
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="date"
                      name="referralDate"
                      value={formData.referralDate}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${formData.referralDate
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.referralDate
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Referral Date
                    </label>
                  </div>
                </div>

                {/* Triage Symptoms Section */}
                <div className="mt-4 space-y-3">
                  {/* Predefined and Custom Symptoms - List all together */}
                  {triageSymptoms.map((symptom, index) => (
                    <div
                      key={index}
                      onClick={() => handleSymptomCheckboxChange(index)}
                      className={`border rounded-lg transition-all duration-200 cursor-pointer ${symptom.checked
                        ? 'border-teal-500 bg-teal-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        } ${symptom.isCustom ? 'border-blue-300' : ''}`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <input
                          type="checkbox"
                          checked={symptom.checked}
                          onChange={() => handleSymptomCheckboxChange(index)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 flex-shrink-0 cursor-pointer pointer-events-auto"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${symptom.checked ? 'text-teal-900' : 'text-gray-700'
                              }`}>
                              {symptom.name}
                            </span>
                            {symptom.isCustom && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Custom
                              </span>
                            )}
                          </div>
                          {symptom.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCustomSymptom(index);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {symptom.checked && (
                        <div className="px-4 pb-4 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-4">
                            <div className={`grid gap-4 ${symptom.name === 'LUTS' || symptom.name === 'Nocturia'
                              ? 'grid-cols-1 md:grid-cols-2'
                              : 'grid-cols-1'
                              }`}>
                              {(symptom.name === 'LUTS' || symptom.name === 'Nocturia') && (
                                <div className="relative mb-3">
                                  <select
                                    value={symptom.ipssScore}
                                    onChange={(e) => handleSymptomFieldChange(index, 'ipssScore', e.target.value)}
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${errors.symptoms && errors.symptoms[`${index}_ipss`]
                                      ? 'border-red-500 focus:border-red-500 bg-red-50'
                                      : symptom.ipssScore
                                        ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                        : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                      } motion-reduce:transition-none`}
                                  >
                                    <option value="" disabled>Select IPSS Score</option>
                                    <option value="Mild">Mild (0-7 points)</option>
                                    <option value="Moderate">Moderate (8-19 points)</option>
                                    <option value="Severe">Severe (20-35 points)</option>
                                  </select>
                                  <label
                                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${errors.symptoms && errors.symptoms[`${index}_ipss`]
                                      ? 'text-red-500'
                                      : symptom.ipssScore
                                        ? 'text-teal-600'
                                        : 'text-gray-500'
                                      } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                  >
                                    IPSS Score <span className="text-red-500">*</span>
                                  </label>
                                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${errors.symptoms && errors.symptoms[`${index}_ipss`]
                                    ? 'text-red-500'
                                    : symptom.ipssScore ? 'text-teal-500' : 'text-gray-400'
                                    }`} />
                                  {errors.symptoms && errors.symptoms[`${index}_ipss`] && (
                                    <p className="mt-1 text-xs text-red-600">
                                      {errors.symptoms[`${index}_ipss`]}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div>
                                <div className="flex gap-2">
                                  <div className="flex-1 relative mb-3">
                                    <input
                                      type="number"
                                      min="0"
                                      value={symptom.duration}
                                      onChange={(e) => handleSymptomFieldChange(index, 'duration', e.target.value)}
                                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${symptom.duration
                                        ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                        : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                        } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                      placeholder=" "
                                    />
                                    <label
                                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${symptom.duration
                                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-teal-50 px-1'
                                        : 'text-gray-500'
                                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-teal-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-teal-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                                    >
                                      Duration of Symptoms
                                    </label>
                                  </div>
                                  <div className="relative mb-3" style={{ minWidth: '120px' }}>
                                    <select
                                      value={symptom.durationUnit}
                                      onChange={(e) => handleSymptomFieldChange(index, 'durationUnit', e.target.value)}
                                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${symptom.durationUnit
                                        ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                        : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                        } motion-reduce:transition-none`}
                                    >
                                      <option value="weeks">Weeks</option>
                                      <option value="months">Months</option>
                                      <option value="years">Years</option>
                                    </select>
                                    <label
                                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${symptom.durationUnit
                                        ? 'text-teal-600'
                                        : 'text-gray-500'
                                        } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                    >
                                      Unit
                                    </label>
                                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${symptom.durationUnit ? 'text-teal-500' : 'text-gray-400'
                                      }`} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes field for all symptoms */}
                            <div className={`grid gap-4 ${symptom.name === 'Nocturia' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                              {symptom.name === 'Nocturia' && (
                                <div className="relative mb-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={symptom.frequency}
                                    onChange={(e) => handleSymptomFieldChange(index, 'frequency', e.target.value)}
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${symptom.frequency
                                      ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                      : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                    placeholder=" "
                                  />
                                  <label
                                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${symptom.frequency
                                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-teal-50 px-1'
                                      : 'text-gray-500'
                                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-teal-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-teal-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                                  >
                                    Frequency (times per night)
                                  </label>
                                </div>
                              )}

                              <div className="relative mb-3">
                                <textarea
                                  value={symptom.notes}
                                  onChange={(e) => handleSymptomFieldChange(index, 'notes', e.target.value)}
                                  rows={3}
                                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear resize-none ${symptom.notes
                                    ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                    : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                    } focus:placeholder:opacity-100 peer-focus:text-teal-600 motion-reduce:transition-none`}
                                  placeholder=" "
                                />
                                <label
                                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${symptom.notes
                                    ? 'text-teal-600'
                                    : 'text-gray-500'
                                    } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                >
                                  Notes
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Custom Symptom Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomSymptomModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Symptom
                  </button>
                </div>

                <div className="mt-4 relative mb-3">
                  <textarea
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    rows={3}
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.medicalHistory
                      ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                      : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.medicalHistory
                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                      : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                  >
                    Medical History
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="relative mb-3">
                    <textarea
                      name="currentMedications"
                      value={formData.currentMedications}
                      onChange={handleInputChange}
                      rows={3}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.currentMedications
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.currentMedications
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Current Medications
                    </label>
                  </div>

                  <div className="relative mb-3">
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.allergies
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.allergies
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Allergies
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="relative mb-3">
                    <textarea
                      name="socialHistory"
                      value={formData.socialHistory}
                      onChange={handleInputChange}
                      rows={3}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.socialHistory
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.socialHistory
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Social History
                    </label>
                  </div>

                  <div className="relative mb-3">
                    <textarea
                      name="familyHistory"
                      value={formData.familyHistory}
                      onChange={handleInputChange}
                      rows={3}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.familyHistory
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                        } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.familyHistory
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Family History
                    </label>
                  </div>
                </div>
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
                  <div className="relative mb-3">
                    <input
                      type="number"
                      step="0.1"
                      name="initialPSA"
                      value={formData.initialPSA}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.initialPSA
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.initialPSA
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                        } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.initialPSA
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.initialPSA ? '!text-red-500' : ''}`}
                    >
                      Initial PSA Level <span className="text-red-500">*</span>
                    </label>
                    {errors.initialPSA && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.initialPSA}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="date"
                      name="initialPSADate"
                      value={formData.initialPSADate}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${errors.initialPSADate
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.initialPSADate
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                        } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.initialPSADate
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.initialPSADate ? '!text-red-500' : ''}`}
                    >
                      PSA Test Date <span className="text-red-500">*</span>
                    </label>
                    {errors.initialPSADate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.initialPSADate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Exam & Prior Tests */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Exam & Prior Tests</h4>
                    <p className="text-sm text-gray-600">Physical examination findings and prior test results</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* DRE Findings */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        name="dreDone"
                        checked={formData.dreDone}
                        onChange={(e) => setFormData(prev => ({ ...prev, dreDone: e.target.checked, dreFindings: e.target.checked ? prev.dreFindings : [] }))}
                        className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        DRE (Digital Rectal Exam) Done
                      </span>
                    </label>

                    {formData.dreDone && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          DRE Findings <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {['Normal', 'Enlarged', 'Nodule', 'Suspicious'].map((finding) => (
                            <label
                              key={finding}
                              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.dreFindings.includes(finding)
                                ? 'border-teal-500 bg-teal-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.dreFindings.includes(finding)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      dreFindings: [...prev.dreFindings, finding]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      dreFindings: prev.dreFindings.filter(f => f !== finding)
                                    }));
                                  }
                                }}
                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className={`text-sm font-medium ${formData.dreFindings.includes(finding) ? 'text-teal-900' : 'text-gray-700'
                                }`}>
                                {finding}
                              </span>
                            </label>
                          ))}
                        </div>
                        {formData.dreFindings.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                            <span className="font-medium">{formData.dreFindings.length} finding(s) selected</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prior Prostate Biopsy */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-4">
                      Prior Prostate Biopsy
                    </label>
                    <div className="flex items-center gap-6 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="priorBiopsy"
                          value="no"
                          checked={formData.priorBiopsy === 'no'}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className={`text-sm font-medium transition-colors ${formData.priorBiopsy === 'no' ? 'text-teal-700' : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                          No
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="priorBiopsy"
                          value="yes"
                          checked={formData.priorBiopsy === 'yes'}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className={`text-sm font-medium transition-colors ${formData.priorBiopsy === 'yes' ? 'text-teal-700' : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                          Yes
                        </span>
                      </label>
                    </div>

                    {formData.priorBiopsy === 'yes' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative mb-3">
                            <input
                              type="date"
                              name="priorBiopsyDate"
                              value={formData.priorBiopsyDate}
                              onChange={handleInputChange}
                              max={new Date().toISOString().split('T')[0]}
                              className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${formData.priorBiopsyDate
                                ? 'border-teal-500 focus:border-teal-500 bg-white'
                                : 'border-gray-300 focus:border-teal-500 bg-white'
                                } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                              placeholder=" "
                            />
                            <label
                              className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.priorBiopsyDate
                                ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                                : 'text-gray-500'
                                } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                            >
                              Biopsy Date <span className="text-red-500">*</span>
                            </label>
                          </div>
                          <div className="relative mb-3">
                            <input
                              type="text"
                              name="gleasonScore"
                              value={formData.gleasonScore}
                              onChange={handleInputChange}
                              className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${formData.gleasonScore
                                ? 'border-teal-500 focus:border-teal-500 bg-white'
                                : 'border-gray-300 focus:border-teal-500 bg-white'
                                } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                              placeholder=" "
                            />
                            <label
                              className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.gleasonScore
                                ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                                : 'text-gray-500'
                                } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                            >
                              Gleason Score <span className="text-red-500">*</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comorbidities */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-4">
                      Comorbidities
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['CVD', 'Diabetes', 'Smoking Status'].map((comorbidity) => (
                        <label
                          key={comorbidity}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.comorbidities.includes(comorbidity)
                            ? 'border-teal-500 bg-teal-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.comorbidities.includes(comorbidity)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  comorbidities: [...prev.comorbidities, comorbidity]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  comorbidities: prev.comorbidities.filter(c => c !== comorbidity)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={`text-sm font-medium ${formData.comorbidities.includes(comorbidity) ? 'text-teal-900' : 'text-gray-700'
                            }`}>
                            {comorbidity}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Additional Notes</h4>
                    <p className="text-sm text-gray-600">Any additional notes or special considerations</p>
                  </div>
                </div>

                <div className="relative mb-3">
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${formData.notes
                      ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                      : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${formData.notes
                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                      : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                  >
                    Notes
                  </label>
                </div>
              </div>

            </form>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-6 mb-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
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

      {/* Add GP Modal */}
      <AddGPModal
        isOpen={isAddGPModalOpen}
        onClose={() => setIsAddGPModalOpen(false)}
        onSuccess={handleGPAdded}
      />

      {/* Custom Symptom Modal */}
      {showCustomSymptomModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200">
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between border-b border-teal-700">
              <h3 className="text-lg font-semibold text-white">Add Custom Symptom</h3>
              <button
                onClick={() => {
                  setShowCustomSymptomModal(false);
                  setCustomSymptomName('');
                  setCustomSymptomIpssScore('');
                  setCustomSymptomDuration('');
                  setCustomSymptomDurationUnit('months');
                  setCustomSymptomNotes('');
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative mb-6">
                <input
                  type="text"
                  value={customSymptomName}
                  onChange={(e) => setCustomSymptomName(e.target.value)}
                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${customSymptomName
                    ? 'border-teal-500 focus:border-teal-500 bg-white'
                    : 'border-gray-300 focus:border-teal-500 bg-white'
                    } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                  placeholder=" "
                />
                <label
                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${customSymptomName
                    ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                    : 'text-gray-500'
                    } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                >
                  Symptom Name <span className="text-red-500">*</span>
                </label>
              </div>

              {(customSymptomName === 'LUTS' || customSymptomName === 'Nocturia') && (
                <div className="relative mb-6">
                  <select
                    value={customSymptomIpssScore}
                    onChange={(e) => setCustomSymptomIpssScore(e.target.value)}
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${customSymptomIpssScore
                      ? 'border-teal-500 focus:border-teal-500 bg-white'
                      : 'border-gray-300 focus:border-teal-500 bg-white'
                      } motion-reduce:transition-none`}
                  >
                    <option value="" disabled>Select IPSS Score</option>
                    <option value="Mild">Mild (0-7 points)</option>
                    <option value="Moderate">Moderate (8-19 points)</option>
                    <option value="Severe">Severe (20-35 points)</option>
                  </select>
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${customSymptomIpssScore
                      ? 'text-teal-600'
                      : 'text-gray-500'
                      } peer-focus:text-teal-600 motion-reduce:transition-none`}
                  >
                    IPSS Score <span className="text-red-500">*</span>
                  </label>
                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${customSymptomIpssScore ? 'text-teal-500' : 'text-gray-400'
                    }`} />
                </div>
              )}

              <div className="mt-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative mb-3">
                    <input
                      type="number"
                      min="0"
                      value={customSymptomDuration}
                      onChange={(e) => setCustomSymptomDuration(e.target.value)}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${customSymptomDuration
                        ? 'border-teal-500 focus:border-teal-500 bg-white'
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                        } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${customSymptomDuration
                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                        : 'text-gray-500'
                        } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Duration of Symptoms
                    </label>
                  </div>
                  <div className="relative mb-3" style={{ minWidth: '120px' }}>
                    <select
                      value={customSymptomDurationUnit}
                      onChange={(e) => setCustomSymptomDurationUnit(e.target.value)}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${customSymptomDurationUnit
                        ? 'border-teal-500 focus:border-teal-500 bg-white'
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                        } motion-reduce:transition-none`}
                    >
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${customSymptomDurationUnit
                        ? 'text-teal-600'
                        : 'text-gray-500'
                        } peer-focus:text-teal-600 motion-reduce:transition-none`}
                    >
                      Unit
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${customSymptomDurationUnit ? 'text-teal-500' : 'text-gray-400'
                      }`} />
                  </div>
                </div>
              </div>

              {/* Notes field */}
              <div className="relative mb-3">
                <textarea
                  value={customSymptomNotes}
                  onChange={(e) => setCustomSymptomNotes(e.target.value)}
                  rows={3}
                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear resize-none ${customSymptomNotes
                    ? 'border-teal-500 focus:border-teal-500 bg-white'
                    : 'border-gray-300 focus:border-teal-500 bg-white'
                    } focus:placeholder:opacity-100 peer-focus:text-teal-600 motion-reduce:transition-none`}
                  placeholder=" "
                />
                <label
                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${customSymptomNotes
                    ? 'text-teal-600'
                    : 'text-gray-500'
                    } peer-focus:text-teal-600 motion-reduce:transition-none`}
                >
                  Notes
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCustomSymptomModal(false);
                  setCustomSymptomName('');
                  setCustomSymptomIpssScore('');
                  setCustomSymptomDuration('');
                  setCustomSymptomDurationUnit('months');
                  setCustomSymptomNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomSymptom}
                disabled={!customSymptomName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Symptom
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddPatientModal;
