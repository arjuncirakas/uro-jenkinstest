import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { patientService } from '../services/patientService.js';
import { bookingService } from '../services/bookingService.js';
import { 
  validateNameInput, 
  validatePhoneInput, 
  validateNumericInput,
  sanitizeInput
} from '../utils/inputValidation.js';
import { IoHeart, IoAnalytics, IoDocument } from 'react-icons/io5';
import { FaStethoscope } from 'react-icons/fa';
import { ChevronDown } from 'lucide-react';

const EditPatientModal = ({ isOpen, onClose, patient, onPatientUpdated, onError }) => {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    postcode: '',
    city: '',
    state: '',
    
    // Medical Information
    referralDate: '',
    initialPSA: '',
    initialPSADate: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: '',
    assignedUrologist: '',
    
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
    
    // Nurse Triage Symptoms
    triageSymptoms: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urologists, setUrologists] = useState([]);
  const [loadingUrologists, setLoadingUrologists] = useState(false);

  // Predefined comorbidities
  const availableComorbidities = ['CVD', 'Diabetes', 'Smoking Status'];

  // Load patient data when modal opens
  useEffect(() => {
    if (isOpen && patient) {
      // Parse triage symptoms if it's a JSON string
      let triageSymptoms = patient.triageSymptoms || patient.triage_symptoms;
      if (typeof triageSymptoms === 'string') {
        try {
          triageSymptoms = JSON.parse(triageSymptoms);
        } catch (e) {
          triageSymptoms = [];
        }
      }
      
      // Normalize triage symptoms field names (handle both camelCase and snake_case)
      if (Array.isArray(triageSymptoms)) {
        triageSymptoms = triageSymptoms.map(symptom => ({
          name: symptom.name || '',
          ipssScore: symptom.ipssScore || symptom.ipss_score || '',
          duration: symptom.duration || '',
          durationUnit: symptom.durationUnit || symptom.duration_unit || 'months',
          frequency: symptom.frequency || '',
          notes: symptom.notes || '',
          isCustom: symptom.isCustom || symptom.is_custom || false
        }));
      }

      // Parse comorbidities if it's a JSON string or array
      let comorbidities = patient.comorbidities || [];
      if (typeof comorbidities === 'string') {
        try {
          comorbidities = JSON.parse(comorbidities);
        } catch (e) {
          comorbidities = [];
        }
      }

      setFormData({
        firstName: patient.firstName || patient.first_name || '',
        lastName: patient.lastName || patient.last_name || '',
        dateOfBirth: patient.dateOfBirth || patient.date_of_birth || '',
        phone: patient.phone || patient.phoneNumber || '',
        email: patient.email || '',
        address: patient.address || '',
        postcode: patient.postcode || '',
        city: patient.city || '',
        state: patient.state || '',
        referralDate: patient.referralDate || patient.referral_date || '',
        initialPSA: patient.initialPSA || patient.initial_psa || '',
        initialPSADate: patient.initialPSADate || patient.initial_psa_date || '',
        medicalHistory: patient.medicalHistory || patient.medical_history || '',
        currentMedications: patient.currentMedications || patient.current_medications || '',
        allergies: patient.allergies || '',
        assignedUrologist: patient.assignedUrologist || patient.assigned_urologist || '',
        emergencyContactName: patient.emergencyContactName || patient.emergency_contact_name || '',
        emergencyContactPhone: patient.emergencyContactPhone || patient.emergency_contact_phone || '',
        emergencyContactRelationship: patient.emergencyContactRelationship || patient.emergency_contact_relationship || '',
        priority: patient.priority || 'Normal',
        notes: patient.notes || '',
        dreFindings: (() => {
          const findings = patient.dreFindings || patient.dre_findings || '';
          if (typeof findings === 'string' && findings.trim()) {
            return findings.split(',').map(f => f.trim()).filter(f => f);
          }
          return Array.isArray(findings) ? findings : [];
        })(),
        dreDone: patient.dreDone || patient.dre_done || false,
        priorBiopsy: patient.priorBiopsy || patient.prior_biopsy || 'no',
        priorBiopsyDate: patient.priorBiopsyDate || patient.prior_biopsy_date || '',
        gleasonScore: patient.gleasonScore || patient.gleason_score || '',
        comorbidities: Array.isArray(comorbidities) ? comorbidities : [],
        triageSymptoms: Array.isArray(triageSymptoms) ? triageSymptoms : []
      });
      setErrors({});
      fetchUrologists();
    }
  }, [isOpen, patient]);

  const fetchUrologists = async () => {
    setLoadingUrologists(true);
    try {
      const result = await bookingService.getAvailableUrologists();
      if (result.success) {
        const urologistsList = Array.isArray(result.data) ? result.data : [];
        setUrologists(urologistsList);
      }
    } catch (error) {
      console.error('Error fetching urologists:', error);
    } finally {
      setLoadingUrologists(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let isValid = true;
    let sanitizedValue = value;
    
    // Name fields
    if (['firstName', 'lastName', 'emergencyContactName', 'city', 'state'].includes(name)) {
      isValid = validateNameInput(value);
      if (!isValid) return;
    }
    
    // Phone fields
    if (['phone', 'emergencyContactPhone'].includes(name)) {
      isValid = validatePhoneInput(value);
      if (!isValid) return;
    }
    
    // Numeric fields
    if (['initialPSA'].includes(name)) {
      isValid = validateNumericInput(value);
      if (!isValid) return;
    }
    
    // Postcode field
    if (name === 'postcode') {
      const postcodeRegex = /^\d*$/;
      isValid = postcodeRegex.test(value);
      if (!isValid) return;
    }
    
    // Textarea fields
    const textareaFields = ['medicalHistory', 'currentMedications', 'allergies', 'notes', 'address'];
    const preserveWhitespace = textareaFields.includes(name);
    
    // Sanitize text inputs
    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value, { preserveWhitespace });
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

  const handleCheckboxChange = (name) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleComorbidityChange = (comorbidity) => {
    setFormData(prev => {
      const current = prev.comorbidities || [];
      if (current.includes(comorbidity)) {
        return {
          ...prev,
          comorbidities: current.filter(c => c !== comorbidity)
        };
      } else {
        return {
          ...prev,
          comorbidities: [...current, comorbidity]
        };
      }
    });
  };

  // Handle triage symptom field changes
  const handleTriageSymptomFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updatedSymptoms = [...(prev.triageSymptoms || [])];
      updatedSymptoms[index] = {
        ...updatedSymptoms[index],
        [field]: value
      };
      return {
        ...prev,
        triageSymptoms: updatedSymptoms
      };
    });
    
    // Clear error when IPSS score is selected for LUTS or Nocturia
    if (field === 'ipssScore' && value) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.triageSymptoms && newErrors.triageSymptoms[`${index}_ipss`]) {
          delete newErrors.triageSymptoms[`${index}_ipss`];
          if (Object.keys(newErrors.triageSymptoms).length === 0) {
            delete newErrors.triageSymptoms;
          }
        }
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setErrors({});
    
    // Client-side validation for IPSS score
    const validationErrors = {};
    if (formData.triageSymptoms && formData.triageSymptoms.length > 0) {
      const symptomErrors = {};
      formData.triageSymptoms.forEach((symptom, index) => {
        if ((symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
          symptomErrors[`${index}_ipss`] = `IPSS score is required for ${symptom.name}`;
        }
      });
      if (Object.keys(symptomErrors).length > 0) {
        validationErrors.triageSymptoms = symptomErrors;
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Helper function to convert date to ISO format
      const convertToISODate = (dateString) => {
        if (!dateString || dateString.trim() === '') return null;
        try {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
            return dateString.trim();
          }
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return null;
          }
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Date conversion error:', error, dateString);
          return null;
        }
      };

      // Prepare patient data for API
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: convertToISODate(formData.dateOfBirth),
        phone: formData.phone,
        email: formData.email || '',
        address: formData.address || '',
        postcode: formData.postcode || '',
        city: formData.city || '',
        state: formData.state || '',
        referralDate: convertToISODate(formData.referralDate) || null,
        initialPSA: formData.initialPSA && formData.initialPSA !== '' ? (isNaN(parseFloat(formData.initialPSA)) ? null : parseFloat(formData.initialPSA)) : null,
        initialPSADate: formData.initialPSADate ? convertToISODate(formData.initialPSADate) : null,
        medicalHistory: formData.medicalHistory || '',
        currentMedications: formData.currentMedications || '',
        allergies: formData.allergies || '',
        assignedUrologist: formData.assignedUrologist || '',
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactPhone: formData.emergencyContactPhone || '',
        emergencyContactRelationship: formData.emergencyContactRelationship || '',
        priority: formData.priority || 'Normal',
        notes: formData.notes || '',
        dreDone: formData.dreDone || false,
        dreFindings: Array.isArray(formData.dreFindings) ? formData.dreFindings.join(', ') : (formData.dreFindings || ''),
        priorBiopsy: formData.priorBiopsy || 'no',
        priorBiopsyDate: formData.priorBiopsyDate ? convertToISODate(formData.priorBiopsyDate) : '',
        gleasonScore: formData.gleasonScore || '',
        comorbidities: formData.comorbidities || [],
        triageSymptoms: formData.triageSymptoms && formData.triageSymptoms.length > 0 ? JSON.stringify(formData.triageSymptoms) : null
      };

      // Call the API
      const result = await patientService.updatePatient(patient.id, updateData);
      
      if (result.success) {
        if (onPatientUpdated) {
          onPatientUpdated(result.data);
        }
        onClose();
      } else {
        if (result.details) {
          const apiErrors = {};
          result.details.forEach(error => {
            // Handle triageSymptoms errors specially
            if (error.field === 'triageSymptoms') {
              // Try to parse which symptom needs IPSS score from the error message
              const message = error.message || '';
              if (message.includes('IPSS score is required')) {
                // Find the symptom that needs IPSS score
                if (formData.triageSymptoms && formData.triageSymptoms.length > 0) {
                  if (!apiErrors.triageSymptoms) {
                    apiErrors.triageSymptoms = {};
                  }
                  formData.triageSymptoms.forEach((symptom, index) => {
                    if ((symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
                      apiErrors.triageSymptoms[`${index}_ipss`] = message;
                    }
                  });
                }
              } else {
                // Generic triageSymptoms error
                apiErrors[error.field] = error.message;
              }
            } else {
              apiErrors[error.field] = error.message;
            }
          });
          setErrors(apiErrors);
        } else {
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
      console.error('Error updating patient:', error);
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

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] border border-gray-200 flex flex-col">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Edit Patient Details</h3>
              <p className="text-teal-50 text-sm mt-0.5">Update patient information</p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                  <IoHeart className="w-6 h-6 text-teal-600" />
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="email@example.com"
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
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.address}
                  </p>
                )}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            </div>

            {/* PSA Information */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <IoAnalytics className="w-6 h-6 text-teal-600" />
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
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
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
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.initialPSADate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <IoDocument className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Medical Information</h4>
                  <p className="text-sm text-gray-600">Clinical details and treatment pathway</p>
                </div>
              </div>
                
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Known allergies"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                  <IoHeart className="w-6 h-6 text-teal-600" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Spouse, Child, etc."
                  />
                </div>
              </div>
            </div>

            {/* Exam & Prior Tests */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-center">
                  <FaStethoscope className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Exam & Prior Tests</h4>
                  <p className="text-sm text-gray-600">Physical examination findings and prior test results</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* DRE Findings */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      name="dreDone"
                      checked={formData.dreDone}
                      onChange={() => handleCheckboxChange('dreDone')}
                      className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <label className="text-sm font-semibold text-gray-900 cursor-pointer">
                      DRE (Digital Rectal Exam) Done
                    </label>
                  </div>
                  
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
                          <CheckCircle2 className="h-4 w-4" />
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
                        <div className="relative">
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
                        <div className="relative">
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
                    {availableComorbidities.map((comorbidity) => (
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
                          onChange={() => handleComorbidityChange(comorbidity)}
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

            {/* Nurse Triage Information */}
            {formData.triageSymptoms && formData.triageSymptoms.length > 0 && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <FaStethoscope className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Nurse Triage Information</h4>
                    <p className="text-sm text-gray-600">Symptoms & Presentation - Chief Complaint</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.triageSymptoms.map((symptom, index) => {
                    const symptomName = symptom.name || '';
                    const ipssScore = symptom.ipssScore || symptom.ipss_score || '';
                    const duration = symptom.duration || '';
                    const durationUnit = symptom.durationUnit || symptom.duration_unit || 'months';
                    const frequency = symptom.frequency || '';
                    const notes = symptom.notes || '';
                    const isCustom = symptom.isCustom || false;

                    return (
                      <div key={index} className={`border border-gray-200 rounded-lg p-4 ${isCustom ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-base">{symptomName}</span>
                            {isCustom && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">(Custom)</span>}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className={`grid gap-4 ${
                            symptomName === 'LUTS' || symptomName === 'Nocturia'
                              ? 'grid-cols-1 md:grid-cols-2' 
                              : 'grid-cols-1'
                          }`}>
                            {(symptomName === 'LUTS' || symptomName === 'Nocturia') && (
                              <div className="relative mb-3">
                                <select
                                  value={ipssScore}
                                  onChange={(e) => handleTriageSymptomFieldChange(index, 'ipssScore', e.target.value)}
                                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                                    errors.triageSymptoms && errors.triageSymptoms[`${index}_ipss`]
                                      ? 'border-red-500 focus:border-red-500 bg-red-50'
                                      : ipssScore
                                      ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                      : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                  } motion-reduce:transition-none`}
                                >
                                  <option value="">Select IPSS Score</option>
                                  <option value="Mild">Mild (0-7 points)</option>
                                  <option value="Moderate">Moderate (8-19 points)</option>
                                  <option value="Severe">Severe (20-35 points)</option>
                                </select>
                                <label
                                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${
                                    ipssScore
                                      ? 'text-teal-600'
                                      : 'text-gray-500'
                                  } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                >
                                  IPSS Score <span className="text-red-500">*</span>
                                </label>
                                <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${
                                  ipssScore ? 'text-teal-500' : 'text-gray-400'
                                }`} />
                                {errors.triageSymptoms && errors.triageSymptoms[`${index}_ipss`] && (
                                  <p className="text-xs text-red-500 mt-1">{errors.triageSymptoms[`${index}_ipss`]}</p>
                                )}
                              </div>
                            )}

                            <div>
                              <div className="flex gap-2">
                                <div className="flex-1 relative mb-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={duration}
                                    onChange={(e) => handleTriageSymptomFieldChange(index, 'duration', e.target.value)}
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 ${
                                      duration
                                        ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                        : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                    } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                    placeholder=" "
                                  />
                                  <label
                                    className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${
                                      duration
                                        ? '-translate-y-[0.9rem] scale-[0.8] text-teal-600 bg-teal-50 px-1'
                                        : 'text-gray-500'
                                    } peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-teal-600 peer-focus:bg-teal-50 peer-focus:px-1 peer-[&:not(:placeholder-shown)]:-translate-y-[0.9rem] peer-[&:not(:placeholder-shown)]:scale-[0.8] peer-[&:not(:placeholder-shown)]:bg-teal-50 peer-[&:not(:placeholder-shown)]:px-1 motion-reduce:transition-none`}
                                  >
                                    Duration of Symptoms
                                  </label>
                                </div>
                                <div className="relative mb-3" style={{ minWidth: '120px' }}>
                                  <select
                                    value={durationUnit}
                                    onChange={(e) => handleTriageSymptomFieldChange(index, 'durationUnit', e.target.value)}
                                    className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 appearance-none ${
                                      durationUnit
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
                                      durationUnit
                                        ? 'text-teal-600'
                                        : 'text-gray-500'
                                    } peer-focus:text-teal-600 motion-reduce:transition-none`}
                                  >
                                    Unit
                                  </label>
                                  <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none ${
                                    durationUnit ? 'text-teal-500' : 'text-gray-400'
                                  }`} />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Notes field for all symptoms */}
                          <div className={`grid gap-4 ${symptomName === 'Nocturia' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                            {symptomName === 'Nocturia' && (
                              <div className="relative mb-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={frequency}
                                  onChange={(e) => handleTriageSymptomFieldChange(index, 'frequency', e.target.value)}
                                  className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    frequency
                                      ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                      : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                  } focus:placeholder:opacity-100 peer-focus:text-teal-600 [&:not(:placeholder-shown)]:placeholder:opacity-0 motion-reduce:transition-none`}
                                  placeholder=" "
                                />
                                <label
                                  className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs ${
                                    frequency
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
                                value={notes}
                                onChange={(e) => handleTriageSymptomFieldChange(index, 'notes', e.target.value)}
                                rows={3}
                                className={`peer block min-h-[auto] w-full rounded border px-3 py-[0.32rem] text-sm leading-[1.6] outline-none transition-all duration-200 ease-linear resize-none ${
                                  notes
                                    ? 'border-teal-500 focus:border-teal-500 bg-teal-50'
                                    : 'border-gray-300 focus:border-teal-500 bg-teal-50'
                                } focus:placeholder:opacity-100 peer-focus:text-teal-600 motion-reduce:transition-none`}
                                placeholder=" "
                              />
                              <label
                                className={`pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] transition-all duration-200 ease-out text-xs -translate-y-[0.9rem] scale-[0.8] bg-teal-50 px-1 ${
                                  notes
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
                    );
                  })}
                </div>
              </div>
            )}

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

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
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
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPatientModal;

