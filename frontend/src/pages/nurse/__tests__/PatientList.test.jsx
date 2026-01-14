import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PatientList from '../PatientList';
import { patientService } from '../../../services/patientService';
import { investigationService } from '../../../services/investigationService';
import { bookingService } from '../../../services/bookingService';

// Mock dependencies
vi.mock('../../../services/patientService', () => ({
  patientService: {
    getPatients: vi.fn(),
    getPatientById: vi.fn(),
    deletePatient: vi.fn()
  }
}));

vi.mock('../../../services/investigationService', () => ({
  investigationService: {
    getInvestigationRequests: vi.fn()
  }
}));

vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getPatientInvestigationBookings: vi.fn()
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

vi.mock('../../../components/modals/ConfirmationModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="delete-confirm-modal">
        <button onClick={onConfirm}>Delete</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../components/modals/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/ErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
  )
}));

vi.mock('../../../utils/psaStatusByAge', () => ({
  getPSAStatusByAge: vi.fn((psa, age) => ({
    status: psa > 4 ? 'High' : 'Low',
    threshold: 4
  }))
}));

describe('PatientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: [],
      pagination: {
        page: 1,
        pages: 1,
        total: 0
      }
    });
    patientService.getPatientById.mockResolvedValue({
      success: true,
      data: {}
    });
    investigationService.getInvestigationRequests.mockResolvedValue({
      success: true,
      data: []
    });
    bookingService.getPatientInvestigationBookings.mockResolvedValue({
      success: true,
      data: { bookings: [] }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render patient list page', () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      expect(screen.getByText(/patient list/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument();
    });

    it('should display urologist filter', () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/filter by urologist/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch patients on mount', async () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            limit: 20,
            status: 'Active'
          })
        );
      });
    });

    it('should display patients', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          upi: 'URP123',
          age: 50,
          assignedUrologist: 'Dr. Smith',
          latestPSA: 4.5
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients,
        pagination: {
          page: 1,
          pages: 1,
          total: 1
        }
      });
      
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      patientService.getPatients.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });
      
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should debounce search requests', async () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'John'
          })
        );
      });
    });
  });

  describe('Urologist Filter', () => {
    it('should filter by urologist', async () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      const urologistSelect = screen.getByLabelText(/filter by urologist/i);
      fireEvent.change(urologistSelect, { target: { value: 'Dr. Smith' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            assignedUrologist: 'Dr. Smith'
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should navigate to next page', async () => {
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: [],
        pagination: {
          page: 1,
          pages: 3,
          total: 60
        }
      });
      
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const nextButton = screen.getByLabelText(/next page/i);
        fireEvent.click(nextButton);
      });
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2
          })
        );
      });
    });
  });

  describe('Patient Details', () => {
    it('should open patient details modal', async () => {
      const mockPatients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          upi: 'URP123',
          age: 50
        }
      ];
      
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: mockPatients,
        pagination: {
          page: 1,
          pages: 1,
          total: 1
        }
      });
      
      render(
        <BrowserRouter>
          <PatientList />
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

  describe('Event Listeners', () => {
    it('should refresh on PSA update event', async () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('psaResultAdded', { detail: { id: 1 } }));
      
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledTimes(2);
      });
    });

    it('should refresh on patient added event', async () => {
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('patientAdded', { detail: { id: 1 } }));
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patient data', async () => {
      patientService.getPatients.mockResolvedValue({
        success: true,
        data: null,
        pagination: {
          page: 1,
          pages: 1,
          total: 0
        }
      });
      
      render(
        <BrowserRouter>
          <PatientList />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(patientService.getPatients).toHaveBeenCalled();
      });
    });
  });
});
