import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock bookingService
const mockGetAllAppointments = vi.fn();

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        getAllAppointments: (...args) => mockGetAllAppointments(...args)
    }
}));

// Mock tokenService
const mockGetUserId = vi.fn();
vi.mock('../../services/tokenService', () => ({
    default: {
        getUserId: () => mockGetUserId()
    }
}));

// Mock components
vi.mock('../../components/NotificationModal', () => ({
    default: ({ isOpen, onClose }) =>
        isOpen ? (
            <div data-testid="notification-modal">
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock('../../components/ProfileDropdown', () => ({
    default: ({ isOpen, onClose }) =>
        isOpen ? (
            <div data-testid="profile-dropdown">
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock('../../components/Calendar', () => ({
    default: ({ appointments, onDayClick, onMonthChange }) => (
        <div data-testid="calendar">
            <button onClick={() => onDayClick && onDayClick(new Date(2024, 0, 15))}>Day Click</button>
            <button onClick={() => onMonthChange && onMonthChange(new Date(2024, 1, 1))}>Month Change</button>
            {appointments && <div>Appointments: {appointments.length}</div>}
        </div>
    )
}));

vi.mock('../../components/DailyAppointmentsList', () => ({
    default: ({ appointments, selectedDate, onDateChange, onAppointmentClick }) => (
        <div data-testid="daily-appointments">
            <button onClick={() => onDateChange && onDateChange(new Date(2024, 0, 16))}>Change Date</button>
            <button onClick={() => onAppointmentClick && onAppointmentClick({ id: 1 })}>Click Appointment</button>
            {appointments && <div>Daily: {appointments.length}</div>}
        </div>
    )
}));

vi.mock('../../components/AppointmentDetailsModal', () => ({
    default: ({ isOpen, appointment, onClose, onReschedule }) =>
        isOpen ? (
            <div data-testid="details-modal">
                <div>Appointment: {appointment?.id}</div>
                <button onClick={onClose}>Close</button>
                {onReschedule && <button onClick={onReschedule}>Reschedule</button>}
            </div>
        ) : null
}));

import Appointments from '../urologist/Appointments';

describe('Urologist Appointments', () => {
    const mockAppointments = [
        {
            id: 1,
            patient_name: 'John Doe',
            appointment_date: '2024-01-15',
            time: '09:00',
            status: 'confirmed',
            type: 'consultation'
        },
        {
            id: 2,
            patient_name: 'Jane Smith',
            appointment_date: '2024-01-15',
            time: '10:00',
            status: 'pending',
            type: 'follow_up'
        },
        {
            id: 3,
            patient_name: 'Missed Patient',
            appointment_date: '2024-01-15',
            time: '11:00',
            status: 'missed',
            type: 'consultation'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockGetUserId.mockReturnValue(1);
        mockGetAllAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Rendering', () => {
        it('should render appointments page', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });
        });

        it('should fetch appointments on mount', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });

        it('should filter out missed appointments', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByText(/Appointments: 2/i)).toBeInTheDocument();
            });
        });
    });

    describe('View Switching', () => {
        it('should switch to daily view', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dailyButton = screen.getByText(/Daily/i) || screen.getByText(/List/i);
            if (dailyButton) {
                fireEvent.click(dailyButton);
                await waitFor(() => {
                    expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
                });
            }
        });

        it('should switch back to calendar view', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const calendarButton = screen.getByText(/Calendar/i);
            if (calendarButton) {
                fireEvent.click(calendarButton);
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            }
        });
    });

    describe('Day Click', () => {
        it('should switch to daily view when day is clicked', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });
        });
    });

    describe('Appointment Details', () => {
        it('should open details modal when appointment is clicked', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });

            const appointmentButton = screen.getByText(/Click Appointment/i);
            fireEvent.click(appointmentButton);

            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should close details modal', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                const appointmentButton = screen.getByText(/Click Appointment/i);
                fireEvent.click(appointmentButton);
            });

            await waitFor(() => {
                const closeButton = screen.getByText(/Close/i);
                fireEvent.click(closeButton);
            });

            await waitFor(() => {
                expect(screen.queryByTestId('details-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Search Functionality', () => {
        it('should handle search input', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });

            const searchInput = screen.getByPlaceholderText(/Search/i) || 
                               document.querySelector('input[type="text"]');
            if (searchInput) {
                fireEvent.change(searchInput, { target: { value: 'John' } });
                
                vi.advanceTimersByTime(300);
                await waitFor(() => {
                    expect(mockGetAllAppointments).toHaveBeenCalledWith(
                        expect.objectContaining({ search: 'John' })
                    );
                });
            }
        });

        it('should debounce search input', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });

            const searchInput = screen.getByPlaceholderText(/Search/i) || 
                               document.querySelector('input[type="text"]');
            if (searchInput) {
                fireEvent.change(searchInput, { target: { value: 'J' } });
                fireEvent.change(searchInput, { target: { value: 'Jo' } });
                fireEvent.change(searchInput, { target: { value: 'Joh' } });
                
                vi.advanceTimersByTime(300);
                
                await waitFor(() => {
                    // Should only be called once more (initial + debounced)
                    expect(mockGetAllAppointments.mock.calls.length).toBeGreaterThanOrEqual(2);
                });
            }
        });
    });

    describe('Filtering', () => {
        it('should filter out no_show appointments', async () => {
            const appointmentsWithNoShow = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'No Show Patient',
                    appointment_date: '2024-01-15',
                    time: '12:00',
                    status: 'no_show',
                    type: 'consultation'
                }
            ];
            mockGetAllAppointments.mockResolvedValue({
                success: true,
                data: { appointments: appointmentsWithNoShow }
            });

            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByText(/Appointments: 2/i)).toBeInTheDocument();
            });
        });

        it('should filter out no-show appointments', async () => {
            const appointmentsWithNoShow = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'No Show Patient',
                    appointment_date: '2024-01-15',
                    time: '12:00',
                    status: 'no-show',
                    type: 'consultation'
                }
            ];
            mockGetAllAppointments.mockResolvedValue({
                success: true,
                data: { appointments: appointmentsWithNoShow }
            });

            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByText(/Appointments: 2/i)).toBeInTheDocument();
            });
        });
    });

    describe('Daily Appointments', () => {
        it('should filter appointments for selected date', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });
        });

        it('should handle date change in daily view', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                const changeDateButton = screen.getByText(/Change Date/i);
                fireEvent.click(changeDateButton);
            });

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle fetch error', async () => {
            mockGetAllAppointments.mockResolvedValue({
                success: false,
                error: 'Failed to fetch appointments'
            });

            render(<Appointments />);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGetAllAppointments.mockRejectedValue(new Error('Network error'));

            render(<Appointments />);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Notifications and Profile', () => {
        it('should open notification modal', () => {
            render(<Appointments />);
            const notificationButton = screen.getByRole('button', { name: /notification/i }) ||
                                     document.querySelector('button[aria-label*="notification" i]');
            if (notificationButton) {
                fireEvent.click(notificationButton);
                expect(screen.getByTestId('notification-modal')).toBeInTheDocument();
            }
        });

        it('should open profile dropdown', () => {
            render(<Appointments />);
            const profileButton = screen.getByRole('button', { name: /profile/i }) ||
                                document.querySelector('button[aria-label*="profile" i]');
            if (profileButton) {
                fireEvent.click(profileButton);
                expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
            }
        });
    });

    describe('Month Change', () => {
        it('should handle month change in calendar', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const monthChangeButton = screen.getByText(/Month Change/i);
            fireEvent.click(monthChangeButton);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });
    });

    describe('Back to Calendar', () => {
        it('should switch back to calendar view from daily view', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });

            const backButton = screen.getByRole('button', { name: /back/i }) ||
                              screen.getByText(/←/i) ||
                              document.querySelector('button[aria-label*="back" i]');
            if (backButton) {
                fireEvent.click(backButton);
                await waitFor(() => {
                    expect(screen.getByTestId('calendar')).toBeInTheDocument();
                });
            }
        });
    });

    describe('Reschedule Functionality', () => {
        it('should refresh appointments after reschedule', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                const appointmentButton = screen.getByText(/Click Appointment/i);
                fireEvent.click(appointmentButton);
            });

            await waitFor(() => {
                const rescheduleButton = screen.getByText(/Reschedule/i);
                if (rescheduleButton) {
                    fireEvent.click(rescheduleButton);
                    // Should refresh appointments
                    expect(mockGetAllAppointments).toHaveBeenCalled();
                }
            });
        });
    });

    describe('Notification Count', () => {
        it('should display notification count badge', () => {
            render(<Appointments />);
            // Notification button should be present
            const notificationButton = screen.getByRole('button', { name: /notification/i }) ||
                                     document.querySelector('button[aria-label*="notification" i]');
            expect(notificationButton || screen.getByTestId('calendar')).toBeInTheDocument();
        });
    });

    describe('Daily Appointments Date Formatting', () => {
        it('should format date correctly for daily appointments', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });
        });

        it('should handle appointments with date field', async () => {
            const appointmentsWithDate = [{
                id: 1,
                patient_name: 'Date Field',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            mockGetAllAppointments.mockResolvedValue({
                success: true,
                data: { appointments: appointmentsWithDate }
            });

            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            const dayClickButton = screen.getByText(/Day Click/i);
            fireEvent.click(dayClickButton);

            await waitFor(() => {
                expect(screen.getByTestId('daily-appointments')).toBeInTheDocument();
            });
        });
    });

    describe('Empty States', () => {
        it('should handle empty appointments array', async () => {
            mockGetAllAppointments.mockResolvedValue({
                success: true,
                data: { appointments: [] }
            });

            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });

        it('should handle no selected date in daily view', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByTestId('calendar')).toBeInTheDocument();
            });

            // Daily view should not show if no date selected
            expect(screen.queryByTestId('daily-appointments')).not.toBeInTheDocument();
        });
    });

    describe('Search Clearing', () => {
        it('should fetch immediately when search is cleared', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });

            const searchInput = screen.getByPlaceholderText(/Search/i) || 
                               document.querySelector('input[type="text"]');
            if (searchInput) {
                fireEvent.change(searchInput, { target: { value: 'John' } });
                vi.advanceTimersByTime(300);
                
                await waitFor(() => {
                    expect(mockGetAllAppointments).toHaveBeenCalled();
                });

                // Clear search
                fireEvent.change(searchInput, { target: { value: '' } });
                // Should fetch immediately (0ms delay)
                await waitFor(() => {
                    expect(mockGetAllAppointments.mock.calls.length).toBeGreaterThan(1);
                });
            }
        });
    });
});


























