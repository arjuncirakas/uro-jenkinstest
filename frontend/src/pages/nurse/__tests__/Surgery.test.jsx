import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Surgery from '../Surgery';
import { patientService } from '../../../services/patientService';
import { bookingService } from '../../../services/bookingService';

// Mock dependencies
vi.mock('../../../services/patientService', () => ({
  patientService: {
    getPatients: vi.fn(),
    getPatientById: vi.fn()
  }
}));

vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getPatientAppointments: vi.fn()
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

describe('Surgery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: []
    });
    bookingService.getPatientAppointments.mockResolvedValue({
      success: true,
      data: { appointments: [] }
    });
  });

  describe('Rendering', () => {
    it('should render surgery page', () => {
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      expect(screen.getByText(/surgery/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search.*surgery/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch surgery pathway patients', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway',
          assignedUrologist: 'Dr. Smith'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });

    it('should filter by Surgery Pathway', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'OPD Queue'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should fetch appointments for each patient', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      bookingService.getPatientAppointments.mockResolvedValue({
        success: true,
        data: {
          appointments: [{
            id: 1,
            appointmentType: 'Surgery',
            surgeryType: 'Prostatectomy'
          }]
        }
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getPatientAppointments).toHaveBeenCalledWith(1);
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
          carePathway: 'Surgery Pathway',
          upi: 'URP123'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          carePathway: 'Surgery Pathway',
          upi: 'URP456'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search.*surgery/i);
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
          carePathway: 'Surgery Pathway'
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
          <Surgery />
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

  describe('Surgery Appointment Detection', () => {
    it('should detect surgery appointments by surgeryType', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      bookingService.getPatientAppointments.mockResolvedValue({
        success: true,
        data: {
          appointments: [{
            id: 1,
            surgeryType: 'Prostatectomy',
            appointmentDate: '2024-01-15',
            appointmentTime: '10:00'
          }]
        }
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getPatientAppointments).toHaveBeenCalled();
      });
    });

    it('should detect surgery appointments by appointmentType', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      bookingService.getPatientAppointments.mockResolvedValue({
        success: true,
        data: {
          appointments: [{
            id: 1,
            appointmentType: 'Surgery',
            appointmentDate: '2024-01-15'
          }]
        }
      });
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getPatientAppointments).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      patientService.getPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should handle appointment fetch error for individual patient', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          carePathway: 'Surgery Pathway'
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      bookingService.getPatientAppointments.mockRejectedValue(new Error('Appointment fetch failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <BrowserRouter>
          <Surgery />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });
});
