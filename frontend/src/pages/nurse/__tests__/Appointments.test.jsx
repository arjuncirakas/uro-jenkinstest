import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Appointments from '../Appointments';
import { bookingService } from '../../../services/bookingService';

// Mock dependencies
vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getAllAppointments: vi.fn()
  }
}));

vi.mock('../../../components/layout/NurseHeader', () => ({
  default: ({ title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}));

vi.mock('../../../components/Calendar', () => ({
  default: ({ appointments, loadingAppointments, appointmentsError, onRefresh }) => (
    <div data-testid="calendar">
      {loadingAppointments && <div>Loading...</div>}
      {appointmentsError && <div>{appointmentsError}</div>}
      <div>Appointments: {appointments?.length || 0}</div>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  )
}));

describe('Appointments (Nurse)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.getAllAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: []
      }
    });
  });

  describe('Rendering', () => {
    it('should render appointments page', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });

    it('should display subtitle', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      expect(screen.getByText(/schedule and manage/i)).toBeInTheDocument();
    });

    it('should render Calendar component', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch appointments on mount', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
    });

    it('should display appointments in calendar', async () => {
      const mockAppointments = [
        { id: 1, date: '2024-01-15', time: '10:00' },
        { id: 2, date: '2024-01-16', time: '14:00' }
      ];
      
      bookingService.getAllAppointments.mockResolvedValue({
        success: true,
        data: {
          appointments: mockAppointments
        }
      });
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/appointments: 2/i)).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      bookingService.getAllAppointments.mockResolvedValue({
        success: false,
        error: 'Failed to fetch'
      });
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      bookingService.getAllAppointments.mockRejectedValue(new Error('Network error'));
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch appointments/i)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should refresh appointments when refresh is called', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      bookingService.getAllAppointments.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: { appointments: [] } }), 100)));
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
