import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MDTSchedulingModal from '../MDTSchedulingModal';
import { doctorsService } from '../../services/doctorsService';
import { investigationService } from '../../services/investigationService';
import { mdtService } from '../../services/mdtService';

// Mock dependencies
vi.mock('../../services/doctorsService', () => ({
  doctorsService: {
    getDoctorsForDropdown: vi.fn(),
    getAllDepartments: vi.fn(),
    addDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn()
  }
}));

vi.mock('../../services/investigationService', () => ({
  investigationService: {
    getInvestigationResults: vi.fn()
  }
}));

vi.mock('../../services/mdtService', () => ({
  mdtService: {
    scheduleMDTMeeting: vi.fn()
  }
}));

vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

vi.mock('../ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={() => onConfirm(true)}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
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

describe('MDTSchedulingModal', () => {
  const mockOnClose = vi.fn();
  const mockOnScheduled = vi.fn();

  const mockPatient = {
    id: 1,
    name: 'John Doe',
    age: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    doctorsService.getDoctorsForDropdown.mockResolvedValue([]);
    doctorsService.getAllDepartments.mockResolvedValue({
      success: true,
      data: []
    });
    investigationService.getInvestigationResults.mockResolvedValue({
      success: true,
      data: { results: [] }
    });
    mdtService.scheduleMDTMeeting.mockResolvedValue({
      success: true,
      data: {}
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <MDTSchedulingModal
          isOpen={false}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.queryByText(/schedule mdt/i)).not.toBeInTheDocument();
    });

    it('should not render when patient is null', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={null}
        />
      );
      expect(screen.queryByText(/schedule mdt/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and patient is provided', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByText(/schedule mdt/i)).toBeInTheDocument();
    });

    it('should display patient information', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update MDT date', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const dateInput = screen.getByLabelText(/mdt date/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
      
      expect(dateInput.value).toBe('2024-01-15');
    });

    it('should update MDT time', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const timeInput = screen.getByLabelText(/time/i);
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      expect(timeInput.value).toBe('14:00');
    });

    it('should update priority', () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const prioritySelect = screen.getByLabelText(/priority/i);
      fireEvent.change(prioritySelect, { target: { value: 'High' } });
      
      expect(prioritySelect.value).toBe('High');
    });
  });

  describe('Team Members', () => {
    it('should add team member', async () => {
      doctorsService.getDoctorsForDropdown.mockResolvedValue([
        { id: 1, name: 'Dr. Smith' }
      ]);
      
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        const addButton = screen.getByText(/add team member/i);
        fireEvent.click(addButton);
      });
      
      await waitFor(() => {
        const selectButton = screen.getByText('Dr. Smith');
        fireEvent.click(selectButton);
      });
      
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onScheduled={mockOnScheduled}
        />
      );
      
      const submitButton = screen.getByText(/schedule mdt/i);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mdtService.scheduleMDTMeeting).toHaveBeenCalled();
      });
    });

    it('should call onScheduled on success', async () => {
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onScheduled={mockOnScheduled}
        />
      );
      
      const submitButton = screen.getByText(/schedule mdt/i);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnScheduled).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      doctorsService.getDoctorsForDropdown.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <MDTSchedulingModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      await waitFor(() => {
        expect(doctorsService.getDoctorsForDropdown).toHaveBeenCalled();
      });
    });
  });
});
