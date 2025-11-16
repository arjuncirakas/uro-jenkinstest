import React, { useState, useEffect } from 'react';
import { IoClose, IoCalendar } from 'react-icons/io5';
import { FaStethoscope } from 'react-icons/fa';
import { bookingService } from '../services/bookingService';
import { notesService } from '../services/notesService';
import authService from '../services/authService';

const EditSurgeryAppointmentModal = ({ isOpen, onClose, appointment, patient, onUpdate }) => {
  const [formData, setFormData] = useState({
    surgeryDate: '',
    surgeryTime: '',
    surgeryStartTime: '',
    surgeryEndTime: '',
    reason: '',
    rescheduleReason: '',
    priority: 'normal',
    clinicalRationale: '',
    additionalNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Surgery slot selection states
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedStartSlot, setSelectedStartSlot] = useState('');
  const [selectedEndSlot, setSelectedEndSlot] = useState('');

  useEffect(() => {
    if (isOpen && appointment) {
      // Format date for input (YYYY-MM-DD)
      const appointmentDate = appointment.appointmentDate || appointment.appointment_date;
      const formattedDate = appointmentDate 
        ? new Date(appointmentDate).toISOString().split('T')[0]
        : '';
      
      // Format time for input (HH:MM)
      const appointmentTime = appointment.appointmentTime || appointment.appointment_time;
      const formattedTime = appointmentTime 
        ? (appointmentTime.length === 5 ? appointmentTime : appointmentTime.substring(0, 5))
        : '';

      // Extract start and end times from appointment
      let startTime = formattedTime;
      let endTime = '';
      
      // Try to get end time from appointment data or notes
      if (appointment.surgeryEndTime || appointment.surgery_end_time) {
        const endTimeRaw = appointment.surgeryEndTime || appointment.surgery_end_time;
        endTime = endTimeRaw.length === 5 ? endTimeRaw : endTimeRaw.substring(0, 5);
      } else if (appointment.notes) {
        // Try to extract from notes: "Surgery Time: HH:MM - HH:MM"
        const timeRangeMatch = appointment.notes.match(/Surgery Time:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        if (timeRangeMatch) {
          startTime = timeRangeMatch[1];
          endTime = timeRangeMatch[2];
        }
      }

      setFormData({
        surgeryDate: formattedDate,
        surgeryTime: startTime,
        surgeryStartTime: startTime,
        surgeryEndTime: endTime,
        reason: appointment.reason || appointment.surgeryType || '',
        rescheduleReason: '',
        priority: appointment.priority || 'normal',
        clinicalRationale: appointment.clinicalRationale || '',
        additionalNotes: appointment.additionalNotes || ''
      });
      
      // Set slot selections
      setSelectedStartSlot(startTime);
      setSelectedEndSlot(endTime);
      
      setError(null);
    }
  }, [isOpen, appointment]);

  // Fetch available time slots when date is selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!formData.surgeryDate || !isOpen) {
        setAvailableSlots([]);
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        return;
      }

      const urologistId = currentUser.id;
      setLoadingSlots(true);

      try {
        const result = await bookingService.getAvailableTimeSlots(urologistId, formData.surgeryDate, 'urologist');
        if (result.success) {
          const apiSlots = result.data || [];
          // Generate all possible time slots (9:00 AM to 5:00 PM, 30-minute intervals)
          const allSlots = [];
          for (let hour = 9; hour <= 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              // Check if this slot is available from API response
              const apiSlot = apiSlots.find(s => s.time === timeString);
              allSlots.push({
                time: timeString,
                available: apiSlot ? apiSlot.available : false
              });
            }
          }
          setAvailableSlots(allSlots);
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

    fetchAvailableSlots();
  }, [formData.surgeryDate, isOpen]);

  // Reset slot selection when date changes
  useEffect(() => {
    if (formData.surgeryDate && !appointment) {
      setSelectedStartSlot('');
      setSelectedEndSlot('');
    }
  }, [formData.surgeryDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!formData.surgeryDate || !selectedStartSlot || !formData.rescheduleReason) {
        setError('Please fill in all required fields (date, start time, and reason for rescheduling)');
        setLoading(false);
        return;
      }
      if (!selectedEndSlot) {
        setError('Please select both start and end time for the surgery duration');
        setLoading(false);
        return;
      }
      if (selectedEndSlot <= selectedStartSlot) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('User data is incomplete. Please log in again.');
      }

      // Get urologist name
      let urologistName = '';
      if (currentUser.firstName && currentUser.lastName) {
        urologistName = `${currentUser.firstName} ${currentUser.lastName}`;
      } else if (currentUser.first_name && currentUser.last_name) {
        urologistName = `${currentUser.first_name} ${currentUser.last_name}`;
      } else if (currentUser.name) {
        urologistName = currentUser.name;
      } else if (currentUser.username) {
        urologistName = currentUser.username;
      }

      if (!urologistName || urologistName.trim() === '') {
        throw new Error('Urologist name could not be determined. Please update your profile.');
      }

      // Update appointment using reschedule endpoint
      // Include time range in notes
      const timeRangeNote = `Surgery Time: ${selectedStartSlot} - ${selectedEndSlot}`;
      const baseNotes = `Surgery scheduled: ${formData.reason}\nPriority: ${formData.priority}\n${timeRangeNote}\nClinical Rationale: ${formData.clinicalRationale}${formData.additionalNotes ? `\n\nAdditional Notes: ${formData.additionalNotes}` : ''}`;
      
      const updateData = {
        newDate: formData.surgeryDate,
        newTime: selectedStartSlot, // Use start slot as the appointment time
        newDoctorId: currentUser.id,
        appointmentType: 'surgery',
        surgeryType: formData.reason,
        rescheduleReason: formData.rescheduleReason,
        surgeryStartTime: selectedStartSlot,
        surgeryEndTime: selectedEndSlot,
        notes: baseNotes
      };

      const result = await bookingService.rescheduleNoShowAppointment(appointment.id, updateData);

      if (result.success) {
        // Create a reschedule note as a sub-note to the original surgery transfer note
        if (patient?.id) {
          try {
            const formattedNewDate = new Date(formData.surgeryDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            const rescheduleNoteContent = `SURGERY APPOINTMENT RESCHEDULED

New Appointment:
- Date: ${formattedNewDate}
- Time: ${selectedStartSlot} - ${selectedEndSlot}

Reason: ${formData.rescheduleReason || 'Not specified'}`;

            const noteResult = await notesService.addNote(patient.id, {
              noteContent: rescheduleNoteContent,
              noteType: 'clinical'
            });
            
            if (noteResult.success) {
              console.log('✅ Reschedule note created successfully');
            } else {
              console.error('⚠️ Failed to create reschedule note:', noteResult.error);
              // Don't fail the reschedule if note creation fails
            }
          } catch (noteError) {
            console.error('⚠️ Error creating reschedule note:', noteError);
            // Don't fail the reschedule if note creation fails
          }
        }
        
        // Dispatch event to refresh data
        window.dispatchEvent(new CustomEvent('surgery:updated'));
        
        if (onUpdate) {
          onUpdate();
        }
        
        onClose();
      } else {
        setError(result.error || 'Failed to update appointment');
      }
    } catch (err) {
      console.error('Error updating surgery appointment:', err);
      setError(err.message || 'An error occurred while updating the appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-teal-600 to-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <IoCalendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Edit Surgery Appointment
                </h3>
                <p className="text-white/80 text-sm">
                  Reschedule surgery appointment
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <IoClose className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Surgery Pathway Details */}
            <div className="mb-6">
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                    <FaStethoscope className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Surgery Pathway Details</h4>
                    <p className="text-sm text-gray-600">Update surgical pathway information</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Surgery *
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter reason..."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Rationale *
                  </label>
                  <textarea
                    value={formData.clinicalRationale}
                    onChange={(e) => setFormData(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                    placeholder="Provide detailed clinical justification for surgical pathway..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    placeholder="Any additional information or special considerations..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Surgery Scheduling Section */}
            <div className="mb-6 pt-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center mr-3">
                  <IoCalendar className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Reschedule Surgery</h4>
                  <p className="text-sm text-gray-600">Update surgery date, time, and reason</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Surgery Date *
                </label>
                <input
                  type="date"
                  value={formData.surgeryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, surgeryDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                  required
                />
              </div>

              {/* Available Time Slots Selection */}
              {formData.surgeryDate && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Surgery Time Range *
                  </label>
                  {loadingSlots ? (
                    <div className="text-sm text-gray-500 py-4">Loading available slots...</div>
                  ) : (
                    <div>
                      {/* Start Time Selection */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Start Time: {selectedStartSlot || 'Not selected'}
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                          {availableSlots.map((slot) => {
                            const isAvailable = slot.available;
                            const slotTime = slot.time ? slot.time.substring(0, 5) : '';
                            const isSelected = slotTime === selectedStartSlot;
                            const isDisabled = !isAvailable;

                            return (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedStartSlot(slotTime);
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      surgeryTime: slotTime,
                                      surgeryStartTime: slotTime
                                    }));
                                    // Reset end slot if new start is after current end
                                    if (selectedEndSlot && slotTime >= selectedEndSlot) {
                                      setSelectedEndSlot('');
                                      setFormData(prev => ({ ...prev, surgeryEndTime: '' }));
                                    }
                                  }
                                }}
                                disabled={isDisabled}
                                className={`
                                  px-3 py-2 text-xs rounded-md border transition-colors
                                  ${isSelected 
                                    ? 'bg-teal-600 text-white border-teal-600 font-semibold' 
                                    : isDisabled
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-teal-50 hover:border-teal-400'
                                  }
                                `}
                              >
                                {slotTime}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* End Time Selection */}
                      {selectedStartSlot && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            End Time: {selectedEndSlot || 'Not selected'}
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                            {availableSlots.map((slot) => {
                              const isAvailable = slot.available;
                              const slotTime = slot.time ? slot.time.substring(0, 5) : '';
                              const isBeforeStart = slotTime <= selectedStartSlot;
                              const isSelected = slotTime === selectedEndSlot;
                              const isDisabled = !isAvailable || isBeforeStart;

                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  onClick={() => {
                                    if (!isDisabled) {
                                      setSelectedEndSlot(slotTime);
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        surgeryEndTime: slotTime
                                      }));
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={`
                                    px-3 py-2 text-xs rounded-md border transition-colors
                                    ${isSelected 
                                      ? 'bg-orange-600 text-white border-orange-600 font-semibold' 
                                      : isDisabled
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-400'
                                    }
                                  `}
                                >
                                  {slotTime}
                                </button>
                              );
                            })}
                          </div>
                          {selectedStartSlot && !selectedEndSlot && (
                            <p className="text-xs text-amber-600 mt-2">
                              Please select an end time for the surgery duration
                            </p>
                          )}
                        </div>
                      )}

                      {availableSlots.length === 0 && !loadingSlots && (
                        <p className="text-sm text-gray-500 py-4">No available slots for this date</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rescheduling *
                </label>
                <textarea
                  value={formData.rescheduleReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, rescheduleReason: e.target.value }))}
                  placeholder="Enter the reason for rescheduling this surgery appointment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSurgeryAppointmentModal;



