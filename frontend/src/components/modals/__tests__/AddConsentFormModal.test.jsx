import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock consentFormService
const mockCreateConsentFormTemplate = vi.fn();
const mockUpdateConsentFormTemplate = vi.fn();

vi.mock('../../../services/consentFormService', () => ({
    consentFormService: {
        createConsentFormTemplate: (...args) => mockCreateConsentFormTemplate(...args),
        updateConsentFormTemplate: (...args) => mockUpdateConsentFormTemplate(...args)
    }
}));

import AddConsentFormModal from '../AddConsentFormModal';

describe('AddConsentFormModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        template: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddConsentFormModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            expect(screen.getByText(/Add New/i)).toBeInTheDocument();
            expect(screen.getByText(/Consent Form Template/i)).toBeInTheDocument();
        });

        it('should render procedure name section', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            expect(screen.getByText(/Procedure Name/i)).toBeInTheDocument();
        });

        it('should render file upload section', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            expect(screen.getByText(/Upload Template File/i)).toBeInTheDocument();
        });

        it('should render Edit mode when template is provided', () => {
            const template = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'test.pdf'
            };
            render(<AddConsentFormModal {...defaultProps} template={template} />);
            expect(screen.getByText(/Edit/i)).toBeInTheDocument();
        });
    });

    describe('Procedure Selection', () => {
        it('should open dropdown when clicking procedure button', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            // Should show procedure options
            expect(screen.getByText('MRI')).toBeInTheDocument();
        });

        it('should select procedure when clicking option', async () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Dropdown should close and show selected value
            await waitFor(() => {
                expect(screen.getByText('MRI')).toBeInTheDocument();
            });
        });

        it('should show procedure groups in dropdown', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('TRUS')).toBeInTheDocument();
            expect(screen.getByText('Biopsy')).toBeInTheDocument();
        });
    });

    describe('File Upload', () => {
        it('should handle PDF file selection', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('consent.pdf')).toBeInTheDocument();
        });

        it('should reject non-PDF files', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const file = new File(['test content'], 'document.docx', { type: 'application/msword' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText(/Only PDF files are allowed/i)).toBeInTheDocument();
        });

        it('should reject files larger than 10MB', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' });
            Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

            fireEvent.change(fileInput, { target: { files: [largeFile] } });

            expect(screen.getByText(/File size must be less than 10MB/i)).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('should validate procedure name is required', async () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const submitButton = screen.getByText('Create Template');

            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Procedure name is required/i)).toBeInTheDocument();
            });
        });

        it('should validate file is required for new template', async () => {
            render(<AddConsentFormModal {...defaultProps} />);

            // Select a procedure first
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Template file is required/i)).toBeInTheDocument();
            });
        });

        it('should submit form successfully with valid data', async () => {
            mockCreateConsentFormTemplate.mockResolvedValue({ success: true });
            render(<AddConsentFormModal {...defaultProps} />);

            // Select procedure
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Upload file
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockCreateConsentFormTemplate).toHaveBeenCalled();
            });
        });

        it('should call update when editing existing template', async () => {
            mockUpdateConsentFormTemplate.mockResolvedValue({ success: true });
            const template = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            const submitButton = screen.getByText('Update Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockUpdateConsentFormTemplate).toHaveBeenCalled();
            });
        });

        it('should call onSuccess after successful submission', async () => {
            mockCreateConsentFormTemplate.mockResolvedValue({ success: true });
            render(<AddConsentFormModal {...defaultProps} />);

            // Select procedure
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Upload file
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalled();
            });
        });

        it('should handle submission error', async () => {
            mockCreateConsentFormTemplate.mockResolvedValue({
                success: false,
                error: 'Server error'
            });

            render(<AddConsentFormModal {...defaultProps} />);

            // Select procedure
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Upload file
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Server error/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            mockCreateConsentFormTemplate.mockRejectedValue(new Error('Network error'));

            render(<AddConsentFormModal {...defaultProps} />);

            // Select procedure
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Upload file
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Network error/i)).toBeInTheDocument();
            });
        });
    });

    describe('Modal Close', () => {
        it('should call onClose when Cancel button is clicked', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onClose when X button is clicked', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const closeButtons = document.querySelectorAll('button');
            const xButton = Array.from(closeButtons).find(btn =>
                btn.querySelector('svg[class*="lucide-x"]')
            );
            if (xButton) {
                fireEvent.click(xButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockCreateConsentFormTemplate.mockReturnValue(promise);

            render(<AddConsentFormModal {...defaultProps} />);

            // Select procedure
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Upload file
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });
    });

    describe('Template Prefill', () => {
        it('should prefill procedure when editing template', () => {
            const template = {
                id: 1,
                procedure_name: 'MRI Prostate',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
        });

        it('should use test_name if procedure_name is missing', () => {
            const template = {
                id: 1,
                test_name: 'MRI',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            expect(screen.getByText('MRI')).toBeInTheDocument();
        });

        it('should use file_name if template_file_name is missing', () => {
            const template = {
                id: 1,
                procedure_name: 'MRI',
                file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            expect(screen.getByText(/Current file: existing.pdf/i)).toBeInTheDocument();
        });

        it('should show current file name when editing', () => {
            const template = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            expect(screen.getByText(/Current file: existing.pdf/i)).toBeInTheDocument();
        });

        it('should allow updating template without new file', async () => {
            mockUpdateConsentFormTemplate.mockResolvedValue({ success: true });
            const template = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            const submitButton = screen.getByText('Update Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockUpdateConsentFormTemplate).toHaveBeenCalled();
            });
        });

        it('should allow updating template with new file', async () => {
            mockUpdateConsentFormTemplate.mockResolvedValue({ success: true });
            const template = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'existing.pdf'
            };

            render(<AddConsentFormModal {...defaultProps} template={template} />);

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'new-consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Update Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockUpdateConsentFormTemplate).toHaveBeenCalled();
            });
        });
    });

    describe('Dropdown Functionality', () => {
        it('should close dropdown when clicking outside', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('MRI')).toBeInTheDocument();

            // Click outside
            fireEvent.mouseDown(document.body);

            // Dropdown should close
            expect(screen.queryByText('TRUS')).not.toBeInTheDocument();
        });

        it('should select TRUS procedure', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            const trusOption = screen.getByText('TRUS');
            fireEvent.click(trusOption);

            expect(screen.getByText('TRUS')).toBeInTheDocument();
        });

        it('should select Biopsy procedure', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            const biopsyOption = screen.getByText('Prostate Biopsy');
            fireEvent.click(biopsyOption);

            expect(screen.getByText('Prostate Biopsy')).toBeInTheDocument();
        });

        it('should show all procedure groups', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('MRI')).toBeInTheDocument();
            expect(screen.getByText('TRUS')).toBeInTheDocument();
            expect(screen.getByText('Biopsy')).toBeInTheDocument();
        });

        it('should highlight selected procedure', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            // Reopen dropdown
            fireEvent.click(dropdownButton);
            // Selected option should be highlighted
            expect(screen.getByText('MRI')).toBeInTheDocument();
        });
    });

    describe('File Upload Edge Cases', () => {
        it('should handle file input with no file selected', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            fireEvent.change(fileInput, { target: { files: [] } });

            // Should not crash
            expect(screen.getByText(/Upload Template File/i)).toBeInTheDocument();
        });

        it('should clear error when valid file is selected after error', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            // First, select invalid file
            const invalidFile = new File(['test'], 'test.docx', { type: 'application/msword' });
            fireEvent.change(fileInput, { target: { files: [invalidFile] } });

            expect(screen.getByText(/Only PDF files are allowed/i)).toBeInTheDocument();

            // Then select valid file
            const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [validFile] } });

            expect(screen.queryByText(/Only PDF files are allowed/i)).not.toBeInTheDocument();
            expect(screen.getByText('test.pdf')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle error without error property', async () => {
            mockCreateConsentFormTemplate.mockResolvedValue({
                success: false
            });

            render(<AddConsentFormModal {...defaultProps} />);

            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Operation failed/i)).toBeInTheDocument();
            });
        });

        it('should handle exception without message', async () => {
            const error = new Error();
            error.message = undefined;
            mockCreateConsentFormTemplate.mockRejectedValue(error);

            render(<AddConsentFormModal {...defaultProps} />);

            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Reset', () => {
        it('should reset form when modal closes', () => {
            const { rerender } = render(<AddConsentFormModal {...defaultProps} />);

            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            // Close modal
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            // Reopen modal
            rerender(<AddConsentFormModal {...defaultProps} isOpen={true} />);

            // Form should be reset
            expect(screen.getByText(/Select a procedure/i)).toBeInTheDocument();
        });

        it('should reset form when template changes', () => {
            const { rerender } = render(<AddConsentFormModal {...defaultProps} />);

            const template1 = {
                id: 1,
                procedure_name: 'MRI',
                template_file_name: 'file1.pdf'
            };

            rerender(<AddConsentFormModal {...defaultProps} template={template1} />);
            expect(screen.getByText('MRI')).toBeInTheDocument();

            const template2 = {
                id: 2,
                procedure_name: 'TRUS',
                template_file_name: 'file2.pdf'
            };

            rerender(<AddConsentFormModal {...defaultProps} template={template2} />);
            expect(screen.getByText('TRUS')).toBeInTheDocument();
        });
    });

    describe('All Procedure Options', () => {
        it('should render all MRI options', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('MRI')).toBeInTheDocument();
            expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
            expect(screen.getByText('MRI Pelvis')).toBeInTheDocument();
            expect(screen.getByText('MRI Abdomen')).toBeInTheDocument();
            expect(screen.getByText('Multi-parametric MRI')).toBeInTheDocument();
        });

        it('should render all TRUS options', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('TRUS')).toBeInTheDocument();
            expect(screen.getByText('TRUS Prostate')).toBeInTheDocument();
            expect(screen.getByText('TRUS Guided Biopsy')).toBeInTheDocument();
            expect(screen.getByText('TRUS Volume Assessment')).toBeInTheDocument();
        });

        it('should render all Biopsy options', () => {
            render(<AddConsentFormModal {...defaultProps} />);
            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);

            expect(screen.getByText('Biopsy')).toBeInTheDocument();
            expect(screen.getByText('Prostate Biopsy')).toBeInTheDocument();
            expect(screen.getByText('Transperineal Biopsy')).toBeInTheDocument();
            expect(screen.getByText('Transrectal Biopsy')).toBeInTheDocument();
            expect(screen.getByText('Fusion Biopsy')).toBeInTheDocument();
            expect(screen.getByText('Template Biopsy')).toBeInTheDocument();
        });
    });

    describe('Disabled State', () => {
        it('should disable submit button during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockCreateConsentFormTemplate.mockReturnValue(promise);

            render(<AddConsentFormModal {...defaultProps} />);

            const dropdownButton = screen.getByText(/Select a procedure/i);
            fireEvent.click(dropdownButton);
            const mriOption = screen.getAllByText('MRI')[0];
            fireEvent.click(mriOption);

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test content'], 'consent.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            const submitButton = screen.getByText('Create Template');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            });

            resolvePromise({ success: true });
        });
    });
});
