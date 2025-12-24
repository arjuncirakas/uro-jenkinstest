import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BaseUserModal, { validateField } from '../BaseUserModal';
import { User } from 'lucide-react';
import React from 'react';

// Mock child modals
vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="success-modal">{title}</div> : null
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="error-modal">{title}</div> : null
}));

describe('validateField', () => {
    describe('first_name validation', () => {
        it('returns error for empty first name', () => {
            expect(validateField('first_name', '')).toBe('First name is required');
        });

        it('returns error for short first name', () => {
            expect(validateField('first_name', 'A')).toBe('First name must be at least 2 characters');
        });

        it('returns error for invalid characters', () => {
            expect(validateField('first_name', 'John123')).toBe('First name can only contain letters and spaces');
        });

        it('passes for valid first name', () => {
            expect(validateField('first_name', 'John')).toBe('');
        });
    });

    describe('last_name validation', () => {
        it('returns error for empty last name', () => {
            expect(validateField('last_name', '')).toBe('Last name is required');
        });

        it('returns error for invalid characters', () => {
            expect(validateField('last_name', 'Doe123')).toBe('Last name can only contain letters and spaces');
        });

        it('passes for valid last name', () => {
            expect(validateField('last_name', 'Doe')).toBe('');
        });
    });

    describe('email validation', () => {
        it('returns error for empty email', () => {
            expect(validateField('email', '')).toBe('Email is required');
        });

        it('returns error for invalid email', () => {
            expect(validateField('email', 'invalid-email')).toBe('Please enter a valid email address');
        });

        it('passes for valid email', () => {
            expect(validateField('email', 'test@example.com')).toBe('');
        });
    });

    describe('phone validation', () => {
        it('returns error for empty phone', () => {
            expect(validateField('phone', '')).toBe('Phone number is required');
        });

        it('returns error for phone with letters', () => {
            expect(validateField('phone', '123abc456')).toBe('Phone number cannot contain letters');
        });

        it('returns error for short phone', () => {
            expect(validateField('phone', '1234567')).toBe('Phone number must contain at least 8 digits');
        });

        it('returns error for long phone', () => {
            expect(validateField('phone', '123456789012345678901')).toBe('Phone number cannot exceed 20 characters');
        });

        it('passes for valid phone', () => {
            expect(validateField('phone', '+61 234 567 890')).toBe('');
        });
    });

    describe('department_id validation', () => {
        it('returns error for empty department', () => {
            expect(validateField('department_id', '')).toBe('Department is required');
        });

        it('passes for valid department', () => {
            expect(validateField('department_id', '1')).toBe('');
        });
    });

    describe('skipFields', () => {
        it('skips validation for specified fields', () => {
            expect(validateField('organization', '', ['organization'])).toBe('');
        });
    });
});

describe('BaseUserModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockSubmitService = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        title: 'Add User',
        icon: User,
        submitService: mockSubmitService,
        initialFormData: {
            first_name: '',
            last_name: '',
            email: '',
            phone: ''
        },
        successTitle: 'Success',
        successMessage: 'User added',
        errorTitle: 'Error',
        submitButtonText: 'Add User'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockSubmitService.mockResolvedValue({ success: true });
    });

    it('renders modal when open', () => {
        render(<BaseUserModal {...defaultProps} />);
        expect(screen.getByRole('heading', { name: 'Add User' })).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<BaseUserModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Add User')).not.toBeInTheDocument();
    });

    it('handles form input changes', () => {
        render(<BaseUserModal {...defaultProps} />);

        const firstNameInput = screen.getByPlaceholderText('Enter first name');
        fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });

        expect(firstNameInput.value).toBe('John');
    });

    it('validates on blur', () => {
        render(<BaseUserModal {...defaultProps} />);

        const firstNameInput = screen.getByPlaceholderText('Enter first name');
        fireEvent.blur(firstNameInput);

        expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    it('clears error when user types', () => {
        render(<BaseUserModal {...defaultProps} />);

        const firstNameInput = screen.getByPlaceholderText('Enter first name');
        fireEvent.blur(firstNameInput);
        expect(screen.getByText('First name is required')).toBeInTheDocument();

        fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
        expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });

    it('validates form on submit', async () => {
        render(<BaseUserModal {...defaultProps} />);

        const submitButton = screen.getByRole('button', { name: 'Add User' });
        fireEvent.click(submitButton);

        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(mockSubmitService).not.toHaveBeenCalled();
    });

    it('submits form successfully', async () => {
        render(<BaseUserModal {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { name: 'first_name', value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { name: 'email', value: 'john@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { name: 'phone', value: '12345678' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

        await waitFor(() => {
            expect(mockSubmitService).toHaveBeenCalled();
            expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        });
    });

    it('handles submission error from service', async () => {
        mockSubmitService.mockResolvedValue({ success: false, message: 'User exists' });

        render(<BaseUserModal {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { name: 'first_name', value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { name: 'email', value: 'john@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { name: 'phone', value: '12345678' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

        await waitFor(() => {
            expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        });
    });

    it('handles submission exception', async () => {
        mockSubmitService.mockRejectedValue(new Error('Network error'));

        render(<BaseUserModal {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { name: 'first_name', value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { name: 'email', value: 'john@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { name: 'phone', value: '12345678' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

        await waitFor(() => {
            expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        });
    });

    it('closes modal on cancel', () => {
        render(<BaseUserModal {...defaultProps} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal on X button', () => {
        render(<BaseUserModal {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Close modal'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('renders extra fields when provided', () => {
        const renderExtraFields = () => (
            <div data-testid="extra-field">Extra Field</div>
        );

        render(<BaseUserModal {...defaultProps} renderExtraFields={renderExtraFields} />);
        expect(screen.getByTestId('extra-field')).toBeInTheDocument();
    });

    it('skips validation for specified fields', async () => {
        const propsWithSkip = {
            ...defaultProps,
            initialFormData: { ...defaultProps.initialFormData, organization: '' },
            skipValidationFields: ['organization']
        };

        render(<BaseUserModal {...propsWithSkip} />);

        fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { name: 'first_name', value: 'John' } });
        fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { name: 'last_name', value: 'Doe' } });
        fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { name: 'email', value: 'john@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { name: 'phone', value: '12345678' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

        await waitFor(() => {
            expect(mockSubmitService).toHaveBeenCalled();
        });
    });
});
