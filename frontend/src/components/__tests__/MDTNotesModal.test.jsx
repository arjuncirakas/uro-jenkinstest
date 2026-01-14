import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MDTNotesModal from '../MDTNotesModal';
import { mdtService } from '../../services/mdtService';
import { patientService } from '../../services/patientService';
import { doctorsService } from '../../services/doctorsService';

// Mock dependencies
vi.mock('../../services/mdtService', () => ({
  mdtService: {
    getMeetingById: vi.fn(),
    updateMeetingNotes: vi.fn()
  }
}));

vi.mock('../../services/patientService', () => ({
  patientService: {
    getPatientById: vi.fn()
  }
}));

vi.mock('../../services/doctorsService', () => ({
  doctorsService: {
    getAllDoctors: vi.fn()
  }
}));

vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

vi.mock('../modals/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../modals/ErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
  )
}));

describe('MDTNotesModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mdtService.getMeetingById.mockResolvedValue({
      success: true,
      data: {}
    });
    patientService.getPatientById.mockResolvedValue({
      success: true,
      data: {}
    });
    doctorsService.getAllDoctors.mockResolvedValue({
      success: true,
      data: []
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <MDTNotesModal
          isOpen={false}
          onClose={mockOnClose}
          patientName="John Doe"
        />
      );
      expect(screen.queryByText(/mdt notes/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
        />
      );
      expect(screen.getByText(/mdt notes/i)).toBeInTheDocument();
    });

    it('should display patient name', () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch meeting data when meetingId is provided', async () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
          meetingId={1}
        />
      );
      
      await waitFor(() => {
        expect(mdtService.getMeetingById).toHaveBeenCalledWith(1);
      });
    });

    it('should fetch patient data when meeting has patient ID', async () => {
      mdtService.getMeetingById.mockResolvedValue({
        success: true,
        data: {
          patient: { id: 1 }
        }
      });
      
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
          meetingId={1}
        />
      );
      
      await waitFor(() => {
        expect(patientService.getPatientById).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Form Editing', () => {
    it('should enter edit mode', async () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
          meetingId={1}
        />
      );
      
      await waitFor(() => {
        const editButton = screen.getByText(/edit/i);
        fireEvent.click(editButton);
      });
      
      // Should show editable form
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should update form fields', async () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
          meetingId={1}
        />
      );
      
      await waitFor(() => {
        const editButton = screen.getByText(/edit/i);
        fireEvent.click(editButton);
      });
      
      const dateInput = screen.getByLabelText(/date/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
      
      expect(dateInput.value).toBe('2024-01-15');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null meetingId', () => {
      render(
        <MDTNotesModal
          isOpen={true}
          onClose={mockOnClose}
          patientName="John Doe"
          meetingId={null}
        />
      );
      // Should not crash
      expect(screen.getByText(/mdt notes/i)).toBeInTheDocument();
    });
  });
});
