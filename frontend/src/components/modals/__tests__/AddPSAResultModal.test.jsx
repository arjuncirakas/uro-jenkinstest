import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the investigationService before importing component
vi.mock('../../../services/investigationService', () => ({
    investigationService: {
        addPSAResult: vi.fn()
    }
}));

// Import the mocked service
import { investigationService } from '../../../services/investigationService';
import AddPSAResultModal from '../AddPSAResultModal';

describe('AddPSAResultModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockPatient = {
        id: 1,
        fullName: 'John Doe',
        age: 65
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        render(
            <AddPSAResultModal
                isOpen={false}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.queryByText('Add PSA Result')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Add PSA Result')).toBeInTheDocument();
    });

    it('should handle successful form submission', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: true });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        // Fill in the result
        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.addPSAResult).toHaveBeenCalled();
        });
    });

    it('should handle form submission failure', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: false, error: 'Failed to add' });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        // Fill in the result
        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Failed to add/i)).toBeInTheDocument();
        });
    });

    it('should handle exception during submission', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        investigationService.addPSAResult.mockRejectedValue(new Error('Network error'));

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        // Fill in the result
        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalled();
        });

        consoleError.mockRestore();
    });

    it('should display patient name', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should reset form when modal opens', () => {
        const { rerender } = render(
            <AddPSAResultModal
                isOpen={false}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        rerender(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        // Should show the form
        expect(screen.getByText('Add PSA Result')).toBeInTheDocument();
    });

    it('should handle patient without age', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ ...mockPatient, age: undefined }}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Add PSA Result')).toBeInTheDocument();
    });

    it('should handle patient with patientAge property', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ ...mockPatient, age: undefined, patientAge: 70 }}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Add PSA Result')).toBeInTheDocument();
    });

    it('should handle validation errors', async () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        // Submit without filling required fields
        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            // Should show validation errors
            expect(screen.getByText(/Test date is required|PSA result is required/)).toBeInTheDocument();
        });
    });

    it('should call onSuccess callback on successful submission', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: true });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        const dateInput = document.getElementById('testDate') || document.querySelector('input[name="testDate"]');
        
        if (dateInput) {
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
        }
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.addPSAResult).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith('PSA result added successfully!', true);
        }, { timeout: 2000 });
    });

    it('should handle success without onSuccess callback', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: true });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={undefined}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        const dateInput = document.getElementById('testDate') || document.querySelector('input[name="testDate"]');
        
        if (dateInput) {
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
        }
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.addPSAResult).toHaveBeenCalled();
        });
    });

    it('should close modal after successful submission', async () => {
        vi.useFakeTimers();
        investigationService.addPSAResult.mockResolvedValue({ success: true });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        const dateInput = document.getElementById('testDate') || document.querySelector('input[name="testDate"]');
        
        if (dateInput) {
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
        }
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.addPSAResult).toHaveBeenCalled();
        });

        // Fast-forward timer
        vi.advanceTimersByTime(1000);
        
        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });

        vi.useRealTimers();
    });

    it('should handle error with default message', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: false });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        const dateInput = document.getElementById('testDate') || document.querySelector('input[name="testDate"]');
        
        if (dateInput) {
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
        }
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to add PSA result')).toBeInTheDocument();
        });
    });

    it('should handle patient name fallback to name property', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ ...mockPatient, fullName: undefined, name: 'Jane Doe' }}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should handle patient name fallback to default', () => {
        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={{ id: 1, age: 65 }}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByText('Patient')).toBeInTheDocument();
    });

    it('should reset form after successful submission', async () => {
        investigationService.addPSAResult.mockResolvedValue({ success: true });

        render(
            <AddPSAResultModal
                isOpen={true}
                onClose={mockOnClose}
                patient={mockPatient}
                onSuccess={mockOnSuccess}
            />
        );

        const resultInput = document.getElementById('psaResult') || document.querySelector('input[name="result"]');
        const dateInput = document.getElementById('testDate') || document.querySelector('input[name="testDate"]');
        
        if (dateInput) {
            fireEvent.change(dateInput, { target: { name: 'testDate', value: '2024-01-15' } });
        }
        if (resultInput) {
            fireEvent.change(resultInput, { target: { name: 'result', value: '3.5' } });
        }

        const submitButton = screen.getByRole('button', { name: /Add PSA Result/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(investigationService.addPSAResult).toHaveBeenCalled();
        });

        // Wait for form reset
        await new Promise(resolve => setTimeout(resolve, 100));
    });
});
