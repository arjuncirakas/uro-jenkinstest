import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpdateAppointmentModal from '../UpdateAppointmentModal';
import { bookingService } from '../../services/bookingService';
import { investigationService } from '../../services/investigationService';

// Mock dependencies
vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getAvailableUrologists: vi.fn(),
    getAvailableTimeSlots: vi.fn(),
    updateAppointment: vi.fn(),
    createAppointment: vi.fn()
  }
}));

vi.mock('../../services/investigationService', () => ({
  investigationService: {
    getInvestigationResults: vi.fn()
  }
}));

vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

vi.mock('../ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={() => onConfirm(true)}>Save</button>
        <button onClick={() => onConfirm(false)}>Don't Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

describe('UpdateAppointmentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockPatient = {
    id: 1,
    name: 'John Doe',
    nextAppointmentDate: '2024-01-15',
    nextAppointmentTime: '10:00',
    urologist: 'Dr. Smith'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.getAvailableUrologists.mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'Dr. Smith' }]
    });
    bookingService.getAvailableTimeSlots.mockResolvedValue({
      success: true,
      data: [{ time: '10:00', available: true }]
    });
    investigationService.getInvestigationResults.mockResolvedValue({
      success: true,
      data: { results: [] }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <UpdateAppointmentModal
          isOpen={false}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.queryByText(/appointment/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and patient is provided', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByText(/appointment/i)).toBeInTheDocument();
    });

    it('should pre-populate with existing appointment data', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    });
  });

  describe('Appointment Type Selection', () => {
    it('should switch between urologist and investigation', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const investigationRadio = screen.getByLabelText(/investigation/i);
      fireEvent.click(investigationRadio);
      
      expect(investigationRadio.checked).toBe(true);
    });
  });

  describe('Form Input', () => {
    it('should update selected date', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const dateInput = screen.getByLabelText(/date/i);
      fireEvent.change(dateInput, { target: { value: '2024-02-15' } });
      
      expect(dateInput.value).toBe('2024-02-15');
    });

    it('should update selected time', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const timeInput = screen.getByLabelText(/time/i);
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      expect(timeInput.value).toBe('14:00');
    });

    it('should update notes', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const notesTextarea = screen.getByLabelText(/notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
      
      expect(notesTextarea.value).toBe('Test notes');
    });
  });

  describe('Urologist Selection', () => {
    it('should fetch urologists on open', async () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
      });
    });

    it('should display urologists in dropdown', async () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Time Slots', () => {
    it('should fetch available time slots when doctor and date are selected', async () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        const dateInput = screen.getByLabelText(/date/i);
        fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
      });
      
      await waitFor(() => {
        expect(bookingService.getAvailableTimeSlots).toHaveBeenCalled();
      });
    });
  });

  describe('PSA Fetching', () => {
    it('should fetch latest PSA when patient ID is provided', async () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        expect(investigationService.getInvestigationResults).toHaveBeenCalledWith(1, 'psa');
      });
    });

    it('should use PSA from patient object if available', async () => {
      const patientWithPSA = {
        ...mockPatient,
        psa: 4.5
      };
      
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={patientWithPSA}
        />
      );
      
      // Should not fetch if PSA is in patient object
      await waitFor(() => {
        expect(investigationService.getInvestigationResults).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should validate required fields', async () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);
      
      // Should show validation errors
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      bookingService.updateAppointment.mockResolvedValue({
        success: true
      });
      
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onSuccess={mockOnSuccess}
        />
      );
      
      await waitFor(() => {
        const submitButton = screen.getByText(/save/i);
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(bookingService.updateAppointment).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patient', () => {
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={null}
        />
      );
      // Should not crash
      expect(screen.queryByText(/appointment/i)).not.toBeInTheDocument();
    });

    it('should handle missing patient fields', () => {
      const minimalPatient = {
        id: 1
      };
      
      render(
        <UpdateAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          patient={minimalPatient}
        />
      );
      // Should not crash
      expect(screen.getByText(/appointment/i)).toBeInTheDocument();
    });
  });
});
