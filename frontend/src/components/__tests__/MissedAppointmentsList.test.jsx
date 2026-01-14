import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MissedAppointmentsList from '../MissedAppointmentsList';
import emailService from '../../services/emailService';
import patientService from '../../services/patientService';

// Mock dependencies
vi.mock('../../services/emailService', () => ({
  default: {
    sendAppointmentReminder: vi.fn(),
    sendBulkReminders: vi.fn()
  }
}));

vi.mock('../../services/patientService', () => ({
  patientService: {
    getPatientById: vi.fn()
  }
}));

vi.mock('../SendReminderModal', () => ({
  default: ({ isOpen, onClose, onSend, appointment }) => (
    isOpen ? (
      <div data-testid="send-reminder-modal">
        <div>Reminder for {appointment?.patientName}</div>
        <button onClick={() => onSend(appointment?.id, '')}>Send</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../SuccessErrorModal', () => ({
  default: ({ isOpen, message, type }) => (
    isOpen ? <div data-testid={`${type}-modal`}>{message}</div> : null
  )
}));

describe('MissedAppointmentsList', () => {
  const mockOnTogglePatients = vi.fn();
  const mockOnRefresh = vi.fn();

  const mockAppointments = [
    {
      id: 1,
      patientName: 'John Doe',
      email: 'john@example.com',
      date: '2024-01-15',
      time: '10:00',
      type: 'Consultation',
      reminderSent: false
    },
    {
      id: 2,
      patientName: 'Jane Smith',
      email: 'jane@example.com',
      date: '2024-01-15',
      time: '14:00',
      type: 'Investigation',
      reminderSent: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    emailService.sendAppointmentReminder.mockResolvedValue({ success: true });
    emailService.sendBulkReminders.mockResolvedValue({
      success: true,
      data: { sent: [{ appointmentId: 1 }] }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render missed appointments list', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText(/missed appointments/i)).toBeInTheDocument();
    });

    it('should display appointment count', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText(/2 missed appointment/i)).toBeInTheDocument();
    });

    it('should display appointments', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display empty state when no appointments', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={[]}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText(/no missed appointments/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by not-sent reminders by default', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      // Should show only appointments without reminders sent
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should filter by all appointments', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const allButton = screen.getByText(/all/i);
      fireEvent.click(allButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should filter by sent reminders', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const sentButton = screen.getByText(/sent/i);
      fireEvent.click(sentButton);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should select individual appointment', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const checkbox = screen.getByLabelText(/select.*john doe/i);
      fireEvent.click(checkbox);
      
      expect(checkbox.checked).toBe(true);
    });

    it('should select all appointments', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const selectAllButton = screen.getByText(/select all/i);
      fireEvent.click(selectAllButton);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        if (checkbox !== selectAllButton) {
          expect(checkbox.checked).toBe(true);
        }
      });
    });

    it('should deselect all when all are selected', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const selectAllButton = screen.getByText(/select all/i);
      fireEvent.click(selectAllButton);
      fireEvent.click(selectAllButton);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        if (checkbox !== selectAllButton) {
          expect(checkbox.checked).toBe(false);
        }
      });
    });
  });

  describe('Send Reminder', () => {
    it('should open reminder modal for single appointment', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      expect(screen.getByTestId('send-reminder-modal')).toBeInTheDocument();
    });

    it('should fetch patient email if not available', async () => {
      const appointmentNoEmail = {
        id: 1,
        patientName: 'John Doe',
        patient_id: 123,
        date: '2024-01-15',
        time: '10:00'
      };
      
      patientService.getPatientById.mockResolvedValue({
        success: true,
        data: { email: 'john@example.com' }
      });
      
      render(
        <MissedAppointmentsList
          missedAppointments={[appointmentNoEmail]}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(patientService.getPatientById).toHaveBeenCalledWith(123);
      });
    });

    it('should send reminder for single appointment', async () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
          onRefresh={mockOnRefresh}
        />
      );
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      const sendModalButton = screen.getByText('Send');
      fireEvent.click(sendModalButton);
      
      await waitFor(() => {
        expect(emailService.sendAppointmentReminder).toHaveBeenCalled();
      });
    });

    it('should send bulk reminders for selected appointments', async () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
          onRefresh={mockOnRefresh}
        />
      );
      
      const selectAllButton = screen.getByText(/select all/i);
      fireEvent.click(selectAllButton);
      
      const sendBulkButton = screen.getByText(/send.*selected/i);
      fireEvent.click(sendBulkButton);
      
      await waitFor(() => {
        expect(emailService.sendBulkReminders).toHaveBeenCalled();
      });
    });

    it('should show success message after sending reminder', async () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      const sendModalButton = screen.getByText('Send');
      fireEvent.click(sendModalButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
      });
    });

    it('should handle send error', async () => {
      emailService.sendAppointmentReminder.mockResolvedValue({
        success: false,
        error: 'Send failed'
      });
      
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      const sendModalButton = screen.getByText('Send');
      fireEvent.click(sendModalButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should convert 24-hour time to 12-hour format', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText(/10:00.*am/i)).toBeInTheDocument();
      expect(screen.getByText(/2:00.*pm/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onTogglePatients', () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={null}
        />
      );
      // Should not crash
      expect(screen.getByText(/missed appointments/i)).toBeInTheDocument();
    });

    it('should handle null onRefresh', async () => {
      render(
        <MissedAppointmentsList
          missedAppointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
          onRefresh={null}
        />
      );
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      const sendModalButton = screen.getByText('Send');
      fireEvent.click(sendModalButton);
      
      await waitFor(() => {
        expect(emailService.sendAppointmentReminder).toHaveBeenCalled();
      });
    });

    it('should handle missing email gracefully', async () => {
      const appointmentNoEmail = {
        id: 1,
        patientName: 'John Doe',
        patient_id: 123,
        date: '2024-01-15',
        time: '10:00'
      };
      
      patientService.getPatientById.mockResolvedValue({
        success: false
      });
      
      render(
        <MissedAppointmentsList
          missedAppointments={[appointmentNoEmail]}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const sendButton = screen.getByText(/send reminder/i);
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('send-reminder-modal')).toBeInTheDocument();
      });
    });
  });
});
