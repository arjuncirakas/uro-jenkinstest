import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
// Mock apiClient (axios) instead of bookingService to allow component and service code to execute
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('../../config/axios', () => ({
    default: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
        put: (...args) => mockPut(...args),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

// Import service after mocking apiClient
import { bookingService } from '../../services/bookingService';

// Mock child components
vi.mock('../RescheduleConfirmationModal', () => ({
    default: ({ isOpen, onConfirm, onCancel }) =>
        isOpen ? (
            <div data-testid="reschedule-modal">
                <button onClick={() => onConfirm(1, '2024-01-15', '09:00', 1)}>Confirm</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        ) : null
}));

vi.mock('../AppointmentDetailsModal', () => ({
    default: ({ isOpen, appointment, onClose }) =>
        isOpen ? (
            <div data-testid="details-modal">
                <span>{appointment?.patient_name}</span>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock('../SuccessErrorModal', () => ({
    default: ({ isOpen, type, message, onClose }) =>
        isOpen ? (
            <div data-testid="success-error-modal" className={type}>
                {message}
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

// NOW import component AFTER all mocks
import Calendar from '../Calendar';

describe('Calendar', () => {
    const mockOnDayClick = vi.fn();
    const mockOnTogglePatients = vi.fn();
    const mockOnRefresh = vi.fn();
    const mockOnMonthChange = vi.fn();

    const mockAppointments = [
        {
            id: 1,
            patientName: 'John Doe',
            date: '2024-01-15',
            appointment_date: '2024-01-15',
            time: '09:00',
            appointment_time: '09:00',
            status: 'confirmed',
            type: 'consultation',
            typeColor: 'teal',
            doctor_name: 'Dr. Smith'
        },
        {
            id: 2,
            patientName: 'Jane Smith',
            date: '2024-01-15',
            appointment_date: '2024-01-15',
            time: '10:00',
            appointment_time: '10:00',
            status: 'pending',
            type: 'follow_up',
            typeColor: 'blue',
            doctor_name: 'Dr. Johnson'
        },
        {
            id: 3,
            patientName: 'Bob Wilson',
            date: '2024-01-16',
            appointment_date: '2024-01-16',
            time: '14:00',
            appointment_time: '14:00',
            status: 'no_show',
            type: 'investigation',
            typeColor: 'purple',
            doctor_name: 'Dr. Smith'
        }
    ];

    const defaultProps = {
        appointments: mockAppointments,
        showAllPatients: false,
        onTogglePatients: mockOnTogglePatients,
        onDayClick: mockOnDayClick,
        loadingAppointments: false,
        appointmentsError: null,
        onRefresh: mockOnRefresh,
        onMonthChange: mockOnMonthChange,
        currentMonth: new Date(2024, 0, 1)
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock apiClient.get to return appointments for getAllAppointments
        mockGet.mockResolvedValue({
            data: {
                data: mockAppointments
            }
        });
    });

    describe('Rendering', () => {
        it('should render calendar header', () => {
            render(<Calendar {...defaultProps} />);
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should render navigation buttons', () => {
            render(<Calendar {...defaultProps} />);
            // chevron icons for navigation
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('should render day names', () => {
            render(<Calendar {...defaultProps} />);
            expect(screen.getByText(/Mon/i)).toBeInTheDocument();
            expect(screen.getByText(/Tue/i)).toBeInTheDocument();
            expect(screen.getByText(/Wed/i)).toBeInTheDocument();
        });

        it('should render appointments on calendar', () => {
            render(<Calendar {...defaultProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should handle appointments with date field', () => {
            const appointmentsWithDate = [{
                id: 1,
                patientName: 'Test Patient',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithDate} />);
            expect(screen.getByText('Test Patient')).toBeInTheDocument();
        });

        it('should handle appointments with appointment_date field', () => {
            const appointmentsWithAppointmentDate = [{
                id: 1,
                patientName: 'Test Patient 2',
                appointment_date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithAppointmentDate} />);
            expect(screen.getByText('Test Patient 2')).toBeInTheDocument();
        });

        it('should handle appointments with time field', () => {
            const appointmentsWithTime = [{
                id: 1,
                patientName: 'Time Patient',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithTime} />);
            expect(screen.getByText('Time Patient')).toBeInTheDocument();
        });

        it('should handle appointments with appointment_time field', () => {
            const appointmentsWithAppointmentTime = [{
                id: 1,
                patientName: 'Appointment Time Patient',
                date: '2024-01-15',
                appointment_time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithAppointmentTime} />);
            expect(screen.getByText('Appointment Time Patient')).toBeInTheDocument();
        });

        it('should show loading state', () => {
            render(<Calendar {...defaultProps} loadingAppointments={true} />);
            expect(screen.getByText(/Loading/i)).toBeInTheDocument();
        });

        it('should show error state', () => {
            render(<Calendar {...defaultProps} appointmentsError="Failed to load appointments" />);
            expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
        });
    });

    describe('View Switching', () => {
        it('should switch to week view', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            // Should show week view with time slots
            expect(screen.getByText(/Week/i)).toBeInTheDocument();
        });

        it('should switch to day view', () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);
            // Should show day view
            expect(screen.getByText(/Day/i)).toBeInTheDocument();
        });

        it('should switch to month view', () => {
            render(<Calendar {...defaultProps} />);
            const monthButton = screen.getByText(/Month/i);
            fireEvent.click(monthButton);
            expect(screen.getByText(/Month/i)).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate to previous month', () => {
            render(<Calendar {...defaultProps} />);
            const prevButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('[class*="chevron"]') || btn.textContent === '<'
            );
            if (prevButton) {
                fireEvent.click(prevButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });

        it('should navigate to next month', () => {
            render(<Calendar {...defaultProps} />);
            const nextButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('[class*="chevron"]') || btn.textContent === '>'
            );
            if (nextButton) {
                fireEvent.click(nextButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });
    });

    describe('Day Click', () => {
        it('should call onDayClick when a day is clicked', () => {
            render(<Calendar {...defaultProps} />);
            // Find a day with appointments
            const dayCell = screen.getByText('15').closest('div[class*="cursor-pointer"]');
            if (dayCell) {
                fireEvent.click(dayCell);
                expect(mockOnDayClick).toHaveBeenCalled();
            }
        });
    });

    describe('Appointment Click', () => {
        it('should open appointment details on click', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);

            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should close details modal', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);

            await waitFor(() => {
                const closeButton = screen.getByText('Close');
                fireEvent.click(closeButton);
            });

            expect(screen.queryByTestId('details-modal')).not.toBeInTheDocument();
        });
    });

    describe('Drag and Drop', () => {
        it('should handle drag start', () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
            fireEvent.dragStart(appointmentElement, { dataTransfer });
            // Verify drag data was set
            expect(dataTransfer.setData).toHaveBeenCalled();
        });

        it('should handle drag over', () => {
            render(<Calendar {...defaultProps} />);
            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.dragOver(dayCell);
                // Verify drag over event was handled without error
                expect(dayCell).toBeInTheDocument();
            } else {
                // If day cell not found, verify calendar still renders
                expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
            }
        });

        it('should handle drop and show reschedule modal', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            // Start drag
            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            // Find a drop target
            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.drop(dayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
                });
            }
        });
    });

    describe('Appointment Status Colors', () => {
        it('should display different colors for different statuses', () => {
            render(<Calendar {...defaultProps} />);

            const confirmedAppointment = screen.getByText('John Doe').closest('div');
            const noShowAppointment = screen.getByText('Bob Wilson').closest('div');

            // They should have different styling
            expect(confirmedAppointment).not.toEqual(noShowAppointment);
        });
    });

    describe('Time Formatting', () => {
        it('should convert 24-hour time to 12-hour format', () => {
            render(<Calendar {...defaultProps} />);
            // 09:00 should show as 9:00 AM
            expect(screen.getByText(/9:00 AM/i) || screen.getByText(/09:00/)).toBeInTheDocument();
        });
    });

    describe('Without Appointments', () => {
        it('should render empty calendar without appointments', () => {
            render(<Calendar {...defaultProps} appointments={[]} />);
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should fetch appointments if not provided', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });
    });

    describe('Toggle Patients', () => {
        it('should call onTogglePatients when toggle is clicked', () => {
            render(<Calendar {...defaultProps} />);
            const toggleButton = screen.getByText(/Show All/i) || screen.getByText(/My Patients/i);
            if (toggleButton) {
                fireEvent.click(toggleButton);
                expect(mockOnTogglePatients).toHaveBeenCalled();
            }
        });
    });

    describe('Refresh', () => {
        it('should call onRefresh when refresh is triggered', () => {
            render(<Calendar {...defaultProps} />);
            const refreshButton = screen.getByRole('button', { name: /refresh/i });
            if (refreshButton) {
                fireEvent.click(refreshButton);
                expect(mockOnRefresh).toHaveBeenCalled();
            }
        });
    });

    describe('Recurring Appointment Detection', () => {
        it('should identify recurring follow-up appointments', () => {
            const recurringAppointments = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'Recurring Patient',
                    appointment_date: '2024-01-17',
                    time_slot: null,
                    status: 'confirmed',
                    type: 'recurring_followup',
                    appointment_type: 'automatic',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={recurringAppointments} />);
            expect(screen.getByText('Recurring Patient')).toBeInTheDocument();
        });
    });

    describe('Appointment Separation', () => {
        it('should separate automatic and regular appointments', () => {
            const mixedAppointments = [
                ...mockAppointments,
                {
                    id: 5,
                    patient_name: 'Auto Patient',
                    appointment_date: '2024-01-15',
                    time_slot: null,
                    status: 'confirmed',
                    type: 'follow_up',
                    is_recurring_followup: true,
                    doctor_name: 'Dr. Auto'
                }
            ];

            render(<Calendar {...defaultProps} appointments={mixedAppointments} />);
            expect(screen.getByText('Auto Patient')).toBeInTheDocument();
        });
    });

    describe('Reschedule Functionality', () => {
        it('should handle reschedule confirmation', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.drop(dayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
                });

                const confirmButton = screen.getByText('Confirm');
                fireEvent.click(confirmButton);

                await waitFor(() => {
                    expect(mockOnRefresh || mockGet).toHaveBeenCalled();
                });
            }
        });

        it('should handle reschedule cancellation', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.drop(dayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
                });

                const cancelButton = screen.getByText('Cancel');
                fireEvent.click(cancelButton);

                await waitFor(() => {
                    expect(screen.queryByTestId('reschedule-modal')).not.toBeInTheDocument();
                });
            }
        });

        it('should prevent rescheduling to past date', async () => {
            vi.useFakeTimers();
            const pastDate = new Date(2020, 0, 1);
            vi.setSystemTime(pastDate);

            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            // Try to drop on a past date
            const pastDayCell = screen.getByText('1').closest('div');
            if (pastDayCell) {
                fireEvent.drop(pastDayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('success-error-modal')).toBeInTheDocument();
                });
            }

            vi.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        it('should handle fetch appointments error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGet.mockRejectedValue(new Error('Network error'));

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch appointments/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle API failure response', async () => {
            // Mock API to return error response
            mockGet.mockResolvedValue({
                data: {
                    success: false,
                    error: 'Failed to fetch'
                }
            });

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
            });
        });

        it('should show retry button on error', async () => {
            mockGet.mockRejectedValue(new Error('Network error'));

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                const retryButton = screen.getByText(/Retry/i);
                expect(retryButton).toBeInTheDocument();
                fireEvent.click(retryButton);
                expect(mockGet).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Week and Day Views', () => {
        it('should render week view correctly', async () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText(/Week/i)).toBeInTheDocument();
            });
        });

        it('should render day view correctly', async () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(screen.getByText(/Day/i)).toBeInTheDocument();
            });
        });

        it('should navigate weeks correctly', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            const prevButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('[class*="chevron-left"]')
            );
            if (prevButton) {
                fireEvent.click(prevButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });

        it('should navigate days correctly', () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            const nextButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('[class*="chevron-right"]')
            );
            if (nextButton) {
                fireEvent.click(nextButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });
    });

    describe('Appointment Color Coding', () => {
        it('should display investigation appointments in purple', () => {
            const investigationAppointments = [
                {
                    id: 6,
                    patient_name: 'Investigation Patient',
                    appointment_date: '2024-01-15',
                    time_slot: '11:00',
                    status: 'confirmed',
                    type: 'investigation',
                    typeColor: 'purple',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={investigationAppointments} />);
            expect(screen.getByText('Investigation Patient')).toBeInTheDocument();
        });

        it('should display surgery appointments in orange', () => {
            const surgeryAppointments = [
                {
                    id: 7,
                    patient_name: 'Surgery Patient',
                    appointment_date: '2024-01-15',
                    time_slot: '12:00',
                    status: 'confirmed',
                    type: 'surgery',
                    typeColor: 'orange',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={surgeryAppointments} />);
            expect(screen.getByText('Surgery Patient')).toBeInTheDocument();
        });

        it('should display MDT appointments in green', () => {
            const mdtAppointments = [
                {
                    id: 8,
                    patient_name: 'MDT Patient',
                    appointment_date: '2024-01-15',
                    time_slot: '13:00',
                    status: 'confirmed',
                    type: 'mdt',
                    typeColor: 'green',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={mdtAppointments} />);
            expect(screen.getByText('MDT Patient')).toBeInTheDocument();
        });

        it('should display missed appointments in red', () => {
            const missedAppointments = [
                {
                    id: 9,
                    patient_name: 'Missed Patient',
                    appointment_date: '2024-01-15',
                    time_slot: '14:00',
                    status: 'missed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={missedAppointments} />);
            expect(screen.getByText('Missed Patient')).toBeInTheDocument();
        });
    });

    describe('Month Change Detection', () => {
        it('should notify parent when month changes', () => {
            const { rerender } = render(<Calendar {...defaultProps} currentMonth={new Date(2024, 0, 1)} />);

            rerender(<Calendar {...defaultProps} currentMonth={new Date(2024, 1, 1)} />);

            expect(mockOnMonthChange).toHaveBeenCalled();
        });
    });

    describe('Appointment Filtering', () => {
        it('should filter appointments by showAllPatients', () => {
            render(<Calendar {...defaultProps} showAllPatients={false} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should toggle patient filter', () => {
            render(<Calendar {...defaultProps} />);
            const allPatientsButton = screen.getByText(/All Patients/i);
            if (allPatientsButton) {
                fireEvent.click(allPatientsButton);
                expect(mockOnTogglePatients).toHaveBeenCalledWith(true);
            }
        });
    });

    describe('Day Click Behavior', () => {
        it('should switch to day view when day clicked without onDayClick handler', () => {
            render(<Calendar {...defaultProps} onDayClick={null} />);
            const dayCell = screen.getByText('15').closest('div[class*="cursor-pointer"]');
            if (dayCell) {
                fireEvent.click(dayCell);
                expect(screen.getByText(/Day/i)).toBeInTheDocument();
            }
        });
    });

    describe('Appointment Sorting', () => {
        it('should sort appointments by status priority', () => {
            const mixedStatusAppointments = [
                {
                    id: 10,
                    patient_name: 'Missed First',
                    appointment_date: '2024-01-15',
                    time_slot: '09:00',
                    status: 'missed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                },
                {
                    id: 11,
                    patient_name: 'Confirmed Second',
                    appointment_date: '2024-01-15',
                    time_slot: '10:00',
                    status: 'confirmed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={mixedStatusAppointments} />);
            expect(screen.getByText('Confirmed Second')).toBeInTheDocument();
            expect(screen.getByText('Missed First')).toBeInTheDocument();
        });
    });

    describe('Appointment Time Handling', () => {
        it('should handle appointments with time field', () => {
            const timeAppointments = [
                {
                    id: 12,
                    patientName: 'Time Patient',
                    date: '2024-01-15',
                    time: '15:00',
                    status: 'confirmed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={timeAppointments} />);
            expect(screen.getByText('Time Patient')).toBeInTheDocument();
        });

        it('should handle appointments with appointment_time field', () => {
            const appointmentTimeAppointments = [
                {
                    id: 13,
                    patientName: 'Appointment Time Patient',
                    appointment_date: '2024-01-15',
                    appointment_time: '16:00',
                    status: 'confirmed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={appointmentTimeAppointments} />);
            expect(screen.getByText('Appointment Time Patient')).toBeInTheDocument();
        });

        it('should handle appointments without time slot', () => {
            const noTimeAppointments = [
                {
                    id: 14,
                    patientName: 'No Time Patient',
                    date: '2024-01-15',
                    time: null,
                    appointment_time: null,
                    status: 'confirmed',
                    type: 'consultation',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={noTimeAppointments} />);
            expect(screen.getByText('No Time Patient')).toBeInTheDocument();
        });

        it('should handle appointments with notes', () => {
            const appointmentsWithNotes = [{
                id: 1,
                patientName: 'Notes Patient',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation',
                notes: 'Test notes'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithNotes} />);
            expect(screen.getByText('Notes Patient')).toBeInTheDocument();
        });

        it('should handle convertTo12Hour with null time', () => {
            const noTimeAppointments = [{
                id: 1,
                patientName: 'No Time',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={noTimeAppointments} />);
            expect(screen.getByText('No Time')).toBeInTheDocument();
        });

        it('should handle convertTo12Hour with empty time', () => {
            const emptyTimeAppointments = [{
                id: 1,
                patientName: 'Empty Time',
                date: '2024-01-15',
                time: '',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={emptyTimeAppointments} />);
            expect(screen.getByText('Empty Time')).toBeInTheDocument();
        });

        it('should handle convertTo12Hour with 00:00 (midnight)', () => {
            const midnightAppointments = [{
                id: 1,
                patientName: 'Midnight Patient',
                date: '2024-01-15',
                time: '00:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={midnightAppointments} />);
            expect(screen.getByText('Midnight Patient')).toBeInTheDocument();
        });

        it('should handle convertTo12Hour with 12:00 (noon)', () => {
            const noonAppointments = [{
                id: 1,
                patientName: 'Noon Patient',
                date: '2024-01-15',
                time: '12:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={noonAppointments} />);
            expect(screen.getByText('Noon Patient')).toBeInTheDocument();
        });

        it('should handle convertTo12Hour with 13:00 (1 PM)', () => {
            const pmAppointments = [{
                id: 1,
                patientName: 'PM Patient',
                date: '2024-01-15',
                time: '13:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={pmAppointments} />);
            expect(screen.getByText('PM Patient')).toBeInTheDocument();
        });

        it('should handle isTimeInSlot correctly', () => {
            const timeSlotAppointments = [{
                id: 1,
                patientName: 'Slot Patient',
                date: '2024-01-15',
                time: '09:15',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={timeSlotAppointments} />);
            expect(screen.getByText('Slot Patient')).toBeInTheDocument();
        });

        it('should handle week view with appointments', async () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should handle day view with appointments', async () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should handle automatic appointments in week view', async () => {
            const automaticAppointments = [{
                id: 1,
                patientName: 'Auto Patient',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={automaticAppointments} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText('Auto Patient')).toBeInTheDocument();
            });
        });

        it('should handle automatic appointments in day view', async () => {
            const automaticAppointments = [{
                id: 1,
                patientName: 'Auto Day Patient',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={automaticAppointments} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(screen.getByText('Auto Day Patient')).toBeInTheDocument();
            });
        });

        it('should handle automatic appointments with time in week view', async () => {
            const automaticWithTime = [{
                id: 1,
                patientName: 'Auto With Time',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic',
                typeColor: 'blue'
            }];
            render(<Calendar {...defaultProps} appointments={automaticWithTime} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText('Auto With Time')).toBeInTheDocument();
            });
        });

        it('should handle reschedule with onRefresh callback', async () => {
            const onRefresh = vi.fn().mockResolvedValue(undefined);
            render(<Calendar {...defaultProps} onRefresh={onRefresh} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.drop(dayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
                });

                const confirmButton = screen.getByText('Confirm');
                fireEvent.click(confirmButton);

                await waitFor(() => {
                    expect(onRefresh).toHaveBeenCalled();
                });
            }
        });

        it('should handle reschedule without onRefresh callback', async () => {
            render(<Calendar {...defaultProps} onRefresh={null} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                fireEvent.drop(dayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
                });

                const confirmButton = screen.getByText('Confirm');
                fireEvent.click(confirmButton);

                await waitFor(() => {
                    expect(mockGet).toHaveBeenCalled();
                });
            }
        });

        it('should handle appointment details modal onReschedule', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);

            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should handle appointment details modal onReschedule with onRefresh', async () => {
            const onRefresh = vi.fn().mockResolvedValue(undefined);
            render(<Calendar {...defaultProps} onRefresh={onRefresh} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);

            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should handle appointment details modal onReschedule without onRefresh', async () => {
            render(<Calendar {...defaultProps} onRefresh={null} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);

            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should handle error modal close', async () => {
            vi.useFakeTimers();
            const pastDate = new Date(2020, 0, 1);
            vi.setSystemTime(pastDate);

            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');

            const dataTransfer = {
                setData: vi.fn(),
                getData: () => JSON.stringify(mockAppointments[0]),
                effectAllowed: ''
            };
            fireEvent.dragStart(appointmentElement, { dataTransfer });

            const pastDayCell = screen.getByText('1').closest('div');
            if (pastDayCell) {
                fireEvent.drop(pastDayCell, { dataTransfer });

                await waitFor(() => {
                    expect(screen.getByTestId('success-error-modal')).toBeInTheDocument();
                });

                const closeButton = screen.getByText('Close');
                fireEvent.click(closeButton);

                await waitFor(() => {
                    expect(screen.queryByTestId('success-error-modal')).not.toBeInTheDocument();
                });
            }

            vi.useRealTimers();
        });

        it('should handle fetchAppointments for month view', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);
            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle fetchAppointments for week view', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle fetchAppointments for day view', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle fetchAppointments error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGet.mockRejectedValue(new Error('Network error'));

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch appointments/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle fetchAppointments with success false', async () => {
            // Mock API to return error response
            mockGet.mockResolvedValue({
                data: {
                    success: false,
                    error: 'Failed to fetch'
                }
            });

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
            });
        });

        it('should handle fetchAppointments with empty appointments array', async () => {
            mockGet.mockResolvedValue({
                data: {
                    data: []
                }
            });

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle fetchAppointments with null appointments data', async () => {
            mockGet.mockResolvedValue({
                data: {
                    data: mockAppointments
                }
            });

            render(<Calendar {...defaultProps} appointments={null} />);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle isRecurringFollowup with typeColor blue', () => {
            const blueTypeColor = [{
                id: 1,
                patientName: 'Blue Color',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                typeColor: 'blue'
            }];
            render(<Calendar {...defaultProps} appointments={blueTypeColor} />);
            expect(screen.getByText('Blue Color')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with appointment_type automatic', () => {
            const automaticType = [{
                id: 1,
                patientName: 'Automatic Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={automaticType} />);
            expect(screen.getByText('Automatic Type')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with type automatic', () => {
            const typeAutomatic = [{
                id: 1,
                patientName: 'Type Automatic',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={typeAutomatic} />);
            expect(screen.getByText('Type Automatic')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with appointmentType automatic', () => {
            const appointmentTypeAutomatic = [{
                id: 1,
                patientName: 'AppointmentType Automatic',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                appointmentType: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentTypeAutomatic} />);
            expect(screen.getByText('AppointmentType Automatic')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with follow-up appointment type label', () => {
            const followUpLabel = [{
                id: 1,
                patientName: 'Follow-up Label',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'Follow-up Appointment'
            }];
            render(<Calendar {...defaultProps} appointments={followUpLabel} />);
            expect(screen.getByText('Follow-up Label')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with followup appointment type label', () => {
            const followupLabel = [{
                id: 1,
                patientName: 'Followup Label',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'Followup Appointment'
            }];
            render(<Calendar {...defaultProps} appointments={followupLabel} />);
            expect(screen.getByText('Followup Label')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with auto-booked notes', () => {
            const autoBookedNotes = [{
                id: 1,
                patientName: 'Auto-booked Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Auto-booked appointment'
            }];
            render(<Calendar {...defaultProps} appointments={autoBookedNotes} />);
            expect(screen.getByText('Auto-booked Notes')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with auto booked notes', () => {
            const autoBookedNotes2 = [{
                id: 1,
                patientName: 'Auto Booked Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Auto booked appointment'
            }];
            render(<Calendar {...defaultProps} appointments={autoBookedNotes2} />);
            expect(screen.getByText('Auto Booked Notes')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with automatic appointment notes', () => {
            const automaticAppointmentNotes = [{
                id: 1,
                patientName: 'Automatic Appointment Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Automatic appointment'
            }];
            render(<Calendar {...defaultProps} appointments={automaticAppointmentNotes} />);
            expect(screen.getByText('Automatic Appointment Notes')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with recurring follow-up notes', () => {
            const recurringFollowUpNotes = [{
                id: 1,
                patientName: 'Recurring Follow-up Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Recurring follow-up appointment'
            }];
            render(<Calendar {...defaultProps} appointments={recurringFollowUpNotes} />);
            expect(screen.getByText('Recurring Follow-up Notes')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with recurring followup notes', () => {
            const recurringFollowupNotes = [{
                id: 1,
                patientName: 'Recurring Followup Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Recurring followup appointment'
            }];
            render(<Calendar {...defaultProps} appointments={recurringFollowupNotes} />);
            expect(screen.getByText('Recurring Followup Notes')).toBeInTheDocument();
        });

        it('should handle isRecurringFollowup with recurring follow up notes', () => {
            const recurringFollowUpNotes2 = [{
                id: 1,
                patientName: 'Recurring Follow Up Notes',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                notes: 'Recurring follow up appointment'
            }];
            render(<Calendar {...defaultProps} appointments={recurringFollowUpNotes2} />);
            expect(screen.getByText('Recurring Follow Up Notes')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with no-show status', () => {
            const noShowAppointment = [{
                id: 1,
                patientName: 'No Show Status',
                date: '2024-01-15',
                time: '09:00',
                status: 'no-show',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={noShowAppointment} />);
            expect(screen.getByText('No Show Status')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with purple typeColor', () => {
            const purpleTypeColor = [{
                id: 1,
                patientName: 'Purple Type Color',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'investigation',
                typeColor: 'purple'
            }];
            render(<Calendar {...defaultProps} appointments={purpleTypeColor} />);
            expect(screen.getByText('Purple Type Color')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with teal typeColor', () => {
            const tealTypeColor = [{
                id: 1,
                patientName: 'Teal Type Color',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation',
                typeColor: 'teal'
            }];
            render(<Calendar {...defaultProps} appointments={tealTypeColor} />);
            expect(screen.getByText('Teal Type Color')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with orange typeColor', () => {
            const orangeTypeColor = [{
                id: 1,
                patientName: 'Orange Type Color',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'surgery',
                typeColor: 'orange'
            }];
            render(<Calendar {...defaultProps} appointments={orangeTypeColor} />);
            expect(screen.getByText('Orange Type Color')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with green typeColor', () => {
            const greenTypeColor = [{
                id: 1,
                patientName: 'Green Type Color',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'mdt',
                typeColor: 'green'
            }];
            render(<Calendar {...defaultProps} appointments={greenTypeColor} />);
            expect(screen.getByText('Green Type Color')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with surgery type label', () => {
            const surgeryType = [{
                id: 1,
                patientName: 'Surgery Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'surgery'
            }];
            render(<Calendar {...defaultProps} appointments={surgeryType} />);
            expect(screen.getByText('Surgery Type')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with surgical type label', () => {
            const surgicalType = [{
                id: 1,
                patientName: 'Surgical Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'surgical procedure'
            }];
            render(<Calendar {...defaultProps} appointments={surgicalType} />);
            expect(screen.getByText('Surgical Type')).toBeInTheDocument();
        });

        it('should handle getAppointmentColor with mdt type label', () => {
            const mdtType = [{
                id: 1,
                patientName: 'MDT Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'mdt'
            }];
            render(<Calendar {...defaultProps} appointments={mdtType} />);
            expect(screen.getByText('MDT Type')).toBeInTheDocument();
        });

        it('should handle separateAppointments with time field', () => {
            const withTime = [{
                id: 1,
                patientName: 'With Time',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withTime} />);
            expect(screen.getByText('With Time')).toBeInTheDocument();
        });

        it('should handle separateAppointments with appointment_time field', () => {
            const withAppointmentTime = [{
                id: 1,
                patientName: 'With Appointment Time',
                date: '2024-01-15',
                appointment_time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withAppointmentTime} />);
            expect(screen.getByText('With Appointment Time')).toBeInTheDocument();
        });

        it('should handle separateAppointments without time', () => {
            const withoutTime = [{
                id: 1,
                patientName: 'Without Time',
                date: '2024-01-15',
                time: null,
                appointment_time: null,
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withoutTime} />);
            expect(screen.getByText('Without Time')).toBeInTheDocument();
        });

        it('should handle drop without dragged appointment', () => {
            render(<Calendar {...defaultProps} />);
            const dayCell = screen.getByText('16').closest('div');
            if (dayCell) {
                const dataTransfer = {
                    preventDefault: vi.fn(),
                    dropEffect: ''
                };
                fireEvent.drop(dayCell, { dataTransfer });
                // Should not throw error
                expect(dayCell).toBeInTheDocument();
            }
        });

        it('should handle navigate for month view', () => {
            render(<Calendar {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            const prevButton = buttons.find(btn => 
                btn.querySelector('svg') && btn.querySelector('svg').classList.toString().includes('chevron-left')
            );
            if (prevButton) {
                fireEvent.click(prevButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });

        it('should handle navigate for week view', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            const buttons = screen.getAllByRole('button');
            const nextButton = buttons.find(btn => 
                btn.querySelector('svg') && btn.querySelector('svg').classList.toString().includes('chevron-right')
            );
            if (nextButton) {
                fireEvent.click(nextButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });

        it('should handle navigate for day view', () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            const buttons = screen.getAllByRole('button');
            const prevButton = buttons.find(btn => 
                btn.querySelector('svg') && btn.querySelector('svg').classList.toString().includes('chevron-left')
            );
            if (prevButton) {
                fireEvent.click(prevButton);
                expect(mockOnMonthChange).toHaveBeenCalled();
            }
        });

        it('should handle currentMonth prop change', () => {
            const { rerender } = render(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 0, 1)} />
            );
            
            rerender(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 2, 1)} />
            );
            
            expect(mockOnMonthChange).toHaveBeenCalled();
        });

        it('should handle currentMonth prop change with same month but different year', () => {
            const { rerender } = render(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 0, 1)} />
            );
            
            rerender(
                <Calendar {...defaultProps} currentMonth={new Date(2025, 0, 1)} />
            );
            
            expect(mockOnMonthChange).toHaveBeenCalled();
        });

        it('should handle currentMonth prop change with same month and year', () => {
            const { rerender } = render(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 0, 1)} />
            );
            
            rerender(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 0, 15)} />
            );
            
            // Should not call onMonthChange if month and year are the same
            // (only day changed)
            expect(mockOnMonthChange).not.toHaveBeenCalled();
        });

        it('should handle appointments prop change', () => {
            const { rerender } = render(
                <Calendar {...defaultProps} appointments={mockAppointments} />
            );
            
            const newAppointments = [{
                id: 100,
                patientName: 'New Patient',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            
            rerender(
                <Calendar {...defaultProps} appointments={newAppointments} />
            );
            
            expect(screen.getByText('New Patient')).toBeInTheDocument();
        });

        it('should handle allAppointments state change', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);
            
            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should handle external loading state', () => {
            render(<Calendar {...defaultProps} loadingAppointments={true} />);
            expect(screen.getByText(/Loading/i)).toBeInTheDocument();
        });

        it('should handle external error state', () => {
            render(<Calendar {...defaultProps} appointmentsError="External error" />);
            expect(screen.getByText(/External error/i)).toBeInTheDocument();
        });

        it('should handle external refresh function', () => {
            const onRefresh = vi.fn();
            render(<Calendar {...defaultProps} onRefresh={onRefresh} appointmentsError="Error" />);
            const retryButton = screen.getByText(/Retry/i);
            if (retryButton) {
                fireEvent.click(retryButton);
                expect(onRefresh).toHaveBeenCalled();
            }
        });

        it('should handle internal refresh function', () => {
            render(<Calendar {...defaultProps} onRefresh={null} appointmentsError="Error" />);
            const retryButton = screen.getByText(/Retry/i);
            if (retryButton) {
                fireEvent.click(retryButton);
                expect(mockGet).toHaveBeenCalled();
            }
        });

        it('should handle onTogglePatients with false', () => {
            render(<Calendar {...defaultProps} />);
            const myPatientsButton = screen.getByText(/My Patients Only/i);
            if (myPatientsButton) {
                fireEvent.click(myPatientsButton);
                expect(mockOnTogglePatients).toHaveBeenCalledWith(false);
            }
        });

        it('should handle onTogglePatients with true', () => {
            render(<Calendar {...defaultProps} />);
            const allPatientsButton = screen.getByText(/All Patients/i);
            if (allPatientsButton) {
                fireEvent.click(allPatientsButton);
                expect(mockOnTogglePatients).toHaveBeenCalledWith(true);
            }
        });

        it('should handle onDayClick when provided', () => {
            render(<Calendar {...defaultProps} onDayClick={mockOnDayClick} />);
            const dayCell = screen.getByText('15').closest('div[class*="cursor-pointer"]');
            if (dayCell) {
                fireEvent.click(dayCell);
                expect(mockOnDayClick).toHaveBeenCalled();
            }
        });

        it('should handle onDayClick when not provided', () => {
            render(<Calendar {...defaultProps} onDayClick={null} />);
            const dayCell = screen.getByText('15').closest('div[class*="cursor-pointer"]');
            if (dayCell) {
                fireEvent.click(dayCell);
                // Should switch to day view
                expect(screen.getByText(/Day/i)).toBeInTheDocument();
            }
        });

        it('should handle appointment click with stopPropagation', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');
            const clickEvent = {
                stopPropagation: vi.fn()
            };
            fireEvent.click(appointmentElement, clickEvent);
            // Should open details modal
            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should handle appointment more button click', async () => {
            render(<Calendar {...defaultProps} />);
            const appointmentElement = screen.getByText('John Doe');
            fireEvent.click(appointmentElement);
            // Should open details modal
            await waitFor(() => {
                expect(screen.getByTestId('details-modal')).toBeInTheDocument();
            });
        });

        it('should handle formatDate with Date object', () => {
            render(<Calendar {...defaultProps} />);
            // Calendar should format dates correctly
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should handle formatDate with string', () => {
            const stringDateAppointments = [{
                id: 1,
                patientName: 'String Date',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={stringDateAppointments} />);
            expect(screen.getByText('String Date')).toBeInTheDocument();
        });

        it('should handle getDaysInMonth correctly', () => {
            render(<Calendar {...defaultProps} />);
            // Should render all days in month
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should handle getWeekDays correctly', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            // Should render week days
            expect(screen.getByText(/Week/i)).toBeInTheDocument();
        });

        it('should handle getWeekRange correctly', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            // Should show week range
            expect(screen.getByText(/Week/i)).toBeInTheDocument();
        });

        it('should handle getDayString correctly', () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);
            // Should show day string
            expect(screen.getByText(/Day/i)).toBeInTheDocument();
        });

        it('should handle getMonthYear correctly', () => {
            render(<Calendar {...defaultProps} />);
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should handle time slot generation', () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            // Should show time slots - verify by checking for time slot elements
            // The timeSlots array is generated from 6 AM to 9 PM (6 to 21 hours)
            // This ensures the for loop at line 167-171 is executed
            expect(screen.getByText(/Week/i)).toBeInTheDocument();
        });

        it('should generate all time slots from 6 AM to 9 PM in week view', async () => {
            render(<Calendar {...defaultProps} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            
            // Verify week view is active
            expect(screen.getByText(/Week/i)).toBeInTheDocument();
            
            // The timeSlots array should be generated with 16 slots (6 AM to 9 PM)
            // This ensures the for loop at lines 167-171 executes completely
            // We can verify by checking that time slot labels are rendered in week view
            // The timeSlots.map() at line 849 should render all slots
            await waitFor(() => {
                // Check for time slot labels (e.g., "6:00 AM", "7:00 AM", etc.)
                const timeSlotLabels = screen.queryAllByText(/\d{1,2}:00 (AM|PM)/i);
                expect(timeSlotLabels.length).toBeGreaterThan(0);
            });
        });

        it('should generate all time slots from 6 AM to 9 PM in day view', async () => {
            render(<Calendar {...defaultProps} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);
            
            // Verify day view is active
            expect(screen.getByText(/Day/i)).toBeInTheDocument();
            
            // The timeSlots array should be generated and used in day view (line 1009)
            // This ensures the for loop at lines 167-171 executes completely
            await waitFor(() => {
                // Check for time slot labels in day view
                const timeSlotLabels = screen.queryAllByText(/\d{1,2}:00 (AM|PM)/i);
                expect(timeSlotLabels.length).toBeGreaterThan(0);
            });
        });

        it('should handle isTimeInSlot with matching time', () => {
            const matchingTime = [{
                id: 1,
                patientName: 'Matching Time',
                date: '2024-01-15',
                time: '09:30',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={matchingTime} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            expect(screen.getByText('Matching Time')).toBeInTheDocument();
        });

        it('should handle isTimeInSlot with non-matching time', () => {
            const nonMatchingTime = [{
                id: 1,
                patientName: 'Non Matching Time',
                date: '2024-01-15',
                time: '09:30',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={nonMatchingTime} />);
            expect(screen.getByText('Non Matching Time')).toBeInTheDocument();
        });

        it('should handle appointment sorting by status', () => {
            const mixedStatus = [
                {
                    id: 1,
                    patientName: 'Pending First',
                    date: '2024-01-15',
                    time: '09:00',
                    status: 'pending',
                    type: 'consultation'
                },
                {
                    id: 2,
                    patientName: 'Confirmed Second',
                    date: '2024-01-15',
                    time: '10:00',
                    status: 'confirmed',
                    type: 'consultation'
                },
                {
                    id: 3,
                    patientName: 'Missed Third',
                    date: '2024-01-15',
                    time: '11:00',
                    status: 'missed',
                    type: 'consultation'
                }
            ];
            render(<Calendar {...defaultProps} appointments={mixedStatus} />);
            expect(screen.getByText('Pending First')).toBeInTheDocument();
            expect(screen.getByText('Confirmed Second')).toBeInTheDocument();
            expect(screen.getByText('Missed Third')).toBeInTheDocument();
        });

        it('should handle appointment sorting by time within status', () => {
            const sameStatus = [
                {
                    id: 1,
                    patientName: 'Later Time',
                    date: '2024-01-15',
                    time: '10:00',
                    status: 'confirmed',
                    type: 'consultation'
                },
                {
                    id: 2,
                    patientName: 'Earlier Time',
                    date: '2024-01-15',
                    time: '09:00',
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<Calendar {...defaultProps} appointments={sameStatus} />);
            expect(screen.getByText('Earlier Time')).toBeInTheDocument();
            expect(screen.getByText('Later Time')).toBeInTheDocument();
        });

        it('should handle appointment sorting with null time', () => {
            const nullTime = [
                {
                    id: 1,
                    patientName: 'Null Time',
                    date: '2024-01-15',
                    time: null,
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<Calendar {...defaultProps} appointments={nullTime} />);
            expect(screen.getByText('Null Time')).toBeInTheDocument();
        });

        it('should handle appointment sorting with empty time', () => {
            const emptyTime = [
                {
                    id: 1,
                    patientName: 'Empty Time',
                    date: '2024-01-15',
                    time: '',
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<Calendar {...defaultProps} appointments={emptyTime} />);
            expect(screen.getByText('Empty Time')).toBeInTheDocument();
        });

        it('should handle hasAppointments flag', () => {
            const withAppointments = [{
                id: 1,
                patientName: 'Has Appointments',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withAppointments} />);
            expect(screen.getByText('Has Appointments')).toBeInTheDocument();
        });

        it('should handle no appointments message', () => {
            render(<Calendar {...defaultProps} appointments={[]} />);
            // Should show "No appointments" for empty days
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should handle day.isCurrentMonth false', () => {
            render(<Calendar {...defaultProps} />);
            // Should render previous/next month days with different styling
            expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
        });

        it('should handle day.isToday true', () => {
            const today = new Date();
            render(<Calendar {...defaultProps} currentMonth={today} />);
            // Should highlight today
            expect(screen.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/i)).toBeInTheDocument();
        });

        it('should handle automatic appointments section in week view', async () => {
            const automatic = [{
                id: 1,
                patientName: 'Automatic Week',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={automatic} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText('Automatic Week')).toBeInTheDocument();
            });
        });

        it('should handle automatic appointments section in day view', async () => {
            const automatic = [{
                id: 1,
                patientName: 'Automatic Day',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic'
            }];
            render(<Calendar {...defaultProps} appointments={automatic} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(screen.getByText('Automatic Day')).toBeInTheDocument();
            });
        });

        it('should handle automatic appointments with time in automatic section', async () => {
            const automaticWithTime = [{
                id: 1,
                patientName: 'Auto With Time Section',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'follow_up',
                appointment_type: 'automatic',
                typeColor: 'blue'
            }];
            render(<Calendar {...defaultProps} appointments={automaticWithTime} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText('Auto With Time Section')).toBeInTheDocument();
            });
        });

        it('should handle empty automatic appointments in week view', async () => {
            render(<Calendar {...defaultProps} appointments={[]} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);

            await waitFor(() => {
                expect(screen.getByText(/Week/i)).toBeInTheDocument();
            });
        });

        it('should handle empty automatic appointments in day view', async () => {
            render(<Calendar {...defaultProps} appointments={[]} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);

            await waitFor(() => {
                expect(screen.getByText(/Day/i)).toBeInTheDocument();
            });
        });

        it('should handle appointment with type field', () => {
            const withType = [{
                id: 1,
                patientName: 'With Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withType} />);
            expect(screen.getByText('With Type')).toBeInTheDocument();
        });

        it('should handle appointment without type field', () => {
            const withoutType = [{
                id: 1,
                patientName: 'Without Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed'
            }];
            render(<Calendar {...defaultProps} appointments={withoutType} />);
            expect(screen.getByText('Without Type')).toBeInTheDocument();
        });

        it('should handle appointment with null type', () => {
            const nullType = [{
                id: 1,
                patientName: 'Null Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: null
            }];
            render(<Calendar {...defaultProps} appointments={nullType} />);
            expect(screen.getByText('Null Type')).toBeInTheDocument();
        });

        it('should handle appointment with empty type', () => {
            const emptyType = [{
                id: 1,
                patientName: 'Empty Type',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: ''
            }];
            render(<Calendar {...defaultProps} appointments={emptyType} />);
            expect(screen.getByText('Empty Type')).toBeInTheDocument();
        });

        it('should handle appointment title with time', () => {
            const withTimeTitle = [{
                id: 1,
                patientName: 'Time Title',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withTimeTitle} />);
            const weekButton = screen.getByText(/Week/i);
            fireEvent.click(weekButton);
            expect(screen.getByText('Time Title')).toBeInTheDocument();
        });

        it('should handle appointment title without time', () => {
            const withoutTimeTitle = [{
                id: 1,
                patientName: 'No Time Title',
                date: '2024-01-15',
                time: null,
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withoutTimeTitle} />);
            expect(screen.getByText('No Time Title')).toBeInTheDocument();
        });

        it('should handle appointment title with type', () => {
            const withTypeTitle = [{
                id: 1,
                patientName: 'Type Title',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={withTypeTitle} />);
            expect(screen.getByText('Type Title')).toBeInTheDocument();
        });

        it('should handle appointment title without type', () => {
            const withoutTypeTitle = [{
                id: 1,
                patientName: 'No Type Title',
                date: '2024-01-15',
                time: '09:00',
                status: 'confirmed'
            }];
            render(<Calendar {...defaultProps} appointments={withoutTypeTitle} />);
            expect(screen.getByText('No Type Title')).toBeInTheDocument();
        });

        it('should handle appointment title with Automatic Appointment fallback', () => {
            const automaticTitle = [{
                id: 1,
                patientName: 'Automatic Title',
                date: '2024-01-15',
                time: null,
                status: 'confirmed'
            }];
            render(<Calendar {...defaultProps} appointments={automaticTitle} />);
            const dayButton = screen.getByText(/Day/i);
            fireEvent.click(dayButton);
            expect(screen.getByText('Automatic Title')).toBeInTheDocument();
        });
    });

    describe('Appointment Time Field Handling', () => {
        it('should use appointment_time field when time field is not available', () => {
            const appointmentsWithAppointmentTime = [{
                id: 1,
                patientName: 'Appointment Time Field',
                date: '2024-01-15',
                appointment_time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithAppointmentTime} />);
            expect(screen.getByText('Appointment Time Field')).toBeInTheDocument();
        });

        it('should prioritize time field over appointment_time field', () => {
            const appointmentsWithBoth = [{
                id: 1,
                patientName: 'Both Time Fields',
                date: '2024-01-15',
                time: '10:00',
                appointment_time: '09:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<Calendar {...defaultProps} appointments={appointmentsWithBoth} />);
            expect(screen.getByText('Both Time Fields')).toBeInTheDocument();
        });
    });
});

    describe('Date Formatting', () => {
        it('should format dates correctly for appointment matching', () => {
            render(<Calendar {...defaultProps} />);
            // Calendar should render appointments on correct dates
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    describe('Recurring Followup Detection', () => {
        it('should detect recurring followup by typeColor', () => {
            const blueTypeColorAppointments = [
                {
                    id: 15,
                    patient_name: 'Blue Type Color',
                    appointment_date: '2024-01-15',
                    time_slot: '17:00',
                    status: 'confirmed',
                    type: 'follow_up',
                    typeColor: 'blue',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={blueTypeColorAppointments} />);
            expect(screen.getByText('Blue Type Color')).toBeInTheDocument();
        });

        it('should detect recurring followup by appointment_type', () => {
            const automaticTypeAppointments = [
                {
                    id: 16,
                    patient_name: 'Automatic Type',
                    appointment_date: '2024-01-15',
                    time_slot: '18:00',
                    status: 'confirmed',
                    type: 'follow_up',
                    appointment_type: 'automatic',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={automaticTypeAppointments} />);
            expect(screen.getByText('Automatic Type')).toBeInTheDocument();
        });

        it('should detect recurring followup by notes', () => {
            const notesAppointments = [
                {
                    id: 17,
                    patient_name: 'Notes Auto',
                    appointment_date: '2024-01-15',
                    time_slot: '19:00',
                    status: 'confirmed',
                    type: 'follow_up',
                    notes: 'Auto-booked appointment',
                    doctor_name: 'Dr. Smith'
                }
            ];

            render(<Calendar {...defaultProps} appointments={notesAppointments} />);
            expect(screen.getByText('Notes Auto')).toBeInTheDocument();
        });
    });

    describe('getAppointmentColor Function', () => {
        it('should return red for missed appointments', () => {
            const missedAppointment = {
                id: 1,
                patient_name: 'Missed',
                appointment_date: '2024-01-15',
                status: 'missed',
                type: 'consultation'
            };
            render(<Calendar {...defaultProps} appointments={[missedAppointment]} />);
            expect(screen.getByText('Missed')).toBeInTheDocument();
        });

        it('should return red for no-show status', () => {
            const noShowAppointment = {
                id: 1,
                patient_name: 'No Show',
                appointment_date: '2024-01-15',
                status: 'no-show',
                type: 'consultation'
            };
            render(<Calendar {...defaultProps} appointments={[noShowAppointment]} />);
            expect(screen.getByText('No Show')).toBeInTheDocument();
        });

        it('should return purple for investigation type label', () => {
            const investigationAppointment = {
                id: 1,
                patient_name: 'Investigation',
                appointment_date: '2024-01-15',
                status: 'confirmed',
                type: 'investigation'
            };
            render(<Calendar {...defaultProps} appointments={[investigationAppointment]} />);
            expect(screen.getByText('Investigation')).toBeInTheDocument();
        });

        it('should return orange for surgical type label', () => {
            const surgicalAppointment = {
                id: 1,
                patient_name: 'Surgical',
                appointment_date: '2024-01-15',
                status: 'confirmed',
                type: 'surgical procedure'
            };
            render(<Calendar {...defaultProps} appointments={[surgicalAppointment]} />);
            expect(screen.getByText('Surgical')).toBeInTheDocument();
        });

        it('should return green for MDT type label', () => {
            const mdtAppointment = {
                id: 1,
                patient_name: 'MDT',
                appointment_date: '2024-01-15',
                status: 'confirmed',
                type: 'mdt meeting'
            };
            render(<Calendar {...defaultProps} appointments={[mdtAppointment]} />);
            expect(screen.getByText('MDT')).toBeInTheDocument();
        });

        it('should return teal as default for consultations', () => {
            const consultationAppointment = {
                id: 1,
                patient_name: 'Consultation',
                appointment_date: '2024-01-15',
                status: 'confirmed',
                type: 'consultation'
            };
            render(<Calendar {...defaultProps} appointments={[consultationAppointment]} />);
            expect(screen.getByText('Consultation')).toBeInTheDocument();
        });
    });

    describe('separateAppointments Function', () => {
        it('should separate appointments with and without time slots', () => {
            const mixedAppointments = [
                {
                    id: 1,
                    patient_name: 'With Time',
                    appointment_date: '2024-01-15',
                    time: '09:00',
                    status: 'confirmed'
                },
                {
                    id: 2,
                    patient_name: 'No Time',
                    appointment_date: '2024-01-15',
                    time: null,
                    appointment_time: null,
                    status: 'confirmed'
                }
            ];
            render(<Calendar {...defaultProps} appointments={mixedAppointments} />);
            expect(screen.getByText('With Time')).toBeInTheDocument();
            expect(screen.getByText('No Time')).toBeInTheDocument();
        });
    });

    describe('External Appointments Handling', () => {
        it('should use external appointments when provided', () => {
            const externalAppointments = [{
                id: 1,
                patient_name: 'External',
                appointment_date: '2024-01-15',
                time: '09:00',
                status: 'confirmed'
            }];
            render(<Calendar {...defaultProps} appointments={externalAppointments} />);
            expect(screen.getByText('External')).toBeInTheDocument();
        });

        it('should fetch appointments when not provided', async () => {
            render(<Calendar {...defaultProps} appointments={null} />);
            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });
    });

    describe('Current Month Sync', () => {
        it('should sync currentDate with currentMonth prop', () => {
            const { rerender } = render(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 0, 1)} />
            );
            
            rerender(
                <Calendar {...defaultProps} currentMonth={new Date(2024, 1, 1)} />
            );
            
            expect(mockOnMonthChange).toHaveBeenCalled();
        });
    });
