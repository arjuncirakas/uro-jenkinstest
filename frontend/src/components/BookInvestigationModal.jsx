import React, { useState, useRef, useEffect } from 'react';
import { IoClose, IoChevronDown, IoPrint, IoCloudUpload } from 'react-icons/io5';
import ConfirmModal from './ConfirmModal';
import { bookingService } from '../services/bookingService';
import { consentFormService } from '../services/consentFormService';

const BookInvestigationModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const [consentFormTemplates, setConsentFormTemplates] = useState([]);
  const [loadingConsentForms, setLoadingConsentForms] = useState(false);
  const [mriConsentForm, setMriConsentForm] = useState(null);
  const [trusConsentForm, setTrusConsentForm] = useState(null);
  const [biopsyConsentForm, setBiopsyConsentForm] = useState(null);
  const [uploadedSignedForms, setUploadedSignedForms] = useState({
    mri: null,
    trus: null,
    biopsy: null
  });
  const [uploadingForms, setUploadingForms] = useState({
    mri: false,
    trus: false,
    biopsy: false
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);


  // Fetch available time slots when doctor and date are selected
  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const result = await bookingService.getAvailableTimeSlots(doctorId, date, 'investigation');
      if (result.success) {
        setAvailableSlots(result.data || []);
      } else {
        console.error('Failed to fetch available slots:', result.error);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fetch doctors and consent forms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
      fetchConsentFormTemplates();
    }
  }, [isOpen]);

  // Fetch consent form templates
  const fetchConsentFormTemplates = async () => {
    setLoadingConsentForms(true);
    try {
      const response = await consentFormService.getConsentFormTemplates();
      if (response.success) {
        const templates = response.data || [];
        setConsentFormTemplates(templates);
        
        // Find templates for MRI, TRUS, and Biopsy
        // Check both test_name and procedure_name since templates can be created as either type
        const mriTemplate = templates.find(t => {
          const name = (t.test_name || t.procedure_name || '').toLowerCase();
          return name === 'mri';
        });
        const trusTemplate = templates.find(t => {
          const name = (t.test_name || t.procedure_name || '').toLowerCase();
          return name === 'trus';
        });
        const biopsyTemplate = templates.find(t => {
          const name = (t.test_name || t.procedure_name || '').toLowerCase();
          return name === 'biopsy';
        });
        
        setMriConsentForm(mriTemplate);
        setTrusConsentForm(trusTemplate);
        setBiopsyConsentForm(biopsyTemplate);
      }
    } catch (error) {
      console.error('Error fetching consent form templates:', error);
    } finally {
      setLoadingConsentForms(false);
    }
  };

  // Pre-select assigned doctor when patient data is available
  useEffect(() => {
    if (isOpen && patient && doctors.length > 0) {
      // Check if patient has an assigned urologist
      const assignedDoctorName = patient.assignedUrologist || patient.assigned_urologist;
      
      if (assignedDoctorName) {
        // Find the doctor in the list
        const matchingDoctor = doctors.find(d => d.name === assignedDoctorName);
        
        if (matchingDoctor) {
          console.log(`Pre-selecting assigned doctor for investigation: ${matchingDoctor.name}`);
          setSelectedDoctor(matchingDoctor.name);
          setSelectedDoctorId(matchingDoctor.id);
        }
      }
    }
  }, [isOpen, patient, doctors]);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchAvailableSlots(selectedDoctorId, selectedDate);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctorId, selectedDate]);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      // Fetch only urologists for investigation bookings
      const result = await bookingService.getAvailableUrologists();
      if (result.success) {
        // The service returns urologists array directly in result.data
        const urologistsList = Array.isArray(result.data) ? result.data : [];
        setDoctors(urologistsList);
      } else {
        console.error('Failed to fetch urologists:', result.error);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching urologists:', error);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Find the selected doctor details
      const selectedDoctorData = doctors.find(d => d.name === selectedDoctor);
      
      if (!selectedDoctorData) {
        alert('Selected doctor not found');
        return;
      }

      const investigationData = {
        investigationType: selectedDoctorData.role, // Use doctor's role as investigation type
        investigationName: selectedDoctor,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        notes: notes || ''
      };

      const result = await bookingService.bookInvestigation(patient.id, investigationData);
      
      if (result.success) {
        console.log('Investigation Booked:', result.data);
        
        // Automatically attach consent forms for MRI, TRUS, and Biopsy
        await attachConsentFormsToPatient(patient.id);
        
        // Dispatch event to notify other components to refresh
        window.dispatchEvent(new CustomEvent('investigationBooked', {
          detail: { patientId: patient.id, investigationData: result.data }
        }));
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.data);
        }
        
        // Reset form
        setSelectedDoctor('');
        setSelectedDate('');
        setSelectedTime('');
        setNotes('');
        
        // Close modal
        onClose();
      } else {
        alert(`Failed to book investigation: ${result.error}`);
      }
    } catch (error) {
      console.error('Error booking investigation:', error);
      alert('An error occurred while booking the investigation. Please try again.');
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
    setSelectedDoctor('');
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    setSelectedDoctorId(null);
    setAvailableSlots([]);
  };

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

  // Print consent form with patient details automatically filled
  const handlePrintConsentForm = async (template, testName) => {
    if (!template || !patient) return;

    try {
      if (template.is_auto_generated) {
        // For auto-generated forms, create a printable HTML version with patient details
        const printWindow = window.open('', '_blank');
        const name = template.procedure_name || template.test_name || testName;
        const type = template.procedure_name ? 'Procedure' : 'Test';
        
        // Format date of birth if available
        const dateOfBirth = patient.dateOfBirth || patient.date_of_birth || '';
        const formattedDOB = dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-GB') : '';
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${name} Consent Form</title>
            <style>
              @media print {
                @page { margin: 20mm; }
                body { margin: 0; }
              }
              body {
                font-family: 'Arial', sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                background: white;
              }
              .header {
                text-align: center;
                border-bottom: 3px solid #0d9488;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              h1 {
                color: #0d9488;
                font-size: 28px;
                margin: 0;
                font-weight: 700;
              }
              .subtitle {
                color: #6b7280;
                font-size: 14px;
                margin-top: 5px;
              }
              .section {
                margin-bottom: 30px;
              }
              .patient-info {
                padding: 20px;
                background: #f9fafb;
                border-left: 4px solid #0d9488;
                border-radius: 4px;
              }
              .signature-section {
                margin-top: 40px;
                padding-top: 30px;
                border-top: 2px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CONSENT FORM</h1>
              <p class="subtitle">${type} Consent</p>
            </div>
            <div class="section">
              <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; font-weight: 600;">${name.toUpperCase()}</h2>
              <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
                I hereby give my consent for the ${template.procedure_name ? 'procedure' : 'test'} mentioned above to be performed on me.
              </p>
            </div>
            <div class="patient-info">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Patient Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                <div>
                  <strong style="color: #374151;">Patient Name:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.name || patient.fullName || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Date of Birth:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${formattedDOB || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Hospital Number (UPI):</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.upi || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Age:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.age ? `${patient.age} years` : '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Date:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
            <div class="section">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Procedure/Test Details</h3>
              <p style="color: #4b5563; line-height: 1.8; font-size: 14px; margin-bottom: 15px;">
                I understand that the ${template.procedure_name ? 'procedure' : 'test'} involves:
              </p>
              <ul style="color: #4b5563; line-height: 1.8; font-size: 14px; padding-left: 20px;">
                <li>Explanation of the ${template.procedure_name ? 'procedure' : 'test'} has been provided to me</li>
                <li>I have been informed about the benefits and potential risks</li>
                <li>I have had the opportunity to ask questions</li>
                <li>I understand that I can withdraw my consent at any time</li>
              </ul>
            </div>
            <div class="signature-section">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                  <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Patient Signature:</strong></p>
                  <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                  <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                </div>
                <div>
                  <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Witness Signature:</strong></p>
                  <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                  <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                </div>
              </div>
              <div>
                <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Doctor/Healthcare Provider Signature:</strong></p>
                <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      } else if (template.template_file_url) {
        // For uploaded PDF templates, open for printing
        const printWindow = window.open(template.template_file_url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
      }
    } catch (error) {
      console.error('Error printing consent form:', error);
      alert('Failed to print consent form. Please try again.');
    }
  };


  // Handle signed consent form upload
  const handleUploadSignedForm = async (testType, template, file) => {
    if (!file || !template || !patient) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.type.includes('image')) {
      alert('Please upload a PDF or image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingForms(prev => ({ ...prev, [testType]: true }));

    try {
      // Upload the signed consent form
      const result = await consentFormService.uploadConsentForm(patient.id, template.id, file);
      
      if (result.success) {
        setUploadedSignedForms(prev => ({
          ...prev,
          [testType]: {
            file: file,
            uploaded: true,
            name: file.name
          }
        }));
        alert(`${testType.toUpperCase()} signed consent form uploaded successfully`);
      } else {
        alert(`Failed to upload signed form: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading signed consent form:', error);
      alert('Failed to upload signed consent form. Please try again.');
    } finally {
      setUploadingForms(prev => ({ ...prev, [testType]: false }));
    }
  };

  // Handle file input change
  const handleFileInputChange = (testType, template, event) => {
    const file = event.target.files[0];
    if (file) {
      handleUploadSignedForm(testType, template, file);
    }
    // Reset input
    event.target.value = '';
  };

  // Attach consent forms to patient
  // Note: This is now handled automatically by the backend when investigation is booked
  const attachConsentFormsToPatient = async (patientId) => {
    // The backend automatically attaches consent forms for MRI, TRUS, and Biopsy
    // when an investigation is booked, so we don't need to do anything here
    console.log('Consent forms will be automatically attached by the backend');
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = selectedDoctor !== '' || 
                           selectedDate !== '' || 
                           selectedTime !== '' || 
                           notes.trim() !== '';

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    handleSubmit(e);
  };

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in BookInvestigationModal!');
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

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Book Investigation</h2>
                <p className="text-teal-100 text-sm">{patient?.name}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Information Card */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {patient?.name ? patient.name.split(' ').map(n => n[0]).join('') : 'P'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-gray-900">{patient?.name}</h3>
                {patient?.referredByGP && (
                  <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs rounded-full font-medium">
                    GP Referral
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>UPI: {patient?.upi}</span>
                <span>Age: {patient?.age} • {patient?.gender}</span>
                <span className="text-orange-600 font-medium">PSA: {patient?.psa} ng/mL</span>
              </div>
              {patient?.referredByGP && (
                <div className="mt-1 text-sm text-teal-600 font-medium">
                  Referred by: {patient.referredByGP}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Investigation Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Investigation Details</h3>
                    <p className="text-sm text-gray-600">Configure diagnostic procedures</p>
                  </div>
                </div>
                
                {/* Select Doctor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white cursor-pointer flex items-center justify-between transition-colors hover:border-gray-400"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className={selectedDoctor ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedDoctor || 'Choose a doctor...'}
                      </span>
                      <IoChevronDown 
                        className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {loadingDoctors ? (
                          <div className="px-3 py-2 text-center text-gray-500 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mx-auto mb-1"></div>
                            Loading doctors...
                          </div>
                        ) : !doctors || doctors.length === 0 ? (
                          <div className="px-3 py-2 text-center text-gray-500 text-sm">
                            No doctors available
                          </div>
                        ) : (
                          doctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm transition-colors border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setSelectedDoctor(doctor.name);
                                setSelectedDoctorId(doctor.id);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-gray-900">{doctor.name}</span>
                                <span className="text-teal-600 text-xs">{doctor.specialization}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Select Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={(() => {
                      const now = new Date();
                      return now.getFullYear() + '-' + 
                             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(now.getDate()).padStart(2, '0');
                    })()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors hover:border-gray-400"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-colors hover:border-gray-400"
                    placeholder="Add any notes or special instructions..."
                  />
                </div>
              </div>

              {/* Right Column - Time Selection */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Select Time</h3>
                    <p className="text-sm text-gray-600">Choose your preferred appointment time</p>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-800">Available Time Slots</h4>
                      {selectedTime && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                          <span className="text-sm text-teal-600 font-medium">Selected: {selectedTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                          <span className="text-gray-600 text-sm">Loading time slots...</span>
                        </div>
                      </div>
                    ) : !availableSlots || availableSlots.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {selectedDoctor && selectedDate ? 'No time slots available' : 'Please select a doctor and date'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {availableSlots.map((slot) => {
                          const [hours, minutes] = slot.time.split(':');
                          const hour24 = parseInt(hours, 10);
                          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                          const ampm = hour24 >= 12 ? 'PM' : 'AM';
                          const displayTime = `${hour12}:${minutes}`;
                          const isAvailable = slot.available;
                          const isSelected = selectedTime === slot.time;
                          
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => isAvailable && setSelectedTime(slot.time)}
                              disabled={!isAvailable}
                              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : isAvailable
                                  ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <div className="text-center">
                                <div className="font-semibold">{displayTime}</div>
                                <div className="text-xs opacity-75">{ampm}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {!selectedTime && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-blue-700 font-medium">Please select a time slot to continue</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Consent Forms Section - Full Width */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Required Consent Forms</h4>
              <p className="text-xs text-gray-600 mb-4">
                The following consent forms will be automatically attached to the patient's profile:
              </p>
              <div className="space-y-3">
                {/* MRI Consent Form */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-xs">MRI</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">MRI Consent Form</div>
                        {mriConsentForm ? (
                          <div className="text-xs text-gray-600">
                            {mriConsentForm.is_auto_generated ? 'Auto-generated' : 'Template available'}
                          </div>
                        ) : (
                          <div className="text-xs text-yellow-600">No template found</div>
                        )}
                      </div>
                    </div>
                    {mriConsentForm && (
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {mriConsentForm && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => handlePrintConsentForm(mriConsentForm, 'MRI')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <IoPrint className="h-4 w-4 mr-2" />
                        Print
                      </button>
                      <label className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                        <IoCloudUpload className="h-4 w-4 mr-2" />
                        {uploadedSignedForms.mri ? 'Re-upload' : 'Upload Signed'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileInputChange('mri', mriConsentForm, e)}
                          className="hidden"
                          disabled={uploadingForms.mri}
                        />
                      </label>
                    </div>
                  )}
                  {uploadedSignedForms.mri && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Signed form uploaded: {uploadedSignedForms.mri.name}
                    </div>
                  )}
                </div>

                {/* TRUS Consent Form */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-xs">TRUS</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">TRUS Consent Form</div>
                        {trusConsentForm ? (
                          <div className="text-xs text-gray-600">
                            {trusConsentForm.is_auto_generated ? 'Auto-generated' : 'Template available'}
                          </div>
                        ) : (
                          <div className="text-xs text-yellow-600">No template found</div>
                        )}
                      </div>
                    </div>
                    {trusConsentForm && (
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {trusConsentForm && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => handlePrintConsentForm(trusConsentForm, 'TRUS')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <IoPrint className="h-4 w-4 mr-2" />
                        Print
                      </button>
                      <label className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                        <IoCloudUpload className="h-4 w-4 mr-2" />
                        {uploadedSignedForms.trus ? 'Re-upload' : 'Upload Signed'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileInputChange('trus', trusConsentForm, e)}
                          className="hidden"
                          disabled={uploadingForms.trus}
                        />
                      </label>
                    </div>
                  )}
                  {uploadedSignedForms.trus && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Signed form uploaded: {uploadedSignedForms.trus.name}
                    </div>
                  )}
                </div>

                {/* Biopsy Consent Form */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 font-semibold text-xs">BIO</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Biopsy Consent Form</div>
                        {biopsyConsentForm ? (
                          <div className="text-xs text-gray-600">
                            {biopsyConsentForm.is_auto_generated ? 'Auto-generated' : 'Template available'}
                          </div>
                        ) : (
                          <div className="text-xs text-yellow-600">No template found</div>
                        )}
                      </div>
                    </div>
                    {biopsyConsentForm && (
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {biopsyConsentForm && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => handlePrintConsentForm(biopsyConsentForm, 'Biopsy')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <IoPrint className="h-4 w-4 mr-2" />
                        Print
                      </button>
                      <label className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                        <IoCloudUpload className="h-4 w-4 mr-2" />
                        {uploadedSignedForms.biopsy ? 'Re-upload' : 'Upload Signed'}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileInputChange('biopsy', biopsyConsentForm, e)}
                          className="hidden"
                          disabled={uploadingForms.biopsy}
                        />
                      </label>
                    </div>
                  )}
                  {uploadedSignedForms.biopsy && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Signed form uploaded: {uploadedSignedForms.biopsy.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedDoctor || !selectedDate || !selectedTime}
              className="flex-1 bg-teal-600 text-white py-2.5 px-4 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Book Investigation</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium text-sm"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </div>
            </button>
          </div>
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

export default BookInvestigationModal;
