import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditSurgeryAppointmentModal from '../EditSurgeryAppointmentModal';
import { bookingService } from '../../services/bookingService';
import { notesService } from '../../services/notesService';

// Mock dependencies
vi.mock('../../services/bookingService', () => ({
  bookingService: {
    rescheduleNoShowAppointment: vi.fn()
  }
}));

vi.mock('../../services/notesService', () => ({
  notesService: {
    addNote: vi.fn()
  }
}));

describe('EditSurgeryAppointmentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  const mockAppointment = {
    id: 1,
    appointmentDate: '2024-01-15',
    appointmentTime: '10:00',
    reason: 'Prostatectomy',
    priority: 'normal',
    urologistId: 1,
    urologistName: 'Dr. Smith'
  };

  const mockPatient = {
    id: 1,
    name: 'John Doe'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.rescheduleNoShowAppointment.mockResolvedValue({
      success: true
    });
    notesService.addNote.mockResolvedValue({
      success: true
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={false}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      expect(screen.queryByText('Edit Surgery Appointment')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      expect(screen.getByText('Edit Surgery Appointment')).toBeInTheDocument();
    });

    it('should pre-populate form with appointment data', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Prostatectomy')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update surgery date', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const dateInput = screen.getByLabelText(/surgery date/i);
      fireEvent.change(dateInput, { target: { value: '2024-02-15' } });
      
      expect(dateInput.value).toBe('2024-02-15');
    });

    it('should update surgery time', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const timeInput = screen.getByLabelText(/surgery time/i);
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      expect(timeInput.value).toBe('14:00');
    });

    it('should update reason', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const reasonInput = screen.getByLabelText(/reason for surgery/i);
      fireEvent.change(reasonInput, { target: { value: 'Biopsy' } });
      
      expect(reasonInput.value).toBe('Biopsy');
    });

    it('should update priority', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const prioritySelect = screen.getByLabelText(/priority/i);
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } });
      
      expect(prioritySelect.value).toBe('urgent');
    });

    it('should update reschedule reason', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      expect(reasonTextarea.value).toBe('Patient request');
    });
  });

  describe('Form Submission', () => {
    it('should validate required fields', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
          onUpdate={mockOnUpdate}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(bookingService.rescheduleNoShowAppointment).toHaveBeenCalled();
      });
    });

    it('should create reschedule note on success', async () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
          onUpdate={mockOnUpdate}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            noteType: 'clinical'
          })
        );
      });
    });

    it('should dispatch surgery:updated event on success', async () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
          onUpdate={mockOnUpdate}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(eventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'surgery:updated'
          })
        );
      });
      
      eventSpy.mockRestore();
    });

    it('should call onUpdate on success', async () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
          onUpdate={mockOnUpdate}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should close modal on success', async () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
          onUpdate={mockOnUpdate}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle API errors', async () => {
      bookingService.rescheduleNoShowAppointment.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });
      
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={mockPatient}
        />
      );
      
      const reasonTextarea = screen.getByLabelText(/reason for rescheduling/i);
      fireEvent.change(reasonTextarea, { target: { value: 'Patient request' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Surgery Time Parsing', () => {
    it('should extract surgery time from notes', () => {
      const appointmentWithTimeInNotes = {
        ...mockAppointment,
        notes: 'Surgery Time: 14:30'
      };
      
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={appointmentWithTimeInNotes}
          patient={mockPatient}
        />
      );
      expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patient', () => {
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          patient={null}
        />
      );
      // Should not crash
      expect(screen.getByText('Edit Surgery Appointment')).toBeInTheDocument();
    });

    it('should handle missing appointment fields', () => {
      const minimalAppointment = {
        id: 1
      };
      
      render(
        <EditSurgeryAppointmentModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={minimalAppointment}
          patient={mockPatient}
        />
      );
      // Should not crash
      expect(screen.getByText('Edit Surgery Appointment')).toBeInTheDocument();
    });
  });
});
