import React, { useState, useRef, useEffect } from 'react';
import { IoClose, IoChevronDown } from 'react-icons/io5';
import { bookingService } from '../services/bookingService';

const AddScheduleModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [formData, setFormData] = useState({
    selectedUrologist: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'consultation',
    notes: ''
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urologists, setUrologists] = useState([]);
  const [loadingUrologists, setLoadingUrologists] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedUrologistId, setSelectedUrologistId] = useState(null);

  // Fetch available time slots when urologist and date are selected
  const fetchAvailableSlots = async (urologistId, date) => {
    if (!urologistId || !date) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const result = await bookingService.getAvailableTimeSlots(urologistId, date, 'urologist');
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

  // Fetch urologists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUrologists();
    }
  }, [isOpen]);

  // Pre-select assigned urologist when patient data is available
  useEffect(() => {
    if (isOpen && patient && urologists.length > 0) {
      // Check if patient has an assigned urologist
      const assignedUrologistName = patient.assignedUrologist || patient.assigned_urologist;
      
      if (assignedUrologistName) {
        // Find the urologist in the list
        const matchingUrologist = urologists.find(u => u.name === assignedUrologistName);
        
        if (matchingUrologist) {
          console.log(`Pre-selecting assigned urologist: ${matchingUrologist.name}`);
          setFormData(prev => ({
            ...prev,
            selectedUrologist: matchingUrologist.name
          }));
          setSelectedUrologistId(matchingUrologist.id);
        }
      }
    }
  }, [isOpen, patient, urologists]);

  // Fetch available slots when urologist or date changes
  useEffect(() => {
    if (selectedUrologistId && formData.appointmentDate) {
      fetchAvailableSlots(selectedUrologistId, formData.appointmentDate);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedUrologistId, formData.appointmentDate]);

  const fetchUrologists = async () => {
    setLoadingUrologists(true);
    try {
      const result = await bookingService.getAvailableUrologists();
      if (result.success) {
        setUrologists(Array.isArray(result.data) ? result.data : []);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    const newErrors = {};
    
    if (!formData.selectedUrologist) {
      newErrors.selectedUrologist = 'Please select a urologist';
    }
    
    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Appointment date is required';
    }
    
    if (!formData.appointmentTime) {
      newErrors.appointmentTime = 'Please select an appointment time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Find the selected urologist details
      const selectedUrologistData = urologists.find(u => u.name === formData.selectedUrologist);
      
      if (!selectedUrologistData) {
        setErrors({ selectedUrologist: 'Selected urologist not found' });
        return;
      }

      const appointmentData = {
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        urologistId: selectedUrologistData.id,
        urologistName: formData.selectedUrologist,
        notes: formData.notes || ''
      };

      const result = await bookingService.bookUrologistAppointment(patient.id, appointmentData);
      
      if (result.success) {
        console.log('Urologist Appointment Booked:', result.data);
        
        // Dispatch event to notify other components to refresh
        window.dispatchEvent(new CustomEvent('appointment:booked', {
          detail: { patientId: patient.id, appointmentData: result.data }
        }));
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.data);
        }
        
        // Reset form
        setFormData({
          selectedUrologist: '',
          appointmentDate: '',
          appointmentTime: '',
          appointmentType: 'consultation',
          notes: ''
        });
        setErrors({});
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to book appointment' });
      }
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      setErrors({ submit: 'An error occurred while booking the appointment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      selectedUrologist: '',
      appointmentDate: '',
      appointmentTime: '',
      appointmentType: 'consultation',
      notes: ''
    });
    setErrors({});
    setSelectedUrologistId(null);
    setAvailableSlots([]);
    onClose();
  };

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Book Urologist Appointment</h2>
                <p className="text-teal-100 text-sm">{patient?.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Information Card */}
        {patient && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {patient.name ? patient.name.split(' ').map(n => n[0]).join('') : 'P'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900">{patient.name}</h3>
                  {patient.referredByGP && (
                    <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs rounded-full font-medium">
                      GP Referral
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>UPI: {patient.upi}</span>
                  <span>Age: {patient.age} • {patient.gender}</span>
                  <span className="text-orange-600 font-medium">PSA: {patient.psa} ng/mL</span>
                </div>
                {patient.referredByGP && (
                  <div className="mt-1 text-sm text-teal-600 font-medium">
                    Referred by: {patient.referredByGP}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Appointment Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Appointment Details</h3>
                    <p className="text-sm text-gray-600">Configure consultation details</p>
                  </div>
                </div>
              
                {/* Select Urologist */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Urologist <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white cursor-pointer flex items-center justify-between transition-colors hover:border-gray-400 ${
                        errors.selectedUrologist ? 'border-red-300 bg-red-50' : ''
                      }`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className={formData.selectedUrologist ? 'text-gray-900' : 'text-gray-500'}>
                        {formData.selectedUrologist || 'Choose a urologist...'}
                      </span>
                      <IoChevronDown 
                        className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {loadingUrologists ? (
                          <div className="px-3 py-2 text-center text-gray-500 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mx-auto mb-1"></div>
                            Loading urologists...
                          </div>
                        ) : !urologists || !Array.isArray(urologists) || urologists.length === 0 ? (
                          <div className="px-3 py-2 text-center text-gray-500 text-sm">
                            No urologists available
                          </div>
                        ) : (
                          urologists.map((urologist) => (
                            <div
                              key={urologist.id}
                              className="px-3 py-2 cursor-pointer text-sm transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between hover:bg-teal-50"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, selectedUrologist: urologist.name }));
                                setSelectedUrologistId(urologist.id);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-gray-900">{urologist.name}</span>
                              </div>
                              <span className="text-teal-600 text-xs">Urologist</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {errors.selectedUrologist && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.selectedUrologist}
                    </p>
                  )}
                </div>

                {/* Select Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    min={(() => {
                      const now = new Date();
                      return now.getFullYear() + '-' + 
                             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(now.getDate()).padStart(2, '0');
                    })()}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors hover:border-gray-400 ${
                      errors.appointmentDate ? 'border-red-300 bg-red-50' : ''
                    }`}
                    required
                  />
                  {errors.appointmentDate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.appointmentDate}
                    </p>
                  )}
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Type
                  </label>
                  <select
                    name="appointmentType"
                    value={formData.appointmentType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors hover:border-gray-400"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="urgent">Urgent</option>
                    <option value="routine">Routine Check</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
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
                      {formData.appointmentTime && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                          <span className="text-sm text-teal-600 font-medium">Selected: {formData.appointmentTime}</span>
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
                    ) : !availableSlots || !Array.isArray(availableSlots) || availableSlots.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {formData.selectedUrologist && formData.appointmentDate ? 'No time slots available' : 'Please select a urologist and date'}
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
                          const isSelected = formData.appointmentTime === slot.time;
                          
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => isAvailable && setFormData(prev => ({ ...prev, appointmentTime: slot.time }))}
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
                    
                    {!formData.appointmentTime && (
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
                
                {errors.appointmentTime && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.appointmentTime}
                  </p>
                )}
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
              disabled={!formData.selectedUrologist || !formData.appointmentDate || !formData.appointmentTime}
              className="flex-1 bg-teal-600 text-white py-2.5 px-4 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Book Appointment</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleClose}
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
    </>
  );
};

export default AddScheduleModal;
