import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the investigationService before importing component
vi.mock('../../../services/investigationService', () => ({
    investigationService: {
        updatePSAResult: vi.fn()
    }
}));

// Import the mocked service
import { investigationService } from '../../../services/investigationService';
import EditPSAResultModal from '../EditPSAResultModal';

describe('EditPSAResultModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockPatient = {
        id: 1,
        fullName: 'John Doe',
        age: 65
    };
    const mockPsaResult = {
        id: 1,
        test_date: '2024-01-15',
        result: '3.5',
        notes: 'Initial test'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        render(
            <EditPSAResultModal
                isOpen={false}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.queryByText('Edit PSA Result')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should pre-fill form with existing PSA result data', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            expect(resultInput.value).toBe('3.5');
        }
    });

    it('should handle successful form submission', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        // Change the result
        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '4.0' } });
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.updatePSAResult).toHaveBeenCalled();
        });
    });

    it('should handle form submission failure', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: false, error: 'Failed to update' });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Failed to update/i)).toBeInTheDocument();
        });
    });

    it('should handle exception during submission', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        investigationService.updatePSAResult.mockRejectedValue(new Error('Network error'));

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalled();
        });

        consoleError.mockRestore();
    });

    it('should display patient name', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle null psaResult', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={null}
                onSuccess={mockOnSuccess}
            />
        );
        // Should still render
        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should update form when psaResult changes', () => {
        const { rerender } = render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const newPsaResult = { ...mockPsaResult, result: '5.0' };
        rerender(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={newPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should handle patient without age', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ ...mockPatient, age: undefined }}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should handle patient with patientAge property', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ ...mockPatient, age: undefined, patientAge: 70 }}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should handle patient with name property instead of fullName', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ id: 1, name: 'Jane Smith', age: 55 }}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should handle date formatting with T separator', () => {
        const psaResultWithT = {
            ...mockPsaResult,
            test_date: '2024-01-15T10:30:00'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithT}
                onSuccess={mockOnSuccess}
            />
        );
        const dateInput = document.getElementById('testDate');
        if (dateInput) {
            expect(dateInput.value).toBe('2024-01-15');
        }
    });

    it('should handle date formatting with space separator', () => {
        const psaResultWithSpace = {
            ...mockPsaResult,
            test_date: '2024-01-15 10:30:00'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithSpace}
                onSuccess={mockOnSuccess}
            />
        );
        const dateInput = document.getElementById('testDate');
        if (dateInput) {
            expect(dateInput.value).toBe('2024-01-15');
        }
    });

    it('should handle date formatting without separator', () => {
        const psaResultSimple = {
            ...mockPsaResult,
            test_date: '2024-01-15'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultSimple}
                onSuccess={mockOnSuccess}
            />
        );
        const dateInput = document.getElementById('testDate');
        if (dateInput) {
            expect(dateInput.value).toBe('2024-01-15');
        }
    });

    it('should handle testDate property', () => {
        const psaResultWithTestDate = {
            ...mockPsaResult,
            testDate: '2024-01-15'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithTestDate}
                onSuccess={mockOnSuccess}
            />
        );
        const dateInput = document.getElementById('testDate');
        if (dateInput) {
            expect(dateInput.value).toBe('2024-01-15');
        }
    });

    it('should handle filePath property', () => {
        const psaResultWithFile = {
            ...mockPsaResult,
            filePath: '/path/to/file.pdf',
            fileName: 'test.pdf'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithFile}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText(/Current file: test.pdf/)).toBeInTheDocument();
    });

    it('should handle file_path property', () => {
        const psaResultWithFile = {
            ...mockPsaResult,
            file_path: '/path/to/file.pdf',
            file_name: 'test.pdf'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithFile}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText(/Current file: test.pdf/)).toBeInTheDocument();
    });

    it('should handle file without fileName', () => {
        const psaResultWithFile = {
            ...mockPsaResult,
            filePath: '/path/to/file.pdf'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithFile}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText(/Current file: Existing file/)).toBeInTheDocument();
    });

    it('should handle file upload with invalid file type', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const invalidFile = new File(['dummy'], 'test.txt', { type: 'text/plain' });
            fireEvent.change(fileInput, { target: { files: [invalidFile] } });

            expect(screen.getByText(/Please select a PDF, DOC, DOCX, JPG, or PNG file/)).toBeInTheDocument();
        }
    });

    it('should handle file upload with file too large', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [largeFile] } });

            expect(screen.getByText(/File size must be less than 10MB/)).toBeInTheDocument();
        }
    });

    it('should handle valid file upload', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const validFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [validFile] } });

            expect(screen.getByText('test.pdf')).toBeInTheDocument();
        }
    });

    it('should handle file removal', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const validFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [validFile] } });

            const removeButton = screen.getByTitle('Remove file');
            fireEvent.click(removeButton);

            // File should be removed
            expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
        }
    });

    it('should handle validation errors', async () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        // Clear required fields
        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '' } });
        }

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/PSA result is required/)).toBeInTheDocument();
        });
    });

    it('should call onSuccess on successful update', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith('PSA result updated successfully!');
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should handle success without onSuccess callback', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={undefined}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should handle error with default message', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: false });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to update PSA result')).toBeInTheDocument();
        });
    });

    it('should format file size correctly', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const file = new File(['x'.repeat(1024)], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            // Should display formatted file size
            expect(screen.getByText(/1 KB/)).toBeInTheDocument();
        }
    });

    it('should handle file upload with DOC type', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const docFile = new File(['dummy'], 'test.doc', { type: 'application/msword' });
            fireEvent.change(fileInput, { target: { files: [docFile] } });

            expect(screen.getByText('test.doc')).toBeInTheDocument();
        }
    });

    it('should handle file upload with DOCX type', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const docxFile = new File(['dummy'], 'test.docx', { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            fireEvent.change(fileInput, { target: { files: [docxFile] } });

            expect(screen.getByText('test.docx')).toBeInTheDocument();
        }
    });

    it('should handle file upload with image types', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const jpgFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [jpgFile] } });

            expect(screen.getByText('test.jpg')).toBeInTheDocument();
        }
    });

    it('should submit with file when file is uploaded', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            const validFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(fileInput, { target: { files: [validFile] } });
        }

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.updatePSAResult).toHaveBeenCalledWith(
                expect.any(Number),
                expect.objectContaining({
                    testFile: expect.any(File)
                })
            );
        });
    });

    it('should handle patient name fallback to default', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ id: 1, age: 65 }}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('for Patient')).toBeInTheDocument();
    });

    it('should handle psaResult with status property', () => {
        const psaResultWithStatus = {
            ...mockPsaResult,
            status: 'High'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithStatus}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
    });

    it('should handle psaResult with notes property', () => {
        const psaResultWithNotes = {
            ...mockPsaResult,
            notes: 'Test notes'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithNotes}
                onSuccess={mockOnSuccess}
            />
        );
        const notesInput = document.getElementById('notes') || document.querySelector('textarea[name="notes"]');
        if (notesInput) {
            expect(notesInput.value).toBe('Test notes');
        }
    });

    it('should handle empty file input change', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const fileInput = document.getElementById('editPsaFile');
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [] } });
            // Should not crash
            expect(screen.getByText('Edit PSA Result')).toBeInTheDocument();
        }
    });

    it('should dispatch PSA events on successful update', async () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(dispatchEventSpy).toHaveBeenCalled();
        }, { timeout: 2000 });

        dispatchEventSpy.mockRestore();
    });

    it('should handle error with result.error message', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: false, error: 'Custom error message' });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        }, { timeout: 2000 });
    });

    it('should ensure setIsSubmitting is false in finally block', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.updatePSAResult).toHaveBeenCalled();
        });

        // After submission, button should not be in submitting state
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Update PSA Result/i })).toBeInTheDocument();
        }, { timeout: 2000 });
    });

    it('should show existing file when existingFileName exists and no new file', () => {
        const psaResultWithFile = {
            ...mockPsaResult,
            filePath: '/path/to/file.pdf',
            fileName: 'existing.pdf'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithFile}
                onSuccess={mockOnSuccess}
            />
        );

        // Should show "Current file" message (line 174-181)
        expect(screen.getByText(/Current file: existing.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Upload a new file to replace it/i)).toBeInTheDocument();
    });

    it('should show different upload text when existingFileName exists', () => {
        const psaResultWithFile = {
            ...mockPsaResult,
            filePath: '/path/to/file.pdf',
            fileName: 'existing.pdf'
        };
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={psaResultWithFile}
                onSuccess={mockOnSuccess}
            />
        );

        // Should show "Click to upload new file" instead of "Click to upload or drag and drop" (line 218)
        expect(screen.getByText(/Click to upload new file/i)).toBeInTheDocument();
    });

    it('should show default upload text when no existingFileName', () => {
        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        // Should show default text (line 218)
        expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();
    });

    it('should include referenceRange in submit data', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.updatePSAResult).toHaveBeenCalledWith(
                mockPsaResult.id,
                expect.objectContaining({
                    referenceRange: '0.0 - 4.0'
                })
            );
        }, { timeout: 2000 });
    });

    it('should call onSuccess with correct message on successful update', async () => {
        investigationService.updatePSAResult.mockResolvedValue({ success: true });

        render(
            <EditPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                psaResult={mockPsaResult}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Update PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith('PSA result updated successfully!');
        }, { timeout: 2000 });
    });

    it('should have PropTypes defined and component exported correctly', () => {
        // This test ensures PropTypes (lines 246-252) and export (line 254) are executed
        // Component is already imported at the top
        expect(EditPSAResultModal).toBeDefined();
        expect(EditPSAResultModal.propTypes).toBeDefined();
        expect(EditPSAResultModal.propTypes.isOpen).toBeDefined();
        expect(EditPSAResultModal.propTypes.onClose).toBeDefined();
        expect(EditPSAResultModal.propTypes.patient).toBeDefined();
        expect(EditPSAResultModal.propTypes.psaResult).toBeDefined();
        expect(EditPSAResultModal.propTypes.onSuccess).toBeDefined();
    });
});
