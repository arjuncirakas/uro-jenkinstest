import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock gpService
const mockCreateGP = vi.fn();

vi.mock('../../../services/gpService', () => ({
    gpService: {
        createGP: (...args) => mockCreateGP(...args)
    }
}));

// Mock child modals
vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, message, title, onClose }) =>
        isOpen ? <div data-testid="success-modal" onClick={onClose}>{title}: {message}</div> : null
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, message, title, onClose }) =>
        isOpen ? <div data-testid="error-modal" onClick={onClose}>{title}: {message}</div> : null
}));

import AddGPModal from '../AddGPModal';

describe('AddGPModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddGPModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddGPModal {...defaultProps} />);
            expect(screen.getByText('Add New GP')).toBeInTheDocument();
        });

        it('should render all form fields', () => {
            render(<AddGPModal {...defaultProps} />);
            expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
        });

        it('should render organization field', () => {
            render(<AddGPModal {...defaultProps} />);
            expect(screen.getByLabelText(/Organization/i)).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        it('should update first name on input change', () => {
            render(<AddGPModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
            expect(firstNameInput.value).toBe('John');
        });

        it('should update last name on input change', () => {
            render(<AddGPModal {...defaultProps} />);
            const lastNameInput = screen.getByLabelText(/Last Name/i);
            fireEvent.change(lastNameInput, { target: { name: 'last_name', value: 'Doe' } });
            expect(lastNameInput.value).toBe('Doe');
        });

        it('should update email on input change', () => {
            render(<AddGPModal {...defaultProps} />);
            const emailInput = screen.getByLabelText(/Email/i);
            fireEvent.change(emailInput, { target: { name: 'email', value: 'john@example.com' } });
            expect(emailInput.value).toBe('john@example.com');
        });

        it('should update phone on input change', () => {
            render(<AddGPModal {...defaultProps} />);
            const phoneInput = screen.getByLabelText(/Phone/i);
            fireEvent.change(phoneInput, { target: { name: 'phone', value: '1234567890' } });
            expect(phoneInput.value).toBe('1234567890');
        });
    });

    describe('Field Validation', () => {
        it('should show error for empty first name on blur', () => {
            render(<AddGPModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        });

        it('should show error for invalid email on blur', () => {
            render(<AddGPModal {...defaultProps} />);
            const emailInput = screen.getByLabelText(/Email/i);
            fireEvent.change(emailInput, { target: { name: 'email', value: 'invalid' } });
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'invalid' } });
            expect(screen.getByText(/valid email/i)).toBeInTheDocument();
        });

        it('should show error for short phone number', () => {
            render(<AddGPModal {...defaultProps} />);
            const phoneInput = screen.getByLabelText(/Phone/i);
            fireEvent.change(phoneInput, { target: { name: 'phone', value: '123' } });
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '123' } });
            expect(screen.getByText(/at least 8/i)).toBeInTheDocument();
        });

        it('should clear error when valid input is provided', () => {
            render(<AddGPModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);

            // Create error
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText(/required/i)).toBeInTheDocument();

            // Fix error
            fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
            expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = () => {
            fireEvent.change(screen.getByLabelText(/First Name/i), {
                target: { name: 'first_name', value: 'John' }
            });
            fireEvent.change(screen.getByLabelText(/Last Name/i), {
                target: { name: 'last_name', value: 'Doe' }
            });
            fireEvent.change(screen.getByLabelText(/Email/i), {
                target: { name: 'email', value: 'john@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Phone/i), {
                target: { name: 'phone', value: '1234567890' }
            });
        };

        it('should validate all fields before submission', () => {
            render(<AddGPModal {...defaultProps} />);
            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            // Should show validation errors
            expect(mockCreateGP).not.toHaveBeenCalled();
        });

        it('should submit form with valid data', async () => {
            mockCreateGP.mockResolvedValue({ success: true });
            render(<AddGPModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockCreateGP).toHaveBeenCalled();
            });
        });

        it('should show success modal on successful submission', async () => {
            mockCreateGP.mockResolvedValue({ success: true });
            render(<AddGPModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            });
        });

        it('should show error modal on failed submission', async () => {
            mockCreateGP.mockResolvedValue({
                success: false,
                message: 'GP already exists'
            });
            render(<AddGPModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockCreateGP.mockRejectedValue(new Error('Network Error'));
            render(<AddGPModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });
    });

    describe('Modal Actions', () => {
        it('should close modal on Cancel click', () => {
            render(<AddGPModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should close modal on X button click', () => {
            render(<AddGPModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i);
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onSuccess after successful submission', async () => {
            mockCreateGP.mockResolvedValue({ success: true, data: { id: 1 } });
            render(<AddGPModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/First Name/i), {
                target: { name: 'first_name', value: 'John' }
            });
            fireEvent.change(screen.getByLabelText(/Last Name/i), {
                target: { name: 'last_name', value: 'Doe' }
            });
            fireEvent.change(screen.getByLabelText(/Email/i), {
                target: { name: 'email', value: 'john@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Phone/i), {
                target: { name: 'phone', value: '1234567890' }
            });

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            });

            // Close success modal
            fireEvent.click(screen.getByTestId('success-modal'));

            await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalled();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockCreateGP.mockReturnValue(promise);

            render(<AddGPModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/First Name/i), {
                target: { name: 'first_name', value: 'John' }
            });
            fireEvent.change(screen.getByLabelText(/Last Name/i), {
                target: { name: 'last_name', value: 'Doe' }
            });
            fireEvent.change(screen.getByLabelText(/Email/i), {
                target: { name: 'email', value: 'john@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Phone/i), {
                target: { name: 'phone', value: '1234567890' }
            });

            const submitButton = screen.getByText('Add GP');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Adding.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });
    });

    describe('Keyboard Navigation', () => {
        it('should handle Enter key in form fields', () => {
            render(<AddGPModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.keyDown(firstNameInput, { key: 'Enter' });
            // Should not submit incomplete form
            expect(mockCreateGP).not.toHaveBeenCalled();
        });
    });
});
