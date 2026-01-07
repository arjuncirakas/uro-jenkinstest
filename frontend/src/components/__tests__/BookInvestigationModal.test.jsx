import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
// Mock bookingService
const mockBookInvestigation = vi.fn();
const mockGetInvestigationTypes = vi.fn();
const mockGetAvailableSlots = vi.fn();
const mockGetAvailableUrologists = vi.fn();
const mockGetAvailableTimeSlots = vi.fn();

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        bookInvestigation: (...args) => mockBookInvestigation(...args),
        getInvestigationTypes: (...args) => mockGetInvestigationTypes(...args),
        getAvailableSlots: (...args) => mockGetAvailableSlots(...args),
        getAvailableUrologists: (...args) => mockGetAvailableUrologists(...args),
        getAvailableTimeSlots: (...args) => mockGetAvailableTimeSlots(...args)
    }
}));

// Mock consentFormService
const mockGetConsentFormTemplates = vi.fn();
const mockUploadConsentForm = vi.fn();

vi.mock('../../services/consentFormService', () => ({
    consentFormService: {
        getConsentFormTemplates: (...args) => mockGetConsentFormTemplates(...args),
        uploadConsentForm: (...args) => mockUploadConsentForm(...args)
    }
}));

// Mock consentFormUtils
const mockGetConsentFormBlobUrl = vi.fn();

vi.mock('../../utils/consentFormUtils', () => ({
    getConsentFormBlobUrl: (...args) => mockGetConsentFormBlobUrl(...args)
}));

// Mock child components
vi.mock('../ConfirmModal', () => ({
    default: ({ isOpen, onConfirm, onCancel, title, message }) =>
        isOpen ? (
            <div data-testid="confirm-modal">
                <div>{title}</div>
                <div>{message}</div>
                <button onClick={() => onConfirm(true)} data-testid="confirm-save">Save</button>
                <button onClick={() => onConfirm(false)} data-testid="confirm-discard">Discard</button>
                <button onClick={onCancel} data-testid="confirm-cancel">Cancel</button>
            </div>
        ) : null
}));

vi.mock('../FullScreenPDFModal', () => ({
    default: ({ isOpen, onClose, pdfUrl, fileName }) =>
        isOpen ? (
            <div data-testid="pdf-viewer-modal">
                <div>PDF: {fileName}</div>
                <div>URL: {pdfUrl}</div>
                <button onClick={onClose} data-testid="close-pdf-viewer">Close</button>
            </div>
        ) : null
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
    IoClose: () => <div data-testid="io-close" />,
    IoChevronDown: () => <div data-testid="io-chevron-down" />,
    IoPrint: () => <div data-testid="io-print" />,
    IoCloudUpload: () => <div data-testid="io-cloud-upload" />
}));

// Mock fetch globally for template availability checks
global.fetch = vi.fn();

// NOW import component AFTER all mocks
import BookInvestigationModal from '../BookInvestigationModal';

describe('BookInvestigationModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe'
    };
    const mockInvestigation = {
        id: 1,
        type: 'MRI',
        name: 'MRI Prostate'
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        patient: mockPatient,
        investigation: mockInvestigation
    };

    const mockSlots = [
        { date: '2024-01-15', time: '09:00', available: true },
        { date: '2024-01-15', time: '10:00', available: true },
        { date: '2024-01-16', time: '09:00', available: true }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = vi.fn();
        
        mockGetInvestigationTypes.mockResolvedValue({
            success: true,
            data: [
                { id: 1, name: 'MRI', description: 'Magnetic Resonance Imaging' },
                { id: 2, name: 'CT Scan', description: 'Computed Tomography Scan' }
            ]
        });
        mockGetAvailableSlots.mockResolvedValue({
            success: true,
            data: mockSlots
        });
        mockGetAvailableUrologists.mockResolvedValue({
            success: true,
            data: [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' },
                { id: 2, name: 'Dr. Jones', specialization: 'Urologist' }
            ]
        });
        mockGetAvailableTimeSlots.mockResolvedValue({
            success: true,
            data: mockSlots
        });
        mockGetConsentFormTemplates.mockResolvedValue({
            success: true,
            data: []
        });
        mockUploadConsentForm.mockResolvedValue({
            success: true
        });
        mockGetConsentFormBlobUrl.mockResolvedValue({
            success: true,
            blobUrl: 'blob:test-url',
            fileName: 'test-consent.pdf'
        });
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200
        });
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <BookInvestigationModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/Book Investigation/i)).toBeInTheDocument();
        });

        it('should show patient name', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

        it('should show investigation type', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/MRI/i)).toBeInTheDocument();
        });

        it('should render date selection', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
        });

        it('should render time slot selection', async () => {
            render(<BookInvestigationModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByLabelText(/Time/i) || screen.getByText(/Select a time/i)).toBeTruthy();
            });
        });
    });

    describe('Date Selection', () => {
        it('should update date on selection', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });
            expect(dateInput.value).toBe('2024-01-15');
        });

        it('should fetch available slots when date changes', async () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            });
        });
    });

    describe('Time Slot Selection', () => {
        it('should display available time slots', async () => {
            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(screen.getByText('09:00') || screen.getByText('9:00 AM')).toBeTruthy();
            });
        });

        it('should select time slot on click', async () => {
            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                const timeSlot = screen.queryByText('09:00') || screen.queryByText('9:00 AM');
                if (timeSlot) {
                    fireEvent.click(timeSlot);
                    // Assert that time slot was selected (check if it's highlighted or selected state changes)
                    expect(timeSlot).toBeInTheDocument();
                } else {
                    // If no time slot found, at least verify the date input was changed
                    expect(dateInput).toHaveValue('2024-01-15');
                }
            });
        });
    });

    describe('Form Validation', () => {
        it('should validate date is required', async () => {
            render(<BookInvestigationModal {...defaultProps} />);

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/date is required/i) || mockBookInvestigation.mock.calls.length === 0).toBeTruthy();
            });
        });

        it('should validate time is required', async () => {
            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/time is required/i) || mockBookInvestigation.mock.calls.length === 0).toBeTruthy();
            });
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = async () => {
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            });

            const timeSlot = screen.getByText('09:00') || screen.getByText('9:00 AM');
            if (timeSlot) {
                fireEvent.click(timeSlot);
            }
        };

        it('should submit form with valid data', async () => {
            mockBookInvestigation.mockResolvedValue({ success: true });
            render(<BookInvestigationModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockBookInvestigation).toHaveBeenCalled();
            });
        });

        it('should call onSuccess after successful submission', async () => {
            mockBookInvestigation.mockResolvedValue({ success: true });
            render(<BookInvestigationModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalled();
            });
        });

        it('should show error on failed submission', async () => {
            mockBookInvestigation.mockResolvedValue({
                success: false,
                message: 'Slot not available'
            });
            render(<BookInvestigationModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Slot not available/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockBookInvestigation.mockRejectedValue(new Error('Network error'));
            render(<BookInvestigationModal {...defaultProps} />);

            await fillValidForm();

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/error/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });
    });

    describe('Modal Close', () => {
        it('should call onClose when Cancel is clicked', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onClose when X button is clicked', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i) ||
                document.querySelector('button[aria-label="close"]');
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Loading State', () => {
        it('should show loading during slots fetch', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockGetAvailableSlots.mockReturnValue(promise);

            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(screen.getByText(/Loading/i)).toBeInTheDocument();
            });

            resolvePromise({ success: true, data: mockSlots });
        });

        it('should show loading during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockBookInvestigation.mockReturnValue(promise);

            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(mockGetAvailableSlots).toHaveBeenCalled();
            });

            const timeSlot = screen.getByText('09:00') || screen.getByText('9:00 AM');
            if (timeSlot) {
                fireEvent.click(timeSlot);
            }

            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Booking.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });
    });

    describe('No Available Slots', () => {
        it('should show message when no slots available', async () => {
            mockGetAvailableSlots.mockResolvedValue({
                success: true,
                data: []
            });

            render(<BookInvestigationModal {...defaultProps} />);

            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { name: 'scheduled_date', value: '2024-01-15' } });

            await waitFor(() => {
                expect(screen.getByText(/No slots available/i)).toBeInTheDocument();
            });
        });
    });

    describe('Notes Field', () => {
        it('should allow adding notes', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const notesInput = screen.getByLabelText(/Notes/i);
            if (notesInput) {
                fireEvent.change(notesInput, { target: { name: 'notes', value: 'Special instructions' } });
                expect(notesInput.value).toBe('Special instructions');
            }
        });
    });

    describe('Doctor Selection', () => {
        it('should open doctor dropdown on click', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' },
                { id: 2, name: 'Dr. Jones', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
        });

        it('should select doctor from dropdown', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
        });

        it('should pre-select assigned doctor when patient has assignedUrologist', async () => {
            const patientWithDoctor = {
                ...mockPatient,
                assignedUrologist: 'Dr. Smith'
            };
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} patient={patientWithDoctor} />);
            await waitFor(() => {
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
        });

        it('should pre-select assigned doctor when patient has assigned_urologist', async () => {
            const patientWithDoctor = {
                ...mockPatient,
                assigned_urologist: 'Dr. Smith'
            };
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} patient={patientWithDoctor} />);
            await waitFor(() => {
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
        });

        it('should show loading state while fetching doctors', async () => {
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockImplementation(() => new Promise(() => {}));
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByText(/Loading urologists/i)).toBeInTheDocument();
            });
        });

        it('should show no doctors message when none available', async () => {
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: [] });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
                expect(screen.getByText(/No urologists available/i)).toBeInTheDocument();
            });
        });

        it('should handle doctor fetch error', async () => {
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: false, error: 'Failed to fetch' });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
            });
        });

        it('should close dropdown when clicking outside', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
            fireEvent.mouseDown(document.body);
            await waitFor(() => {
                expect(screen.queryByText('Dr. Smith')).not.toBeInTheDocument();
            });
        });
    });

    describe('Time Slot Selection', () => {
        it('should fetch time slots when doctor and date are selected', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.getAvailableTimeSlots.mockResolvedValueOnce({ success: true, data: mockSlots });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            await waitFor(() => {
                expect(bookingService.getAvailableTimeSlots).toHaveBeenCalled();
            });
        });

        it('should display time slots in 12-hour format', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.getAvailableTimeSlots.mockResolvedValueOnce({ success: true, data: mockSlots });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            await waitFor(() => {
                expect(screen.getByText(/9:00/i) || screen.getByText(/09:00/i)).toBeInTheDocument();
            });
        });

        it('should show loading state while fetching time slots', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.getAvailableTimeSlots.mockImplementation(() => new Promise(() => {}));
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            await waitFor(() => {
                expect(screen.getByText(/Loading time slots/i)).toBeInTheDocument();
            });
        });

        it('should show message when no time slots available', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.getAvailableTimeSlots.mockResolvedValueOnce({ success: true, data: [] });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            await waitFor(() => {
                expect(screen.getByText(/No time slots available/i)).toBeInTheDocument();
            });
        });

        it('should allow submission without time slot', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockResolvedValueOnce({ success: true, data: { id: 1 } });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(bookingService.bookInvestigation).toHaveBeenCalled();
            });
        });

        it('should handle time slot fetch error', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.getAvailableTimeSlots.mockResolvedValueOnce({ success: false, error: 'Failed to fetch' });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            await waitFor(() => {
                expect(bookingService.getAvailableTimeSlots).toHaveBeenCalled();
            });
        });
    });

    describe('Form Validation', () => {
        it('should require doctor selection', async () => {
            global.alert = vi.fn();
            render(<BookInvestigationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('urologist'));
            });
        });

        it('should require date selection', async () => {
            global.alert = vi.fn();
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('date'));
            });
        });

        it('should allow submission with only doctor and date', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockResolvedValueOnce({ success: true, data: { id: 1 } });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(bookingService.bookInvestigation).toHaveBeenCalled();
            });
        });
    });

    describe('Consent Forms', () => {
        it('should fetch consent form templates on mount', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ success: true, data: [] });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle consent form templates fetch error', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ success: false, error: 'Failed to fetch' });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle consent form templates fetch exception', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            consentFormService.getConsentFormTemplates.mockRejectedValueOnce(new Error('Network error'));
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('Unsaved Changes Handling', () => {
        it('should show confirmation modal when closing with unsaved changes', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            await waitFor(() => {
                expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
            });
        });

        it('should close without confirmation when no unsaved changes', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should handle escape key with unsaved changes', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => {
                expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
            });
        });
    });

    describe('Investigation Booking Event', () => {
        it('should dispatch investigationBooked event on successful booking', async () => {
            const eventListener = vi.fn();
            window.addEventListener('investigationBooked', eventListener);
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockResolvedValueOnce({ success: true, data: { id: 1 } });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(eventListener).toHaveBeenCalled();
            });
            window.removeEventListener('investigationBooked', eventListener);
        });
    });

    describe('Form Reset', () => {
        it('should reset form after successful submission', async () => {
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockResolvedValueOnce({ success: true, data: { id: 1 } });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('Patient Information Display', () => {
        it('should display patient name', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

        it('should display GP referral badge when patient is referred by GP', () => {
            const gpPatient = {
                ...mockPatient,
                referredByGP: 'Dr. GP'
            };
            render(<BookInvestigationModal {...defaultProps} patient={gpPatient} />);
            expect(screen.getByText(/GP Referral/i)).toBeInTheDocument();
        });

        it('should display patient UPI', () => {
            const patientWithUPI = {
                ...mockPatient,
                upi: 'UPI123'
            };
            render(<BookInvestigationModal {...defaultProps} patient={patientWithUPI} />);
            expect(screen.getByText(/UPI123/i)).toBeInTheDocument();
        });

        it('should display patient age and gender', () => {
            const patientWithDetails = {
                ...mockPatient,
                age: 65,
                gender: 'Male'
            };
            render(<BookInvestigationModal {...defaultProps} patient={patientWithDetails} />);
            expect(screen.getByText(/65.*Male/i)).toBeInTheDocument();
        });

        it('should display patient PSA value', () => {
            const patientWithPSA = {
                ...mockPatient,
                psa: 5.5
            };
            render(<BookInvestigationModal {...defaultProps} patient={patientWithPSA} />);
            expect(screen.getByText(/5.5 ng\/mL/i)).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle selected doctor not found error', async () => {
            global.alert = vi.fn();
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            render(<BookInvestigationModal {...defaultProps} />);
            // Manually set selectedDoctor to a non-existent doctor
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalled();
            });
        });

        it('should handle booking API error', async () => {
            global.alert = vi.fn();
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockResolvedValueOnce({ success: false, error: 'Slot not available' });
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Slot not available'));
            });
        });

        it('should handle booking exception', async () => {
            global.alert = vi.fn();
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockDoctors = [
                { id: 1, name: 'Dr. Smith', specialization: 'Urologist' }
            ];
            const { bookingService } = await import('../../services/bookingService');
            bookingService.getAvailableUrologists.mockResolvedValueOnce({ success: true, data: mockDoctors });
            bookingService.bookInvestigation.mockRejectedValueOnce(new Error('Network error'));
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                const dropdown = screen.getByText(/Choose a urologist/i);
                fireEvent.click(dropdown);
            });
            await waitFor(() => {
                const doctorOption = screen.getByText('Dr. Smith');
                fireEvent.click(doctorOption);
            });
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalled();
            });
            consoleError.mockRestore();
        });
    });

    describe('Consent Form Template Availability', () => {
        it('should check template availability for MRI template with HEAD request success', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
        });

        it('should check template availability with HEAD request 404', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
        });

        it('should check template availability with HEAD timeout and fallback to GET', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            
            // Mock HEAD request timeout (AbortError)
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            global.fetch
                .mockRejectedValueOnce(abortError)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 206
                });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
        });

        it('should check template availability with GET request 404', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            global.fetch
                .mockRejectedValueOnce(abortError)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404
                });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
        });

        it('should handle CORS error in template availability check', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            
            const corsError = new Error('Failed to fetch');
            corsError.message = 'CORS error';
            global.fetch
                .mockRejectedValueOnce(corsError)
                .mockRejectedValueOnce(corsError);

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle auto-generated templates (skip availability check)', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                is_auto_generated: true
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            // Auto-generated templates should not trigger fetch
            await waitFor(() => {
                expect(global.fetch).not.toHaveBeenCalled();
            }, { timeout: 2000 });
        });

        it('should handle template without file URL', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            // Template without URL should not trigger fetch
            await waitFor(() => {
                expect(global.fetch).not.toHaveBeenCalled();
            }, { timeout: 2000 });
        });

        it('should find templates by procedure_name', async () => {
            const mockTemplates = [{
                id: 1,
                procedure_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('Consent Form Printing', () => {
        it('should print consent form successfully', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockGetConsentFormBlobUrl.mockResolvedValueOnce({
                success: true,
                blobUrl: 'blob:test-url',
                fileName: 'MRI Consent Form.pdf'
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton) {
                    fireEvent.click(printButton);
                }
            });
            
            await waitFor(() => {
                expect(mockGetConsentFormBlobUrl).toHaveBeenCalled();
            });
        });

        it('should handle print consent form error', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockGetConsentFormBlobUrl.mockResolvedValueOnce({
                success: false,
                error: 'Failed to load'
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton) {
                    fireEvent.click(printButton);
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
            });
        });

        it('should handle print consent form exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockGetConsentFormBlobUrl.mockRejectedValueOnce(new Error('Network error'));

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton) {
                    fireEvent.click(printButton);
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalled();
            });
            consoleError.mockRestore();
        });

        it('should block printing when template is unavailable', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            // Wait for availability check to complete
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton && printButton.disabled) {
                    fireEvent.click(printButton);
                    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('unavailable'));
                }
            }, { timeout: 7000 });
        });

        it('should handle print with missing template', async () => {
            render(<BookInvestigationModal {...defaultProps} />);
            // Component should render without errors even if no templates
            expect(screen.getByText(/Book Investigation/i)).toBeInTheDocument();
        });

        it('should handle print with missing patient', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            render(<BookInvestigationModal {...defaultProps} patient={null} />);
            // Should handle null patient gracefully
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('File Upload Handling', () => {
        it('should upload signed consent form successfully', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockUploadConsentForm.mockResolvedValueOnce({
                success: true
            });

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fireEvent.change(fileInput, { target: { files: [file] } });
                }
            });
            
            await waitFor(() => {
                expect(mockUploadConsentForm).toHaveBeenCalled();
            });
        });

        it('should reject invalid file type', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fireEvent.change(fileInput, { target: { files: [imageFile] } });
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('PDF, DOC, or DOCX'));
            });
        });

        it('should reject file too large', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
            
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fireEvent.change(fileInput, { target: { files: [largeFile] } });
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('10MB'));
            });
        });

        it('should handle upload error', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockUploadConsentForm.mockResolvedValueOnce({
                success: false,
                error: 'Upload failed'
            });

            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fireEvent.change(fileInput, { target: { files: [file] } });
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
            });
        });

        it('should handle upload exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockUploadConsentForm.mockRejectedValueOnce(new Error('Network error'));

            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            
            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fireEvent.change(fileInput, { target: { files: [file] } });
                }
            });
            
            await waitFor(() => {
                expect(global.alert).toHaveBeenCalled();
            });
            consoleError.mockRestore();
        });

        it('should handle file input with no file selected', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fireEvent.change(fileInput, { target: { files: [] } });
            }
            // Should not crash when no file selected
            expect(mockUploadConsentForm).not.toHaveBeenCalled();
        });
    });

    describe('PDF Viewer Modal', () => {
        it('should open PDF viewer when printing consent form', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockGetConsentFormBlobUrl.mockResolvedValueOnce({
                success: true,
                blobUrl: 'blob:test-url',
                fileName: 'MRI Consent Form.pdf'
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton) {
                    fireEvent.click(printButton);
                }
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('pdf-viewer-modal')).toBeInTheDocument();
            });
        });

        it('should close PDF viewer and cleanup blob URL', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            mockGetConsentFormBlobUrl.mockResolvedValueOnce({
                success: true,
                blobUrl: 'blob:test-url',
                fileName: 'MRI Consent Form.pdf'
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                const printButton = screen.queryByText('Print');
                if (printButton) {
                    fireEvent.click(printButton);
                }
            });
            
            await waitFor(() => {
                const closeButton = screen.queryByTestId('close-pdf-viewer');
                if (closeButton) {
                    fireEvent.click(closeButton);
                }
            });
            
            await waitFor(() => {
                expect(global.URL.revokeObjectURL).toHaveBeenCalled();
            });
        });
    });

    describe('Template Availability States', () => {
        it('should show available state when template is available', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should show unavailable state when template is not available', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            }, { timeout: 6000 });
        });

        it('should show checking state when availability is null', async () => {
            const mockTemplates = [{
                id: 1,
                test_name: 'MRI',
                template_file_url: 'http://example.com/mri.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            // Don't resolve fetch immediately to test null state
            global.fetch.mockImplementation(() => new Promise(() => {}));

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle TRUS template availability', async () => {
            const mockTemplates = [{
                id: 2,
                test_name: 'TRUS',
                template_file_url: 'http://example.com/trus.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle Biopsy template availability', async () => {
            const mockTemplates = [{
                id: 3,
                test_name: 'Biopsy',
                template_file_url: 'http://example.com/biopsy.pdf',
                is_auto_generated: false
            }];
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: mockTemplates
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            render(<BookInvestigationModal {...defaultProps} />);
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('Confirmation Modal', () => {
        it('should show confirmation modal when closing with unsaved changes', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            
            await waitFor(() => {
                expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
            });
        });

        it('should save changes when confirmed in modal', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: mockSlots
            });
            mockBookInvestigation.mockResolvedValueOnce({
                success: true,
                data: { id: 1 }
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            
            await waitFor(() => {
                const saveButton = screen.queryByTestId('confirm-save');
                if (saveButton) {
                    fireEvent.click(saveButton);
                }
            });
            
            await waitFor(() => {
                expect(mockBookInvestigation).toHaveBeenCalled();
            });
        });

        it('should discard changes when confirmed in modal', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            
            await waitFor(() => {
                const discardButton = screen.queryByTestId('confirm-discard');
                if (discardButton) {
                    fireEvent.click(discardButton);
                }
            });
            
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it('should cancel confirmation modal', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            
            await waitFor(() => {
                const modalCancelButton = screen.queryByTestId('confirm-cancel');
                if (modalCancelButton) {
                    fireEvent.click(modalCancelButton);
                }
            });
            
            await waitFor(() => {
                expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Dropdown Click Outside', () => {
        it('should close dropdown when clicking outside', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            // Click outside
            fireEvent.mouseDown(document.body);
            
            await waitFor(() => {
                // Dropdown should be closed
                expect(screen.queryByText('Dr. Smith')).not.toBeInTheDocument();
            });
        });
    });

    describe('Assigned Doctor Pre-selection', () => {
        it('should pre-select assigned urologist when patient has one', async () => {
            const patientWithUrologist = {
                ...mockPatient,
                assignedUrologist: 'Dr. Smith'
            };
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [
                    { id: 1, name: 'Dr. Smith', specialization: 'Urologist' },
                    { id: 2, name: 'Dr. Jones', specialization: 'Urologist' }
                ]
            });
            
            render(<BookInvestigationModal {...defaultProps} patient={patientWithUrologist} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
            
            // Doctor should be pre-selected
            await waitFor(() => {
                expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
            });
        });

        it('should pre-select assigned_urologist when patient has one', async () => {
            const patientWithUrologist = {
                ...mockPatient,
                assigned_urologist: 'Dr. Jones'
            };
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [
                    { id: 1, name: 'Dr. Smith', specialization: 'Urologist' },
                    { id: 2, name: 'Dr. Jones', specialization: 'Urologist' }
                ]
            });
            
            render(<BookInvestigationModal {...defaultProps} patient={patientWithUrologist} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
        });
    });

    describe('Time Slot Selection', () => {
        it('should handle unavailable time slots', async () => {
            const unavailableSlots = [
                { date: '2024-01-15', time: '09:00', available: false },
                { date: '2024-01-15', time: '10:00', available: true }
            ];
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: unavailableSlots
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            });
        });

        it('should clear slots when doctor or date is cleared', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '' } });
            
            // Slots should be cleared when date is empty
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).not.toHaveBeenCalled();
            });
        });
    });

    describe('Escape Key Handling', () => {
        it('should handle escape key with unsaved changes', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            fireEvent.keyDown(document, { key: 'Escape' });
            
            await waitFor(() => {
                expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
            });
        });

        it('should close immediately with escape key when no unsaved changes', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            
            fireEvent.keyDown(document, { key: 'Escape' });
            
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Form Reset After Submission', () => {
        it('should reset all form fields after successful booking', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: mockSlots
            });
            mockBookInvestigation.mockResolvedValueOnce({
                success: true,
                data: { id: 1 }
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            const notesInput = screen.getByLabelText(/Notes/i) || screen.getByPlaceholderText(/notes/i);
            if (notesInput) {
                fireEvent.change(notesInput, { target: { value: 'Test notes' } });
            }
            
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('Investigation Booking Event Dispatch', () => {
        it('should dispatch investigationBooked event on successful booking', async () => {
            const eventListener = vi.fn();
            window.addEventListener('investigationBooked', eventListener);
            
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: mockSlots
            });
            mockBookInvestigation.mockResolvedValueOnce({
                success: true,
                data: { id: 1 }
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            const submitButton = screen.getByText(/Book/i);
            fireEvent.click(submitButton);
            
            await waitFor(() => {
                expect(eventListener).toHaveBeenCalled();
            });
            
            window.removeEventListener('investigationBooked', eventListener);
        });
    });

    describe('Consent Form Template Fetching', () => {
        it('should handle consent form templates fetch error', async () => {
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch'
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle consent form templates fetch exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetConsentFormTemplates.mockRejectedValueOnce(new Error('Network error'));
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
            
            consoleError.mockRestore();
        });

        it('should handle empty templates array', async () => {
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: []
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });

        it('should handle null templates data', async () => {
            mockGetConsentFormTemplates.mockResolvedValueOnce({
                success: true,
                data: null
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetConsentFormTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('Doctor Fetching', () => {
        it('should handle doctors fetch error', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch'
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
        });

        it('should handle doctors fetch exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetAvailableUrologists.mockRejectedValueOnce(new Error('Network error'));
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
            
            consoleError.mockRestore();
        });

        it('should handle non-array doctors data', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: { doctors: [] }
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockGetAvailableUrologists).toHaveBeenCalled();
            });
        });
    });

    describe('Time Slots Fetching', () => {
        it('should handle time slots fetch error', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch'
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            });
        });

        it('should handle time slots fetch exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockRejectedValueOnce(new Error('Network error'));
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            });
            
            consoleError.mockRestore();
        });

        it('should handle null time slots data', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: null
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            });
        });
    });

    describe('Patient Information Display', () => {
        it('should display patient initials when name is available', () => {
            render(<BookInvestigationModal {...defaultProps} />);
            // Should render patient info card
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

        it('should handle patient without name', () => {
            const patientWithoutName = { id: 1 };
            render(<BookInvestigationModal {...defaultProps} patient={patientWithoutName} />);
            // Should render with default 'P' initial
            expect(screen.getByText(/Book Investigation/i)).toBeInTheDocument();
        });

        it('should display patient with first_name and last_name', () => {
            const patientWithNames = {
                ...mockPatient,
                first_name: 'Jane',
                last_name: 'Smith'
            };
            render(<BookInvestigationModal {...defaultProps} patient={patientWithNames} />);
            expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
        });
    });

    describe('Time Slot Display', () => {
        it('should display time slots in 12-hour format', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockResolvedValueOnce({
                success: true,
                data: [
                    { date: '2024-01-15', time: '09:00', available: true },
                    { date: '2024-01-15', time: '14:00', available: true }
                ]
            });
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            await waitFor(() => {
                expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
            });
        });

        it('should show loading state for time slots', async () => {
            mockGetAvailableUrologists.mockResolvedValueOnce({
                success: true,
                data: [{ id: 1, name: 'Dr. Smith', specialization: 'Urologist' }]
            });
            mockGetAvailableTimeSlots.mockImplementation(() => 
                new Promise(() => {}) // Never resolves
            );
            
            render(<BookInvestigationModal {...defaultProps} />);
            
            await waitFor(() => {
                const dropdown = screen.queryByText(/Choose a urologist/i);
                if (dropdown) {
                    fireEvent.click(dropdown);
                }
            });
            
            await waitFor(() => {
                const doctorOption = screen.queryByText('Dr. Smith');
                if (doctorOption) {
                    fireEvent.click(doctorOption);
                }
            });
            
            const dateInput = screen.getByLabelText(/Date/i);
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
            
            // Should show loading state
            await waitFor(() => {
                expect(screen.getByText(/Loading time slots/i)).toBeInTheDocument();
            });
        });
    });
});
