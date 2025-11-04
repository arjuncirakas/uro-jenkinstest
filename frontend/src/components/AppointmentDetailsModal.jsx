import React from 'react';
import { FiX, FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiMapPin, FiFileText, FiTag } from 'react-icons/fi';
import { useEscapeKey } from '../utils/useEscapeKey';

const AppointmentDetailsModal = ({ isOpen, appointment, onClose }) => {
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

  const getTypeColor = (typeColor) => {
    return typeColor === 'teal' ? 'bg-teal-500' : 'bg-purple-500';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700">
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

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Patient Information */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                <FiUser className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">{appointment.patientName}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1.5">
                    <FiPhone className="w-3.5 h-3.5" />
                    {appointment.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiMail className="w-3.5 h-3.5" />
                    {appointment.email}
                  </span>
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
                  <span className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Time:</span>
                  <span className="text-sm font-medium text-gray-900">{formatTime(appointment.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium text-gray-900">{appointment.duration} minutes</span>
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
                  <div className={`w-4 h-4 rounded ${getTypeColor(appointment.typeColor)}`}></div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium text-gray-900">{appointment.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
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

          {/* Appointment Notes */}
          {appointment.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h5 className="font-semibold text-blue-900 text-sm mb-2 flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-blue-600" />
                Appointment Notes
              </h5>
              <p className="text-sm text-blue-800">{appointment.notes}</p>
            </div>
          )}

          {/* Additional Information */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h5 className="font-semibold text-gray-900 text-sm mb-3">Additional Information</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Patient ID:</span>
                <span className="ml-2 font-medium text-gray-900">{appointment.patientId}</span>
              </div>
              <div>
                <span className="text-gray-600">Appointment ID:</span>
                <span className="ml-2 font-medium text-gray-900">#{appointment.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;

