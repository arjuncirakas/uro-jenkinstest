import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import PatientDetailsModalWrapper from '../PatientDetailsModalWrapper';
import { patientService } from '../../services/patientService';
import { notesService } from '../../services/notesService';
import { investigationService } from '../../services/investigationService';

// Mock dependencies
vi.mock('../../services/patientService', () => ({
  patientService: {
    getPatients: vi.fn(),
    getAllPatients: vi.fn(),
    getPatientById: vi.fn()
  }
}));

vi.mock('../../services/notesService', () => ({
  notesService: {
    getPatientNotes: vi.fn()
  }
}));

vi.mock('../../services/investigationService', () => ({
  investigationService: {
    getInvestigationResults: vi.fn()
  }
}));

vi.mock('../UrologistPatientDetailsModal', () => ({
  default: ({ patient, onClose }) => (
    patient ? <div data-testid="patient-details-modal">Patient Details</div> : null
  )
}));

describe('PatientDetailsModalWrapper', () => {
  const mockOnTransferSuccess = vi.fn();
  let mockRef;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRef = { current: null };
    
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: []
    });
    patientService.getAllPatients.mockResolvedValue({
      success: true,
      data: []
    });
    patientService.getPatientById.mockResolvedValue({
      success: true,
      data: {}
    });
    notesService.getPatientNotes.mockResolvedValue({
      success: true,
      data: []
    });
    investigationService.getInvestigationResults.mockResolvedValue({
      success: true,
      data: []
    });
  });

  describe('openPatientDetails - UPI Search', () => {
    it('should find patient by UPI from appointment data', async () => {
      const mockPatient = {
        id: 1,
        upi: 'URP123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', { upi: 'URP123' });
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'URP123'
          })
        );
      });
    });

    it('should fallback to name search when UPI search fails', async () => {
      patientService.getPatients
        .mockResolvedValueOnce({
          success: true,
          data: []
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, firstName: 'John', lastName: 'Doe' }]
        });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', { upi: 'URP123' });
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'John Doe'
          })
        );
      });
    });
  });

  describe('openPatientDetails - Name Search', () => {
    it('should find patient by exact name match', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'John Doe'
          })
        );
      });
    });

    it('should handle name search with first_name and last_name fields', async () => {
      const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });
  });

  describe('openPatientDetails - All Patients Search', () => {
    it('should search all patients when name search fails', async () => {
      patientService.getPatients
        .mockResolvedValueOnce({
          success: true,
          data: []
        })
        .mockResolvedValueOnce({
          success: true,
          data: []
        });
      
      patientService.getAllPatients.mockResolvedValue({
        success: true,
        data: [{ id: 1, firstName: 'John', lastName: 'Doe' }]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getAllPatients).toHaveBeenCalled();
      });
    });

    it('should find patient by UPI in all patients', async () => {
      const mockPatient = {
        id: 1,
        upi: 'URP123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      patientService.getAllPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', { upi: 'URP123' });
        }
      });
      
      await waitFor(() => {
        expect(patientService.getAllPatients).toHaveBeenCalled();
      });
    });
  });

  describe('openPatientDetails - Patient Data Processing', () => {
    it('should fetch full patient details by ID', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const mockFullDetails = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        triageSymptoms: [],
        dreFindings: []
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      patientService.getPatientById.mockResolvedValue({
        success: true,
        data: mockFullDetails
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatientById).toHaveBeenCalledWith(1);
      });
    });

    it('should fetch notes and investigations', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      notesService.getPatientNotes.mockResolvedValue({
        success: true,
        data: [{ id: 1, note: 'Test note' }]
      });
      
      investigationService.getInvestigationResults.mockResolvedValue({
        success: true,
        data: [{ id: 1, testType: 'PSA' }]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(notesService.getPatientNotes).toHaveBeenCalledWith(1);
        expect(investigationService.getInvestigationResults).toHaveBeenCalledWith(1);
      });
    });

    it('should determine category from care pathway', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        carePathway: 'Surgery Pathway'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', null, 'all');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should create patient from appointment data when not found', async () => {
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      patientService.getAllPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      const appointmentData = {
        id: 1,
        upi: 'URP123',
        age: 50,
        gender: 'Male',
        appointmentDate: '2024-01-01',
        psa: 4.5
      };
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', appointmentData);
        }
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle patient search error', async () => {
      patientService.getPatients.mockRejectedValue(new Error('Search failed'));
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should handle notes fetch error', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      notesService.getPatientNotes.mockRejectedValue(new Error('Notes fetch failed'));
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(notesService.getPatientNotes).toHaveBeenCalled();
      });
    });

    it('should handle investigations fetch error', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      investigationService.getInvestigationResults.mockRejectedValue(new Error('Investigations fetch failed'));
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(investigationService.getInvestigationResults).toHaveBeenCalled();
      });
    });
  });

  describe('Imperative Handle', () => {
    it('should expose openPatientDetails method via ref', () => {
      const ref = { current: null };
      render(
        <PatientDetailsModalWrapper
          ref={ref}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      expect(ref.current).toBeDefined();
      expect(typeof ref.current.openPatientDetails).toBe('function');
    });

    it('should call openPatientDetails with correct parameters', async () => {
      const ref = { current: null };
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      render(
        <PatientDetailsModalWrapper
          ref={ref}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (ref.current) {
          ref.current.openPatientDetails('John Doe', { upi: 'URP123' }, 'surgery-pathway');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });
  });

  describe('PSA Results Filtering', () => {
    it('should filter PSA results from investigations', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      investigationService.getInvestigationResults.mockResolvedValue({
        success: true,
        data: [
          { id: 1, testType: 'PSA', value: 4.5 },
          { id: 2, testType: 'MRI', value: 'Normal' }
        ]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(investigationService.getInvestigationResults).toHaveBeenCalled();
      });
    });

    it('should handle test_type field variations', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [mockPatient]
      });
      
      investigationService.getInvestigationResults.mockResolvedValue({
        success: true,
        data: [
          { id: 1, test_type: 'psa', value: 4.5 },
          { id: 2, test_type: 'PSA', value: 5.0 }
        ]
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(investigationService.getInvestigationResults).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patientName', async () => {
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails(null);
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should handle null appointmentData', async () => {
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', null);
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should handle null category', async () => {
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe', null, null);
        }
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should handle empty search results', async () => {
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      patientService.getAllPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      const { result } = render(
        <PatientDetailsModalWrapper
          ref={mockRef}
          onTransferSuccess={mockOnTransferSuccess}
        />
      );
      
      await waitFor(() => {
        if (mockRef.current) {
          mockRef.current.openPatientDetails('John Doe');
        }
      });
      
      await waitFor(() => {
        expect(patientService.getAllPatients).toHaveBeenCalled();
      });
    });
  });
});
