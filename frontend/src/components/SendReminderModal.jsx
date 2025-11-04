import React, { useState } from 'react';
import { FiX, FiMail, FiUser, FiCalendar, FiClock } from 'react-icons/fi';

const SendReminderModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onSend 
}) => {
  const [additionalMessage, setAdditionalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !appointment) return null;

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Call the onSend function passed from parent
      await onSend(appointment.id, additionalMessage);
      setAdditionalMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending reminder:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setAdditionalMessage('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <FiMail className="text-teal-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Send Reminder</h3>
              <p className="text-sm text-gray-500">Send appointment reminder to patient</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <FiX className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <FiUser className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Patient Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {appointment.patientName || appointment.patient_name || 'Unknown Patient'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiMail className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 break-all">
                    {appointment.email || appointment.patient_email || appointment.patientEmail || 'No email available'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-red-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Missed Appointment Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <FiCalendar className="text-red-500" />
                <div>
                  <p className="text-xs text-gray-600">Appointment Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(appointment.missedDate || appointment.missed_date || appointment.date || appointment.appointment_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiClock className="text-red-500" />
                <div>
                  <p className="text-xs text-gray-600">Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {convertTo12Hour(appointment.time || appointment.appointment_time)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Appointment Type</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {appointment.type || appointment.appointment_type || 'Appointment'}
              </span>
            </div>
          </div>

          {/* Default Message Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Default Reminder Message</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <p className="mb-2">Dear {appointment.patientName || appointment.patient_name || 'Patient'},</p>
              <p className="mb-2">
                This is a reminder that you missed your appointment scheduled for <strong>{formatDate(appointment.missedDate || appointment.missed_date || appointment.date || appointment.appointment_date)}</strong> at <strong>{convertTo12Hour(appointment.time || appointment.appointment_time)}</strong>.
              </p>
              <p className="mb-2">
                We would like to reschedule your appointment at your earliest convenience. Please contact us to book a new appointment.
              </p>
              <p>Best regards,<br />Urology Care Team</p>
            </div>
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Additional Message (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Add any personalized notes or instructions for the patient
            </p>
            <textarea
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              placeholder="e.g., Please bring your test results to the next appointment..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
              disabled={isSending}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>This will be appended to the default message</span>
              <span>{additionalMessage.length} / 500</span>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FiMail className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Email will be sent to:</p>
                <p className="break-all">
                  {appointment.email || appointment.patient_email || appointment.patientEmail || 'No email address available'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !(appointment.email || appointment.patient_email || appointment.patientEmail)}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <FiMail className="w-4 h-4" />
                Send Reminder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;

