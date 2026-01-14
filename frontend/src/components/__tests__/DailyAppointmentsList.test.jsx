import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyAppointmentsList from '../DailyAppointmentsList';

describe('DailyAppointmentsList', () => {
  const mockOnDateChange = vi.fn();
  const mockOnAppointmentClick = vi.fn();

  const mockAppointments = [
    {
      id: 1,
      patientName: 'John Doe',
      time: '10:00',
      status: 'confirmed',
      type: 'Consultation',
      appointment_type: 'urologist'
    },
    {
      id: 2,
      patientName: 'Jane Smith',
      time: '14:00',
      status: 'pending',
      type: 'Investigation',
      appointment_type: 'investigation'
    }
  ];

  const mockSelectedDate = new Date('2024-01-15');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render daily appointments list', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/january.*15.*2024/i)).toBeInTheDocument();
    });

    it('should display appointment count', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/2 appointment/i)).toBeInTheDocument();
    });

    it('should display appointments', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display empty state when no appointments', () => {
      render(
        <DailyAppointmentsList
          appointments={[]}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('should render list view by default', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should switch to timeline view', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      const timelineButton = screen.getByText('Timeline View');
      fireEvent.click(timelineButton);
      
      // Timeline view should show time slots
      expect(screen.getByText(/10:00.*am/i)).toBeInTheDocument();
    });

    it('should switch back to list view', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      const timelineButton = screen.getByText('Timeline View');
      fireEvent.click(timelineButton);
      
      const listButton = screen.getByText('List View');
      fireEvent.click(listButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to previous day', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      const prevButton = screen.getByLabelText(/previous day/i);
      fireEvent.click(prevButton);
      
      expect(mockOnDateChange).toHaveBeenCalled();
    });

    it('should navigate to next day', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      const nextButton = screen.getByLabelText(/next day/i);
      fireEvent.click(nextButton);
      
      expect(mockOnDateChange).toHaveBeenCalled();
    });
  });

  describe('Appointment Click', () => {
    it('should call onAppointmentClick when appointment is clicked', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      const appointment = screen.getByText('John Doe').closest('div');
      fireEvent.click(appointment);
      
      expect(mockOnAppointmentClick).toHaveBeenCalledWith(mockAppointments[0]);
    });
  });

  describe('Appointment Sorting', () => {
    it('should sort appointments by status priority', () => {
      const mixedAppointments = [
        { id: 1, patientName: 'Missed', time: '10:00', status: 'missed' },
        { id: 2, patientName: 'Confirmed', time: '14:00', status: 'confirmed' },
        { id: 3, patientName: 'Pending', time: '12:00', status: 'pending' }
      ];
      
      render(
        <DailyAppointmentsList
          appointments={mixedAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      
      const appointments = screen.getAllByText(/missed|confirmed|pending/i);
      // Confirmed/pending should appear before missed
      expect(appointments[0].textContent).toMatch(/confirmed|pending/i);
    });

    it('should sort appointments by time within status group', () => {
      const appointments = [
        { id: 1, patientName: 'Later', time: '14:00', status: 'confirmed' },
        { id: 2, patientName: 'Earlier', time: '10:00', status: 'confirmed' }
      ];
      
      render(
        <DailyAppointmentsList
          appointments={appointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      
      const patientNames = screen.getAllByText(/earlier|later/i);
      expect(patientNames[0].textContent).toContain('Earlier');
    });
  });

  describe('Recurring Followup Detection', () => {
    it('should identify recurring followup appointments', () => {
      const recurringAppointment = {
        id: 1,
        patientName: 'Recurring Patient',
        time: null,
        type: 'Follow-up Appointment',
        appointment_type: 'automatic',
        typeColor: 'blue'
      };
      
      render(
        <DailyAppointmentsList
          appointments={[recurringAppointment]}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      
      expect(screen.getByText(/flexible.*no time slot/i)).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should convert 24-hour time to 12-hour format', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/10:00.*am/i)).toBeInTheDocument();
      expect(screen.getByText(/2:00.*pm/i)).toBeInTheDocument();
    });

    it('should handle midnight (00:00)', () => {
      const midnightAppointment = {
        id: 1,
        patientName: 'Midnight Patient',
        time: '00:00',
        status: 'confirmed'
      };
      
      render(
        <DailyAppointmentsList
          appointments={[midnightAppointment]}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/12:00.*am/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onAppointmentClick', () => {
      render(
        <DailyAppointmentsList
          appointments={mockAppointments}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={null}
        />
      );
      // Should not crash
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle missing time', () => {
      const appointmentNoTime = {
        id: 1,
        patientName: 'No Time',
        time: null,
        status: 'confirmed'
      };
      
      render(
        <DailyAppointmentsList
          appointments={[appointmentNoTime]}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
    });

    it('should handle automatic appointments without time', () => {
      const automaticAppointment = {
        id: 1,
        patientName: 'Automatic',
        time: null,
        appointment_type: 'automatic',
        type: 'automatic'
      };
      
      render(
        <DailyAppointmentsList
          appointments={[automaticAppointment]}
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          onAppointmentClick={mockOnAppointmentClick}
        />
      );
      expect(screen.getByText(/flexible.*no time slot/i)).toBeInTheDocument();
    });
  });
});
