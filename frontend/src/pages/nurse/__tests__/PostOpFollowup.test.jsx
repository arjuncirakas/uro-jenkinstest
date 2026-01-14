import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PostOpFollowup from '../PostOpFollowup';
import { patientService } from '../../../services/patientService';

// Mock dependencies
vi.mock('../../../services/patientService', () => ({
  patientService: {
    getPatients: vi.fn(),
    getPatientById: vi.fn()
  }
}));

vi.mock('../../../components/layout/NurseHeader', () => ({
  default: ({ title }) => <h1>{title}</h1>
}));

vi.mock('../../../components/NursePatientDetailsModal', () => ({
  default: ({ isOpen, onClose, patientId }) => (
    isOpen ? (
      <div data-testid="patient-details-modal">
        <div>Patient ID: {patientId}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../components/UpdateAppointmentModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="update-appointment-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../utils/psaStatusByAge', () => ({
  getPSAStatusByAge: vi.fn((psa, age) => ({
    status: psa > 4 ? 'High' : 'Low',
    threshold: 4
  }))
}));

describe('PostOpFollowup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: []
    });
    patientService.getPatientById.mockResolvedValue({
      success: true,
      data: {}
    });
  });

  describe('Rendering', () => {
    it('should render post-op followup page', () => {
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      expect(screen.getByText(/post-op follow-up/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch active and discharged patients', async () => {
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'Active'
          })
        );
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'Discharged'
          })
        );
      });
    });

    it('should filter by Post-op pathways', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Post-op Transfer'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'Post-op Followup'
        },
        {
          id: 3,
          firstName: 'Bob',
          lastName: 'Johnson',
          carePathway: 'Discharge'
        },
        {
          id: 4,
          firstName: 'Alice',
          lastName: 'Brown',
          carePathway: 'OPD Queue'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
      });
    });

    it('should display patients with surgery information', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Post-op Followup',
          surgeryType: 'Prostatectomy',
          surgeryDate: '2024-01-15',
          assignedUrologist: 'Dr. Smith',
          initialPSA: 4.5,
          age: 50
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Prostatectomy')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should filter patients by search query', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Post-op Followup',
          upi: 'URP123',
          surgeryType: 'Prostatectomy',
          assignedUrologist: 'Dr. Smith'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'Post-op Transfer',
          upi: 'URP456',
          surgeryType: 'Biopsy',
          assignedUrologist: 'Dr. Jones'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Patient Details', () => {
    it('should open patient details modal', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Post-op Followup'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      patientService.getPatientById.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe'
        }
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const viewButton = screen.getByLabelText(/view details.*john doe/i);
        fireEvent.click(viewButton);
      });
      
      await waitFor(() => {
        expect(patientService.getPatientById).toHaveBeenCalledWith(1);
        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
      });
    });
  });

  describe('PSA Display', () => {
    it('should display PSA with status color', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Post-op Followup',
          initialPSA: 5.5,
          age: 50
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('5.5')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      patientService.getPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should handle empty patients list', async () => {
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no post-op.*patients/i)).toBeInTheDocument();
      });
    });

    it('should handle missing patient fields', async () => {
      const mockPatients = [
        {
          id: 1,
          carePathway: 'Post-op Followup'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <PostOpFollowup />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        // Should not crash
        expect(screen.getByText(/post-op follow-up/i)).toBeInTheDocument();
      });
    });
  });
});
