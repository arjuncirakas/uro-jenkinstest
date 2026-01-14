import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientsDueForReviewModal from '../PatientsDueForReviewModal';

describe('PatientsDueForReviewModal', () => {
  const mockOnClose = vi.fn();
  const mockPatientModalRef = { current: { openPatientDetails: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={false}
          onClose={mockOnClose}
          patients={[]}
        />
      );
      expect(screen.queryByText('Patients Due for Review')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
        />
      );
      expect(screen.getByText('Patients Due for Review')).toBeInTheDocument();
    });

    it('should display patient count', () => {
      const mockPatients = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      expect(screen.getByText(/2 patients/i)).toBeInTheDocument();
    });

    it('should display singular patient count', () => {
      const mockPatients = [
        { id: 1, name: 'John Doe' }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      expect(screen.getByText(/1 patient/i)).toBeInTheDocument();
    });
  });

  describe('Patients Display', () => {
    it('should display patients in table', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          age: 50,
          type: 'Follow-up',
          date: '2024-01-15',
          priority: 'High'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
          patientModalRef={mockPatientModalRef}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });

    it('should display loading state', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
          loading={true}
        />
      );
      expect(screen.getByText(/loading patients/i)).toBeInTheDocument();
    });

    it('should display error state', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
          error="Fetch failed"
        />
      );
      expect(screen.getByText(/error.*fetch failed/i)).toBeInTheDocument();
    });

    it('should display empty state', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
        />
      );
      expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
    });
  });

  describe('Priority Colors', () => {
    it('should apply correct color for High priority', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          priority: 'High'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      const priorityBadge = screen.getByText('High');
      expect(priorityBadge.className).toContain('bg-red-100');
    });

    it('should apply correct color for Medium priority', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          priority: 'Medium'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      const priorityBadge = screen.getByText('Medium');
      expect(priorityBadge.className).toContain('bg-yellow-100');
    });

    it('should apply correct color for Low priority', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          priority: 'Low'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      const priorityBadge = screen.getByText('Low');
      expect(priorityBadge.className).toContain('bg-green-100');
    });
  });

  describe('Type Colors', () => {
    it('should apply correct color for Post-Op Follow-up', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          type: 'Post-Op Follow-up'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      const typeBadge = screen.getByText('Post-Op Follow-up');
      expect(typeBadge.className).toContain('bg-purple-100');
    });

    it('should apply correct color for Surgery', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          type: 'Surgery'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      const typeBadge = screen.getByText('Surgery');
      expect(typeBadge.className).toContain('bg-orange-100');
    });
  });

  describe('Patient Click', () => {
    it('should open patient details when view button is clicked', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe',
          appointmentId: 1
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
          patientModalRef={mockPatientModalRef}
        />
      );
      const viewButton = screen.getByLabelText(/view.*john doe/i);
      fireEvent.click(viewButton);
      
      expect(mockPatientModalRef.current.openPatientDetails).toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should close modal on Escape key', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={[]}
        />
      );
      const closeButton = screen.getByLabelText(/close modal/i);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing patient fields', () => {
      const mockPatients = [
        {
          id: 1
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
        />
      );
      expect(screen.getByText('Unknown Patient')).toBeInTheDocument();
    });

    it('should handle null patientModalRef', () => {
      const mockPatients = [
        {
          id: 1,
          name: 'John Doe'
        }
      ];
      
      render(
        <PatientsDueForReviewModal
          isOpen={true}
          onClose={mockOnClose}
          patients={mockPatients}
          patientModalRef={null}
        />
      );
      const viewButton = screen.getByLabelText(/view.*john doe/i);
      fireEvent.click(viewButton);
      
      // Should not crash
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
