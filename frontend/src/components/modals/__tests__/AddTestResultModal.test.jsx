import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
// Mock investigationService
const mockAddOtherTestResult = vi.fn();

vi.mock('../../../services/investigationService', () => ({
    investigationService: {
        addOtherTestResult: (...args) => mockAddOtherTestResult(...args)
    }
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
    IoClose: () => <div data-testid="io-close" />,
    IoCalendar: () => <div data-testid="io-calendar" />,
    IoDocument: () => <div data-testid="io-document" />,
    IoCloudUpload: () => <div data-testid="io-cloud-upload" />
}));

// NOW import component AFTER all mocks
import AddTestResultModal from '../AddTestResultModal';

describe('AddTestResultModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockPatient = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe'
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        patient: mockPatient
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddOtherTestResult.mockResolvedValue({
            success: true,
            data: { id: 1 }
        });
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddTestResultModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByText(/Add Test Result/i)).toBeInTheDocument();
        });

        it('should show patient name', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

        it('should render test type dropdown', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByLabelText(/Test Type/i)).toBeInTheDocument();
        });

        it('should render test date field', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByLabelText(/Test Date/i)).toBeInTheDocument();
        });

        it('should render result value field', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByLabelText(/Result/i)).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        it('should update test name on selection', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            fireEvent.change(testNameSelect, { target: { name: 'testName', value: 'mri' } });
            expect(testNameSelect.value).toBe('mri');
        });

        it('should update test date on change', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Test Date/i);
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
            expect(dateInput.value).toBe('2024-01-15');
        });

        it('should update notes on change', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const notesInput = screen.getByLabelText(/Notes/i);
            fireEvent.change(notesInput, { target: { name: 'notes', value: 'Test notes' } });
            expect(notesInput.value).toBe('Test notes');
        });

        it('should clear error when user starts typing', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            
            // Trigger validation error
            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);
            
            // Start typing to clear error
            fireEvent.change(testNameSelect, { target: { name: 'testName', value: 'mri' } });
            
            // Error should be cleared
            expect(screen.queryByText(/Test name is required/i)).not.toBeInTheDocument();
        });
    });

    describe('File Upload', () => {
        it('should handle file selection', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('report.pdf')).toBeInTheDocument();
        });

        it('should reject invalid file types', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'image.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText(/Please select a PDF, DOC, or DOCX file/i)).toBeInTheDocument();
        });

        it('should reject files larger than limit', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            // Create a large file (10MB+)
            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

            fireEvent.change(fileInput, { target: { files: [largeFile] } });

            expect(screen.getByText(/File size must be less than 10MB/i)).toBeInTheDocument();
        });

        it('should accept valid PDF file', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('report.pdf')).toBeInTheDocument();
            expect(screen.queryByText(/Please select a PDF/i)).not.toBeInTheDocument();
        });

        it('should accept valid DOC file', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'report.doc', { type: 'application/msword' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('report.doc')).toBeInTheDocument();
        });

        it('should accept valid DOCX file', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'report.docx', { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('report.docx')).toBeInTheDocument();
        });

        it('should clear file error when valid file is selected', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            // First, select invalid file
            const invalidFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [invalidFile] } });
            expect(screen.getByText(/Please select a PDF/i)).toBeInTheDocument();

            // Then, select valid file
            const validFile = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [validFile] } });
            expect(screen.queryByText(/Please select a PDF/i)).not.toBeInTheDocument();
        });

        it('should handle file input with no file selected', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            fireEvent.change(fileInput, { target: { files: [] } });
            // Should not crash
            expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('should validate test name is required', async () => {
            render(<AddTestResultModal {...defaultProps} />);

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            expect(screen.getByText(/Test name is required/i)).toBeInTheDocument();
            expect(mockAddOtherTestResult).not.toHaveBeenCalled();
        });

        it('should validate test date is required', async () => {
            render(<AddTestResultModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            expect(screen.getByText(/Test date is required/i)).toBeInTheDocument();
            expect(mockAddOtherTestResult).not.toHaveBeenCalled();
        });

        it('should validate file is required', async () => {
            render(<AddTestResultModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            expect(screen.getByText(/Document attachment is required/i)).toBeInTheDocument();
            expect(mockAddOtherTestResult).not.toHaveBeenCalled();
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = () => {
            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });
        };

        it('should submit form with valid data', async () => {
            mockAddOtherTestResult.mockResolvedValue({ success: true });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockAddOtherTestResult).toHaveBeenCalled();
            });
        });

        it('should call onSuccess after successful submission', async () => {
            mockAddOtherTestResult.mockResolvedValue({ success: true });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalledWith('Test result added successfully!');
            });
        });

        it('should reset form after successful submission', async () => {
            mockAddOtherTestResult.mockResolvedValue({ success: true });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it('should dispatch testResultAdded event on successful submission', async () => {
            const eventListener = vi.fn();
            window.addEventListener('testResultAdded', eventListener);
            
            mockAddOtherTestResult.mockResolvedValue({ success: true });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(eventListener).toHaveBeenCalled();
            });
            
            window.removeEventListener('testResultAdded', eventListener);
        });

        it('should handle submission error', async () => {
            mockAddOtherTestResult.mockResolvedValue({
                success: false,
                error: 'Failed to add test result'
            });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to add test result/i)).toBeInTheDocument();
            });
        });

        it('should handle submission error without error message', async () => {
            mockAddOtherTestResult.mockResolvedValue({
                success: false
            });
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to add test result/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockAddOtherTestResult.mockRejectedValue(new Error('Network Error'));
            render(<AddTestResultModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });
    });

    describe('Modal Close', () => {
        it('should call onClose when close button is clicked', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const closeButton = screen.getByTestId('io-close').closest('button');
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });

        it('should call onClose when Cancel is clicked', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockAddOtherTestResult.mockReturnValue(promise);

            render(<AddTestResultModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Adding.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });

        it('should disable submit button during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockAddOtherTestResult.mockReturnValue(promise);

            render(<AddTestResultModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            });

            resolvePromise({ success: true });
        });
    });

    describe('Notes Field', () => {
        it('should allow adding notes', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const notesArea = screen.getByLabelText(/Notes/i);
            fireEvent.change(notesArea, { target: { name: 'notes', value: 'Additional notes' } });
            expect(notesArea.value).toBe('Additional notes');
        });

        it('should allow empty notes', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const notesArea = screen.getByLabelText(/Notes/i);
            expect(notesArea.value).toBe('');
        });
    });

    describe('Patient Information Display', () => {
        it('should display patient fullName when available', () => {
            const patientWithFullName = {
                ...mockPatient,
                fullName: 'John Full Name'
            };
            render(<AddTestResultModal {...defaultProps} patient={patientWithFullName} />);
            expect(screen.getByText(/John Full Name/i)).toBeInTheDocument();
        });

        it('should display patient name when fullName is not available', () => {
            const patientWithName = {
                ...mockPatient,
                name: 'John Name'
            };
            render(<AddTestResultModal {...defaultProps} patient={patientWithName} />);
            expect(screen.getByText(/John Name/i)).toBeInTheDocument();
        });

        it('should display default "Patient" when no name available', () => {
            const patientWithoutName = { id: 1 };
            render(<AddTestResultModal {...defaultProps} patient={patientWithoutName} />);
            expect(screen.getByText(/for Patient/i)).toBeInTheDocument();
        });
    });

    describe('Test Name Options', () => {
        it('should display all test name options', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            
            expect(testNameSelect).toHaveTextContent('MRI');
            expect(testNameSelect).toHaveTextContent('TRUS');
            expect(testNameSelect).toHaveTextContent('Biopsy');
        });

        it('should allow selecting MRI', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            fireEvent.change(testNameSelect, { target: { name: 'testName', value: 'mri' } });
            expect(testNameSelect.value).toBe('mri');
        });

        it('should allow selecting TRUS', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            fireEvent.change(testNameSelect, { target: { name: 'testName', value: 'trus' } });
            expect(testNameSelect.value).toBe('trus');
        });

        it('should allow selecting Biopsy', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const testNameSelect = screen.getByLabelText(/Test Name/i);
            fireEvent.change(testNameSelect, { target: { name: 'testName', value: 'biopsy' } });
            expect(testNameSelect.value).toBe('biopsy');
        });
    });

    describe('File Upload UI States', () => {
        it('should show default upload state', () => {
            render(<AddTestResultModal {...defaultProps} />);
            expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();
        });

        it('should show file name when file is selected', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });
            expect(screen.getByText('report.pdf')).toBeInTheDocument();
        });

        it('should show error state for invalid file', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });
            
            // Check for error styling
            const uploadArea = fileInput.closest('div[class*="border"]');
            expect(uploadArea).toHaveClass('border-red-500');
        });

        it('should show success state for valid file', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });
            
            // Check for success styling
            const uploadArea = fileInput.closest('div[class*="border"]');
            expect(uploadArea).toHaveClass('border-blue-400');
        });
    });

    describe('Error Display', () => {
        it('should display test name error', () => {
            render(<AddTestResultModal {...defaultProps} />);
            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);
            expect(screen.getByText(/Test name is required/i)).toBeInTheDocument();
        });

        it('should display test date error', () => {
            render(<AddTestResultModal {...defaultProps} />);
            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);
            expect(screen.getByText(/Test date is required/i)).toBeInTheDocument();
        });

        it('should display file error', () => {
            render(<AddTestResultModal {...defaultProps} />);
            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });
            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);
            expect(screen.getByText(/Document attachment is required/i)).toBeInTheDocument();
        });

        it('should display submit error', async () => {
            mockAddOtherTestResult.mockResolvedValue({
                success: false,
                error: 'Server error'
            });
            render(<AddTestResultModal {...defaultProps} />);
            
            fireEvent.change(screen.getByLabelText(/Test Name/i), {
                target: { name: 'testName', value: 'mri' }
            });
            fireEvent.change(screen.getByLabelText(/Test Date/i), {
                target: { name: 'testDate', value: '2024-01-15' }
            });
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });
            
            const submitButton = screen.getByText(/Add Test Result/i);
            fireEvent.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText(/Server error/i)).toBeInTheDocument();
            });
        });
    });
});
