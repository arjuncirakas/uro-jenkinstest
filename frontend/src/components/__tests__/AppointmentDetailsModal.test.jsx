import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppointmentDetailsModal from '../AppointmentDetailsModal';

// Mock dependencies
vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

vi.mock('../UpdateAppointmentModal', () => ({
  default: ({ isOpen, onClose, patient, onSuccess }) => (
    isOpen ? (
      <div data-testid="update-appointment-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess()}>Update</button>
      </div>
    ) : null
  )
}));

describe('AppointmentDetailsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnReschedule = vi.fn();

  const mockAppointment = {
    id: 1,
    patientName: 'John Doe',
    phone: '1234567890',
    email: 'john@example.com',
    date: '2024-01-15',
    time: '10:00',
    type: 'Consultation',
    status: 'confirmed',
    urologist: 'Dr. Smith',
    notes: 'Regular checkup'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AppointmentDetailsModal
          isOpen={false}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Appointment Details')).not.toBeInTheDocument();
    });

    it('should not render when appointment is null', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={null}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Appointment Details')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and appointment is provided', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    });

    it('should display patient information', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display appointment details', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/january.*15.*2024/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00.*am/i)).toBeInTheDocument();
      expect(screen.getByText('Consultation')).toBeInTheDocument();
    });

    it('should handle snake_case field names', () => {
      const appointmentSnakeCase = {
        id: 1,
        patient_name: 'Jane Smith',
        appointment_date: '2024-01-15',
        appointment_time: '14:00',
        appointment_type: 'Follow-up'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={appointmentSnakeCase}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should handle missing fields gracefully', () => {
      const minimalAppointment = {
        id: 1
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={minimalAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Unknown Patient')).toBeInTheDocument();
    });
  });

  describe('Surgery Time Parsing', () => {
    it('should parse surgery time from notes', () => {
      const appointmentWithSurgery = {
        ...mockAppointment,
        notes: 'Surgery Time: 14:30\nPre-operative consultation'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={appointmentWithSurgery}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/surgery time/i)).toBeInTheDocument();
      expect(screen.getByText(/2:30.*pm/i)).toBeInTheDocument();
    });

    it('should separate surgery time from other notes', () => {
      const appointmentWithSurgery = {
        ...mockAppointment,
        notes: 'Surgery Time: 14:30\nAdditional notes here'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={appointmentWithSurgery}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Additional notes here')).toBeInTheDocument();
    });

    it('should handle notes without surgery time', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText(/surgery time/i)).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display confirmed status with correct styling', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    });

    it('should display pending status', () => {
      const pendingAppointment = {
        ...mockAppointment,
        status: 'pending'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={pendingAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should display cancelled status', () => {
      const cancelledAppointment = {
        ...mockAppointment,
        status: 'cancelled'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={cancelledAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    });
  });

  describe('Reschedule', () => {
    it('should open reschedule modal when Reschedule button is clicked', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
          onReschedule={mockOnReschedule}
        />
      );
      const rescheduleButton = screen.getByText('Reschedule');
      fireEvent.click(rescheduleButton);
      
      expect(screen.getByTestId('update-appointment-modal')).toBeInTheDocument();
    });

    it('should call onReschedule on successful reschedule', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
          onReschedule={mockOnReschedule}
        />
      );
      const rescheduleButton = screen.getByText('Reschedule');
      fireEvent.click(rescheduleButton);
      
      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
      
      expect(mockOnReschedule).toHaveBeenCalled();
    });

    it('should close modal after successful reschedule', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
          onReschedule={mockOnReschedule}
        />
      );
      const rescheduleButton = screen.getByText('Reschedule');
      fireEvent.click(rescheduleButton);
      
      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Automatic Appointments', () => {
    it('should display flexible time message for automatic appointments', () => {
      const automaticAppointment = {
        ...mockAppointment,
        appointment_type: 'automatic',
        type: 'automatic'
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={automaticAppointment}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/flexible.*no time slot/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onReschedule', () => {
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={mockAppointment}
          onClose={mockOnClose}
          onReschedule={null}
        />
      );
      const rescheduleButton = screen.getByText('Reschedule');
      fireEvent.click(rescheduleButton);
      
      // Should not crash
      expect(screen.getByTestId('update-appointment-modal')).toBeInTheDocument();
    });

    it('should handle missing time', () => {
      const appointmentNoTime = {
        ...mockAppointment,
        time: null
      };
      render(
        <AppointmentDetailsModal
          isOpen={true}
          appointment={appointmentNoTime}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
    });
  });
});
