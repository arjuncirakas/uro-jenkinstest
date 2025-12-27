import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OPDManagement from '../OPDManagement';
import { bookingService } from '../../../services/bookingService';
import { patientService } from '../../../services/patientService';
import { getPSAStatusByAge } from '../../../utils/psaStatusByAge';

// Mock services
vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getTodaysAppointments: vi.fn(),
    getNoShowPatients: vi.fn(),
    getUpcomingAppointments: vi.fn(),
  }
}));

vi.mock('../../../services/patientService', () => ({
  patientService: {
    getNewPatients: vi.fn(),
    getPatientById: vi.fn(),
    getPatients: vi.fn(),
  }
}));

vi.mock('../../../utils/psaStatusByAge', () => ({
  getPSAStatusByAge: vi.fn(),
}));

// Mock child components
vi.mock('../../../components/layout/NurseHeader', () => ({
  default: ({ title }) => <div data-testid="nurse-header">{title}</div>
}));

vi.mock('../../../components/NursePatientDetailsModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="patient-details-modal">Patient Modal</div> : null
}));

vi.mock('../../../components/BookInvestigationModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="investigation-modal">Investigation Modal</div> : null
}));

vi.mock('../../../components/AddScheduleModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="schedule-modal">Schedule Modal</div> : null
}));

vi.mock('../../../components/NoShowPatientModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="no-show-modal">No Show Modal</div> : null
}));

describe('OPDManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock responses
    bookingService.getTodaysAppointments.mockResolvedValue({
      success: true,
      data: { appointments: [] }
    });
    bookingService.getNoShowPatients.mockResolvedValue({
      success: true,
      data: { noShowPatients: [] }
    });
    bookingService.getUpcomingAppointments.mockResolvedValue({
      success: true,
      data: { appointments: [], hasMore: false }
    });
    patientService.getNewPatients.mockResolvedValue({
      success: true,
      data: { patients: [] }
    });
    getPSAStatusByAge.mockReturnValue({ status: 'Normal' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the component with header', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('nurse-header')).toHaveTextContent('OPD Management');
      });
    });

    it('should render only two tabs: Investigation and Urologist (no Follow-up tab)', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Investigation')).toBeInTheDocument();
        expect(screen.getByText('Urologist')).toBeInTheDocument();
        expect(screen.queryByText('Follow-up')).not.toBeInTheDocument();
      });
    });

    it('should default to investigation tab', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const investigationTab = screen.getByText('Investigation').closest('button');
        expect(investigationTab).toHaveClass('bg-teal-600');
      });
    });

    it('should switch to urologist tab when clicked', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist').closest('button');
        expect(urologistTab).toHaveClass('bg-teal-600');
      });
    });
  });

  describe('Appointment Filtering', () => {
    it('should show investigation appointments in investigation tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show follow-up appointments in investigation tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: '11:00',
          urologist: 'Dr. Johnson',
          type: 'automatic',
          appointment_type: 'automatic',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should show urologist appointments in urologist tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Bob Wilson',
          age: 55,
          psa: '5.1',
          appointmentDate: '2025-01-15',
          appointmentTime: '14:00',
          urologist: 'Dr. Brown',
          type: 'urologist',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('should show follow-up appointments in urologist tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Alice Cooper',
          age: 60,
          psa: '6.0',
          appointmentDate: '2025-01-15',
          appointmentTime: '15:00',
          urologist: 'Dr. White',
          type: 'automatic',
          appointment_type: 'automatic',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });
    });

    it('should filter out no-show appointments from both tabs', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'no_show'
        },
        {
          id: 2,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: '11:00',
          urologist: 'Dr. Johnson',
          type: 'urologist',
          status: 'no_show'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should show both investigation and follow-up appointments in investigation tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'scheduled'
        },
        {
          id: 2,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: '11:00',
          urologist: 'Dr. Johnson',
          type: 'automatic',
          appointment_type: 'automatic',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should show both urologist and follow-up appointments in urologist tab', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Bob Wilson',
          age: 55,
          psa: '5.1',
          appointmentDate: '2025-01-15',
          appointmentTime: '14:00',
          urologist: 'Dr. Brown',
          type: 'urologist',
          status: 'scheduled'
        },
        {
          id: 2,
          patientName: 'Alice Cooper',
          age: 60,
          psa: '6.0',
          appointmentDate: '2025-01-15',
          appointmentTime: '15:00',
          urologist: 'Dr. White',
          type: 'automatic',
          appointment_type: 'automatic',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });
    });

    it('should handle follow-up appointments identified by appointment_type field', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Test Patient',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Smith',
          type: 'urologist',
          appointment_type: 'automatic', // Follow-up identified by appointment_type
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Should appear in investigation tab (default)
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        // Should also appear in urologist tab
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should display empty message when no investigation appointments found', async () => {
      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: [] }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No investigation appointments found/)).toBeInTheDocument();
      });
    });

    it('should display empty message when no urologist appointments found', async () => {
      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: [] }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/No urologist appointments found/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when fetching appointments', async () => {
      bookingService.getTodaysAppointments.mockResolvedValue({
        success: false,
        error: 'Failed to fetch appointments'
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch appointments')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should refresh appointments when retry button is clicked', async () => {
      bookingService.getTodaysAppointments
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to fetch appointments'
        })
        .mockResolvedValueOnce({
          success: true,
          data: { appointments: [] }
        });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(bookingService.getTodaysAppointments.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle error when fetching new patients', async () => {
      patientService.getNewPatients.mockResolvedValue({
        success: false,
        error: 'Failed to fetch new patients'
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch new patients')).toBeInTheDocument();
      });
    });

    it('should handle error when fetching no-show patients', async () => {
      bookingService.getNoShowPatients.mockResolvedValue({
        success: false,
        error: 'Failed to fetch no-show patients'
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch no-show patients')).toBeInTheDocument();
      });
    });

    it('should handle error when fetching upcoming appointments', async () => {
      bookingService.getUpcomingAppointments.mockResolvedValue({
        success: false,
        error: 'Failed to fetch upcoming appointments'
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to fetch upcoming appointments/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch all data on component mount', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(bookingService.getTodaysAppointments).toHaveBeenCalledWith(null);
        expect(bookingService.getNoShowPatients).toHaveBeenCalled();
        expect(bookingService.getUpcomingAppointments).toHaveBeenCalled();
        expect(patientService.getNewPatients).toHaveBeenCalled();
      });
    });

    it('should fetch all appointments (null) regardless of active tab', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(bookingService.getTodaysAppointments).toHaveBeenCalledWith(null);
      });

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      // Should not call again when tab changes (filtering is done on frontend)
      await waitFor(() => {
        expect(bookingService.getTodaysAppointments).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointments with null appointmentTime', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: null,
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle appointments with undefined appointmentTime', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: undefined,
          urologist: 'Dr. Johnson',
          type: 'urologist',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle empty appointments array', async () => {
      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: [] }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No investigation appointments found/)).toBeInTheDocument();
      });
    });

    it('should handle appointments with missing fields', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'Test Patient',
          age: null,
          psa: null,
          appointmentDate: null,
          appointmentTime: null,
          urologist: null,
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });
    });

    it('should handle appointments with empty string values', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: '',
          age: '',
          psa: '',
          appointmentDate: '',
          appointmentTime: '',
          urologist: '',
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Component should render without crashing
        expect(screen.getByTestId('nurse-header')).toBeInTheDocument();
      });
    });
  });

  describe('Appointment Sorting', () => {
    it('should sort appointments by time', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: '14:00',
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'scheduled'
        },
        {
          id: 2,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Johnson',
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const rows = screen.getAllByText(/John Doe|Jane Smith/);
        // Jane should appear first (10:00) before John (14:00)
        expect(rows[0]).toHaveTextContent('Jane Smith');
      });
    });

    it('should place appointments without time at the end', async () => {
      const mockAppointments = [
        {
          id: 1,
          patientName: 'John Doe',
          age: 45,
          psa: '3.5',
          appointmentDate: '2025-01-15',
          appointmentTime: null,
          urologist: 'Dr. Smith',
          type: 'investigation',
          status: 'scheduled'
        },
        {
          id: 2,
          patientName: 'Jane Smith',
          age: 50,
          psa: '4.2',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:00',
          urologist: 'Dr. Johnson',
          type: 'investigation',
          status: 'scheduled'
        }
      ];

      bookingService.getTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: mockAppointments }
      });

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const rows = screen.getAllByText(/John Doe|Jane Smith/);
        // Jane should appear first (has time) before John (no time)
        expect(rows[0]).toHaveTextContent('Jane Smith');
      });
    });
  });

  describe('Table Headers', () => {
    it('should show investigation table headers when investigation tab is active', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('PATIENT')).toBeInTheDocument();
        expect(screen.getByText('DATE')).toBeInTheDocument();
        expect(screen.getByText('UROLOGIST')).toBeInTheDocument();
        expect(screen.getByText('MRI')).toBeInTheDocument();
        expect(screen.getByText('BIOPSY')).toBeInTheDocument();
        expect(screen.getByText('TRUS')).toBeInTheDocument();
        expect(screen.getByText('ACTIONS')).toBeInTheDocument();
      });
    });

    it('should show urologist table headers when urologist tab is active', async () => {
      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const urologistTab = screen.getByText('Urologist');
        fireEvent.click(urologistTab);
      });

      await waitFor(() => {
        expect(screen.getByText('PATIENT')).toBeInTheDocument();
        expect(screen.getByText('DATE OF APPOINTMENT')).toBeInTheDocument();
        expect(screen.getByText('UROLOGIST')).toBeInTheDocument();
        expect(screen.getByText('ACTIONS')).toBeInTheDocument();
        expect(screen.queryByText('MRI')).not.toBeInTheDocument();
        expect(screen.queryByText('BIOPSY')).not.toBeInTheDocument();
        expect(screen.queryByText('TRUS')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when fetching appointments', async () => {
      bookingService.getTodaysAppointments.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { appointments: [] }
        }), 100))
      );

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading appointments...')).not.toBeInTheDocument();
      });
    });

    it('should show loading state when fetching new patients', async () => {
      patientService.getNewPatients.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { patients: [] }
        }), 100))
      );

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading new patients...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading new patients...')).not.toBeInTheDocument();
      });
    });

    it('should show loading state when fetching no-show patients', async () => {
      bookingService.getNoShowPatients.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { noShowPatients: [] }
        }), 100))
      );

      render(
        <MemoryRouter>
          <OPDManagement />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading no-show patients...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading no-show patients...')).not.toBeInTheDocument();
      });
    });
  });
});
