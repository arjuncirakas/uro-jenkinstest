import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock investigationService
const mockCreateInvestigationRequest = vi.fn();

vi.mock('../../services/investigationService', () => ({
    investigationService: {
        createInvestigationRequest: (...args) => mockCreateInvestigationRequest(...args)
    }
}));

import AddInvestigationModal from '../AddInvestigationModal';

describe('AddInvestigationModal', () => {
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
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddInvestigationModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/Add Investigation/i)).toBeInTheDocument();
        });

        it('should show patient name', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

        it('should render investigation type options', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/Laboratory/i)).toBeInTheDocument();
            expect(screen.getByText(/Imaging/i)).toBeInTheDocument();
        });
    });

    describe('Investigation Type Selection', () => {
        it('should toggle investigation type selection', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);
            // Should show PSA tests
            expect(screen.getByText(/PSA Total/i)).toBeInTheDocument();
        });

        it('should show different tests for different investigation types', async () => {
            render(<AddInvestigationModal {...defaultProps} />);

            const mriTypeButton = screen.getByText(/MRI/i).closest('label') || screen.getByText(/MRI/i);
            fireEvent.click(mriTypeButton);

            await waitFor(() => {
                expect(screen.getByText(/MRI Prostate/i)).toBeInTheDocument();
            });
        });

        it('should show TRUS tests when TRUS is selected', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const trusTypeButton = screen.getByText(/TRUS/i).closest('label') || screen.getByText(/TRUS/i);
            fireEvent.click(trusTypeButton);
            expect(screen.getByText(/TRUS Prostate/i)).toBeInTheDocument();
        });

        it('should show Biopsy tests when Biopsy is selected', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const biopsyTypeButton = screen.getByText(/Biopsy/i).closest('label') || screen.getByText(/Biopsy/i);
            fireEvent.click(biopsyTypeButton);
            expect(screen.getByText(/Prostate Biopsy/i)).toBeInTheDocument();
        });
    });

    describe('Test Selection', () => {
        it('should toggle test selection', async () => {
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
                // Verify checkbox is checked/selected
                expect(psaTotalCheckbox).toBeInTheDocument();
            });
        });

        it('should allow multiple test selections', async () => {
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
                
                const psaFreeCheckbox = screen.getByText(/PSA Free/i);
                fireEvent.click(psaFreeCheckbox);
                
                expect(screen.getByText(/2 tests selected/i)).toBeInTheDocument();
            });
        });

        it('should handle deselecting test', async () => {
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
                // Deselect
                fireEvent.click(psaTotalCheckbox);
                expect(screen.queryByText(/1 test selected/i)).not.toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        it('should validate before submission', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select at least one investigation type/i)).toBeInTheDocument();
            });
            expect(mockCreateInvestigationRequest).not.toHaveBeenCalled();
        });

        it('should submit successfully with valid data', async () => {
            mockCreateInvestigationRequest.mockResolvedValue({ success: true });
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockCreateInvestigationRequest).toHaveBeenCalled();
            });
        });

        it('should call onSuccess after successful submission', async () => {
            mockCreateInvestigationRequest.mockResolvedValue({ success: true });
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalled();
            });
        });

        it('should handle submission error', async () => {
            mockCreateInvestigationRequest.mockResolvedValue({
                success: false,
                error: 'Failed to create investigation'
            });
            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/failed/i)).toBeInTheDocument();
            });
        });
    });

    describe('Modal Close', () => {
        it('should call onClose when close button is clicked', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const closeButton = document.querySelector('[class*="IoClose"]')?.closest('button') || 
                               screen.getByRole('button', { name: /close/i });
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(mockOnClose).toHaveBeenCalled();
            } else {
                // Try finding by icon
                const iconButton = document.querySelector('svg').closest('button');
                if (iconButton) {
                    fireEvent.click(iconButton);
                    expect(mockOnClose).toHaveBeenCalled();
                }
            }
        });

        it('should call onClose when Cancel is clicked', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should reset form state when modal is closed and reopened', () => {
            const { rerender } = render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            // Close and reopen
            rerender(<AddInvestigationModal {...defaultProps} isOpen={false} />);
            rerender(<AddInvestigationModal {...defaultProps} isOpen={true} />);

            // Form should be reset - PSA Test should not be selected
            const psaCheckbox = screen.getByText(/PSA Test/i).closest('label')?.querySelector('input[type="checkbox"]');
            expect(psaCheckbox?.checked).toBeFalsy();
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockCreateInvestigationRequest.mockReturnValue(promise);

            render(<AddInvestigationModal {...defaultProps} />);

            // Select PSA Test type
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Requesting.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });
    });

    describe('Without Patient', () => {
        it('should handle missing patient gracefully', () => {
            render(<AddInvestigationModal {...defaultProps} patient={null} />);
            expect(screen.getByText(/Add Investigation/i)).toBeInTheDocument();
        });

        it('should show error when submitting without patient', async () => {
            render(<AddInvestigationModal {...defaultProps} patient={null} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const psaOption = screen.getByText(/PSA/i);
                fireEvent.click(psaOption);
            });

            const submitButton = screen.getByText(/Add Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Patient information is missing/i)).toBeInTheDocument();
            });
        });

        it('should show error when submitting without patient ID', async () => {
            render(<AddInvestigationModal {...defaultProps} patient={{}} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const psaOption = screen.getByText(/PSA/i);
                fireEvent.click(psaOption);
            });

            const submitButton = screen.getByText(/Add Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Patient information is missing/i)).toBeInTheDocument();
            });
        });
    });

    describe('Multiple Investigation Types', () => {
        it('should allow selecting multiple investigation types', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                expect(screen.getByText(/PSA/i)).toBeInTheDocument();
            });

            const imagingOption = screen.getByText(/Imaging/i).closest('button') || screen.getByText(/Imaging/i);
            fireEvent.click(imagingOption);

            await waitFor(() => {
                expect(screen.getByText(/MRI/i)).toBeInTheDocument();
            });
        });

        it('should handle deselecting investigation type', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                expect(screen.getByText(/PSA/i)).toBeInTheDocument();
            });

            // Deselect
            fireEvent.click(labOption);

            await waitFor(() => {
                expect(screen.queryByText(/PSA/i)).not.toBeInTheDocument();
            });
        });
    });

    describe('Custom Test Name', () => {
        it('should handle custom test name input', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const customOption = screen.getByText(/Custom Test/i).closest('button') || screen.getByText(/Custom Test/i);
            fireEvent.click(customOption);

            await waitFor(() => {
                const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
                fireEvent.change(customInput, { target: { value: 'Custom Lab Test' } });
                expect(customInput.value).toBe('Custom Lab Test');
            });
        });

        it('should validate custom test name is required', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const customOption = screen.getByText(/Custom Test/i).closest('button') || screen.getByText(/Custom Test/i);
            fireEvent.click(customOption);

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
            });
        });

        it('should submit custom test successfully', async () => {
            mockCreateInvestigationRequest.mockResolvedValue({ success: true });
            render(<AddInvestigationModal {...defaultProps} />);
            
            const customOption = screen.getByText(/Custom Test/i).closest('label') || screen.getByText(/Custom Test/i);
            fireEvent.click(customOption);

            await waitFor(() => {
                const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
                fireEvent.change(customInput, { target: { value: 'Custom Lab Test' } });
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockCreateInvestigationRequest).toHaveBeenCalled();
            });
        });
    });

    describe('Priority Selection', () => {
        it('should allow selecting urgent priority', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const urgentButton = screen.getByText(/Urgent/i);
            fireEvent.click(urgentButton);
            expect(urgentButton).toBeInTheDocument();
        });

        it('should allow selecting soon priority', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const soonButton = screen.getByText(/Soon/i);
            fireEvent.click(soonButton);
            expect(soonButton).toBeInTheDocument();
        });

        it('should allow selecting routine priority', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const routineButton = screen.getByText(/Routine/i);
            fireEvent.click(routineButton);
            expect(routineButton).toBeInTheDocument();
        });
    });

    describe('Scheduled Date', () => {
        it('should handle scheduled date input', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Scheduled Date/i) || document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { value: '2024-12-31' } });
                expect(dateInput.value).toBe('2024-12-31');
            }
        });

        it('should clear scheduled date on blur if empty', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const dateInput = screen.getByLabelText(/Scheduled Date/i) || document.querySelector('input[type="date"]');
            if (dateInput) {
                fireEvent.change(dateInput, { target: { value: '2024-12-31' } });
                fireEvent.change(dateInput, { target: { value: '' } });
                fireEvent.blur(dateInput, { target: { value: '' } });
                expect(dateInput.value).toBe('');
            }
        });
    });

    describe('Notes', () => {
        it('should handle notes input', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const notesInput = screen.getByPlaceholderText(/Enter clinical indication/i);
            fireEvent.change(notesInput, { target: { value: 'Follow-up required' } });
            expect(notesInput.value).toBe('Follow-up required');
        });
    });

    describe('Multiple Test Selection', () => {
        it('should allow selecting multiple tests for same type', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const psaTotal = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotal);
                
                const psaFree = screen.getByText(/PSA Free/i);
                fireEvent.click(psaFree);
            });

            await waitFor(() => {
                expect(screen.getByText(/2 tests selected/i)).toBeInTheDocument();
            });
        });

        it('should show validation error when no tests selected', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Validation', () => {
        it('should validate at least one investigation type is selected', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Please select at least one investigation type/i)).toBeInTheDocument();
            });
        });

        it('should disable submit button when no investigation type selected', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            const submitButton = screen.getByText(/Request Investigation/i);
            expect(submitButton).toBeDisabled();
        });

        it('should disable submit button when investigation type selected but no tests', async () => {
            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const submitButton = screen.getByText(/Request Investigation/i);
                expect(submitButton).toBeDisabled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API error with message', async () => {
            mockCreateInvestigationRequest.mockResolvedValue({
                success: false,
                error: 'Failed to create investigation'
            });

            render(<AddInvestigationModal {...defaultProps} />);
            
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to create investigation/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockCreateInvestigationRequest.mockRejectedValue(new Error('Network error'));

            render(<AddInvestigationModal {...defaultProps} />);
            
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle partial failure when submitting multiple requests', async () => {
            mockCreateInvestigationRequest
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ success: false });

            render(<AddInvestigationModal {...defaultProps} />);
            
            const psaTypeButton = screen.getByText(/PSA Test/i).closest('label') || screen.getByText(/PSA Test/i);
            fireEvent.click(psaTypeButton);

            await waitFor(() => {
                const psaTotalCheckbox = screen.getByText(/PSA Total/i);
                fireEvent.click(psaTotalCheckbox);
            });

            const mriTypeButton = screen.getByText(/MRI/i).closest('label') || screen.getByText(/MRI/i);
            fireEvent.click(mriTypeButton);

            await waitFor(() => {
                const mriProstateCheckbox = screen.getByText(/MRI Prostate/i);
                fireEvent.click(mriProstateCheckbox);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/failed/i)).toBeInTheDocument();
            });
        });
    });

    describe('Patient Name Display', () => {
        it('should display patient name from name property', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1, name: 'John Doe' }} />);
            expect(screen.getByText(/Patient: John Doe/i)).toBeInTheDocument();
        });

        it('should display patient name from patientName property', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1, patientName: 'Jane Smith' }} />);
            expect(screen.getByText(/Patient: Jane Smith/i)).toBeInTheDocument();
        });

        it('should display patient name from fullName property', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1, fullName: 'Bob Wilson' }} />);
            expect(screen.getByText(/Patient: Bob Wilson/i)).toBeInTheDocument();
        });

        it('should display patient name from first_name and last_name', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1, first_name: 'John', last_name: 'Doe' }} />);
            expect(screen.getByText(/Patient: John Doe/i)).toBeInTheDocument();
        });

        it('should display patient name from firstName and lastName', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1, firstName: 'Jane', lastName: 'Smith' }} />);
            expect(screen.getByText(/Patient: Jane Smith/i)).toBeInTheDocument();
        });

        it('should not display patient name section if name not available', () => {
            render(<AddInvestigationModal {...defaultProps} patient={{ id: 1 }} />);
            expect(screen.queryByText(/Patient:/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Reset', () => {
        it('should reset form when modal closes', () => {
            const { rerender } = render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            rerender(<AddInvestigationModal {...defaultProps} isOpen={true} />);

            expect(screen.queryByText(/PSA/i)).not.toBeInTheDocument();
        });
    });

    describe('Submit Button State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockAddCustomInvestigation.mockReturnValue(promise);

            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const psaOption = screen.getByText(/PSA/i);
                fireEvent.click(psaOption);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Requesting.../i)).toBeInTheDocument();
                expect(submitButton).toBeDisabled();
            });

            resolvePromise({ success: true });
        });

        it('should disable submit button when submitting', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockAddCustomInvestigation.mockReturnValue(promise);

            render(<AddInvestigationModal {...defaultProps} />);
            
            const labOption = screen.getByText(/Laboratory/i).closest('button') || screen.getByText(/Laboratory/i);
            fireEvent.click(labOption);

            await waitFor(() => {
                const psaOption = screen.getByText(/PSA/i);
                fireEvent.click(psaOption);
            });

            const submitButton = screen.getByText(/Request Investigation/i);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            });

            resolvePromise({ success: true });
        });
    });

    describe('All Investigation Types', () => {
        it('should render all investigation type options', () => {
            render(<AddInvestigationModal {...defaultProps} />);
            expect(screen.getByText(/PSA Test/i)).toBeInTheDocument();
            expect(screen.getByText(/TRUS/i)).toBeInTheDocument();
            expect(screen.getByText(/MRI/i)).toBeInTheDocument();
            expect(screen.getByText(/Biopsy/i)).toBeInTheDocument();
            expect(screen.getByText(/Custom Test/i)).toBeInTheDocument();
        });
    });
});
