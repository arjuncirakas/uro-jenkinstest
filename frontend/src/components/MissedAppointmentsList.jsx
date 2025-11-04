import React, { useState } from 'react';
import { FiMail, FiPhone, FiCalendar, FiClock, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import SendReminderModal from './SendReminderModal';
import emailService from '../services/emailService';
import { bookingService } from '../services/bookingService';
import patientService from '../services/patientService';

const MissedAppointmentsList = ({ 
  missedAppointments = [], 
  showAllPatients = false,
  onTogglePatients = null 
}) => {
  const [selectedAppointments, setSelectedAppointments] = useState(new Set());
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

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

  // Handle individual appointment selection
  const handleAppointmentSelect = (appointmentId) => {
    const newSelected = new Set(selectedAppointments);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedAppointments(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAppointments.size === missedAppointments.length) {
      setSelectedAppointments(new Set());
    } else {
      setSelectedAppointments(new Set(missedAppointments.map(apt => apt.id)));
    }
  };

  // Open reminder modal and fetch patient email if not available
  const handleOpenReminderModal = async (appointment) => {
    // Check if email is already in appointment data
    const hasEmail = appointment.email || appointment.patient_email || appointment.patientEmail;
    
    if (hasEmail) {
      setSelectedAppointment(appointment);
      setShowReminderModal(true);
    } else {
      // Fetch patient details to get email
      setLoadingPatientData(true);
      try {
        const patientId = appointment.patientId || appointment.patient_id;
        if (patientId) {
          const result = await patientService.getPatientById(patientId);
          
          if (result.success && result.data) {
            // Merge patient email into appointment data
            const enrichedAppointment = {
              ...appointment,
              email: result.data.email || result.data.patient_email,
              patientEmail: result.data.email || result.data.patient_email,
              patient_email: result.data.email || result.data.patient_email,
            };
            setSelectedAppointment(enrichedAppointment);
          } else {
            // Show modal even if we couldn't fetch email
            setSelectedAppointment(appointment);
            console.warn('Could not fetch patient email:', result.error);
          }
        } else {
          setSelectedAppointment(appointment);
          console.warn('No patient ID available in appointment data');
        }
        setShowReminderModal(true);
      } catch (error) {
        console.error('Error fetching patient details:', error);
        setSelectedAppointment(appointment);
        setShowReminderModal(true);
      } finally {
        setLoadingPatientData(false);
      }
    }
  };

  // Handle send reminder for single appointment with additional message
  const handleSendReminder = async (appointmentId, additionalMessage) => {
    setSendingReminders(true);
    try {
      // Send email via email service
      const result = await emailService.sendAppointmentReminder({
        appointmentId,
        patientEmail: selectedAppointment.email || selectedAppointment.patient_email || selectedAppointment.patientEmail,
        patientName: selectedAppointment.patientName || selectedAppointment.patient_name,
        appointmentDate: selectedAppointment.missedDate || selectedAppointment.missed_date || selectedAppointment.date || selectedAppointment.appointment_date,
        appointmentTime: selectedAppointment.time || selectedAppointment.appointment_time,
        appointmentType: selectedAppointment.type || selectedAppointment.appointment_type,
        additionalMessage
      });
      
      if (result.success) {
        // Update appointment status via API
        try {
          await bookingService.updateAppointmentStatus(appointmentId, { reminderSent: true });
        } catch (err) {
          console.error('Error updating appointment status:', err);
        }
        
        // Remove from selected if it was selected
        const newSelected = new Set(selectedAppointments);
        newSelected.delete(appointmentId);
        setSelectedAppointments(newSelected);
        
        // Show success message (in a real app, you'd use a toast notification)
        alert('Reminder email sent successfully to the patient!');
        
        // Close modal
        setShowReminderModal(false);
        setSelectedAppointment(null);
        
        // Trigger parent refresh to update the list
        if (window.location.reload) {
          window.location.reload();
        }
      } else {
        alert(`Failed to send reminder email: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to send reminder email. Please try again.');
      console.error('Error sending reminder:', error);
    } finally {
      setSendingReminders(false);
    }
  };

  // Handle send reminders for selected appointments
  const handleSendSelectedReminders = async () => {
    if (selectedAppointments.size === 0) return;
    
    setSendingReminders(true);
    try {
      // Prepare reminders data for bulk send
      const selectedAppointmentsList = missedAppointments.filter(apt => 
        selectedAppointments.has(apt.id)
      );
      
      const reminders = selectedAppointmentsList.map(apt => ({
        appointmentId: apt.id,
        patientEmail: apt.email || apt.patient_email || apt.patientEmail,
        patientName: apt.patientName || apt.patient_name,
        appointmentDate: apt.missedDate || apt.missed_date || apt.date || apt.appointment_date,
        appointmentTime: apt.time || apt.appointment_time,
        appointmentType: apt.type || apt.appointment_type,
        additionalMessage: ''
      }));
      
      // Send bulk reminders via email service
      const result = await emailService.sendBulkReminders(reminders);
      
      if (result.success) {
        // Update all appointment statuses via API
        const updatePromises = Array.from(selectedAppointments).map(appointmentId =>
          bookingService.updateAppointmentStatus(appointmentId, { reminderSent: true })
            .catch(err => console.error(`Error updating appointment ${appointmentId}:`, err))
        );
        
        await Promise.all(updatePromises);
        
        setSelectedAppointments(new Set());
        alert(`Reminders sent successfully to ${reminders.length} patients!`);
        
        // Trigger refresh
        if (window.location.reload) {
          window.location.reload();
        }
      } else {
        alert(`Failed to send some reminders: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to send some reminders. Please try again.');
      console.error('Error sending bulk reminders:', error);
    } finally {
      setSendingReminders(false);
    }
  };

  // Filter appointments based on reminder status
  const [reminderFilter, setReminderFilter] = useState('all'); // 'all', 'sent', 'not-sent'
  
  const filteredAppointments = missedAppointments.filter(appointment => {
    if (reminderFilter === 'sent') return appointment.reminderSent;
    if (reminderFilter === 'not-sent') return !appointment.reminderSent;
    return true;
  });

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" />
              Missed Appointments
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {filteredAppointments.length} missed appointment{filteredAppointments.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Patient Filter Toggle */}
          {onTogglePatients && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Display:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onTogglePatients(false)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                    !showAllPatients
                      ? 'bg-white text-teal-600 shadow-sm border border-teal-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${!showAllPatients ? 'bg-teal-500' : 'bg-gray-400'}`}></div>
                    My Patients Only
                  </span>
                </button>
                <button
                  onClick={() => onTogglePatients(true)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                    showAllPatients
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${showAllPatients ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    All Patients
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Reminder Filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'not-sent', label: 'Reminder Not Sent' },
                { value: 'sent', label: 'Reminder Sent' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setReminderFilter(filter.value)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    reminderFilter === filter.value
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedAppointments.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedAppointments.size} selected
              </span>
              <button
                onClick={handleSendSelectedReminders}
                disabled={sendingReminders}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingReminders ? 'Sending...' : 'Send Reminders'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Appointments List */}
      <div className="divide-y divide-gray-200">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <FiAlertCircle className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No missed appointments</h3>
            <p className="text-gray-500">
              {reminderFilter === 'all' 
                ? 'Great! No missed appointments found.' 
                : `No missed appointments with ${reminderFilter === 'sent' ? 'reminders sent' : 'reminders not sent'}.`
              }
            </p>
          </div>
        ) : (
          <div className="p-4">
            {/* Select All Header */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <input
                type="checkbox"
                checked={selectedAppointments.size === filteredAppointments.length && filteredAppointments.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select all ({filteredAppointments.length})
              </span>
            </div>

            {/* Appointments */}
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${
                    selectedAppointments.has(appointment.id) ? 'ring-2 ring-teal-500 bg-teal-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedAppointments.has(appointment.id)}
                      onChange={() => handleAppointmentSelect(appointment.id)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 mt-1"
                    />

                    {/* Appointment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {appointment.patientName || appointment.patient_name || 'Unknown Patient'}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              appointment.typeColor === 'red' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.type || appointment.appointment_type || 'Appointment'}
                            </span>
                            {appointment.reminderSent && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <FiCheckCircle className="w-3 h-3" />
                                Reminder Sent
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <FiCalendar className="w-4 h-4" />
                              <span>{formatDate(appointment.missedDate || appointment.missed_date || appointment.date || appointment.appointment_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FiClock className="w-4 h-4" />
                              <span>{convertTo12Hour(appointment.time || appointment.appointment_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FiUser className="w-4 h-4" />
                              <span>{appointment.duration || 30} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FiPhone className="w-4 h-4" />
                              <span>{appointment.phone || appointment.patient_phone || 'N/A'}</span>
                            </div>
                          </div>
                          
                          {(appointment.notes || appointment.appointment_notes) && (
                            <p className="mt-2 text-sm text-gray-600">
                              <strong>Notes:</strong> {appointment.notes || appointment.appointment_notes}
                            </p>
                          )}
                          
                          {/* Display email */}
                          {(appointment.email || appointment.patient_email || appointment.patientEmail) && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                              <FiMail className="w-4 h-4" />
                              <span>{appointment.email || appointment.patient_email || appointment.patientEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleOpenReminderModal(appointment)}
                            disabled={sendingReminders || appointment.reminderSent || loadingPatientData}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              appointment.reminderSent
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {loadingPatientData ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <FiMail className="w-4 h-4" />
                                <span>Send Reminder</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Send Reminder Modal */}
      <SendReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onSend={handleSendReminder}
      />
    </>
  );
};

export default MissedAppointmentsList;

