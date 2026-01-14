import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../Calendar';
import { bookingService } from '../../services/bookingService';

// Mock dependencies
vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getAllAppointments: vi.fn(),
    rescheduleAppointment: vi.fn()
  }
}));

vi.mock('../RescheduleConfirmationModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="reschedule-modal">
        <button onClick={() => onConfirm()}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

vi.mock('../AppointmentDetailsModal', () => ({
  default: ({ isOpen, appointment, onClose }) => (
    isOpen ? (
      <div data-testid="appointment-details-modal">
        <div>Appointment: {appointment?.id}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../SuccessErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
  )
}));

describe('Calendar', () => {
  const mockOnTogglePatients = vi.fn();
  const mockOnDayClick = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnMonthChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.getAllAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: []
      }
    });
    bookingService.rescheduleAppointment.mockResolvedValue({
      success: true
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render calendar', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      expect(screen.getByText(/january|february|march/i)).toBeInTheDocument();
    });

    it('should render month view by default', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      // Month view should show calendar grid
      expect(screen.getByText(/sunday|monday|tuesday/i)).toBeInTheDocument();
    });

    it('should display current month and year', () => {
      const currentDate = new Date();
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(new RegExp(monthYear, 'i'))).toBeInTheDocument();
    });
  });

  describe('View Switching', () => {
    it('should switch to week view', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const weekButton = screen.getByText(/week/i);
      fireEvent.click(weekButton);
      
      // Week view should show week days
      expect(screen.getByText(/sunday|monday|tuesday/i)).toBeInTheDocument();
    });

    it('should switch to day view', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const dayButton = screen.getByText(/day/i);
      fireEvent.click(dayButton);
      
      // Day view should show single day
      const dayString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(dayString.split(' ')[0], 'i'))).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to previous month', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const prevButton = screen.getByLabelText(/previous month/i);
      fireEvent.click(prevButton);
      
      // Should show previous month
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const monthYear = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(new RegExp(monthYear, 'i'))).toBeInTheDocument();
    });

    it('should navigate to next month', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      const nextButton = screen.getByLabelText(/next month/i);
      fireEvent.click(nextButton);
      
      // Should show next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthYear = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(new RegExp(monthYear, 'i'))).toBeInTheDocument();
    });

    it('should call onMonthChange when month changes', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
          onMonthChange={mockOnMonthChange}
        />
      );
      const nextButton = screen.getByLabelText(/next month/i);
      fireEvent.click(nextButton);
      
      expect(mockOnMonthChange).toHaveBeenCalled();
    });
  });

  describe('Appointments Display', () => {
    it('should display appointments on calendar', async () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'John Doe',
          type: 'Consultation'
        }
      ];
      
      bookingService.getAllAppointments.mockResolvedValue({
        success: true,
        data: {
          appointments: mockAppointments
        }
      });
      
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should use provided appointments if available', () => {
      const providedAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'Provided Patient',
          type: 'Consultation'
        }
      ];
      
      render(
        <Calendar
          appointments={providedAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      expect(screen.getByText('Provided Patient')).toBeInTheDocument();
    });
  });

  describe('Day Click', () => {
    it('should call onDayClick when day is clicked', () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
          onDayClick={mockOnDayClick}
        />
      );
      // Click on today's date
      const today = new Date().getDate();
      const dayButton = screen.getByText(today.toString());
      fireEvent.click(dayButton);
      
      expect(mockOnDayClick).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle appointment drag and drop', () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'John Doe',
          type: 'Consultation'
        }
      ];
      
      render(
        <Calendar
          appointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const appointment = screen.getByText('John Doe');
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      
      fireEvent.dragStart(appointment);
      fireEvent.dragOver(screen.getByText(targetDate.getDate().toString()));
      fireEvent.drop(screen.getByText(targetDate.getDate().toString()));
      
      // Should open reschedule modal
      expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
    });

    it('should prevent dropping on past dates', () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'John Doe',
          type: 'Consultation'
        }
      ];
      
      render(
        <Calendar
          appointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const appointment = screen.getByText('John Doe');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      fireEvent.dragStart(appointment);
      fireEvent.dragOver(screen.getByText(pastDate.getDate().toString()));
      fireEvent.drop(screen.getByText(pastDate.getDate().toString()));
      
      expect(screen.getByTestId('error-modal')).toBeInTheDocument();
      expect(screen.getByText(/cannot reschedule.*past date/i)).toBeInTheDocument();
    });
  });

  describe('Appointment Details', () => {
    it('should open appointment details modal', () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'John Doe',
          type: 'Consultation'
        }
      ];
      
      render(
        <Calendar
          appointments={mockAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const appointment = screen.getByText('John Doe');
      fireEvent.click(appointment);
      
      expect(screen.getByTestId('appointment-details-modal')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch appointments when no appointments provided', async () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
    });

    it('should not fetch when appointments are provided', () => {
      const providedAppointments = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          patientName: 'John Doe',
          type: 'Consultation'
        }
      ];
      
      render(
        <Calendar
          appointments={providedAppointments}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      // Should not fetch if appointments are provided
      expect(bookingService.getAllAppointments).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      bookingService.getAllAppointments.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });
      
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh', () => {
    it('should refresh appointments when onRefresh is called', async () => {
      render(
        <Calendar
          onTogglePatients={mockOnTogglePatients}
          onRefresh={mockOnRefresh}
        />
      );
      
      await waitFor(() => {
        expect(bookingService.getAllAppointments).toHaveBeenCalled();
      });
      
      if (mockOnRefresh) {
        mockOnRefresh();
        await waitFor(() => {
          expect(bookingService.getAllAppointments).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Current Month Prop', () => {
    it('should sync with currentMonth prop', () => {
      const customMonth = new Date('2024-06-15');
      render(
        <Calendar
          currentMonth={customMonth}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      
      const monthYear = customMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(new RegExp(monthYear, 'i'))).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null appointments', () => {
      render(
        <Calendar
          appointments={null}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      // Should not crash
      expect(screen.getByText(/january|february|march/i)).toBeInTheDocument();
    });

    it('should handle empty appointments array', () => {
      render(
        <Calendar
          appointments={[]}
          onTogglePatients={mockOnTogglePatients}
        />
      );
      // Should not crash
      expect(screen.getByText(/january|february|march/i)).toBeInTheDocument();
    });
  });
});
