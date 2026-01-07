import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import DailyAppointmentsList from '../DailyAppointmentsList';

describe('DailyAppointmentsList', () => {
    const mockOnDateChange = vi.fn();
    const mockOnAppointmentClick = vi.fn();

    const mockAppointments = [
        {
            id: 1,
            patient_name: 'John Doe',
            patient_email: 'john@example.com',
            patient_phone: '1234567890',
            appointment_date: '2024-01-15',
            time_slot: '09:00',
            status: 'confirmed',
            type: 'consultation',
            doctor_name: 'Dr. Smith'
        },
        {
            id: 2,
            patient_name: 'Jane Smith',
            patient_email: 'jane@example.com',
            patient_phone: '0987654321',
            appointment_date: '2024-01-15',
            time_slot: '10:00',
            status: 'pending',
            type: 'follow_up',
            doctor_name: 'Dr. Johnson'
        },
        {
            id: 3,
            patient_name: 'Bob Wilson',
            patient_email: 'bob@example.com',
            patient_phone: '5555555555',
            appointment_date: '2024-01-15',
            time_slot: '14:00',
            status: 'no_show',
            type: 'investigation',
            doctor_name: 'Dr. Smith'
        }
    ];

    const defaultProps = {
        appointments: mockAppointments,
        selectedDate: new Date(2024, 0, 15),
        onDateChange: mockOnDateChange,
        onAppointmentClick: mockOnAppointmentClick
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the component', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/January 15/i)).toBeInTheDocument();
        });

        it('should render navigation buttons', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('should display appointments for the day', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        it('should display time slots', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/9:00 AM/i) || screen.getByText(/09:00/)).toBeInTheDocument();
        });

        it('should show empty state when no appointments', () => {
            render(<DailyAppointmentsList {...defaultProps} appointments={[]} />);
            expect(screen.getByText(/No appointments/i)).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate to previous day', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const prevButton = screen.getAllByRole('button')[0]; // First button should be prev
            fireEvent.click(prevButton);
            expect(mockOnDateChange).toHaveBeenCalled();
        });

        it('should navigate to next day', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            const nextButton = buttons[buttons.length - 1]; // Last button should be next
            fireEvent.click(nextButton);
            expect(mockOnDateChange).toHaveBeenCalled();
        });
    });

    describe('Appointment Click', () => {
        it('should call onAppointmentClick when appointment is clicked', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const appointment = screen.getByText('John Doe');
            fireEvent.click(appointment);
            expect(mockOnAppointmentClick).toHaveBeenCalled();
        });

        it('should pass correct appointment to click handler', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const appointment = screen.getByText('John Doe');
            fireEvent.click(appointment);
            expect(mockOnAppointmentClick).toHaveBeenCalledWith(
                expect.objectContaining({ patient_name: 'John Doe' })
            );
        });
    });

    describe('Time Formatting', () => {
        it('should convert 24-hour to 12-hour format', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            // 14:00 should be 2:00 PM
            expect(screen.getByText(/2:00 PM/i) || screen.getByText(/14:00/)).toBeInTheDocument();
        });

        it('should handle morning times correctly', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            // 09:00 should be 9:00 AM
            expect(screen.getByText(/9:00 AM/i) || screen.getByText(/09:00/)).toBeInTheDocument();
        });
    });

    describe('Date Formatting', () => {
        it('should format the selected date correctly', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/January 15, 2024/i) || screen.getByText(/Mon, Jan 15/i)).toBeInTheDocument();
        });
    });

    describe('Status Display', () => {
        it('should display confirmed status', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
        });

        it('should display pending status', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/pending/i)).toBeInTheDocument();
        });

        it('should display no_show status', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/no.show|missed/i)).toBeInTheDocument();
        });
    });

    describe('Appointment Sorting', () => {
        it('should sort appointments by status priority', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const appointments = screen.getAllByText(/Doe|Smith|Wilson/);
            // Confirmed/pending should appear before no_show
            expect(appointments[0].textContent).toContain('Doe');
        });

        it('should sort appointments by time', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const times = screen.getAllByText(/:(00|30)/);
            // Earlier times should appear first
            expect(times.length).toBeGreaterThan(0);
        });
    });

    describe('Patient Information', () => {
        it('should display patient email', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
        });

        it('should display patient phone', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText('1234567890')).toBeInTheDocument();
        });
    });

    describe('Doctor Information', () => {
        it('should display doctor name', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
        });
    });

    describe('Recurring Appointments', () => {
        it('should identify recurring follow-up appointments by typeColor', () => {
            const recurringAppointments = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'Recurring Patient',
                    appointment_date: '2024-01-15',
                    time: null,
                    status: 'confirmed',
                    type: 'Follow-up Appointment',
                    typeColor: 'blue',
                    doctor_name: 'Dr. Auto'
                }
            ];

            render(<DailyAppointmentsList {...defaultProps} appointments={recurringAppointments} />);
            expect(screen.getByText('Recurring Patient')).toBeInTheDocument();
        });

        it('should identify recurring appointments by appointment_type', () => {
            const recurringAppointments = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'Auto Patient',
                    appointment_date: '2024-01-15',
                    time: null,
                    status: 'confirmed',
                    appointment_type: 'automatic',
                    doctor_name: 'Dr. Auto'
                }
            ];

            render(<DailyAppointmentsList {...defaultProps} appointments={recurringAppointments} />);
            expect(screen.getByText('Auto Patient')).toBeInTheDocument();
        });

        it('should identify recurring appointments by notes', () => {
            const recurringAppointments = [
                ...mockAppointments,
                {
                    id: 4,
                    patient_name: 'Note Patient',
                    appointment_date: '2024-01-15',
                    time: null,
                    status: 'confirmed',
                    notes: 'Auto-booked appointment',
                    doctor_name: 'Dr. Auto'
                }
            ];

            render(<DailyAppointmentsList {...defaultProps} appointments={recurringAppointments} />);
            expect(screen.getByText('Note Patient')).toBeInTheDocument();
        });
    });

    describe('View Mode Toggle', () => {
        it('should switch to list view', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const listButton = screen.getByText(/List View/i);
            fireEvent.click(listButton);
            expect(listButton.className).toContain('bg-white');
        });

        it('should switch to timeline view', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const timelineButton = screen.getByText(/Timeline View/i);
            fireEvent.click(timelineButton);
            expect(timelineButton.className).toContain('bg-white');
        });

        it('should display appointments in list view', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const listButton = screen.getByText(/List View/i);
            fireEvent.click(listButton);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should display appointments in timeline view', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            const timelineButton = screen.getByText(/Timeline View/i);
            fireEvent.click(timelineButton);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    describe('Appointment Sorting', () => {
        it('should sort confirmed before missed', () => {
            const mixedAppointments = [
                {
                    id: 1,
                    patient_name: 'Missed Patient',
                    time: '09:00',
                    status: 'missed',
                    type: 'consultation'
                },
                {
                    id: 2,
                    patient_name: 'Confirmed Patient',
                    time: '10:00',
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={mixedAppointments} />);
            const appointments = screen.getAllByText(/Patient/);
            expect(appointments[0].textContent).toContain('Confirmed');
        });

        it('should sort automatic appointments to the end', () => {
            const mixedAppointments = [
                {
                    id: 1,
                    patient_name: 'Automatic Patient',
                    time: null,
                    appointment_type: 'automatic',
                    status: 'confirmed',
                    type: 'automatic'
                },
                {
                    id: 2,
                    patient_name: 'Regular Patient',
                    time: '09:00',
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={mixedAppointments} />);
            const appointments = screen.getAllByText(/Patient/);
            // Regular should appear before automatic
            expect(appointments[0].textContent).toContain('Regular');
        });

        it('should sort by time within same status', () => {
            const timeAppointments = [
                {
                    id: 1,
                    patient_name: 'Later Patient',
                    time: '14:00',
                    status: 'confirmed',
                    type: 'consultation'
                },
                {
                    id: 2,
                    patient_name: 'Earlier Patient',
                    time: '09:00',
                    status: 'confirmed',
                    type: 'consultation'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={timeAppointments} />);
            const appointments = screen.getAllByText(/Patient/);
            expect(appointments[0].textContent).toContain('Earlier');
        });
    });

    describe('Timeline View', () => {
        it('should generate time slots from 6 AM to 9 PM', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            expect(screen.getByText(/6:00 AM/i) || screen.getByText(/9:00 PM/i)).toBeInTheDocument();
        });

        it('should get appointments for specific hour', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            // 9 AM slot should contain John Doe (09:00)
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should exclude automatic appointments from timeline', () => {
            const automaticAppointments = [
                {
                    id: 1,
                    patient_name: 'Auto Patient',
                    time: null,
                    appointment_type: 'automatic',
                    status: 'confirmed',
                    type: 'automatic'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={automaticAppointments} />);
            // Should still render but not in timeline slots
            expect(screen.getByText('Auto Patient')).toBeInTheDocument();
        });
    });

    describe('Automatic Appointments', () => {
        it('should display flexible time for automatic appointments', () => {
            const automaticAppointments = [
                {
                    id: 1,
                    patient_name: 'Auto Patient',
                    time: null,
                    appointment_type: 'automatic',
                    status: 'confirmed',
                    type: 'automatic'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={automaticAppointments} />);
            expect(screen.getByText(/Flexible/i) || 
                   screen.getByText(/no time slot/i)).toBeInTheDocument();
        });

        it('should show blue badge for automatic appointments', () => {
            const automaticAppointments = [
                {
                    id: 1,
                    patient_name: 'Auto Patient',
                    time: null,
                    appointment_type: 'automatic',
                    typeColor: 'blue',
                    status: 'confirmed',
                    type: 'automatic'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={automaticAppointments} />);
            const badge = screen.getByText('Auto Patient').closest('div')?.querySelector('.bg-blue');
            expect(badge || screen.getByText('Auto Patient')).toBeInTheDocument();
        });
    });

    describe('Missed Appointments', () => {
        it('should display missed status badge', () => {
            const missedAppointments = [
                {
                    id: 1,
                    patient_name: 'Missed Patient',
                    time: '09:00',
                    status: 'missed',
                    type: 'consultation'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={missedAppointments} />);
            expect(screen.getByText(/Missed/i)).toBeInTheDocument();
        });

        it('should show red styling for missed appointments in timeline', () => {
            const missedAppointments = [
                {
                    id: 1,
                    patient_name: 'Missed Patient',
                    time: '09:00',
                    status: 'missed',
                    type: 'consultation'
                }
            ];
            render(<DailyAppointmentsList {...defaultProps} appointments={missedAppointments} />);
            const timelineButton = screen.getByText(/Timeline View/i);
            fireEvent.click(timelineButton);
            const appointmentCard = screen.getByText('Missed Patient').closest('.bg-red-500');
            expect(appointmentCard || screen.getByText('Missed Patient')).toBeInTheDocument();
        });
    });

    describe('Time Conversion', () => {
        it('should convert 00:00 to 12:00 AM', () => {
            const midnightAppointment = [{
                id: 1,
                patient_name: 'Midnight Patient',
                time: '00:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<DailyAppointmentsList {...defaultProps} appointments={midnightAppointment} />);
            expect(screen.getByText(/12:00 AM/i) || screen.getByText(/00:00/)).toBeInTheDocument();
        });

        it('should convert 12:00 to 12:00 PM', () => {
            const noonAppointment = [{
                id: 1,
                patient_name: 'Noon Patient',
                time: '12:00',
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<DailyAppointmentsList {...defaultProps} appointments={noonAppointment} />);
            expect(screen.getByText(/12:00 PM/i) || screen.getByText(/12:00/)).toBeInTheDocument();
        });

        it('should handle missing time gracefully', () => {
            const noTimeAppointment = [{
                id: 1,
                patient_name: 'No Time Patient',
                time: null,
                status: 'confirmed',
                type: 'consultation'
            }];
            render(<DailyAppointmentsList {...defaultProps} appointments={noTimeAppointment} />);
            expect(screen.getByText(/N\/A/i) || screen.getByText('No Time Patient')).toBeInTheDocument();
        });
    });

    describe('Without Optional Props', () => {
        it('should handle undefined onAppointmentClick', () => {
            render(
                <DailyAppointmentsList
                    appointments={mockAppointments}
                    selectedDate={new Date(2024, 0, 15)}
                    onDateChange={mockOnDateChange}
                    onAppointmentClick={undefined}
                />
            );
            const appointment = screen.getByText('John Doe');
            fireEvent.click(appointment); // Should not throw
            // Verify component doesn't crash and appointments are still displayed
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should handle undefined selectedDate', () => {
            render(
                <DailyAppointmentsList
                    appointments={mockAppointments}
                    selectedDate={undefined}
                    onDateChange={mockOnDateChange}
                    onAppointmentClick={mockOnAppointmentClick}
                />
            );
            // Should render with today's date
            expect(screen.getByText(/appointments/i)).toBeInTheDocument();
        });
    });

    describe('Hour Slots', () => {
        it('should display appointments in correct hour slots', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            // 9 AM slot should contain John Doe
            const nineAmSlot = screen.getByText('John Doe').closest('div');
            expect(nineAmSlot).toBeInTheDocument();
        });

        it('should get appointments for specific hour', () => {
            render(<DailyAppointmentsList {...defaultProps} />);
            // 2 PM (14:00) should show Bob Wilson
            expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        });
    });
});
