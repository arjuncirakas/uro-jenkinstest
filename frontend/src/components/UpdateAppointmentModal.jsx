import React, { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiClock, FiUser, FiFileText } from 'react-icons/fi';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { bookingService } from '../services/bookingService';
import { investigationService } from '../services/investigationService';

const UpdateAppointmentModal = ({ isOpen, onClose, patient, onSuccess, appointmentType = 'urologist' }) => {
  // Pre-populate with existing appointment details
  const [appointmentTypeSelected, setAppointmentTypeSelected] = useState('urologist'); // 'urologist' or 'investigation'
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
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [latestPsa, setLatestPsa] = useState(null);
  const [loadingPsa, setLoadingPsa] = useState(false);

  // Extract patient name from various possible property names
  useEffect(() => {
    if (patient) {
      const name = patient.name || 
                   patient.patientName || 
                   patient.fullName ||
                   (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null) ||
                   (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
                   'Unknown Patient';
      setPatientName(name);
    } else {
      setPatientName('');
    }
  }, [patient]);

  // Fetch latest PSA value
  useEffect(() => {
    const fetchLatestPsa = async () => {
      if (!patient?.id || !isOpen) {
        setLatestPsa(null);
        return;
      }

      // First, check if PSA is already in patient object
      const psaFromPatient = patient.psa || 
                            patient.latestPsa || 
                            patient.initial_psa || 
                            patient.initialPSA;
      
      if (psaFromPatient) {
        setLatestPsa(psaFromPatient);
        return;
      }

      // If not in patient object, fetch from investigation results
      setLoadingPsa(true);
      try {
        const result = await investigationService.getInvestigationResults(patient.id, 'psa');
        if (result.success && result.data && result.data.results && result.data.results.length > 0) {
          // Get the most recent PSA result
          const latestResult = result.data.results[0];
          setLatestPsa(latestResult.result || latestResult.numericValue);
        } else {
          // Fallback to initial PSA if available
          setLatestPsa(patient.initial_psa || patient.initialPSA || null);
        }
      } catch (err) {
        console.error('Error fetching latest PSA:', err);
        // Fallback to initial PSA if available
        setLatestPsa(patient.initial_psa || patient.initialPSA || null);
      } finally {
        setLoadingPsa(false);
      }
    };

    if (isOpen && patient?.id) {
      fetchLatestPsa();
    }
  }, [isOpen, patient?.id, patient?.psa, patient?.latestPsa, patient?.initial_psa, patient?.initialPSA]);

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

  // Helper function to check if a time slot is in the past
  const isTimeInPast = (date, time) => {
    if (!date || !time) return false;
    
    const today = new Date();
    const selectedDateObj = new Date(date);
    
    // Reset time to midnight for date comparison
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
    
    // If selected date is in the past, time is definitely in the past
    if (selectedDateOnly < todayDate) {
      return true;
    }
    
    // If selected date is today, check if time has passed
    if (selectedDateOnly.getTime() === todayDate.getTime()) {
      const [hours, minutes] = time.split(':').map(Number);
      const selectedDateTime = new Date(today);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      return selectedDateTime < today;
    }
    
    return false;
  };

  // Fetch available time slots when doctor and date are selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDoctorId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      setLoadingSlots(true);
      try {
        // Use the selected appointment type for fetching slots
        const slotType = appointmentTypeSelected === 'investigation' ? 'investigation' : 'urologist';
        const result = await bookingService.getAvailableTimeSlots(selectedDoctorId, selectedDate, slotType);
        if (result.success) {
          const apiSlots = result.data || [];
          // For surgery appointments, generate all slots (9:00 AM to 5:00 PM, 30-minute intervals)
          if (appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') {
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
            setAvailableSlots(apiSlots);
          }
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
  }, [selectedDoctorId, selectedDate, appointmentTypeSelected]);

  // Clear selected time if it's in the past when date changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      if (isTimeInPast(selectedDate, selectedTime)) {
        console.log('Selected time is in the past, clearing selection');
        setSelectedTime('');
      }
    }
    // Reset time when date changes for surgery appointments (only if not loading existing data)
    if ((appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') && selectedDate) {
      if (!patient?.hasSurgeryAppointment || !patient?.surgeryDate) {
        setSelectedTime('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Update time when appointment type changes to surgery and patient has surgery data
  useEffect(() => {
    if ((appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') && 
        patient?.hasSurgeryAppointment && 
        patient?.surgeryDate && 
        patient.surgeryDate !== 'TBD') {
      
      // Get surgery time - prefer surgeryStartTime if available, otherwise use surgeryTime
      const surgeryStartTime = patient.surgeryStartTime || patient.surgeryTime || '';
      const normalizedSurgeryTime = surgeryStartTime && surgeryStartTime !== 'TBD' ? surgeryStartTime.substring(0, 5) : '';
      
      if (normalizedSurgeryTime) {
        setSelectedTime(normalizedSurgeryTime);
      }
    }
  }, [appointmentTypeSelected, appointmentType, patient?.hasSurgeryAppointment, patient?.surgeryDate, patient?.surgeryStartTime, patient?.surgeryTime]);

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
      // Determine appointment type based on existing appointment
      // Check if patient is in surgery pathway or has surgery appointment
      const isSurgeryPathway = appointmentType === 'surgery' || 
                               patient?.pathway === 'Surgery Pathway' || 
                               patient?.pathway === 'Surgical Pathway' ||
                               patient?.carePathway === 'Surgery Pathway' ||
                               patient?.care_pathway === 'Surgery Pathway' ||
                               patient?.hasSurgeryAppointment;
      
      if (isSurgeryPathway) {
        // Set appointment type to 'surgery' for surgery pathway patients
        setAppointmentTypeSelected('surgery');
      } else if (patient.hasSurgeryAppointment && patient.surgeryAppointmentId) {
        // Surgery appointments are stored with appointmentType='urologist' and surgeryType set
        setAppointmentTypeSelected('urologist');
      } else if (patient.nextAppointmentType) {
        // Set appointment type based on what patient already has
        setAppointmentTypeSelected(patient.nextAppointmentType);
      } else if (patient.nextAppointmentDate || patient.nextAppointmentTime) {
        // If patient has appointment but type is not specified, default to urologist
        setAppointmentTypeSelected('urologist');
      }
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
      // Check for surgery appointment first
      if (patient.hasSurgeryAppointment && patient.surgeryDate && patient.surgeryDate !== 'TBD') {
        // Format date to YYYY-MM-DD for date input field
        let formattedDate = patient.surgeryDate;
        if (typeof patient.surgeryDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(patient.surgeryDate)) {
          try {
            const date = new Date(patient.surgeryDate);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error formatting surgery date:', error);
          }
        }
        setSelectedDate(formattedDate);
        
        // Get surgery time - prefer surgeryStartTime if available, otherwise use surgeryTime
        const surgeryStartTime = patient.surgeryStartTime || patient.surgeryTime || '';
        const surgeryTime = surgeryStartTime && surgeryStartTime !== 'TBD' ? surgeryStartTime : '';
        // Normalize time format to HH:MM
        const normalizedSurgeryTime = surgeryTime ? surgeryTime.substring(0, 5) : '';
        setSelectedTime(normalizedSurgeryTime);
        
        // Set surgery type if available
        const surgeryTypeValue = patient.surgeryType && patient.surgeryType !== 'TBD' ? patient.surgeryType : '';
        setSurgeryType(surgeryTypeValue);
      } 
      // Check for regular appointment (nextAppointmentDate/nextAppointmentTime)
      else if (patient.nextAppointmentDate || patient.nextAppointmentTime) {
        if (patient.nextAppointmentDate) {
          setSelectedDate(patient.nextAppointmentDate);
        }
        if (patient.nextAppointmentTime) {
          // Normalize time format to HH:MM (handle both HH:MM and HH:MM:SS formats)
          const normalizedTime = patient.nextAppointmentTime.substring(0, 5);
          setSelectedTime(normalizedTime);
          console.log('Setting appointment time from patient data:', normalizedTime);
        }
        setSurgeryType('');
      } 
      // Default to today's date if no existing appointment
      else {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        setSelectedTime('');
        setSurgeryType('');
      }
      
      // Don't pre-fill notes for surgery appointments - let user add notes when updating
      // Only pre-fill notes for non-surgery appointments
      if (!patient.hasSurgeryAppointment || appointmentType !== 'surgery') {
        setNotes(patient.notes || '');
      } else {
        setNotes('');
      }
    }
  }, [patient, isOpen, urologists, loading, appointmentType]);

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
    
    // Validate required fields based on appointment type
    if (appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') {
      // For surgery appointments, validate time
      if (!selectedDoctorId || !selectedDate || !selectedTime) {
        setError('Please fill in all required fields (doctor, date, and time)');
        return;
      }
      // Validate that the selected time is not in the past
      if (isTimeInPast(selectedDate, selectedTime)) {
        setError('Cannot book or reschedule appointments for past time slots. Please select a future time.');
        return;
      }
    } else {
      // For regular appointments, validate standard fields
      if (!selectedDoctorId || !selectedDate || !selectedTime) {
        setError('Please fill in all required fields');
        return;
      }
      // Validate that the selected time is not in the past
      if (isTimeInPast(selectedDate, selectedTime)) {
        setError('Cannot book or reschedule appointments for past time slots. Please select a future time.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Find the selected doctor details for investigation bookings
      const selectedDoctorData = urologists.find(u => {
        const firstName = u.first_name || '';
        const lastName = u.last_name || '';
        return `${firstName} ${lastName}`.trim() === selectedDoctor;
      });

      // Check if patient has an existing appointment to update
      const appointmentIdToUpdate = patient?.surgeryAppointmentId || patient?.nextAppointmentId;
      const appointmentTypeToUpdate = patient?.nextAppointmentType || (patient?.hasSurgeryAppointment ? 'urologist' : null);
      
      if (appointmentIdToUpdate) {
        // Update existing appointment (reschedule)
        // Use the selected appointment type from the dropdown (appointmentTypeSelected)
        // This allows changing from urologist to investigation or vice versa
        // For surgery appointments, use selectedTime
        const isSurgery = appointmentType === 'surgery' || appointmentTypeSelected === 'surgery';
        const appointmentTime = selectedTime;
        let appointmentNotes = notes;
        if (isSurgery && selectedTime) {
          const timeNote = `Surgery Time: ${selectedTime}`;
          appointmentNotes = notes ? `${timeNote}\n${notes}` : timeNote;
        }
        
        const result = await bookingService.rescheduleNoShowAppointment(
          appointmentIdToUpdate,
          {
            newDate: selectedDate,
            newTime: appointmentTime,
            newDoctorId: selectedDoctorId,
            appointmentType: appointmentTypeSelected, // Use the selected type, not the original
            surgeryType: isSurgery ? surgeryType : null,
            surgeryStartTime: isSurgery ? selectedTime : null,
            surgeryEndTime: '', // No end time needed
            notes: appointmentNotes
          }
        );

        if (result.success) {
          // Dispatch appropriate events based on the selected appointment type
          if (isSurgery) {
            window.dispatchEvent(new CustomEvent('surgery:updated', {
              detail: { patientId: patient.id, appointmentData: result.data }
            }));
          }
          if (appointmentTypeSelected === 'investigation') {
            window.dispatchEvent(new CustomEvent('investigationBooked', {
              detail: { patientId: patient.id, investigationData: result.data }
            }));
          }
          // Dispatch general appointment updated event
          window.dispatchEvent(new CustomEvent('appointment:updated', {
            detail: { patientId: patient.id, appointmentData: result.data }
          }));
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(result.error || 'Failed to update appointment');
        }
      } else {
        // Book new appointment - check appointment type
        if (appointmentTypeSelected === 'investigation') {
          // Book investigation appointment
          const result = await bookingService.bookInvestigation(patient.id, {
            investigationType: selectedDoctorData?.role || 'urologist',
            investigationName: selectedDoctor,
            scheduledDate: selectedDate,
            scheduledTime: selectedTime,
            notes: notes || ''
          });

          if (result.success) {
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('investigationBooked', {
              detail: { patientId: patient.id, investigationData: result.data }
            }));
            window.dispatchEvent(new CustomEvent('appointment:updated', {
              detail: { patientId: patient.id, appointmentData: result.data }
            }));
            if (onSuccess) onSuccess();
            onClose();
          } else {
            setError(result.error || 'Failed to book investigation');
          }
        } else {
          // Book urologist appointment
          // For surgery appointments, use selectedTime
          const isSurgery = appointmentType === 'surgery' || appointmentTypeSelected === 'surgery';
          const appointmentTime = selectedTime;
          let appointmentNotes = notes;
          if (isSurgery && selectedTime) {
            const timeNote = `Surgery Time: ${selectedTime}`;
            appointmentNotes = notes ? `${timeNote}\n${notes}` : timeNote;
          }
          
          const result = await bookingService.bookUrologistAppointment(patient.id, {
            appointmentDate: selectedDate,
            appointmentTime: appointmentTime,
            urologistId: selectedDoctorId,
            urologistName: selectedDoctor,
            surgeryType: isSurgery ? surgeryType : null,
            notes: appointmentNotes,
            appointmentType: isSurgery ? 'surgery' : 'urologist',
            surgeryStartTime: isSurgery ? selectedTime : null,
            surgeryEndTime: '' // No end time needed
          });

          if (result.success) {
            // Dispatch event if it's a surgery appointment
            if (isSurgery) {
              window.dispatchEvent(new CustomEvent('surgery:updated', {
                detail: { patientId: patient.id, appointmentData: result.data }
              }));
            }
            window.dispatchEvent(new CustomEvent('appointment:updated', {
              detail: { patientId: patient.id, appointmentData: result.data }
            }));
            if (onSuccess) onSuccess();
            onClose();
          } else {
            setError(result.error || 'Failed to book appointment');
          }
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
    
    // Reset appointment details - check for surgery first, then regular appointment
    if (patient?.hasSurgeryAppointment && patient?.surgeryDate && patient.surgeryDate !== 'TBD') {
      // Format date to YYYY-MM-DD for date input field
      let formattedDate = patient.surgeryDate;
      if (typeof patient.surgeryDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(patient.surgeryDate)) {
        try {
          const date = new Date(patient.surgeryDate);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error formatting surgery date:', error);
        }
      }
      setSelectedDate(formattedDate);
      
      // Get start time - prefer surgeryStartTime if available, otherwise use surgeryTime
      const surgeryStartTime = patient.surgeryStartTime || patient.surgeryTime || '';
      const normalizedSurgeryTime = surgeryStartTime && surgeryStartTime !== 'TBD' ? surgeryStartTime.substring(0, 5) : '';
      setSelectedTime(normalizedSurgeryTime);
      
      // Check if this is a surgery appointment (use same logic as above)
      const isSurgeryPathway = appointmentType === 'surgery' || 
                               patient?.pathway === 'Surgery Pathway' || 
                               patient?.pathway === 'Surgical Pathway' ||
                               patient?.carePathway === 'Surgery Pathway' ||
                               patient?.care_pathway === 'Surgery Pathway' ||
                               patient?.hasSurgeryAppointment;
      
      // Surgery time is already set above via setSelectedTime
      
      setSurgeryType(patient.surgeryType && patient.surgeryType !== 'TBD' ? patient.surgeryType : '');
    } else if (patient?.nextAppointmentDate || patient?.nextAppointmentTime) {
      setSelectedDate(patient.nextAppointmentDate || '');
      if (patient.nextAppointmentTime) {
        const normalizedTime = patient.nextAppointmentTime.substring(0, 5);
        setSelectedTime(normalizedTime);
      } else {
        setSelectedTime('');
      }
      setSurgeryType('');
    } else {
      setSelectedDate('');
      setSelectedTime('');
      setSurgeryType('');
    }
    
    // Don't pre-fill notes for surgery appointments - let user add notes when updating
    const isSurgery = appointmentType === 'surgery' || appointmentTypeSelected === 'surgery';
    if (!patient?.hasSurgeryAppointment || !isSurgery) {
      setNotes(patient?.notes || '');
    } else {
      setNotes('');
    }
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideUp">
        
        {/* Modal Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {patient?.hasSurgeryAppointment || patient?.hasAppointment ? 'Update Appointment' : 'Book Appointment'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {patient?.hasSurgeryAppointment || patient?.hasAppointment 
                  ? 'Modify existing appointment details' 
                  : `Schedule a new ${appointmentTypeSelected === 'investigation' ? 'investigation' : 'consultation'} appointment`}
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

        {/* Patient Card - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-br from-teal-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-md relative">
              <FiUser className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base">{patientName || 'Unknown Patient'}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                {patient?.age && <span>{patient.age} years</span>}
                {patient?.age && latestPsa !== null && <span className="w-1 h-1 bg-gray-400 rounded-full"></span>}
                {loadingPsa ? (
                  <span className="text-gray-400">Loading PSA...</span>
                ) : latestPsa !== null ? (
                  <span>PSA {latestPsa} ng/mL</span>
                ) : (
                  <span className="text-gray-400">PSA: N/A</span>
                )}
              </div>
            </div>
            <span className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${getPathwayStyle(patient?.pathway)}`}>
              {patient?.pathway}
            </span>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Appointment Type Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiCalendar className="w-4 h-4 text-teal-600" />
              Appointment Type
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={appointmentTypeSelected}
                onChange={(e) => {
                  setAppointmentTypeSelected(e.target.value);
                  // Reset selected doctor and time when type changes
                  setSelectedDoctor('');
                  setSelectedDoctorId(null);
                  setSelectedTime('');
                  setAvailableSlots([]);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 appearance-none text-gray-900"
                required
              >
                <option value="urologist">Urologist Consultation</option>
                <option value="investigation">Investigation</option>
                {/* Show Surgery option for surgery pathway patients or when appointmentType prop is 'surgery' */}
                {(appointmentType === 'surgery' || 
                  patient?.pathway === 'Surgery Pathway' || 
                  patient?.pathway === 'Surgical Pathway' ||
                  patient?.carePathway === 'Surgery Pathway' ||
                  patient?.care_pathway === 'Surgery Pathway' ||
                  patient?.hasSurgeryAppointment) && (
                  <option value="surgery">Surgery</option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {appointmentTypeSelected === 'surgery' 
                ? 'Select Surgery to schedule a surgery appointment with start and end time slots'
                : 'Select whether this is a consultation appointment or an investigation booking'}
            </p>
          </div>

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

          {/* Surgery Type Field - Hidden for surgery appointments (user doesn't want it) */}
          {false && (appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiFileText className="w-4 h-4 text-teal-600" />
                Surgery Type
                <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  value={surgeryType}
                  onChange={(e) => setSurgeryType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 appearance-none text-gray-900"
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

            {/* Selected Time Display - Show single time for surgery */}
            {(appointmentType === 'surgery' || appointmentTypeSelected === 'surgery') ? (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="w-4 h-4 text-teal-600" />
                  Surgery Time
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 flex items-center justify-between">
                  <span className={selectedTime ? 'font-medium text-teal-700' : 'text-gray-500'}>
                    {selectedTime || 'No time selected'}
                  </span>
                  {selectedTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTime('');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear selected time"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="w-4 h-4 text-teal-600" />
                  Selected Time
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 flex items-center justify-between">
                  <span className={selectedTime ? 'font-medium text-teal-700' : 'text-gray-500'}>
                    {selectedTime || 'No time selected'}
                  </span>
                  {selectedTime && (
                    <button
                      type="button"
                      onClick={() => setSelectedTime('')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear selected time"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Time Slots - Show start/end selection for surgery pathway patients, single selection for others */}
          {/* Check if patient is in surgery pathway: appointmentType is 'surgery' OR appointmentTypeSelected is 'surgery' OR patient has surgery appointment */}
          {(appointmentType === 'surgery' || appointmentTypeSelected === 'surgery' || patient?.hasSurgeryAppointment) ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Surgery Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Available Time Slots
              </label>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                {loadingSlots ? (
                  <div className="col-span-6 flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                      <span className="text-gray-600 text-sm">Loading time slots...</span>
                    </div>
                  </div>
                ) : !availableSlots || availableSlots.length === 0 ? (
                  <div className="col-span-6 text-center py-8 text-gray-500 text-sm">
                    {selectedDoctorId && selectedDate ? 'No time slots available' : 'Please select a doctor and date'}
                  </div>
                ) : (
                  availableSlots.map((slot) => {
                    const isAvailable = slot.available;
                    const slotTime = slot.time ? slot.time.substring(0, 5) : '';
                    const currentSelectedTime = selectedTime ? selectedTime.substring(0, 5) : '';
                    const isSelected = currentSelectedTime === slotTime;
                    const isPastTime = isTimeInPast(selectedDate, slotTime);
                    const isDisabled = !isAvailable || isPastTime;
                    
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          if (isAvailable && !isPastTime) {
                            const timeToSet = slot.time ? slot.time.substring(0, 5) : slot.time;
                            setSelectedTime(timeToSet);
                            console.log('Time selected:', timeToSet);
                          }
                        }}
                        disabled={isDisabled}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                          isSelected && !isPastTime
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                            : isAvailable && !isPastTime
                            ? 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
          </form>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!selectedDoctorId || !selectedDate || !selectedTime || isSubmitting}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white px-4 py-2.5 rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            >
              <FiCalendar className="w-4 h-4" />
              {isSubmitting 
                ? 'Saving...' 
                : (patient?.hasSurgeryAppointment || patient?.hasAppointment 
                  ? 'Update Appointment' 
                  : appointmentTypeSelected === 'investigation' 
                    ? 'Book Investigation' 
                    : 'Book Appointment')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
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

export default UpdateAppointmentModal;
