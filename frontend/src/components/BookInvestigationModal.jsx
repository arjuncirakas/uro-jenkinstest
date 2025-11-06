import React, { useState, useRef, useEffect } from 'react';
import { IoClose, IoChevronDown } from 'react-icons/io5';
import ConfirmModal from './ConfirmModal';
import { bookingService } from '../services/bookingService';

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

  // Fetch doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen]);

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
      const result = await bookingService.getAvailableDoctors();
      if (result.success) {
        setDoctors(result.data || []);
      } else {
        console.error('Failed to fetch doctors:', result.error);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
