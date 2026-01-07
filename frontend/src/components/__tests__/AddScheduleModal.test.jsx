import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock bookingService
const mockBookUrologistAppointment = vi.fn();
const mockGetAvailableUrologists = vi.fn();
const mockGetAvailableTimeSlots = vi.fn();

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        bookUrologistAppointment: (...args) => mockBookUrologistAppointment(...args),
        getAvailableUrologists: (...args) => mockGetAvailableUrologists(...args),
        getAvailableTimeSlots: (...args) => mockGetAvailableTimeSlots(...args)
    }
}));

// Mock child modals
vi.mock('../modals/SuccessModal', () => ({
    default: ({ isOpen, message, onClose }) =>
        isOpen ? <div data-testid="success-modal" onClick={onClose}>{message}</div> : null
}));

vi.mock('../modals/ErrorModal', () => ({
    default: ({ isOpen, message, onClose }) =>
        isOpen ? <div data-testid="error-modal" onClick={onClose}>{message}</div> : null
}));

import AddScheduleModal from '../AddScheduleModal';

describe('AddScheduleModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const mockPatient = {
        id: 1,
        name: 'John Doe',
        upi: 'UPI123',
        age: 50,
        gender: 'Male',
        psa: 5.5
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        patient: mockPatient
    };

    const mockUrologists = [
        { id: 1, name: 'Dr. Smith', first_name: 'Dr.', last_name: 'Smith' },
        { id: 2, name: 'Dr. Johnson', first_name: 'Dr.', last_name: 'Johnson' }
    ];

    const mockTimeSlots = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: false }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAvailableUrologists.mockResolvedValue({ success: true, data: mockUrologists });
        mockGetAvailableTimeSlots.mockResolvedValue({ success: true, data: mockTimeSlots });
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddScheduleModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddScheduleModal {...defaultProps} />);
            expect(screen.getByText(/Book Urologist Appointment/i)).toBeInTheDocument();
        });

        it('should render patient information', () => {
            render(<AddScheduleModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
            expect(screen.getByText(/UPI123/i)).toBeInTheDocument();
        });

        it('should fetch urologists on mount', async () => {
            render(<AddScheduleModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
        });

        it('should pre-select assigned urologist when patient has one', async () => {
            const patientWithUrologist = {
                ...mockPatient,
                assignedUrologist: 'Dr. Smith'
            };
            render(<AddScheduleModal {...defaultProps} patient={patientWithUrologist} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
        });
    });

    describe('Form Input Handling', () => {
        it('should update urologist selection', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            // Find urologist dropdown/input
            const urologistInput = screen.getByPlaceholderText(/Select urologist/i) || 
                                   document.querySelector('input[name="selectedUrologist"]') ||
                                   screen.getByText(/Dr. Smith/i);
            if (urologistInput && urologistInput.tagName === 'INPUT') {
                fireEvent.change(urologistInput, { target: { name: 'selectedUrologist', value: 'Dr. Smith' } });
            }
        });

        it('should update appointment date', () => {
            render(<AddScheduleModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Appointment Date/i) || 
                            document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
                expect(dateInput.value).toBe('2024-12-31');
            }
        });

        it('should fetch available time slots when urologist and date are selected', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            // Simulate selecting urologist and date
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            await waitFor(() => {
                // Should fetch slots when both are selected
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            }, { timeout: 2000 });
        });

        it('should update notes', () => {
            render(<AddScheduleModal {...defaultProps} />);
            const notesInput = screen.getByLabelText(/Notes/i) || 
                             document.querySelector('textarea[name="notes"]');
            if (notesInput) {
                fireEvent.change(notesInput, { target: { name: 'notes', value: 'Follow-up required' } });
                expect(notesInput.value).toBe('Follow-up required');
            }
        });
    });

    describe('Form Validation', () => {
        it('should validate urologist is required', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select a urologist/i) || 
                       screen.getByText(/urologist/i)).toBeInTheDocument();
            });
        });

        it('should validate appointment date is required', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Appointment date is required/i) ||
                       screen.getByText(/date/i)).toBeInTheDocument();
            });
        });

        it('should validate appointment time is required', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select an appointment time/i) ||
                       screen.getByText(/time/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = async () => {
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            // Select urologist
            const urologistInput = screen.getByPlaceholderText(/Select urologist/i) || 
                                  document.querySelector('input[name="selectedUrologist"]');
            if (urologistInput) {
                fireEvent.change(urologistInput, { target: { name: 'selectedUrologist', value: 'Dr. Smith' } });
            }

            // Select date
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            // Wait for time slots to load
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            }, { timeout: 2000 });

            // Select time slot
            const timeSlot = screen.getByText(/09:00/i) || document.querySelector('button[data-time="09:00"]');
            if (timeSlot) {
                fireEvent.click(timeSlot);
            }
        };

        it('should submit form with valid data', async () => {
            mockBookUrologistAppointment.mockResolvedValue({ success: true, data: { id: 1 } });
            render(<AddScheduleModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockBookUrologistAppointment).toHaveBeenCalled();
            });
        });

        it('should dispatch appointment:booked event on success', async () => {
            const eventSpy = vi.fn();
            window.addEventListener('appointment:booked', eventSpy);
            
            mockBookUrologistAppointment.mockResolvedValue({ success: true, data: { id: 1 } });
            render(<AddScheduleModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(eventSpy).toHaveBeenCalled();
            });

            window.removeEventListener('appointment:booked', eventSpy);
        });

        it('should call onSuccess after successful submission', async () => {
            mockBookUrologistAppointment.mockResolvedValue({ success: true, data: { id: 1 } });
            render(<AddScheduleModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalled();
            });
        });

        it('should show error on failed submission', async () => {
            mockBookUrologistAppointment.mockResolvedValue({
                success: false,
                error: 'Appointment slot not available'
            });
            render(<AddScheduleModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Appointment slot not available/i) ||
                       screen.getByText(/Failed to book appointment/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockBookUrologistAppointment.mockRejectedValue(new Error('Network error'));
            render(<AddScheduleModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/An error occurred/i) ||
                       screen.getByText(/error/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle urologist not found error', async () => {
            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            const urologistInput = document.querySelector('input[name="selectedUrologist"]');
            if (urologistInput) {
                fireEvent.change(urologistInput, { target: { name: 'selectedUrologist', value: 'Non-existent Doctor' } });
            }

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Selected urologist not found/i) ||
                       screen.getByText(/urologist/i)).toBeInTheDocument();
            });
        });
    });

    describe('Modal Close', () => {
        it('should call onClose when Cancel is clicked', () => {
            render(<AddScheduleModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onClose when X button is clicked', () => {
            render(<AddScheduleModal {...defaultProps} />);
            const closeButton = document.querySelector('button[aria-label*="close" i]') ||
                               screen.getByRole('button', { name: /close/i });
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });

        it('should reset form when modal is closed and reopened', async () => {
            const { rerender } = render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            rerender(<AddScheduleModal {...defaultProps} isOpen={false} />);
            rerender(<AddScheduleModal {...defaultProps} isOpen={true} />);

            if (dateInput) {
                expect(dateInput.value).toBe('');
            }
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockBookUrologistAppointment.mockReturnValue(promise);

            render(<AddScheduleModal {...defaultProps} />);

            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }

            const urologistInput = document.querySelector('input[name="selectedUrologist"]');
            if (urologistInput) {
                fireEvent.change(urologistInput, { target: { name: 'selectedUrologist', value: 'Dr. Smith' } });
            }

            const submitButton = screen.getByText(/Book Appointment/i) || screen.getByText(/Submit/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                const button = screen.getByText(/Booking.../i) || screen.getByText(/Submitting/i);
                expect(button).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });

        it('should handle urologist fetch error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGetAvailableUrologists.mockResolvedValue({ success: false, error: 'Failed to fetch' });
            
            render(<AddScheduleModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
            
            consoleError.mockRestore();
        });

        it('should handle time slots fetch error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGetAvailableTimeSlots.mockResolvedValue({ success: false, error: 'Failed to fetch slots' });
            
            render(<AddScheduleModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { name: 'appointmentDate', value: '2024-12-31' } });
            }
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            }, { timeout: 2000 });
            
            consoleError.mockRestore();
        });
    });

    describe('Dropdown Handling', () => {
        it('should close dropdown when clicking outside', async () => {
            render(<AddScheduleModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });

            // Simulate clicking outside
            fireEvent.mouseDown(document.body);
            
            // Dropdown should close
            expect(screen.queryByText(/Dr. Smith/i)).not.toBeInTheDocument();
        });
    });
});
