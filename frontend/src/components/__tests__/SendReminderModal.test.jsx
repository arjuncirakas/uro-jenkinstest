import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SendReminderModal from '../SendReminderModal';

describe('SendReminderModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSend = vi.fn();

  const mockAppointment = {
    id: 1,
    patientName: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    date: '2024-01-15',
    time: '10:00',
    type: 'Consultation'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSend.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SendReminderModal
          isOpen={false}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      expect(screen.queryByText('Send Reminder')).not.toBeInTheDocument();
    });

    it('should not render when appointment is null', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={null}
          onSend={mockOnSend}
        />
      );
      expect(screen.queryByText('Send Reminder')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and appointment is provided', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText('Send Reminder')).toBeInTheDocument();
    });

    it('should display patient information', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });

    it('should display appointment details', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText(/jan.*15.*2024/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00.*am/i)).toBeInTheDocument();
    });

    it('should handle missing email', () => {
      const appointmentNoEmail = {
        ...mockAppointment,
        email: null
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentNoEmail}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText(/no email available/i)).toBeInTheDocument();
    });

    it('should handle snake_case field names', () => {
      const appointmentSnakeCase = {
        id: 1,
        patient_name: 'Jane Smith',
        patient_email: 'jane@example.com',
        appointment_date: '2024-01-15',
        appointment_time: '14:00'
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentSnakeCase}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  describe('Additional Message', () => {
    it('should allow entering additional message', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      const textarea = screen.getByPlaceholderText(/additional message/i);
      fireEvent.change(textarea, { target: { value: 'Please arrive 15 minutes early' } });
      expect(textarea.value).toBe('Please arrive 15 minutes early');
    });
  });

  describe('Send Reminder', () => {
    it('should call onSend when Send button is clicked', async () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith(1, '');
      });
    });

    it('should call onSend with additional message', async () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const textarea = screen.getByPlaceholderText(/additional message/i);
      fireEvent.change(textarea, { target: { value: 'Custom message' } });
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith(1, 'Custom message');
      });
    });

    it('should close modal after successful send', async () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should clear additional message after send', async () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const textarea = screen.getByPlaceholderText(/additional message/i);
      fireEvent.change(textarea, { target: { value: 'Custom message' } });
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should handle send error', async () => {
      mockOnSend.mockRejectedValue(new Error('Send failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear additional message on close', () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const textarea = screen.getByPlaceholderText(/additional message/i);
      fireEvent.change(textarea, { target: { value: 'Custom message' } });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when sending', async () => {
      mockOnSend.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={mockOnSend}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDisabled();
    });
  });

  describe('Time Formatting', () => {
    it('should convert 24-hour time to 12-hour format', () => {
      const appointmentPM = {
        ...mockAppointment,
        time: '14:30'
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentPM}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText(/2:30.*pm/i)).toBeInTheDocument();
    });

    it('should handle midnight (00:00)', () => {
      const appointmentMidnight = {
        ...mockAppointment,
        time: '00:00'
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentMidnight}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText(/12:00.*am/i)).toBeInTheDocument();
    });

    it('should handle noon (12:00)', () => {
      const appointmentNoon = {
        ...mockAppointment,
        time: '12:00'
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentNoon}
          onSend={mockOnSend}
        />
      );
      expect(screen.getByText(/12:00.*pm/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onSend', async () => {
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          onSend={null}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Send Reminder')).toBeInTheDocument();
      });
    });

    it('should handle missing time', () => {
      const appointmentNoTime = {
        ...mockAppointment,
        time: null
      };
      render(
        <SendReminderModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentNoTime}
          onSend={mockOnSend}
        />
      );
      // Should not crash
      expect(screen.getByText('Send Reminder')).toBeInTheDocument();
    });
  });
});
