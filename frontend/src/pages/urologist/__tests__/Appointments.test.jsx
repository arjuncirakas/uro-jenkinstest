import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Appointments from '../Appointments';
import { bookingService } from '../../../services/bookingService';
import tokenService from '../../../services/tokenService';

// Mock dependencies
vi.mock('../../../services/bookingService', () => ({
  bookingService: {
    getAllAppointments: vi.fn()
  }
}));

vi.mock('../../../services/tokenService', () => ({
  default: {
    getUserId: vi.fn()
  }
}));

vi.mock('../../../components/NotificationModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="notification-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../components/ProfileDropdown', () => ({
  default: ({ isOpen }) => (
    isOpen ? <div data-testid="profile-dropdown">Profile</div> : null
  )
}));

vi.mock('../../../components/Calendar', () => ({
  default: ({ appointments, onDayClick }) => (
    <div data-testid="calendar">
      <div>Appointments: {appointments?.length || 0}</div>
      <button onClick={() => onDayClick(new Date())}>Select Day</button>
    </div>
  )
}));

vi.mock('../../../components/DailyAppointmentsList', () => ({
  default: ({ appointments, selectedDate, onAppointmentClick }) => (
    <div data-testid="daily-appointments">
      <div>Date: {selectedDate?.toDateString()}</div>
      <div>Appointments: {appointments?.length || 0}</div>
      {appointments?.length > 0 && (
        <button onClick={() => onAppointmentClick(appointments[0])}>View Appointment</button>
      )}
    </div>
  )
}));

vi.mock('../../../components/AppointmentDetailsModal', () => ({
  default: ({ isOpen, appointment, onClose }) => (
    isOpen ? (
      <div data-testid="appointment-details-modal">
        <div>Appointment: {appointment?.id}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

describe('Appointments (Urologist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getUserId.mockReturnValue(1);
    bookingService.getAllAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: []
      }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    it('should render calendar view by default', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search appointments/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch appointments filtered by urologist ID', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalledWith({
          urologistId: 1,
          search: ''
        });
      });
    });

    it('should filter out missed and no-show appointments', async () => {
      const mockAppointments = [
        { id: 1, status: 'confirmed', date: '2024-01-15' },
        { id: 2, status: 'missed', date: '2024-01-15' },
        { id: 3, status: 'no_show', date: '2024-01-15' }
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
        expect(screen.getByText(/appointments: 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should debounce search requests', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      const searchInput = screen.getByPlaceholderText(/search appointments/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalledWith({
          urologistId: 1,
          search: 'John'
        });
      });
    });
  });

  describe('View Switching', () => {
    it('should switch to daily view when day is clicked', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      const selectDayButton = screen.getByText('Select Day');
      fireEvent.click(selectDayButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
      });
    });

    it('should switch back to calendar view', async () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      const selectDayButton = screen.getByText('Select Day');
      fireEvent.click(selectDayButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
      });
      
      const backButton = screen.getByLabelText(/back to calendar/i);
      fireEvent.click(backButton);
      
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
  });

  describe('Appointment Details', () => {
    it('should open appointment details modal', async () => {
      const mockAppointments = [
        { id: 1, status: 'confirmed', date: '2024-01-15', time: '10:00' }
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
        const selectDayButton = screen.getByText('Select Day');
        fireEvent.click(selectDayButton);
      });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View Appointment');
        fireEvent.click(viewButton);
      });
      
      expect(screen.getByTestId('appointment-details-modal')).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('should open notification modal', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      const notificationButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(notificationButton);
      
      expect(screen.getByTestId('notification-modal')).toBeInTheDocument();
    });
  });

  describe('Profile', () => {
    it('should open profile dropdown', () => {
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      const profileButton = screen.getByLabelText(/profile/i);
      fireEvent.click(profileButton);
      
      expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null urologist ID', () => {
      tokenService.getUserId.mockReturnValue(null);
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      // Should not crash
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });

    it('should handle fetch error', async () => {
      bookingService.getAllAppointments.mockRejectedValue(new Error('Network error'));
      
      render(
        <BrowserRouter>
          <Appointments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
    });
  });
});
