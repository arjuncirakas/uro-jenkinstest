import apiClient, { handleApiError } from '../config/axios.js';

class EmailService {
  /**
   * Send appointment reminder email to patient
   * @param {Object} reminderData - The reminder data
   * @param {number} reminderData.appointmentId - The appointment ID
   * @param {string} reminderData.patientEmail - Patient's email address
   * @param {string} reminderData.patientName - Patient's name
   * @param {string} reminderData.appointmentDate - Appointment date
   * @param {string} reminderData.appointmentTime - Appointment time
   * @param {string} reminderData.appointmentType - Type of appointment
   * @param {string} reminderData.additionalMessage - Optional additional message
   * @returns {Promise<Object>} Response from the server
   */
  async sendAppointmentReminder(reminderData) {
    try {
      const response = await apiClient.post('/appointments/send-reminder', {
        appointmentId: reminderData.appointmentId,
        patientEmail: reminderData.patientEmail,
        patientName: reminderData.patientName,
        appointmentDate: reminderData.appointmentDate,
        appointmentTime: reminderData.appointmentTime,
        appointmentType: reminderData.appointmentType,
        additionalMessage: reminderData.additionalMessage || ''
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Reminder email sent successfully'
      };
    } catch (error) {
      console.error('Error sending reminder email:', error);
      return {
        success: false,
        error: handleApiError(error),
        message: 'Failed to send reminder email'
      };
    }
  }

  /**
   * Send bulk appointment reminders to multiple patients
   * @param {Array} reminders - Array of reminder data objects
   * @returns {Promise<Object>} Response from the server
   */
  async sendBulkReminders(reminders) {
    try {
      const response = await apiClient.post('/appointments/send-bulk-reminders', {
        reminders
      });
      
      return {
        success: true,
        data: response.data,
        message: `Reminders sent successfully to ${reminders.length} patients`
      };
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      return {
        success: false,
        error: handleApiError(error),
        message: 'Failed to send some reminders'
      };
    }
  }

  /**
   * Send custom email to patient
   * @param {Object} emailData - The email data
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.message - Email message body
   * @returns {Promise<Object>} Response from the server
   */
  async sendCustomEmail(emailData) {
    try {
      const response = await apiClient.post('/notifications/send-email', {
        to: emailData.to,
        subject: emailData.subject,
        message: emailData.message
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Error sending custom email:', error);
      return {
        success: false,
        error: handleApiError(error),
        message: 'Failed to send email'
      };
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;





















