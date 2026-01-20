import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiArrowRight, FiCheck, FiAlertCircle, FiUserCheck } from 'react-icons/fi';
import { bookingService } from '../services/bookingService';
import SuccessErrorModal from './SuccessErrorModal';

const RescheduleConfirmationModal = ({ isOpen, appointment, newDate, newTime, onConfirm, onCancel }) => {
  const [selectedTime, setSelectedTime] = useState(newTime || '09:00');
  const [selectedDate, setSelectedDate] = useState(newDate || '');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    if (isOpen && appointment) {
      // Use the date directly if it's already in YYYY-MM-DD format
      let formattedDate = newDate || '';

      // If the date is not in the correct format, try to parse it
      if (formattedDate && !formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      setSelectedDate(formattedDate);
      setSelectedTime(newTime || appointment.time);
      setIsConfirming(false);
      setError(null);

      // Load doctors
      loadDoctors();
    }
  }, [isOpen, appointment, newDate, newTime]);

  // Load doctors when modal opens
  const loadDoctors = async () => {
    setLoadingDoctors(true);
    setError(null);
    setDoctors([]); // Initialize as empty array

    try {
      const result = await bookingService.getAvailableDoctors();
      console.log('Doctors result:', result); // Debug log
      if (result.success) {
        const doctorsData = result.data || [];
        console.log('Doctors data:', doctorsData); // Debug log
        setDoctors(doctorsData);

        // Set default doctor if appointment has urologist info
        if (doctorsData.length > 0) {
          let defaultDoctor = null;
          
          // First, try to match by urologist_id if available (most reliable)
          if (appointment.urologist_id || appointment.urologistId || appointment.doctor_id || appointment.doctorId) {
            const urologistId = appointment.urologist_id || appointment.urologistId || appointment.doctor_id || appointment.doctorId;
            defaultDoctor = doctorsData.find(doctor => doctor.id === parseInt(urologistId));
          }
          
          // If no match by ID, try to match by name
          if (!defaultDoctor) {
            // Get urologist name from appointment (try multiple possible fields)
            const appointmentUrologist = appointment.urologist || 
                                        appointment.doctorName || 
                                        appointment.doctor_name || 
                                        appointment.urologist_name || 
                                        '';
            
            if (appointmentUrologist) {
              // Normalize the appointment urologist name (remove "Dr." prefix and trim)
              const normalizedAppointmentUrologist = appointmentUrologist
                .replace(/^Dr\.\s*/i, '')
                .trim()
                .toLowerCase();
              
              // Find matching doctor
              defaultDoctor = doctorsData.find(doctor => {
                // Try different name formats from doctor object
                const doctorFullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
                const doctorName = doctor.name || doctorFullName;
                
                // Normalize doctor names
                const normalizedDoctorFullName = doctorFullName.toLowerCase();
                const normalizedDoctorName = doctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
                
                // Check for exact matches or partial matches
                return normalizedDoctorFullName === normalizedAppointmentUrologist ||
                       normalizedDoctorName === normalizedAppointmentUrologist ||
                       normalizedAppointmentUrologist.includes(normalizedDoctorFullName) ||
                       normalizedDoctorFullName.includes(normalizedAppointmentUrologist) ||
                       // Check if first name or last name matches individually
                       (doctor.first_name && normalizedAppointmentUrologist.includes(doctor.first_name.toLowerCase())) ||
                       (doctor.last_name && normalizedAppointmentUrologist.includes(doctor.last_name.toLowerCase()));
              });
            }
          }
          
          if (defaultDoctor) {
            console.log('Default doctor found:', defaultDoctor); // Debug log
            setSelectedDoctor(defaultDoctor);
          } else {
            console.log('No matching doctor found for appointment:', appointment); // Debug log
          }
        }
      } else {
        setError(result.error || 'Failed to load doctors');
        setDoctors([]); // Ensure it's an array even on error
      }
    } catch (error) {
      setError('Failed to load doctors');
      setDoctors([]); // Ensure it's an array even on error
      console.error('Error loading doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Load available time slots when doctor or date changes
  const loadAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) {
      console.warn('[RescheduleConfirmationModal] Cannot load slots - missing doctorId or date:', { doctorId, date });
      return;
    }

    console.log('[RescheduleConfirmationModal] Fetching available slots for doctor:', doctorId, 'date:', date);
    setLoadingSlots(true);
    setError(null);
    setAvailableSlots([]); // Initialize as empty array

    try {
      const result = await bookingService.getAvailableTimeSlots(doctorId, date, appointment?.type?.toLowerCase());
      console.log('[RescheduleConfirmationModal] Available slots result:', result);
      if (result.success) {
        const slots = result.data || [];
        console.log('[RescheduleConfirmationModal] Loaded', slots.length, 'slots. Available:', slots.filter(s => s.available).length);
        setAvailableSlots(slots);
      } else {
        console.error('[RescheduleConfirmationModal] Failed to load slots:', result.error);
        setError(result.error || 'Failed to load available slots');
        setAvailableSlots([]); // Ensure it's an array even on error
      }
    } catch (error) {
      console.error('[RescheduleConfirmationModal] Error loading available slots:', error);
      setError('Failed to load available slots');
      setAvailableSlots([]); // Ensure it's an array even on error
    } finally {
      setLoadingSlots(false);
    }
  };

  // Load slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadAvailableSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);

  if (!isOpen || !appointment) return null;

  // Generate all possible time slots (8:00 AM to 5:30 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    const slotsData = Array.isArray(availableSlots) ? availableSlots : [];

    // If we haven't loaded slots yet or loading failed, mark all as available (let backend validate)
    // This prevents false positives when API hasn't been called or failed
    const hasLoadedSlots = !loadingSlots && slotsData.length > 0;

    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        let isAvailable = true; // Default to available if we don't have data
        
        if (hasLoadedSlots) {
          // Only check availability if we have successfully loaded slots
          const slotData = slotsData.find(slot => slot.time === timeString);
          isAvailable = slotData ? slotData.available : false;
        }
        // If slots are still loading or we have no data, default to available (backend will validate)
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
      }
    }
    return slots;
  };

  const allTimeSlots = generateTimeSlots();

  const handleConfirm = async () => {
    if (!selectedDoctor) {
      setError('Please select a urologist');
      return;
    }

    // Only validate frontend if we have successfully loaded slots
    // If slots are still loading or failed to load, let the backend handle validation
    if (!loadingSlots && availableSlots.length > 0) {
      const selectedSlot = allTimeSlots.find(slot => slot.time === selectedTime);
      if (selectedSlot && !selectedSlot.available) {
        setErrorModal({
          isOpen: true,
          message: `The selected time slot (${formatTime(selectedTime)}) is already booked. Appointments must never overlap. Please select an available time slot to avoid scheduling conflicts.`
        });
        return;
      }
    }
    // If slots haven't loaded yet or loading failed, proceed and let backend validate
    // This prevents false positives when API hasn't been called or failed

    setIsConfirming(true);
    setError(null);

    try {
      // Determine appointment type - preserve original type based on typeColor or type field
      // This ensures investigation appointments (purple) stay as investigation and 
      // urologist consultations (teal) stay as urologist when rescheduled
      let appointmentType = 'urologist'; // default

      if (appointment.typeColor === 'purple') {
        appointmentType = 'investigation';
      } else if (appointment.typeColor === 'teal') {
        appointmentType = 'urologist';
      } else {
        // Fallback to checking type field
        const typeLabel = (appointment.type || '').toLowerCase();
        if (typeLabel.includes('investigation')) {
          appointmentType = 'investigation';
        } else {
          appointmentType = 'urologist';
        }
      }

      // Call the API to reschedule the appointment
      const result = await bookingService.rescheduleNoShowAppointment(appointment.id, {
        newDate: selectedDate,
        newTime: selectedTime,
        newDoctorId: selectedDoctor.id,
        appointmentType: appointmentType
      });

      if (result.success) {
        // Call the parent callback with the reschedule data
        onConfirm(appointment.id, selectedDate, selectedTime, selectedDoctor);
        // Close the modal after successful reschedule
        setTimeout(() => {
          onCancel();
        }, 1000);
      } else {
        // Show error message - backend will return 409 for conflicts
        const errorMessage = result.error || 'Failed to reschedule appointment';
        if (errorMessage.includes('already booked') || errorMessage.includes('overlapping')) {
          setErrorModal({
            isOpen: true,
            message: errorMessage
          });
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setError('Failed to reschedule appointment');
    } finally {
      setIsConfirming(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] border border-gray-200 flex flex-col">

        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Reschedule Appointment</h3>
              <p className="text-teal-50 text-sm mt-0.5">Confirm the new date and time</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <FiX className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Patient Information */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                <FiUser className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">{appointment.patientName}</h4>
              </div>
            </div>
          </div>

          {/* Current vs New Appointment Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Current Appointment */}
            <div className="border-2 border-red-200 bg-red-50/50 rounded p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900 text-sm">Current Appointment</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FiCalendar className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiClock className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Time</p>
                    <p className="text-sm font-medium text-gray-900">{formatTime(appointment.time)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded mt-0.5 ${
                    appointment.typeColor === 'orange' ? 'bg-orange-500' :
                    appointment.typeColor === 'teal' ? 'bg-teal-500' :
                    appointment.typeColor === 'green' ? 'bg-green-500' :
                    appointment.typeColor === 'blue' ? 'bg-blue-500' :
                    appointment.typeColor === 'purple' ? 'bg-purple-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('surgery') ? 'bg-orange-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('investigation') ? 'bg-purple-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('mdt') ? 'bg-green-500' :
                    'bg-teal-500'
                  }`}></div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Type</p>
                    <p className="text-sm font-medium text-gray-900">{appointment.type}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* New Appointment */}
            <div className="border-2 border-green-200 bg-green-50/50 rounded p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900 text-sm">New Appointment</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FiCalendar className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedDate ? formatDate(selectedDate) : 'Select date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiUserCheck className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Urologist</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : 'Select urologist'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiClock className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Time</p>
                    <p className="text-sm font-medium text-gray-900">{formatTime(selectedTime)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded mt-0.5 ${
                    appointment.typeColor === 'orange' ? 'bg-orange-500' :
                    appointment.typeColor === 'teal' ? 'bg-teal-500' :
                    appointment.typeColor === 'green' ? 'bg-green-500' :
                    appointment.typeColor === 'blue' ? 'bg-blue-500' :
                    appointment.typeColor === 'purple' ? 'bg-purple-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('surgery') ? 'bg-orange-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('investigation') ? 'bg-purple-500' :
                    (appointment.type || appointment.appointment_type || '').toLowerCase().includes('mdt') ? 'bg-green-500' :
                    'bg-teal-500'
                  }`}></div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Type</p>
                    <p className="text-sm font-medium text-gray-900">{appointment.type}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-xs font-medium">Rescheduling to</span>
              <FiArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Date, Doctor and Time Selection */}
          <div className="border border-gray-200 rounded p-5 bg-white">
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Select New Date, Urologist & Time</h4>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* New Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const selected = e.target.value;
                    // Validate that selected date is not in the past
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selectedDateObj = new Date(selected);
                    selectedDateObj.setHours(0, 0, 0, 0);

                    if (selectedDateObj < today) {
                      setError('Cannot reschedule appointments to a past date. Please select today or a future date.');
                      return;
                    }
                    setError(null);
                    setSelectedDate(selected);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  min={(() => {
                    const now = new Date();
                    return now.getFullYear() + '-' +
                      String(now.getMonth() + 1).padStart(2, '0') + '-' +
                      String(now.getDate()).padStart(2, '0');
                  })()}
                />
              </div>

              {/* Doctor Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Urologist
                </label>
                {loadingDoctors ? (
                  <div className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm bg-gray-50 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading urologists...
                  </div>
                ) : doctors && Array.isArray(doctors) && doctors.length > 0 ? (
                  <select
                    value={selectedDoctor?.id || ''}
                    onChange={(e) => {
                      const doctor = doctors.find(d => d.id === parseInt(e.target.value));
                      setSelectedDoctor(doctor);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select a urologist</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm bg-gray-50 text-gray-500">
                    No urologists available
                  </div>
                )}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Available Time Slots
              </label>
              {loadingSlots ? (
                <div className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm bg-gray-50 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  Loading available slots...
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                  {allTimeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => {
                        // Only block if we have loaded slots and this slot is marked unavailable
                        // If slots are still loading, allow selection (backend will validate)
                        if (loadingSlots || availableSlots.length === 0) {
                          // Slots not loaded yet, allow selection
                          setSelectedTime(slot.time);
                          setError(null);
                        } else if (slot.available) {
                          setSelectedTime(slot.time);
                          setError(null); // Clear any previous errors
                        } else {
                          // Only show error if we have confirmed this slot is unavailable
                          setErrorModal({
                            isOpen: true,
                            message: `The time slot ${formatTime(slot.time)} is already booked. Appointments must never overlap. Please select an available time slot to avoid scheduling conflicts.`
                          });
                        }
                      }}
                      disabled={!slot.available}
                      className={`px-3 py-2 text-xs rounded transition-colors ${selectedTime === slot.time
                          ? 'bg-teal-600 text-white'
                          : slot.available
                            ? 'bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        } border ${selectedTime === slot.time
                          ? 'border-teal-600'
                          : slot.available
                            ? 'border-gray-200'
                            : 'border-gray-100'
                        }`}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              )}
              {!loadingSlots && allTimeSlots.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {!selectedDoctor ? 'Please select a urologist and date to view available time slots' : 'No time slots available for the selected date'}
                </div>
              )}
            </div>
          </div>

          {/* Appointment Notes */}
          {appointment.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-blue-900 mb-1">Appointment Notes</h4>
                  <p className="text-sm text-blue-800">{appointment.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedDate && selectedDoctor && selectedTime ? (
              <span className="flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-green-600" />
                Ready to confirm
              </span>
            ) : (
              <span>Please select date, urologist and time</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isConfirming}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedDoctor || !selectedTime || isConfirming}
              className="px-5 py-2 text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-2"
            >
              {isConfirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <SuccessErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
        type="error"
      />
    </div>
  );
};

export default RescheduleConfirmationModal;
