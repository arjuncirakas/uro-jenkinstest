import { describe, it, expect, vi, beforeEach } from 'vitest';
import emailService from '../emailService';
import apiClient, { handleApiError } from '../config/axios';

// Mock axios and handleApiError
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  handleApiError: vi.fn((error) => ({
    message: error.response?.data?.message || error.message || 'API error'
  }))
}));

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('sendAppointmentReminder', () => {
    it('should send appointment reminder successfully', async () => {
      const reminderData = {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation'
      };
      const mockResponse = {
        data: {
          success: true,
          message: 'Reminder sent'
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await emailService.sendAppointmentReminder(reminderData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reminder email sent successfully');
      expect(apiClient.post).toHaveBeenCalledWith('/booking/appointments/send-reminder', {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation',
        additionalMessage: ''
      });
    });

    it('should include additionalMessage when provided', async () => {
      const reminderData = {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation',
        additionalMessage: 'Please bring your insurance card'
      };
      const mockResponse = {
        data: {
          success: true
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      await emailService.sendAppointmentReminder(reminderData);

      expect(apiClient.post).toHaveBeenCalledWith('/booking/appointments/send-reminder', {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation',
        additionalMessage: 'Please bring your insurance card'
      });
    });

    it('should handle errors gracefully', async () => {
      const reminderData = {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation'
      };
      const error = {
        response: {
          data: {
            message: 'Email service unavailable'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue({ message: 'Email service unavailable' });

      const result = await emailService.sendAppointmentReminder(reminderData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send reminder email');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const reminderData = {
        appointmentId: 1,
        patientEmail: 'patient@example.com',
        patientName: 'John Doe',
        appointmentDate: '2024-12-31',
        appointmentTime: '10:00',
        appointmentType: 'Consultation'
      };
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue({ message: 'Network error' });

      const result = await emailService.sendAppointmentReminder(reminderData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Network error');
    });
  });

  describe('sendBulkReminders', () => {
    it('should send bulk reminders successfully', async () => {
      const reminders = [
        {
          appointmentId: 1,
          patientEmail: 'patient1@example.com',
          patientName: 'John Doe'
        },
        {
          appointmentId: 2,
          patientEmail: 'patient2@example.com',
          patientName: 'Jane Smith'
        }
      ];
      const mockResponse = {
        data: {
          success: true,
          sent: 2
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await emailService.sendBulkReminders(reminders);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reminders sent successfully to 2 patients');
      expect(apiClient.post).toHaveBeenCalledWith('/booking/appointments/send-bulk-reminders', {
        reminders
      });
    });

    it('should handle errors gracefully', async () => {
      const reminders = [];
      const error = {
        response: {
          data: {
            message: 'Some reminders failed'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue({ message: 'Some reminders failed' });

      const result = await emailService.sendBulkReminders(reminders);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send some reminders');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle empty reminders array', async () => {
      const mockResponse = {
        data: {
          success: true,
          sent: 0
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await emailService.sendBulkReminders([]);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reminders sent successfully to 0 patients');
    });
  });

  describe('sendCustomEmail', () => {
    it('should send custom email successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Test message body'
      };
      const mockResponse = {
        data: {
          success: true,
          message: 'Email sent'
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await emailService.sendCustomEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email sent successfully');
      expect(apiClient.post).toHaveBeenCalledWith('/notifications/send-email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Test message body'
      });
    });

    it('should handle errors gracefully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };
      const error = {
        response: {
          data: {
            message: 'Invalid recipient'
          }
        }
      };
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue({ message: 'Invalid recipient' });

      const result = await emailService.sendCustomEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send email');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);
      handleApiError.mockReturnValue({ message: 'Network error' });

      const result = await emailService.sendCustomEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Network error');
    });

    it('should handle null/undefined email data', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      await emailService.sendCustomEmail({
        to: null,
        subject: undefined,
        message: ''
      });

      expect(apiClient.post).toHaveBeenCalledWith('/notifications/send-email', {
        to: null,
        subject: undefined,
        message: ''
      });
    });
  });
});
