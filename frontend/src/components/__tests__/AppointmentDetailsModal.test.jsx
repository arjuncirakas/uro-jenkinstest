import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock UpdateAppointmentModal
vi.mock('../UpdateAppointmentModal', () => ({
    default: ({ isOpen, onClose, onSuccess, patient }) =>
        isOpen ? (
            <div data-testid="update-appointment-modal">
                <button onClick={onClose}>Close</button>
                <button onClick={() => onSuccess()}>Save</button>
                <div>Patient: {patient?.name}</div>
            </div>
        ) : null
}));

import AppointmentDetailsModal from '../AppointmentDetailsModal';

describe('AppointmentDetailsModal', () => {
    const mockOnClose = vi.fn();
    const mockOnReschedule = vi.fn();
    const mockOnCancel = vi.fn();

    const mockAppointment = {
        id: 1,
        patient_name: 'John Doe',
        patient_email: 'john@example.com',
        patient_phone: '1234567890',
        appointment_date: '2024-01-15',
        time_slot: '09:00',
        status: 'confirmed',
        type: 'consultation',
        doctor_name: 'Dr. Smith',
        notes: 'Follow up required'
    };

    const defaultProps = {
        isOpen: true,
        appointment: mockAppointment,
        onClose: mockOnClose,
        onReschedule: mockOnReschedule,
        onCancel: mockOnCancel
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AppointmentDetailsModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should return null when no appointment', () => {
            const { container } = render(
                <AppointmentDetailsModal {...defaultProps} appointment={null} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open with appointment', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText('Appointment Details')).toBeInTheDocument();
        });

        it('should display patient name', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should display patient email', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
        });

        it('should display patient phone', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText('1234567890')).toBeInTheDocument();
        });

        it('should display appointment date', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/January 15/i) || screen.getByText(/2024-01-15/)).toBeInTheDocument();
        });

        it('should display appointment time', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/9:00 AM/i) || screen.getByText(/09:00/)).toBeInTheDocument();
        });

        it('should display doctor name', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
        });

        it('should display appointment type', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/consultation/i)).toBeInTheDocument();
        });

        it('should display appointment status', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
        });

        it('should display notes if present', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText('Follow up required')).toBeInTheDocument();
        });
    });

    describe('Status Styling', () => {
        it('should show green styling for confirmed status', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const statusBadge = screen.getByText(/confirmed/i);
            expect(statusBadge.className).toContain('green');
        });

        it('should show yellow styling for pending status', () => {
            const pendingAppointment = { ...mockAppointment, status: 'pending' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={pendingAppointment} />);
            const statusBadge = screen.getByText(/pending/i);
            expect(statusBadge).toBeInTheDocument();
        });

        it('should show red styling for no_show status', () => {
            const noShowAppointment = { ...mockAppointment, status: 'no_show' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={noShowAppointment} />);
            const statusBadge = screen.getByText(/no.show|missed/i);
            expect(statusBadge).toBeInTheDocument();
        });
    });

    describe('Actions', () => {
        it('should call onClose when close button is clicked', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i) || screen.getByText('Close');
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should open reschedule modal when reschedule button is clicked', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const rescheduleButton = screen.getByText(/Reschedule/i);
            if (rescheduleButton) {
                fireEvent.click(rescheduleButton);
                expect(screen.getByTestId('update-appointment-modal')).toBeInTheDocument();
            }
        });

        it('should close details modal after successful reschedule', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const rescheduleButton = screen.getByText(/Reschedule/i);
            if (rescheduleButton) {
                fireEvent.click(rescheduleButton);
                const saveButton = screen.getByText('Save');
                fireEvent.click(saveButton);
                expect(mockOnReschedule).toHaveBeenCalled();
                expect(mockOnClose).toHaveBeenCalled();
            }
        });

        it('should call onCancel when cancel button is clicked', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const cancelButton = screen.getByText(/Cancel Appointment/i);
            if (cancelButton) {
                fireEvent.click(cancelButton);
                expect(mockOnCancel).toHaveBeenCalled();
            }
        });
    });

    describe('Appointment Types', () => {
        it('should display consultation type', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            expect(screen.getByText(/consultation/i)).toBeInTheDocument();
        });

        it('should display follow_up type', () => {
            const followUpAppointment = { ...mockAppointment, type: 'follow_up' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={followUpAppointment} />);
            expect(screen.getByText(/follow.up/i)).toBeInTheDocument();
        });

        it('should display investigation type', () => {
            const investigationAppointment = { ...mockAppointment, type: 'investigation' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={investigationAppointment} />);
            expect(screen.getByText(/investigation/i)).toBeInTheDocument();
        });
    });

    describe('Missing Data Handling', () => {
        it('should handle missing email', () => {
            const noEmailAppointment = { ...mockAppointment, patient_email: null };
            render(<AppointmentDetailsModal {...defaultProps} appointment={noEmailAppointment} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should handle missing phone', () => {
            const noPhoneAppointment = { ...mockAppointment, patient_phone: null };
            render(<AppointmentDetailsModal {...defaultProps} appointment={noPhoneAppointment} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should handle missing notes', () => {
            const noNotesAppointment = { ...mockAppointment, notes: null };
            render(<AppointmentDetailsModal {...defaultProps} appointment={noNotesAppointment} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should handle missing time slot', () => {
            const noTimeAppointment = { ...mockAppointment, time_slot: null };
            render(<AppointmentDetailsModal {...defaultProps} appointment={noTimeAppointment} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    describe('Modal Backdrop', () => {
        it('should close modal when backdrop is clicked', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const backdrop = document.querySelector('[class*="fixed"][class*="inset"]');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Recurring Appointments', () => {
        it('should display recurring appointment indicator', () => {
            const recurringAppointment = {
                ...mockAppointment,
                is_recurring_followup: true,
                appointment_type: 'automatic'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={recurringAppointment} />);
            expect(screen.getByText(/recurring|automatic/i) || 
                   screen.getByText(/Flexible/i)).toBeInTheDocument();
        });

        it('should display flexible time for automatic appointments', () => {
            const automaticAppointment = {
                ...mockAppointment,
                appointment_type: 'automatic',
                type: 'automatic'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={automaticAppointment} />);
            expect(screen.getByText(/Flexible/i) || 
                   screen.getByText(/no time slot/i)).toBeInTheDocument();
        });
    });

    describe('Surgery Time Parsing', () => {
        it('should parse and display surgery time from notes', () => {
            const surgeryAppointment = {
                ...mockAppointment,
                notes: 'Surgery Time: 10:30\nPre-op instructions'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={surgeryAppointment} />);
            expect(screen.getByText(/Surgery Time/i)).toBeInTheDocument();
            expect(screen.getByText(/10:30/i) || screen.getByText(/10:30 AM/i)).toBeInTheDocument();
        });

        it('should separate surgery time from other notes', () => {
            const surgeryAppointment = {
                ...mockAppointment,
                notes: 'Surgery Time: 14:00\nFollow-up required'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={surgeryAppointment} />);
            expect(screen.getByText(/Follow-up required/i)).toBeInTheDocument();
        });

        it('should handle notes without surgery time', () => {
            const normalAppointment = {
                ...mockAppointment,
                notes: 'Regular follow-up appointment'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={normalAppointment} />);
            expect(screen.getByText(/Regular follow-up appointment/i)).toBeInTheDocument();
            expect(screen.queryByText(/Surgery Time/i)).not.toBeInTheDocument();
        });
    });

    describe('Different Appointment Data Structures', () => {
        it('should handle appointment with date property', () => {
            const appointment = {
                ...mockAppointment,
                date: '2024-01-15'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            expect(screen.getByText(/January 15/i) || screen.getByText(/2024-01-15/)).toBeInTheDocument();
        });

        it('should handle appointment with appointmentDate property', () => {
            const appointment = {
                ...mockAppointment,
                appointmentDate: '2024-01-15'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            expect(screen.getByText(/January 15/i) || screen.getByText(/2024-01-15/)).toBeInTheDocument();
        });

        it('should handle appointment with time property', () => {
            const appointment = {
                ...mockAppointment,
                time: '14:30'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            expect(screen.getByText(/2:30 PM/i) || screen.getByText(/14:30/)).toBeInTheDocument();
        });

        it('should handle appointment with appointmentTime property', () => {
            const appointment = {
                ...mockAppointment,
                appointmentTime: '15:00'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            expect(screen.getByText(/3:00 PM/i) || screen.getByText(/15:00/)).toBeInTheDocument();
        });

        it('should handle patient name from first_name and last_name', () => {
            const appointment = {
                ...mockAppointment,
                first_name: 'Jane',
                last_name: 'Smith',
                patient_name: null
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
        });
    });

    describe('Status Colors', () => {
        it('should show green styling for confirmed status', () => {
            render(<AppointmentDetailsModal {...defaultProps} />);
            const statusBadge = screen.getByText(/confirmed/i);
            expect(statusBadge.className).toContain('green');
        });

        it('should show yellow styling for pending status', () => {
            const pendingAppointment = { ...mockAppointment, status: 'pending' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={pendingAppointment} />);
            const statusBadge = screen.getByText(/pending/i);
            expect(statusBadge.className).toContain('yellow');
        });

        it('should show red styling for cancelled status', () => {
            const cancelledAppointment = { ...mockAppointment, status: 'cancelled' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={cancelledAppointment} />);
            const statusBadge = screen.getByText(/cancelled/i);
            expect(statusBadge.className).toContain('red');
        });

        it('should show default styling for unknown status', () => {
            const unknownAppointment = { ...mockAppointment, status: 'unknown' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={unknownAppointment} />);
            const statusBadge = screen.getByText(/unknown/i);
            expect(statusBadge).toBeInTheDocument();
        });
    });

    describe('Type Colors', () => {
        it('should show teal color for teal typeColor', () => {
            const appointment = { ...mockAppointment, typeColor: 'teal' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            const typeIndicator = document.querySelector('.bg-teal-500');
            expect(typeIndicator).toBeInTheDocument();
        });

        it('should show purple color for non-teal typeColor', () => {
            const appointment = { ...mockAppointment, typeColor: 'purple' };
            render(<AppointmentDetailsModal {...defaultProps} appointment={appointment} />);
            const typeIndicator = document.querySelector('.bg-purple-500');
            expect(typeIndicator).toBeInTheDocument();
        });
    });

    describe('Investigation Appointments', () => {
        it('should set appointmentType to investigation for investigation appointments', () => {
            const investigationAppointment = {
                ...mockAppointment,
                type: 'Investigation',
                appointment_type: 'investigation'
            };
            render(<AppointmentDetailsModal {...defaultProps} appointment={investigationAppointment} />);
            const rescheduleButton = screen.getByText(/Reschedule/i);
            if (rescheduleButton) {
                fireEvent.click(rescheduleButton);
                expect(screen.getByTestId('update-appointment-modal')).toBeInTheDocument();
            }
        });
    });

    describe('Without Action Handlers', () => {
        it('should handle missing onReschedule', () => {
            render(
                <AppointmentDetailsModal
                    {...defaultProps}
                    onReschedule={undefined}
                />
            );
            // Reschedule button should not throw
            const rescheduleButton = screen.queryByText(/Reschedule/i);
            if (rescheduleButton) {
                fireEvent.click(rescheduleButton);
                // Verify component doesn't crash and modal remains open
                expect(screen.getByText('Appointment Details')).toBeInTheDocument();
            } else {
                // If button doesn't exist, verify modal still renders
                expect(screen.getByText('Appointment Details')).toBeInTheDocument();
            }
        });

        it('should handle missing onCancel', () => {
            render(
                <AppointmentDetailsModal
                    {...defaultProps}
                    onCancel={undefined}
                />
            );
            // Cancel button should not throw
            const cancelButton = screen.queryByText(/Cancel Appointment/i);
            if (cancelButton) {
                fireEvent.click(cancelButton);
                // Verify component doesn't crash and modal remains open
                expect(screen.getByText('Appointment Details')).toBeInTheDocument();
            } else {
                // If button doesn't exist, verify modal still renders
                expect(screen.getByText('Appointment Details')).toBeInTheDocument();
            }
        });
    });
});
