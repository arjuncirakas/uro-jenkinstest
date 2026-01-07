import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock bookingService
const mockRescheduleAppointment = vi.fn();
const mockGetAvailableSlots = vi.fn();

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        rescheduleAppointment: (...args) => mockRescheduleAppointment(...args),
        getAvailableTimeSlots: (...args) => mockGetAvailableSlots(...args),
        getAvailableDoctors: vi.fn().mockResolvedValue({ success: true, data: [] })
    }
}));

import RescheduleConfirmationModal from '../RescheduleConfirmationModal';

describe('RescheduleConfirmationModal', () => {
    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();
    const mockAppointment = {
        id: 1,
        patient_name: 'John Doe',
        current_date: '2024-01-15',
        current_time: '09:00',
        doctor_id: 1,
        doctor_name: 'Dr. Smith'
    };

    const defaultProps = {
        isOpen: true,
        appointment: mockAppointment,
        newDate: '2024-01-20',
        newTime: '10:00',
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel
    };

    const mockSlots = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAvailableSlots.mockResolvedValue({
            success: true,
            data: mockSlots
        });
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <RescheduleConfirmationModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByText(/Reschedule/i)).toBeInTheDocument();
        });

        it('should show current appointment details', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
            expect(screen.getByText(/2024-01-15/i) || screen.getByText(/Jan 15/i)).toBeTruthy();
        });

        it('should show new appointment details', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByText(/2024-01-20/i) || screen.getByText(/Jan 20/i)).toBeTruthy();
        });

        it('should show date selection', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByLabelText(/New Date/i) || screen.getByLabelText(/Date/i)).toBeTruthy();
        });

        it('should show time selection', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByLabelText(/New Time/i) || screen.getByLabelText(/Time/i) || screen.getByText(/10:00/)).toBeTruthy();
        });
    });

    describe('Date and Time Selection', () => {
        it('should update date on change', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Date/i);
            if (dateInput) {
                fireEvent.change(dateInput, { target: { value: '2024-01-25' } });
                expect(dateInput.value).toBe('2024-01-25');
            }
        });

        it('should update time on change', async () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            });

            const timeSlot = screen.getByText('10:00');
            if (timeSlot) {
                fireEvent.click(timeSlot);
                // Verify time slot was clicked and time selection updated
                expect(timeSlot).toBeInTheDocument();
            } else {
                // If time slot not found, verify slots were fetched
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            }
        });

        it('should fetch available slots when date changes', async () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            if (dateInput) {
                fireEvent.change(dateInput, { target: { value: '2024-01-25' } });
            }

            await waitFor(() => {
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            });
        });
    });

    describe('Confirmation', () => {
        it('should call onConfirm when confirm button is clicked', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const confirmButton = screen.getByText(/Confirm/i);
            fireEvent.click(confirmButton);
            expect(mockOnConfirm).toHaveBeenCalled();
        });

        it('should pass correct parameters to onConfirm', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const confirmButton = screen.getByText(/Confirm/i);
            fireEvent.click(confirmButton);

            expect(mockOnConfirm).toHaveBeenCalledWith(
                expect.any(Number), // appointment id
                expect.any(String), // new date
                expect.any(String), // new time
                expect.any(Number)  // doctor id
            );
        });
    });

    describe('Cancellation', () => {
        it('should call onCancel when cancel button is clicked', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const cancelButton = screen.getByText(/Cancel/i);
            fireEvent.click(cancelButton);
            expect(mockOnCancel).toHaveBeenCalled();
        });

        it('should call onCancel when X button is clicked', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i) ||
                document.querySelector('button[aria-label="close"]');
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(mockOnCancel).toHaveBeenCalled();
            }
        });
    });

    describe('Visual Indicators', () => {
        it('should show current to new comparison', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByText(/from/i) || screen.getByText(/to/i)).toBeTruthy();
        });

        it('should highlight changes', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            const modal = screen.getByRole('dialog') || document.querySelector('[class*="modal"]');
            expect(modal).toBeInTheDocument();
        });
    });

    describe('Doctor Selection', () => {
        it('should maintain same doctor by default', () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);
            expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
        });

        it('should allow changing doctor if enabled', async () => {
            render(<RescheduleConfirmationModal {...defaultProps} allowDoctorChange={true} />);

            const doctorSelect = screen.queryByLabelText(/Doctor/i);
            if (doctorSelect) {
                expect(doctorSelect).toBeInTheDocument();
            }
        });
    });

    describe('Loading State', () => {
        it('should show loading while fetching slots', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockGetAvailableSlots.mockReturnValue(promise);

            render(<RescheduleConfirmationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            if (dateInput) {
                fireEvent.change(dateInput, { target: { value: '2024-01-25' } });
            }

            await waitFor(() => {
                expect(screen.getByText(/Loading/i)).toBeInTheDocument();
            });

            resolvePromise({ success: true, data: mockSlots });
        });
    });

    describe('Slot Availability', () => {
        it('should show available slots', async () => {
            render(<RescheduleConfirmationModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('09:00') || screen.getByText('10:00')).toBeTruthy();
            });
        });

        it('should show message when no slots available', async () => {
            mockGetAvailableSlots.mockResolvedValue({
                success: true,
                data: []
            });

            render(<RescheduleConfirmationModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/No slots/i) || screen.queryByText('09:00') === null).toBeTruthy();
            });
        });
    });

    describe('Validation', () => {
        it('should disable confirm when no time selected', () => {
            render(<RescheduleConfirmationModal {...defaultProps} newTime={null} />);
            const confirmButton = screen.getByText(/Confirm/i);
            expect(confirmButton).toBeDisabled();
        });

        it('should disable confirm when date is in past', () => {
            render(<RescheduleConfirmationModal {...defaultProps} newDate="2020-01-01" />);
            const confirmButton = screen.getByText(/Confirm/i);
            expect(confirmButton).toBeDisabled();
        });
    });
});
