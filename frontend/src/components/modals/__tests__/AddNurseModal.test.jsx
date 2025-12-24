import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddNurseModal from '../AddNurseModal';
import React from 'react';

// Only mock the service, not BaseUserModal
vi.mock('../../../services/nursesService', () => ({
    nursesService: {
        createNurse: vi.fn()
    }
}));

vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="success-modal">{title}</div> : null
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="error-modal">{title}</div> : null
}));

describe('AddNurseModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(async () => {
        vi.clearAllMocks();
        const { nursesService } = await import('../../../services/nursesService');
        nursesService.createNurse.mockResolvedValue({ success: true });
    });

    it('renders modal with form fields when open', () => {
        render(
            <AddNurseModal
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <AddNurseModal
                isOpen={false}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        expect(screen.queryByText('Add New Nurse')).not.toBeInTheDocument();
    });

    it('submits form data to nursesService', async () => {
        const { nursesService } = await import('../../../services/nursesService');

        render(
            <AddNurseModal
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        // Fill out the form
        fireEvent.change(screen.getByPlaceholderText('Enter first name'),
            { target: { name: 'first_name', value: 'Jane' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'),
            { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'),
            { target: { name: 'email', value: 'jane@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'),
            { target: { name: 'phone', value: '12345678' } });
        fireEvent.change(screen.getByPlaceholderText('Enter organization (optional)'),
            { target: { name: 'organization', value: 'Test Hospital' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Add Nurse' }));

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalled();
        });
    });

    it('allows organization field to be optional', () => {
        render(
            <AddNurseModal
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        const orgField = screen.getByPlaceholderText('Enter organization (optional)');
        expect(orgField).toBeInTheDocument();

        // Label should not have required indicator
        const orgLabel = screen.getByText('Organization');
        expect(orgLabel).not.toHaveTextContent('*');
    });
});
