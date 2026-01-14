import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ActiveMonitoring from '../ActiveMonitoring';
import { patientService } from '../../../services/patientService';
import { bookingService } from '../../../services/bookingService';

// Mock dependencies
vi.mock('../../../services/patientService', () => ({
  patientService: {
    getPatients: vi.fn(),
    getAllUrologists: vi.fn(),
    getPatientById: vi.fn()
  }
}));

vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getAvailableUrologists: vi.fn()
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

describe('ActiveMonitoring (Nurse)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: []
    });
    patientService.getAllUrologists.mockResolvedValue({
      success: true,
      data: []
    });
    bookingService.getAvailableUrologists.mockResolvedValue({
      success: true,
      data: []
    });
  });

  describe('Rendering', () => {
    it('should render active monitoring page', () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      expect(screen.getByText(/active monitoring/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search.*monitoring/i)).toBeInTheDocument();
    });

    it('should display urologist filter', () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/filter by urologist/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch active monitoring patients', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            activeMonitoring: 'true'
          })
        );
      });
    });

    it('should fetch urologists for filtering', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getAllUrologists).toHaveBeenCalled();
      });
    });

    it('should fallback to booking service for urologists', async () => {
      patientService.getAllUrologists.mockResolvedValue({
        success: false
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
      });
    });

    it('should display patients', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Active Monitoring',
          initialPSA: 4.5,
          age: 50,
          nextAppointmentDate: '2024-01-15'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should sort patients by appointment date', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'Later',
          lastName: 'Patient',
          carePathway: 'Active Monitoring',
          nextAppointmentDate: '2024-02-15'
        },
        {
          id: 2,
          firstName: 'Earlier',
          lastName: 'Patient',
          carePathway: 'Active Monitoring',
          nextAppointmentDate: '2024-01-15'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const patients = screen.getAllByText(/patient/i);
        expect(patients[0].textContent).toContain('Earlier');
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
          carePathway: 'Active Monitoring',
          upi: 'URP123'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'Active Monitoring',
          upi: 'URP456'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search.*monitoring/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Urologist Filter', () => {
    it('should filter by urologist', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Active Monitoring',
          assignedUrologist: 'Dr. Smith'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'Active Monitoring',
          assignedUrologist: 'Dr. Jones'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const urologistSelect = screen.getByLabelText(/filter by urologist/i);
      fireEvent.change(urologistSelect, { target: { value: 'Dr. Smith' } });
      
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
          carePathway: 'Active Monitoring'
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
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const viewButton = screen.getByLabelText(/view details.*john doe/i);
        fireEvent.click(viewButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      patientService.getPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should handle empty patients list', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no.*monitoring.*patients/i)).toBeInTheDocument();
      });
    });
  });
});
