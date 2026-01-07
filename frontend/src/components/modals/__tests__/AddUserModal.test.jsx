import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock userService
const mockCreateUser = vi.fn();
const mockGetDepartments = vi.fn();

vi.mock('../../../services/userService', () => ({
    userService: {
        createUser: (...args) => mockCreateUser(...args),
        getDepartments: (...args) => mockGetDepartments(...args)
    }
}));

// Mock doctorsService
vi.mock('../../../services/doctorsService', () => ({
    doctorsService: {
        getDepartments: () => Promise.resolve({
            success: true,
            data: [
                { id: 1, name: 'Urology' },
                { id: 2, name: 'Cardiology' }
            ]
        })
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

import AddUserModal from '../AddUserModal';

describe('AddUserModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDepartments.mockResolvedValue({
            success: true,
            data: [
                { id: 1, name: 'Urology' },
                { id: 2, name: 'Cardiology' }
            ]
        });
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <AddUserModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<AddUserModal {...defaultProps} />);
            expect(screen.getByText('Add New User')).toBeInTheDocument();
        });

        it('should render all form fields', () => {
            render(<AddUserModal {...defaultProps} />);
            expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
        });

        it('should render role selection', () => {
            render(<AddUserModal {...defaultProps} />);
            expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        it('should update first name on input change', () => {
            render(<AddUserModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
            expect(firstNameInput.value).toBe('John');
        });

        it('should update last name on input change', () => {
            render(<AddUserModal {...defaultProps} />);
            const lastNameInput = screen.getByLabelText(/Last Name/i);
            fireEvent.change(lastNameInput, { target: { name: 'last_name', value: 'Doe' } });
            expect(lastNameInput.value).toBe('Doe');
        });

        it('should update email on input change', () => {
            render(<AddUserModal {...defaultProps} />);
            const emailInput = screen.getByLabelText(/Email/i);
            fireEvent.change(emailInput, { target: { name: 'email', value: 'john@example.com' } });
            expect(emailInput.value).toBe('john@example.com');
        });

        it('should update phone on input change', () => {
            render(<AddUserModal {...defaultProps} />);
            const phoneInput = screen.getByLabelText(/Phone/i);
            fireEvent.change(phoneInput, { target: { name: 'phone', value: '1234567890' } });
            expect(phoneInput.value).toBe('1234567890');
        });

        it('should update role on selection', () => {
            render(<AddUserModal {...defaultProps} />);
            const roleSelect = screen.getByLabelText(/Role/i);
            fireEvent.change(roleSelect, { target: { name: 'role', value: 'urologist' } });
            expect(roleSelect.value).toBe('urologist');
        });
    });

    describe('Field Validation', () => {
        it('should show error for empty first name on blur', () => {
            render(<AddUserModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        });

        it('should show error for short first name', () => {
            render(<AddUserModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'A' } });
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: 'A' } });
            expect(screen.getByText(/at least 2/i)).toBeInTheDocument();
        });

        it('should show error for invalid email', () => {
            render(<AddUserModal {...defaultProps} />);
            const emailInput = screen.getByLabelText(/Email/i);
            fireEvent.change(emailInput, { target: { name: 'email', value: 'invalid' } });
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'invalid' } });
            expect(screen.getByText(/valid email/i)).toBeInTheDocument();
        });

        it('should show error for short phone number', () => {
            render(<AddUserModal {...defaultProps} />);
            const phoneInput = screen.getByLabelText(/Phone/i);
            fireEvent.change(phoneInput, { target: { name: 'phone', value: '123' } });
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '123' } });
            expect(screen.getByText(/at least 8/i)).toBeInTheDocument();
        });

        it('should clear error when valid input is provided', () => {
            render(<AddUserModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);

            // Create error
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '' } });

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
            fireEvent.change(screen.getByLabelText(/Role/i), {
                target: { name: 'role', value: 'urologist' }
            });
        };

        it('should validate all fields before submission', () => {
            render(<AddUserModal {...defaultProps} />);
            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            expect(mockCreateUser).not.toHaveBeenCalled();
        });

        it('should submit form with valid data', async () => {
            mockCreateUser.mockResolvedValue({ success: true });
            render(<AddUserModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockCreateUser).toHaveBeenCalled();
            });
        });

        it('should show success modal on successful submission', async () => {
            mockCreateUser.mockResolvedValue({ success: true });
            render(<AddUserModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            });
        });

        it('should show error modal on failed submission', async () => {
            mockCreateUser.mockResolvedValue({ success: false, message: 'Email already exists' });
            render(<AddUserModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockCreateUser.mockRejectedValue(new Error('Network Error'));
            render(<AddUserModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });
    });

    describe('Modal Actions', () => {
        it('should close modal on Cancel click', () => {
            render(<AddUserModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should close modal on X button click', () => {
            render(<AddUserModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i);
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockCreateUser.mockReturnValue(promise);

            render(<AddUserModal {...defaultProps} />);

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
            fireEvent.change(screen.getByLabelText(/Role/i), {
                target: { name: 'role', value: 'urologist' }
            });

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Adding.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });
    });

    describe('Department Fetching', () => {
        it('should fetch departments on mount', async () => {
            render(<AddUserModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
            });
        });
    });

    describe('Keyboard Navigation', () => {
        it('should handle Enter key in form fields', () => {
            render(<AddUserModal {...defaultProps} />);
            const firstNameInput = screen.getByLabelText(/First Name/i);
            fireEvent.keyDown(firstNameInput, { key: 'Enter' });
            // Should not submit incomplete form
            expect(mockCreateUser).not.toHaveBeenCalled();
        });
    });
});
