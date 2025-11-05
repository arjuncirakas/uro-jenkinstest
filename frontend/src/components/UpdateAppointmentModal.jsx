import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiClock, FiUser, FiFileText } from 'react-icons/fi';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { bookingService } from '../services/bookingService';

const UpdateAppointmentModal = ({ isOpen, onClose, patient, onSuccess, appointmentType = 'urologist' }) => {
  // Pre-populate with existing appointment details
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [urologists, setUrologists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available urologists
  useEffect(() => {
    const fetchUrologists = async () => {
      setLoading(true);
      try {
        const result = await bookingService.getAvailableUrologists();
        if (result.success) {
          // Transform the data to ensure we have first_name and last_name
          const transformedUrologists = (result.data || []).map(urologist => {
            // If API returns 'name' field, split it into first_name and last_name
            if (urologist.name && !urologist.first_name && !urologist.last_name) {
              const nameParts = urologist.name.trim().split(' ');
              return {
                ...urologist,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || ''
              };
            }
            // Otherwise, use existing fields or provide defaults
            return {
              ...urologist,
              first_name: urologist.first_name || '',
              last_name: urologist.last_name || ''
            };
          });
          setUrologists(transformedUrologists);
        }
      } catch (err) {
        console.error('Error fetching urologists:', err);
        setUrologists([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchUrologists();
    }
  }, [isOpen]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!patient) return false;
    
    const originalDoctor = patient.surgeon || patient.assignedUrologist || patient.currentDoctor || '';
    const originalDate = patient.surgeryDate && patient.surgeryDate !== 'TBD' ? patient.surgeryDate : '';
    const originalTime = patient.surgeryTime && patient.surgeryTime !== 'TBD' ? patient.surgeryTime : '';
    const originalSurgeryType = patient.surgeryType && patient.surgeryType !== 'TBD' ? patient.surgeryType : '';
    const originalNotes = patient.notes || patient.appointmentNotes || '';
    
    return selectedDoctor !== originalDoctor ||
           selectedDate !== originalDate ||
           selectedTime !== originalTime ||
           surgeryType !== originalSurgeryType ||
           notes !== originalNotes;
  };

  // Update form when patient or urologists change
  useEffect(() => {
    if (patient && isOpen && !loading && urologists.length > 0) {
      // Set default doctor to assigned urologist (surgeon) if available
      const assignedUrologistName = patient.surgeon || patient.assignedUrologist || '';
      
      // Find the urologist in the list
      if (assignedUrologistName) {
        const assignedUrologist = urologists.find(u => {
          const firstName = u.first_name || '';
          const lastName = u.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const assignedName = assignedUrologistName || '';
          
          // Try exact match first, then partial match
          if (!fullName || !assignedName) return false;
          
          return fullName.toLowerCase() === assignedName.toLowerCase() || 
                 fullName.toLowerCase().includes(assignedName.toLowerCase()) ||
                 assignedName.toLowerCase().includes(firstName.toLowerCase()) || 
                 assignedName.toLowerCase().includes(lastName.toLowerCase());
        });
        
        if (assignedUrologist) {
          const firstName = assignedUrologist.first_name || '';
          const lastName = assignedUrologist.last_name || '';
          setSelectedDoctor(`${firstName} ${lastName}`.trim());
          setSelectedDoctorId(assignedUrologist.id);
        } else {
          // If exact match not found, use first urologist
          const firstName = urologists[0].first_name || '';
          const lastName = urologists[0].last_name || '';
          setSelectedDoctor(`${firstName} ${lastName}`.trim());
          setSelectedDoctorId(urologists[0].id);
        }
      } else {
        // No assigned urologist, use first one
        const firstName = urologists[0].first_name || '';
        const lastName = urologists[0].last_name || '';
        setSelectedDoctor(`${firstName} ${lastName}`.trim());
        setSelectedDoctorId(urologists[0].id);
      }
      
      // Set appointment details if exists
      if (patient.hasSurgeryAppointment && patient.surgeryDate && patient.surgeryDate !== 'TBD') {
        setSelectedDate(patient.surgeryDate);
        setSelectedTime(patient.surgeryTime && patient.surgeryTime !== 'TBD' ? patient.surgeryTime : '');
        setSurgeryType(patient.surgeryType && patient.surgeryType !== 'TBD' ? patient.surgeryType : '');
      } else {
        // Default to today's date
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        setSurgeryType('');
      }
      
      setNotes(patient.notes || '');
    }
  }, [patient, isOpen, urologists, loading]);

  const getPathwayStyle = (pathway) => {
    switch (pathway) {
      case 'OPD Queue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Active Surveillance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Surgical Pathway':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Post-Op Follow-up':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!selectedDoctorId || !selectedDate || !selectedTime) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate surgery type for surgery appointments
    if (appointmentType === 'surgery' && !surgeryType) {
      setError('Please specify the surgery type');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (patient?.hasSurgeryAppointment && patient?.surgeryAppointmentId) {
        // Update existing appointment (reschedule)
        const result = await bookingService.rescheduleNoShowAppointment(
          patient.surgeryAppointmentId,
          {
            newDate: selectedDate,
            newTime: selectedTime,
            newDoctorId: selectedDoctorId,
            surgeryType: appointmentType === 'surgery' ? surgeryType : null,
            notes: notes
          }
        );

        if (result.success) {
          // Dispatch event if it's a surgery appointment
          if (appointmentType === 'surgery') {
            window.dispatchEvent(new CustomEvent('surgery:updated'));
          }
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(result.error || 'Failed to update appointment');
        }
      } else {
        // Book new appointment
        const result = await bookingService.bookUrologistAppointment(patient.id, {
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          urologistId: selectedDoctorId,
          urologistName: selectedDoctor,
          surgeryType: appointmentType === 'surgery' ? surgeryType : null,
          notes: notes,
          appointmentType: appointmentType === 'surgery' ? 'surgery' : 'urologist'
        });

        if (result.success) {
          // Dispatch event if it's a surgery appointment
          if (appointmentType === 'surgery') {
            window.dispatchEvent(new CustomEvent('surgery:updated'));
          }
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(result.error || 'Failed to book appointment');
        }
      }
    } catch (err) {
      console.error('Error booking/updating appointment:', err);
      setError('Failed to save appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Check if there are unsaved changes before closing
    if (hasUnsavedChanges()) {
      setShowConfirmModal(true);
    } else {
      // Reset to original values and close
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    const assignedUrologistName = patient?.surgeon || patient?.assignedUrologist || '';
    if (urologists.length > 0 && assignedUrologistName) {
      const assignedUrologist = urologists.find(u => {
        const firstName = u.first_name || '';
        const lastName = u.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName === assignedUrologistName || 
               assignedUrologistName.includes(firstName) || 
               assignedUrologistName.includes(lastName);
      });
      if (assignedUrologist) {
        const firstName = assignedUrologist.first_name || '';
        const lastName = assignedUrologist.last_name || '';
        setSelectedDoctor(`${firstName} ${lastName}`.trim());
        setSelectedDoctorId(assignedUrologist.id);
      }
    }
    setSelectedDate(patient?.surgeryDate && patient.surgeryDate !== 'TBD' ? patient.surgeryDate : '');
    setSelectedTime(patient?.surgeryTime && patient.surgeryTime !== 'TBD' ? patient.surgeryTime : '');
    setSurgeryType(patient?.surgeryType && patient.surgeryType !== 'TBD' ? patient.surgeryType : '');
    setNotes(patient?.notes || '');
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

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        // Call handleClose which will check for unsaved changes
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDoctor, selectedDate, selectedTime, surgeryType, notes]);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        
        {/* Modal Header - Simplified */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {patient?.hasSurgeryAppointment ? 'Update Appointment' : 'Book Appointment'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {patient?.hasSurgeryAppointment ? 'Modify existing appointment details' : 'Schedule a new surgery appointment'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Card - Cleaner Design */}
        <div className="px-6 py-4 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {getInitials(patient?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base">{patient?.name}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span>{patient?.age} years</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>PSA {patient?.latestPsa} ng/mL</span>
              </div>
            </div>
            <span className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${getPathwayStyle(patient?.pathway)}`}>
              {patient?.pathway}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Select Doctor */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiUser className="w-4 h-4 text-teal-600" />
              Select Doctor
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedDoctor}
                onChange={(e) => {
                  const selected = urologists.find(u => {
                    const firstName = u.first_name || '';
                    const lastName = u.last_name || '';
                    return `${firstName} ${lastName}`.trim() === e.target.value;
                  });
                  setSelectedDoctor(e.target.value);
                  setSelectedDoctorId(selected?.id || null);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 appearance-none text-gray-900"
                required
                disabled={loading}
              >
                <option value="" className="text-gray-500">Choose a doctor...</option>
                {loading ? (
                  <option>Loading doctors...</option>
                ) : (
                  urologists.map((urologist) => {
                    const firstName = urologist.first_name || '';
                    const lastName = urologist.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    return (
                      <option 
                        key={urologist.id} 
                        value={fullName}
                      >
                        {fullName}
                      </option>
                    );
                  })
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Surgery Type Field (only for surgery appointments) */}
          {appointmentType === 'surgery' && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiFileText className="w-4 h-4 text-teal-600" />
                Surgery Type
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={surgeryType}
                  onChange={(e) => setSurgeryType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 appearance-none text-gray-900"
                  required
                >
                  <option value="">Select surgery type...</option>
                  <option value="Robot-assisted Laparoscopic Prostatectomy">Robot-assisted Laparoscopic Prostatectomy</option>
                  <option value="Radical Prostatectomy">Radical Prostatectomy</option>
                  <option value="Transurethral Resection of Prostate (TURP)">Transurethral Resection of Prostate (TURP)</option>
                  <option value="Laparoscopic Partial Nephrectomy">Laparoscopic Partial Nephrectomy</option>
                  <option value="Radical Nephrectomy">Radical Nephrectomy</option>
                  <option value="Cystoscopy with Biopsy">Cystoscopy with Biopsy</option>
                  <option value="Transurethral Resection of Bladder Tumor (TURBT)">Transurethral Resection of Bladder Tumor (TURBT)</option>
                  <option value="Partial Cystectomy">Partial Cystectomy</option>
                  <option value="Radical Cystectomy">Radical Cystectomy</option>
                  <option value="Ureteroscopy">Ureteroscopy</option>
                  <option value="Percutaneous Nephrolithotomy (PCNL)">Percutaneous Nephrolithotomy (PCNL)</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Date and Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Select Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="w-4 h-4 text-teal-600" />
                Select Date
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-gray-900"
                required
              />
            </div>

            {/* Selected Time Display */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiClock className="w-4 h-4 text-teal-600" />
                Selected Time
              </label>
              <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 flex items-center justify-between">
                <span>{selectedTime || 'No time selected'}</span>
                {selectedTime && (
                  <button
                    type="button"
                    onClick={() => setSelectedTime('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Available Time Slots
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                    selectedTime === time
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiFileText className="w-4 h-4 text-teal-600" />
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none text-gray-900"
              placeholder="Add symptoms, special instructions, or other relevant information..."
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Optional: Include any important details for this appointment
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!selectedDoctorId || !selectedDate || !selectedTime || isSubmitting}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white px-4 py-2.5 rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            >
              <FiCalendar className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : (patient?.hasSurgeryAppointment ? 'Update Appointment' : 'Book Appointment')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
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

export default UpdateAppointmentModal;
