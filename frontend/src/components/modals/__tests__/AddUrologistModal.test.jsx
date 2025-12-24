import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddUrologistModal from '../AddUrologistModal';
import React from 'react';

// Mock services
vi.mock('../../../services/doctorsService', () => ({
    doctorsService: {
        createDoctor: vi.fn().mockResolvedValue({ success: true }),
        getAllDepartments: vi.fn().mockResolvedValue({
            success: true,
            data: [
                { id: 1, name: 'Urology' },
                { id: 2, name: 'Cardiology' }
            ]
        })
    }
}));

vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="success-modal">{title}</div> : null
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="error-modal">{title}</div> : null
}));

describe('AddUrologistModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal with form fields when open', async () => {
        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        expect(screen.getByText('Add New Urologist')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <AddUrologistModal
                isOpen={false}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        expect(screen.queryByText('Add New Urologist')).not.toBeInTheDocument();
    });

    it('fetches departments on mount', async () => {
        const { doctorsService } = await import('../../../services/doctorsService');

        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        await waitFor(() => {
            expect(doctorsService.getAllDepartments).toHaveBeenCalledWith({ is_active: true });
        });
    });

    it('shows department select with options', async () => {
        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        await waitFor(() => {
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });

        // Departments should be populated
        await waitFor(() => {
            expect(screen.getByText('Urology')).toBeInTheDocument();
            expect(screen.getByText('Cardiology')).toBeInTheDocument();
        });
    });

    it('submits form data to doctorsService', async () => {
        const { doctorsService } = await import('../../../services/doctorsService');

        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        // Wait for departments to load
        await waitFor(() => {
            expect(screen.getByText('Urology')).toBeInTheDocument();
        });

        // Fill out the form
        fireEvent.change(screen.getByPlaceholderText('Enter first name'),
            { target: { name: 'first_name', value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'),
            { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'),
            { target: { name: 'email', value: 'john@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'),
            { target: { name: 'phone', value: '12345678' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Add Urologist' }));

        await waitFor(() => {
            expect(doctorsService.createDoctor).toHaveBeenCalled();
        });
    });

    it('pre-selects urology department', async () => {
        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        await waitFor(() => {
            const select = screen.getByRole('combobox');
            expect(select.value).toBe('1'); // Urology department ID
        });
    });

    it('handles department fetch error gracefully', async () => {
        const { doctorsService } = await import('../../../services/doctorsService');
        doctorsService.getAllDepartments.mockRejectedValueOnce(new Error('Network error'));

        render(
            <AddUrologistModal
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        // Should still render without crashing
        await waitFor(() => {
            expect(screen.getByText('Add New Urologist')).toBeInTheDocument();
        });
    });
});
