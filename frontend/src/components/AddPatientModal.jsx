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
  FileCheck,
  XCircle
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { patientService } from '../services/patientService.js';
import { bookingService } from '../services/bookingService.js';
import { consentFormService } from '../services/consentFormService.js';
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

    // Consent Forms
    selectedConsentForms: [],
    consentFormFiles: {} // Map of consentFormId to File object
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
  
  // Consent Forms state
  const [availableConsentForms, setAvailableConsentForms] = useState([]);
  const [loadingConsentForms, setLoadingConsentForms] = useState(false);
  const [showAddConsentFormModal, setShowAddConsentFormModal] = useState(false);
  const [newConsentFormName, setNewConsentFormName] = useState('');
  const [isAddingConsentForm, setIsAddingConsentForm] = useState(false);


  // Fetch urologists and consent forms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUrologists();
      fetchConsentForms();
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

  const fetchConsentForms = async () => {
    setLoadingConsentForms(true);
    try {
      const result = await consentFormService.getConsentForms();
      if (result.success) {
        setAvailableConsentForms(result.data || []);
      } else {
        console.error('Failed to fetch consent forms:', result.error);
        setAvailableConsentForms([]);
      }
    } catch (error) {
      console.error('Error fetching consent forms:', error);
      setAvailableConsentForms([]);
    } finally {
      setLoadingConsentForms(false);
    }
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
    const textareaFields = ['medicalHistory', 'currentMedications', 'allergies', 'notes', 'address'];
    const nameFields = ['firstName', 'lastName', 'emergencyContactName', 'city', 'state'];
    const preserveWhitespace = textareaFields.includes(name) || nameFields.includes(name);

    // Sanitize text inputs to prevent XSS
    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value, { preserveWhitespace });
    }

    // Handle auto-calculation between DOB and Age
    let updatedFormData = { ...formData, [name]: sanitizedValue };

    if (name === 'dateOfBirth' && sanitizedValue) {
      const dob = new Date(sanitizedValue);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      updatedFormData.age = age.toString();
    } else if (name === 'age' && sanitizedValue) {
      const age = parseInt(sanitizedValue, 10);
      if (!isNaN(age)) {
        const today = new Date();
        const birthYear = today.getFullYear() - age;
        // Set to Jan 1st of the estimated birth year
        const dob = new Date(birthYear, 0, 1);
        // Adjust for timezone offset to ensure the date string is correct
        const year = dob.getFullYear();
        const month = String(dob.getMonth() + 1).padStart(2, '0');
        const day = String(dob.getDate()).padStart(2, '0');
        updatedFormData.dateOfBirth = `${year}-${month}-${day}`;
      }
    } else if ((name === 'dateOfBirth' && !sanitizedValue) || (name === 'age' && !sanitizedValue)) {
      if (name === 'dateOfBirth') updatedFormData.age = '';
      if (name === 'age') updatedFormData.dateOfBirth = '';
    }

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

    // Validate symptoms - IPSS score is required for LUTS
    triageSymptoms.forEach((symptom, index) => {
      if (symptom.checked && symptom.name === 'LUTS' && !symptom.ipssScore) {
        // Store error using symptom index
        if (!newErrors.symptoms) {
          newErrors.symptoms = {};
        }
        newErrors.symptoms[`${index}_ipss`] = 'IPSS score is required for LUTS';
      }
    });

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

      // Prepare triage symptoms data (only checked symptoms with required fields)
      const triageData = triageSymptoms
        .filter(symptom => {
          if (!symptom.checked || !symptom.duration) return false;
          // IPSS score is required only for LUTS
          if (symptom.name === 'LUTS') {
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
        referredByGpId: formData.referringGP || null, // Add referring GP ID
        triageSymptoms: triageData.length > 0 ? JSON.stringify(triageData) : null, // Add triage symptoms as JSON
        // Exam & Prior Tests
        dreDone: formData.dreDone || false,
        dreFindings: Array.isArray(formData.dreFindings) ? formData.dreFindings.join(', ') : (formData.dreFindings || ''),
        priorBiopsy: formData.priorBiopsy || 'no',
        priorBiopsyDate: formData.priorBiopsyDate ? convertToISODate(formData.priorBiopsyDate) : '',
        gleasonScore: formData.gleasonScore || '',
        comorbidities: formData.comorbidities || []
      };

      // Call the API
      const result = await patientService.addPatient(patientData);

      if (result.success) {
        const patientId = result.data.id || result.data._id;

        // Upload consent form files if any are selected
        if (formData.selectedConsentForms.length > 0 && Object.keys(formData.consentFormFiles).length > 0) {
          const uploadPromises = formData.selectedConsentForms
            .filter(formId => formData.consentFormFiles[formId])
            .map(async (formId) => {
              const file = formData.consentFormFiles[formId];
              try {
                const uploadResult = await consentFormService.uploadConsentForm(patientId, formId, file);
                if (!uploadResult.success) {
                  console.error(`Failed to upload consent form ${formId}:`, uploadResult.error);
                }
                return uploadResult;
              } catch (error) {
                console.error(`Error uploading consent form ${formId}:`, error);
                return { success: false, error: error.message };
              }
            });

          // Wait for all uploads to complete (but don't fail the entire operation if some fail)
          await Promise.allSettled(uploadPromises);
        }

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
      notes: '',
      dreFindings: [],
      dreDone: false,
      priorBiopsy: 'no',
      priorBiopsyDate: '',
      gleasonScore: '',
      comorbidities: [],
      selectedConsentForms: [],
      consentFormFiles: {}
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
    formData.gender !== '' ||
    formData.phone.trim() !== '' ||
    formData.email.trim() !== '' ||
    formData.address.trim() !== '' ||
    formData.initialPSA !== '' ||
    formData.medicalHistory.trim() !== '' ||
    formData.notes.trim() !== '' ||
    triageSymptoms.some(s => s.checked || s.isCustom) ||
    formData.dreDone || formData.priorBiopsy === 'yes' || formData.comorbidities.length > 0 ||
    formData.selectedConsentForms.length > 0 || Object.keys(formData.consentFormFiles).length > 0;

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
    
    // Clear error when IPSS score is selected for LUTS
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

    const newSymptom = {
      name: capitalizeFirstLetter(customSymptomName),
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

  // Handle consent form selection
  const handleConsentFormToggle = (consentFormId) => {
    setFormData(prev => {
      const isSelected = prev.selectedConsentForms.includes(consentFormId);
      if (isSelected) {
        // Remove from selection and remove file if exists
        const newFiles = { ...prev.consentFormFiles };
        delete newFiles[consentFormId];
        return {
          ...prev,
          selectedConsentForms: prev.selectedConsentForms.filter(id => id !== consentFormId),
          consentFormFiles: newFiles
        };
      } else {
        // Add to selection
        return {
          ...prev,
          selectedConsentForms: [...prev.selectedConsentForms, consentFormId]
        };
      }
    });
  };

  // Handle consent form file upload
  const handleConsentFormFileChange = (consentFormId, file) => {
    if (file) {
      setFormData(prev => ({
        ...prev,
        consentFormFiles: {
          ...prev.consentFormFiles,
          [consentFormId]: file
        }
      }));
    }
  };

  // Handle remove consent form file
  const handleRemoveConsentFormFile = (consentFormId) => {
    setFormData(prev => {
      const newFiles = { ...prev.consentFormFiles };
      delete newFiles[consentFormId];
      return {
        ...prev,
        consentFormFiles: newFiles
      };
    });
  };

  // Handle add new consent form
  const handleAddNewConsentForm = async () => {
    if (!newConsentFormName.trim()) {
      return;
    }

    setIsAddingConsentForm(true);
    try {
      const result = await consentFormService.createConsentForm(newConsentFormName.trim());
      if (result.success) {
        // Add to available forms and select it
        const newForm = result.data;
        setAvailableConsentForms(prev => [...prev, newForm]);
        setFormData(prev => ({
          ...prev,
          selectedConsentForms: [...prev.selectedConsentForms, newForm.id || newForm._id]
        }));
        setNewConsentFormName('');
        setShowAddConsentFormModal(false);
      } else {
        console.error('Failed to create consent form:', result.error);
        setErrors(prev => ({ ...prev, consentForms: result.error }));
      }
    } catch (error) {
      console.error('Error creating consent form:', error);
      setErrors(prev => ({ ...prev, consentForms: 'Failed to create consent form' }));
    } finally {
      setIsAddingConsentForm(false);
    }
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.firstName
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.firstName
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.firstName
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.lastName
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.lastName
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.lastName
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.dateOfBirth && !formData.age
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.dateOfBirth
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.dateOfBirth
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.age && !formData.dateOfBirth
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.age
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.age
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
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                        errors.gender
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.gender
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    >
                      <option value="" disabled hidden>Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.gender
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.gender ? '!text-red-500' : ''}`}
                    >
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${
                      errors.gender ? 'text-red-500' : formData.gender ? 'text-teal-500' : 'text-gray-400'
                    }`} />
                    {errors.gender && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.gender}
                      </p>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.phone
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.phone
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.phone
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.email
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.email
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
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                      errors.address
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : formData.address
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                    } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.address
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        formData.postcode
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.postcode
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        formData.city
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.city
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                        formData.state
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
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.state
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      State
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${
                      formData.state ? 'text-teal-500' : 'text-gray-400'
                    }`} />
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        formData.emergencyContactName
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.emergencyContactName
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Contact Name
                    </label>
                  </div>

                  <div className="relative mb-3">
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.emergencyContactPhone
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.emergencyContactPhone
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.emergencyContactPhone
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none ${errors.emergencyContactPhone ? '!text-red-500' : ''}`}
                    >
                      Contact Phone
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        formData.emergencyContactRelationship
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.emergencyContactRelationship
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Relationship
                    </label>
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                        loadingUrologists 
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
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-gray-50 px-1 ${
                        formData.assignedUrologist
                          ? 'text-teal-600'
                          : 'text-gray-500'
                      } peer-focus:text-teal-600 motion-reduce:transition-none ${loadingUrologists ? 'text-gray-400' : ''}`}
                    >
                      {loadingUrologists ? 'Loading urologists...' : 'Assigned Urologist'}
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${
                      loadingUrologists ? 'text-gray-400' : formData.assignedUrologist ? 'text-teal-500' : 'text-gray-400'
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        formData.referralDate
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.referralDate
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
                      className={`border rounded-lg transition-all duration-200 cursor-pointer ${
                        symptom.checked
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
                            <span className={`text-sm font-medium ${
                              symptom.checked ? 'text-teal-900' : 'text-gray-700'
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
                            <div className={`grid gap-4 ${
                              symptom.name === 'LUTS'
                                ? 'grid-cols-1 md:grid-cols-2' 
                                : 'grid-cols-1'
                            }`}>
                              {symptom.name === 'LUTS' && (
                                <div className="relative mb-3">
                                  <select
                                    value={symptom.ipssScore}
                                    onChange={(e) => handleSymptomFieldChange(index, 'ipssScore', e.target.value)}
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                                      errors.symptoms && errors.symptoms[`${index}_ipss`]
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
                                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${
                                      errors.symptoms && errors.symptoms[`${index}_ipss`]
                                        ? 'text-red-500'
                                        : symptom.ipssScore
                                        ? 'text-teal-600'
                                        : 'text-gray-500'
                                    } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                  >
                                    IPSS Score <span className="text-red-500">*</span>
                                  </label>
                                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${
                                    errors.symptoms && errors.symptoms[`${index}_ipss`]
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
                                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                                        symptom.duration
                                          ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                          : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                      placeholder=" "
                                    />
                                    <label
                                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${
                                        symptom.duration
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
                                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                                        symptom.durationUnit
                                          ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                          : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                      } motion-reduce:transition-none`}
                                    >
                                      <option value="weeks">Weeks</option>
                                      <option value="months">Months</option>
                                      <option value="years">Years</option>
                                    </select>
                                    <label
                                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${
                                        symptom.durationUnit
                                          ? 'text-teal-600'
                                          : 'text-gray-500'
                                      } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                    >
                                      Unit
                                    </label>
                                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${
                                      symptom.durationUnit ? 'text-teal-500' : 'text-gray-400'
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
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                      symptom.frequency
                                        ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                        : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                    } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                    placeholder=" "
                                  />
                                  <label
                                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${
                                      symptom.frequency
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
                                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear resize-none ${
                                    symptom.notes
                                      ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                      : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                  } focus:placeholder:opacity-100 peer-focus:text-teal-600 motion-reduce:transition-none`}
                                  placeholder=" "
                                />
                                <label
                                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${
                                    symptom.notes
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
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${
                      formData.medicalHistory
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                    } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                      formData.medicalHistory
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${
                        formData.currentMedications
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.currentMedications
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${
                        formData.allergies
                          ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                          : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                      } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.allergies
                          ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-gray-50 px-1'
                          : 'text-gray-500'
                      } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-gray-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-gray-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                    >
                      Allergies
                    </label>
                  </div>
                </div>
              </div>

              {/* Consent Forms */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Consent Forms</h4>
                    <p className="text-sm text-gray-600">Select and upload patient consent forms</p>
                  </div>
                </div>

                {/* Consent Forms Dropdown */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Select Consent Forms
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddConsentFormModal(true)}
                        className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add New Form
                      </button>
                    </div>
                    
                    <div className="border border-gray-300 rounded-lg bg-white min-h-[120px] max-h-[200px] overflow-y-auto p-3">
                      {loadingConsentForms ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                          <span className="ml-2 text-sm text-gray-600">Loading consent forms...</span>
                        </div>
                      ) : availableConsentForms.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No consent forms available. Click "Add New Form" to create one.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableConsentForms.map((form) => {
                            const formId = form.id || form._id;
                            const formName = form.name || form.formName;
                            const isSelected = formData.selectedConsentForms.includes(formId);
                            const hasFile = formData.consentFormFiles[formId];
                            
                            return (
                              <div
                                key={formId}
                                className={`border rounded-lg p-3 transition-all ${
                                  isSelected
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleConsentFormToggle(formId)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                                  />
                                  <label
                                    className="flex-1 text-sm font-medium text-gray-900 cursor-pointer"
                                    onClick={() => handleConsentFormToggle(formId)}
                                  >
                                    {formName}
                                  </label>
                                </div>

                                {/* File Upload Section for Selected Forms */}
                                {isSelected && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <label className="flex-1">
                                        <input
                                          type="file"
                                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                          onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                              handleConsentFormFileChange(formId, file);
                                            }
                                          }}
                                          className="hidden"
                                          id={`consent-file-${formId}`}
                                        />
                                        <div className="flex items-center gap-2 cursor-pointer">
                                          <button
                                            type="button"
                                            onClick={() => document.getElementById(`consent-file-${formId}`).click()}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-600 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
                                          >
                                            <Upload className="w-3 h-3" />
                                            {hasFile ? 'Change File' : 'Upload File'}
                                          </button>
                                          {hasFile && (
                                            <span className="text-xs text-gray-600 flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              {hasFile.name}
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveConsentFormFile(formId)}
                                                className="ml-1 text-red-600 hover:text-red-700"
                                              >
                                                <XCircle className="w-3 h-3" />
                                              </button>
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    </div>
                                    {hasFile && (
                                      <p className="mt-1 text-xs text-gray-500">
                                        File size: {(hasFile.size / 1024).toFixed(2)} KB
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {formData.selectedConsentForms.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {formData.selectedConsentForms.length} form(s) selected
                    </div>
                  )}
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.initialPSA
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.initialPSA
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.initialPSA
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        errors.initialPSADate
                          ? 'border-red-500 focus:border-red-500 bg-red-50'
                          : formData.initialPSADate
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        formData.initialPSADate
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
                              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                formData.dreFindings.includes(finding)
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
                              <span className={`text-sm font-medium ${
                                formData.dreFindings.includes(finding) ? 'text-teal-900' : 'text-gray-700'
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
                        <span className={`text-sm font-medium transition-colors ${
                          formData.priorBiopsy === 'no' ? 'text-teal-700' : 'text-gray-700 group-hover:text-gray-900'
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
                        <span className={`text-sm font-medium transition-colors ${
                          formData.priorBiopsy === 'yes' ? 'text-teal-700' : 'text-gray-700 group-hover:text-gray-900'
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
                              className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                                formData.priorBiopsyDate
                                  ? 'border-teal-500 focus:border-teal-500 bg-white'
                                  : 'border-gray-300 focus:border-teal-500 bg-white'
                              } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                              placeholder=" "
                            />
                            <label
                              className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                                formData.priorBiopsyDate
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
                              className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                                formData.gleasonScore
                                  ? 'border-teal-500 focus:border-teal-500 bg-white'
                                  : 'border-gray-300 focus:border-teal-500 bg-white'
                              } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                              placeholder=" "
                            />
                            <label
                              className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                                formData.gleasonScore
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
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.comorbidities.includes(comorbidity)
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
                          <span className={`text-sm font-medium ${
                            formData.comorbidities.includes(comorbidity) ? 'text-teal-900' : 'text-gray-700'
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
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 resize-none ${
                      formData.notes
                        ? 'border-teal-500 focus:border-teal-500 bg-gray-50'
                        : 'border-gray-300 focus:border-teal-500 bg-gray-50'
                    } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                    placeholder=" "
                  />
                  <label
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                      formData.notes
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

      {/* Add Consent Form Modal */}
      {showAddConsentFormModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200">
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between border-b border-teal-700">
              <h3 className="text-lg font-semibold text-white">Add New Consent Form</h3>
              <button
                onClick={() => {
                  setShowAddConsentFormModal(false);
                  setNewConsentFormName('');
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                disabled={isAddingConsentForm}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative mb-6">
                <input
                  type="text"
                  value={newConsentFormName}
                  onChange={(e) => setNewConsentFormName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAddingConsentForm && newConsentFormName.trim()) {
                      handleAddNewConsentForm();
                    }
                  }}
                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                    newConsentFormName
                      ? 'border-teal-500 focus:border-teal-500 bg-white'
                      : 'border-gray-300 focus:border-teal-500 bg-white'
                  } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                  placeholder=" "
                  disabled={isAddingConsentForm}
                />
                <label
                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                    newConsentFormName
                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                      : 'text-gray-500'
                  } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                >
                  Consent Form Name <span className="text-red-500">*</span>
                </label>
              </div>

              {errors.consentForms && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">
                    {errors.consentForms}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddConsentFormModal(false);
                    setNewConsentFormName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
                  disabled={isAddingConsentForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewConsentForm}
                  disabled={isAddingConsentForm || !newConsentFormName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isAddingConsentForm ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Form
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                    customSymptomName
                      ? 'border-teal-500 focus:border-teal-500 bg-white'
                      : 'border-gray-300 focus:border-teal-500 bg-white'
                  } border focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                  placeholder=" "
                />
                <label
                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                    customSymptomName
                      ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-white px-1'
                      : 'text-gray-500'
                  } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-white peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                >
                  Symptom Name <span className="text-red-500">*</span>
                </label>
              </div>

              {customSymptomName === 'LUTS' && (
                <div className="relative mb-6">
                  <select
                    value={customSymptomIpssScore}
                    onChange={(e) => setCustomSymptomIpssScore(e.target.value)}
                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                      customSymptomIpssScore
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
                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${
                      customSymptomIpssScore
                        ? 'text-teal-600'
                        : 'text-gray-500'
                    } peer-focus:text-teal-600 motion-reduce:transition-none`}
                  >
                    IPSS Score <span className="text-red-500">*</span>
                  </label>
                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${
                    customSymptomIpssScore ? 'text-teal-500' : 'text-gray-400'
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                        customSymptomDuration
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                      placeholder=" "
                    />
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out ${
                        customSymptomDuration
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
                      className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                        customSymptomDurationUnit
                          ? 'border-teal-500 focus:border-teal-500 bg-white'
                          : 'border-gray-300 focus:border-teal-500 bg-white'
                      } motion-reduce:transition-none`}
                    >
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                    <label
                      className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${
                        customSymptomDurationUnit
                          ? 'text-teal-600'
                          : 'text-gray-500'
                      } peer-focus:text-teal-600 motion-reduce:transition-none`}
                    >
                      Unit
                    </label>
                    <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none ${
                      customSymptomDurationUnit ? 'text-teal-500' : 'text-gray-400'
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
                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear resize-none ${
                    customSymptomNotes
                      ? 'border-teal-500 focus:border-teal-500 bg-white'
                      : 'border-gray-300 focus:border-teal-500 bg-white'
                  } focus:placeholder:opacity-100 peer-focus:text-teal-600 motion-reduce:transition-none`}
                  placeholder=" "
                />
                <label
                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-white px-1 ${
                    customSymptomNotes
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
