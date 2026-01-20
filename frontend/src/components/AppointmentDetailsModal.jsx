import React, { useState } from 'react';
import { FiX, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiMapPin, FiFileText, FiTag, FiEdit } from 'react-icons/fi';
import { useEscapeKey } from '../utils/useEscapeKey';
import UpdateAppointmentModal from './UpdateAppointmentModal';

const AppointmentDetailsModal = ({ isOpen, appointment, onClose, onReschedule }) => {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEscapeKey(onClose, isOpen);

  if (!isOpen || !appointment) return null;

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (typeColor, appointmentType) => {
    // Check typeColor first (set by backend)
    if (typeColor === 'orange') {
      return 'bg-orange-500';
    }
    if (typeColor === 'teal') {
      return 'bg-teal-500';
    }
    if (typeColor === 'green') {
      return 'bg-green-500';
    }
    if (typeColor === 'blue') {
      return 'bg-blue-500';
    }
    if (typeColor === 'purple') {
      return 'bg-purple-500';
    }
    
    // Fallback: determine color from appointment type if typeColor is not set
    const typeLabel = (appointmentType || '').toLowerCase();
    if (typeLabel.includes('surgery') || typeLabel.includes('surgical')) {
      return 'bg-orange-500';
    }
    if (typeLabel.includes('investigation')) {
      return 'bg-purple-500';
    }
    if (typeLabel.includes('mdt')) {
      return 'bg-green-500';
    }
    
    // Default to teal for urologist consultations
    return 'bg-teal-500';
  };

  // Parse notes to separate surgery time from other notes and format JSON notes
  const parseNotes = (notes) => {
    if (!notes) return { surgeryTime: null, otherNotes: null, formattedNotes: null, isMdtNotes: false };
    
    // Try to parse as JSON first (for MDT meeting notes)
    let parsedNotes = null;
    let isJson = false;
    try {
      parsedNotes = typeof notes === 'string' ? JSON.parse(notes) : notes;
      isJson = true;
    } catch (e) {
      // Not JSON, treat as plain text
      parsedNotes = null;
    }
    
    // Check if notes contain "Surgery Time:" - match the time pattern and everything after it on the same line
    const surgeryTimeMatch = notes.match(/Surgery Time:\s*([0-9]{1,2}:[0-9]{2})/i);
    const surgeryTime = surgeryTimeMatch ? surgeryTimeMatch[1] : null;
    
    // If it's JSON (MDT notes), format it nicely
    let formattedNotes = null;
    let otherNotes = null;
    
    if (isJson && parsedNotes) {
      // Format MDT notes
      const formatted = [];
      
      if (parsedNotes.clinicalSummary) {
        formatted.push({ label: 'Clinical Summary', value: parsedNotes.clinicalSummary });
      }
      
      if (parsedNotes.content) {
        formatted.push({ label: 'Discussion', value: parsedNotes.content });
      }
      
      if (parsedNotes.mdtOutcome) {
        formatted.push({ label: 'MDT Outcome', value: parsedNotes.mdtOutcome });
      }
      
      if (parsedNotes.recommendations && Array.isArray(parsedNotes.recommendations) && parsedNotes.recommendations.length > 0) {
        formatted.push({ label: 'Clinical Recommendations', value: parsedNotes.recommendations });
      }
      
      if (parsedNotes.actionItems && Array.isArray(parsedNotes.actionItems) && parsedNotes.actionItems.length > 0) {
        formatted.push({ label: 'Follow-up Action Items', value: parsedNotes.actionItems });
      }
      
      if (parsedNotes.attendees && Array.isArray(parsedNotes.attendees) && parsedNotes.attendees.length > 0) {
        formatted.push({ label: 'Team Members', value: parsedNotes.attendees });
      }
      
      formattedNotes = formatted;
    } else {
      // Plain text notes - remove surgery time line if present
      otherNotes = notes;
      if (surgeryTime) {
        // Remove the entire "Surgery Time: XX:XX" line (including any text after it on the same line)
        otherNotes = notes.replace(/Surgery Time:\s*[0-9]{1,2}:[0-9]{2}[^\n]*\n?/i, '').trim();
        otherNotes = otherNotes.replace(/Surgery Time:\s*[0-9]{1,2}:[0-9]{2}[^\n]*$/i, '').trim();
      }
      otherNotes = otherNotes || null;
    }
    
    return {
      surgeryTime,
      otherNotes,
      formattedNotes,
      isMdtNotes: isJson
    };
  };

  const { surgeryTime, otherNotes, formattedNotes, isMdtNotes } = parseNotes(appointment.notes);
  
  // Extract doctor name from notes if it's MDT notes, otherwise use appointment data
  const getDoctorName = () => {
    // If it's MDT notes, try to get doctor from meta.author or attendees
    if (isMdtNotes && formattedNotes) {
      try {
        const notesJson = typeof appointment.notes === 'string' ? JSON.parse(appointment.notes) : appointment.notes;
        if (notesJson.meta && notesJson.meta.author) {
          return notesJson.meta.author;
        }
        if (notesJson.attendees && Array.isArray(notesJson.attendees) && notesJson.attendees.length > 0) {
          // Get first attendee and remove department suffix if present
          const firstAttendee = notesJson.attendees[0];
          return firstAttendee.replace(/\s*\([^)]*\)$/, ''); // Remove "(Department)" suffix
        }
      } catch (e) {
        // Fall through to default
      }
    }
    
    // Default: use appointment urologist fields
    const urologistName = appointment.urologist || 
                         appointment.doctorName || 
                         appointment.doctor_name || 
                         appointment.urologist_name || '';
    
    // Remove "Dr. MDT Meeting" or similar generic names
    if (urologistName.toLowerCase().includes('mdt meeting') || 
        urologistName.toLowerCase().includes('meeting')) {
      // Try to get from notes if available
      if (isMdtNotes) {
        try {
          const notesJson = typeof appointment.notes === 'string' ? JSON.parse(appointment.notes) : appointment.notes;
          if (notesJson.meta && notesJson.meta.author) {
            return notesJson.meta.author;
          }
        } catch (e) {
          // Fall through
        }
      }
      return 'Unassigned';
    }
    
    return urologistName || 'Unassigned';
  };
  
  const doctorName = getDoctorName();

  // Prepare patient object for UpdateAppointmentModal
  const getPatientForReschedule = () => {
    if (!appointment) return null;
    
    // Handle different appointment data structures
    const appointmentDate = appointment.date || appointment.appointment_date || appointment.appointmentDate;
    const appointmentTime = appointment.time || appointment.appointment_time || appointment.appointmentTime;
    const appointmentType = appointment.type || appointment.appointment_type || appointment.appointmentType;
    const patientId = appointment.patientId || appointment.patient_id || appointment.patientID;
    const patientName = appointment.patientName || appointment.patient_name || 
                       (appointment.first_name && appointment.last_name ? `${appointment.first_name} ${appointment.last_name}` : '') ||
                       appointment.name || '';
    
    return {
      id: patientId,
      name: patientName,
      age: appointment.age || '',
      gender: appointment.gender || '',
      upi: appointment.upi || '',
      // Appointment details
      nextAppointmentId: appointment.id,
      nextAppointmentDate: appointmentDate,
      nextAppointmentTime: appointmentTime,
      nextAppointmentType: appointmentType === 'Investigation' || appointmentType === 'investigation' ? 'investigation' : 'urologist',
      urologist: appointment.urologist || appointment.doctorName || appointment.doctor_name || appointment.urologist_name || '',
      notes: otherNotes || '',
      surgeryTime: surgeryTime || '',
      hasAppointment: true,
      // Check if it's a surgery appointment
      hasSurgeryAppointment: surgeryTime !== null,
      surgeryDate: appointmentDate,
      surgeryStartTime: surgeryTime || appointmentTime
    };
  };

  const handleReschedule = () => {
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    setIsRescheduleModalOpen(false);
    if (onReschedule) {
      onReschedule();
    }
    onClose(); // Close the details modal after successful reschedule
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Appointment Details</h3>
              <p className="text-teal-50 text-sm mt-0.5">View appointment information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <FiX className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Patient Information */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                <FiUser className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">
                  {appointment.patientName || appointment.patient_name || 
                   (appointment.first_name && appointment.last_name ? `${appointment.first_name} ${appointment.last_name}` : '') ||
                   appointment.name || 'Unknown Patient'}
                </h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {(appointment.phone || appointment.phone_number) && (
                    <span className="flex items-center gap-1.5">
                      <FiPhone className="w-3.5 h-3.5" />
                      {appointment.phone || appointment.phone_number}
                    </span>
                  )}
                  {(appointment.email || appointment.email_address) && (
                    <span className="flex items-center gap-1.5">
                      <FiMail className="w-3.5 h-3.5" />
                      {appointment.email || appointment.email_address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Date & Time */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <h5 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-teal-600" />
                Date & Time
              </h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(appointment.date || appointment.appointment_date || appointment.appointmentDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Time:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {appointment.appointment_type === 'automatic' || appointment.type === 'automatic' 
                      ? 'Flexible (no time slot - additional appointment)'
                      : formatTime(appointment.time || appointment.appointment_time || appointment.appointmentTime) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Type & Status */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <h5 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <FiTag className="w-4 h-4 text-teal-600" />
                Type & Status
              </h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getTypeColor(appointment.typeColor, appointment.type || appointment.appointment_type || appointment.appointmentType)}`}></div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {appointment.type || appointment.appointment_type || appointment.appointmentType || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status || appointment.appointment_status || 'scheduled')}`}>
                    {(appointment.status || appointment.appointment_status || 'scheduled').charAt(0).toUpperCase() + (appointment.status || appointment.appointment_status || 'scheduled').slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white border border-gray-200 rounded p-4">
            <h5 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <FiMapPin className="w-4 h-4 text-teal-600" />
              Location
            </h5>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">Urology Department</p>
              <p>Room 205, 2nd Floor</p>
              <p>Medical Center Building</p>
            </div>
          </div>

          {/* Surgery Time */}
          {surgeryTime && (
            <div className="bg-teal-50 border border-teal-200 rounded p-4">
              <h5 className="font-semibold text-teal-900 text-sm mb-2 flex items-center gap-2">
                <FiClock className="w-4 h-4 text-teal-600" />
                Surgery Time
              </h5>
              <p className="text-sm font-medium text-teal-800">{formatTime(surgeryTime)}</p>
            </div>
          )}

          {/* Appointment Notes */}
          {(formattedNotes || otherNotes) && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h5 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-blue-600" />
                {isMdtNotes ? 'MDT Meeting Notes' : 'Appointment Notes'}
              </h5>
              {formattedNotes ? (
                <div className="space-y-4">
                  {formattedNotes.map((item, idx) => (
                    <div key={idx} className="bg-white rounded p-3 border border-blue-100">
                      <h6 className="font-semibold text-blue-900 text-xs mb-2 uppercase tracking-wide">
                        {item.label}
                      </h6>
                      {Array.isArray(item.value) ? (
                        <ul className="space-y-2">
                          {item.value.map((val, valIdx) => (
                            <li key={valIdx} className="text-sm text-blue-800 flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>{val}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-blue-800 whitespace-pre-line">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-800 whitespace-pre-line">{otherNotes}</p>
              )}
            </div>
          )}

          {/* Additional Information */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h5 className="font-semibold text-gray-900 text-sm mb-3">Additional Information</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Patient ID:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {appointment.patientId || appointment.patient_id || appointment.patientID || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Appointment ID:</span>
                <span className="ml-2 font-medium text-gray-900">#{appointment.id || appointment.appointment_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Urologist:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {doctorName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleReschedule}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors flex items-center gap-2"
          >
            <FiEdit className="w-4 h-4" />
            Reschedule
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reschedule Modal */}
      <UpdateAppointmentModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        patient={getPatientForReschedule()}
        onSuccess={handleRescheduleSuccess}
        appointmentType={(appointment.type || appointment.appointment_type || appointment.appointmentType || '').toLowerCase() === 'investigation' ? 'investigation' : 'urologist'}
      />
    </div>
  );
};

export default AppointmentDetailsModal;

