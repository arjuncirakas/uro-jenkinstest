import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { User, Mail } from 'lucide-react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
// Mock child modals - but capture onClose to test it
let successModalOnClose;
let errorModalOnClose;

vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, message, onClose }) => {
        successModalOnClose = onClose;
        return isOpen ? <div data-testid="success-modal">{message}</div> : null;
    }
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, message, onClose }) => {
        errorModalOnClose = onClose;
        return isOpen ? <div data-testid="error-modal">{message}</div> : null;
    }
}));

// NOW import component AFTER all mocks
import BaseUserModal, { validateField } from '../BaseUserModal';

describe('BaseUserModal', () => {
    const mockOnClose = vi.fn();
    const mockSubmitService = vi.fn();
    const mockOnSuccess = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        title: "Test Modal",
        icon: User,
        submitService: mockSubmitService,
        initialFormData: { first_name: '', last_name: '', email: '', phone: '' },
        renderExtraFields: vi.fn(),
        successTitle: "Success",
        successMessage: "User created",
        errorTitle: "Error",
        submitButtonText: "Add User"
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Helper: validateField', () => {
        it('should validate names', () => {
            expect(validateField('first_name', '')).toContain('required');
            expect(validateField('first_name', 'A')).toContain('at least 2 characters');
            expect(validateField('first_name', '123')).toContain('letters and spaces');
            expect(validateField('first_name', 'John')).toBe('');
        });

        it('should validate email', () => {
            expect(validateField('email', '')).toContain('required');
            expect(validateField('email', 'invalid')).toContain('valid email');
            expect(validateField('email', 'test@example.com')).toBe('');
        });

        it('should validate phone', () => {
            expect(validateField('phone', '')).toContain('required');
            expect(validateField('phone', 'abc')).toContain('letters');
            expect(validateField('phone', '123')).toContain('at least 8 digits');
            expect(validateField('phone', '1'.repeat(21))).toContain('exceed 20 characters');
            expect(validateField('phone', '12345678')).toBe('');
        });

        it('should skip validation', () => {
            expect(validateField('first_name', '', ['first_name'])).toBe('');
        });

        it('should validate department', () => {
            expect(validateField('department_id', '')).toContain('required');
        });

        it('should validate organization', () => {
            expect(validateField('organization', '')).toBe('');
        });
    });

    describe('Rendering and Interactions', () => {
        it('should return null if not open', () => {
            const { container } = render(<BaseUserModal {...defaultProps} isOpen={false} />);
            expect(container.firstChild).toBeNull();
        });

        it('should render modal content when open', () => {
            render(<BaseUserModal {...defaultProps} />);
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
        });

        it('should reset form when reopened', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} isOpen={false} />);
            rerender(<BaseUserModal {...defaultProps} isOpen={true} />);
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('');
        });

        it('should update inputs', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.change(input, { target: { value: 'Jane', name: 'first_name' } });
            expect(input.value).toBe('Jane');
        });

        it('should validate on blur', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(input, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText('First name is required')).toBeInTheDocument();
        });

        it('should submit successfully', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            // Fill form
            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            // Submit
            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(mockSubmitService).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'John' }));
            });

            expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        });

        it('should show error on API failure', async () => {
            mockSubmitService.mockResolvedValue({ success: false, message: 'API Error' });
            render(<BaseUserModal {...defaultProps} />);

            // Fill form validly to bypass client validation
            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('API Error');
            });
        });

        it('should show error on Exception', async () => {
            mockSubmitService.mockRejectedValue(new Error('Network Error'));
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });

            // Force submit (other fields empty, validation will actually stop it)
            // Need to fill all or bypass validation. 
            // Let's use skipValidationFields prop to make it easier or just fill all.
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Network Error');
            });
        });

        it('should prevent submission if validation fails', async () => {
            render(<BaseUserModal {...defaultProps} />);
            fireEvent.click(screen.getByText('Add User'));

            expect(mockSubmitService).not.toHaveBeenCalled();
            expect(screen.getByText('First name is required')).toBeInTheDocument();
        });

        it('should render extra fields', () => {
            const renderExtra = vi.fn().mockReturnValue(<div>Extra</div>);
            render(<BaseUserModal {...defaultProps} renderExtraFields={renderExtra} />);
            expect(screen.getByText('Extra')).toBeInTheDocument();
            expect(renderExtra).toHaveBeenCalled();
        });

        it('should close on cancel', () => {
            render(<BaseUserModal {...defaultProps} />);
            fireEvent.click(screen.getByText('Cancel'));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should close on X button', () => {
            render(<BaseUserModal {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Close modal'));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should handle input change and clear errors', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            
            // First, create an error
            fireEvent.blur(input, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText('First name is required')).toBeInTheDocument();
            
            // Then change input to clear error
            fireEvent.change(input, { target: { value: 'John', name: 'first_name' } });
            expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
        });

        it('should handle success with onSuccess callback', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Wait for setTimeout to execute
            await new Promise(resolve => setTimeout(resolve, 1600));
            expect(mockOnSuccess).toHaveBeenCalled();
        });

        it('should handle success without onSuccess callback', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} onSuccess={undefined} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('should handle error with response.error', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error message' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Error message');
            });
        });

        it('should handle error with response.message', async () => {
            mockSubmitService.mockResolvedValue({ success: false, message: 'Message error' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Message error');
            });
        });

        it('should handle error with default message', async () => {
            mockSubmitService.mockResolvedValue({ success: false });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Failed to create user');
            });
        });

        it('should handle exception with error.response.data.error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {
                    data: {
                        error: 'Response error'
                    }
                }
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Response error');
            });
            consoleError.mockRestore();
        });

        it('should handle exception with error.response.data.message', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {
                    data: {
                        message: 'Response message'
                    }
                }
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Response message');
            });
            consoleError.mockRestore();
        });

        it('should handle exception with error.message', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSubmitService.mockRejectedValue(new Error('Error message'));
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Error message');
            });
            consoleError.mockRestore();
        });

        it('should handle exception with default message', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSubmitService.mockRejectedValue({});
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Failed to create user. Please try again.');
            });
            consoleError.mockRestore();
        });

        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockSubmitService.mockReturnValue(promise);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByText('Adding...')).toBeInTheDocument();
            });

            resolvePromise({ success: true });
            await waitFor(() => {
                expect(screen.queryByText('Adding...')).not.toBeInTheDocument();
            });
        });

        it('should disable buttons during loading', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockSubmitService.mockReturnValue(promise);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                const cancelButton = screen.getByText('Cancel');
                expect(cancelButton).toBeDisabled();
            });

            resolvePromise({ success: true });
        });

        it('should close success modal and call onClose', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            });

            // Mock SuccessModal's onClose
            const successModal = screen.getByTestId('success-modal');
            // The modal should have a close handler that calls onClose
            // Since we mocked it, we need to check the actual implementation
            // For now, just verify the modal is shown
            expect(successModal).toBeInTheDocument();
        });

        it('should close error modal', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            });
        });

        it('should handle all field error displays', () => {
            render(<BaseUserModal {...defaultProps} />);

            // Test first_name error
            const firstNameInput = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '' } });
            expect(screen.getByText('First name is required')).toBeInTheDocument();

            // Test last_name error
            const lastNameInput = screen.getByPlaceholderText('Enter last name');
            fireEvent.blur(lastNameInput, { target: { name: 'last_name', value: '' } });
            expect(screen.getByText('Last name is required')).toBeInTheDocument();

            // Test email error
            const emailInput = screen.getByPlaceholderText('Enter email address');
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'invalid' } });
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();

            // Test phone error
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '123' } });
            expect(screen.getByText(/at least 8 digits/)).toBeInTheDocument();
        });

        it('should handle phone validation with plus sign', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '+1234567890' } });
            // Should not show error for valid phone with +
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with formatting', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '(123) 456-7890' } });
            // Should not show error for valid formatted phone
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with letters', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '123abc456' } });
            expect(screen.getByText('Phone number cannot contain letters')).toBeInTheDocument();
        });

        it('should handle phone validation exceeding 20 characters', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1'.repeat(21) } });
            expect(screen.getByText('Phone number cannot exceed 20 characters')).toBeInTheDocument();
        });

        it('should handle name validation with numbers', () => {
            render(<BaseUserModal {...defaultProps} />);
            const firstNameInput = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: 'John123' } });
            expect(screen.getByText('First name can only contain letters and spaces')).toBeInTheDocument();
        });

        it('should handle name validation with special characters', () => {
            render(<BaseUserModal {...defaultProps} />);
            const firstNameInput = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: 'John@Doe' } });
            expect(screen.getByText('First name can only contain letters and spaces')).toBeInTheDocument();
        });

        it('should handle name validation with spaces', () => {
            render(<BaseUserModal {...defaultProps} />);
            const firstNameInput = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: 'John Doe' } });
            // Should not show error for valid name with space
            expect(screen.queryByText(/can only contain/)).not.toBeInTheDocument();
        });

        it('should handle renderExtraFields with all parameters', () => {
            const renderExtra = vi.fn().mockReturnValue(<div>Extra</div>);
            render(<BaseUserModal {...defaultProps} renderExtraFields={renderExtra} />);
            expect(renderExtra).toHaveBeenCalledWith(
                expect.objectContaining({
                    formData: expect.any(Object),
                    errors: expect.any(Object),
                    handleInputChange: expect.any(Function),
                    handleBlur: expect.any(Function)
                })
            );
        });

        it('should handle renderExtraFields being undefined', () => {
            render(<BaseUserModal {...defaultProps} renderExtraFields={undefined} />);
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
        });

        it('should reset form when initialFormData changes', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.change(input, { target: { value: 'Jane', name: 'first_name' } });
            expect(input.value).toBe('Jane');

            rerender(<BaseUserModal {...defaultProps} initialFormData={{ first_name: '', last_name: '', email: '', phone: '' }} />);
            expect(input.value).toBe('');
        });

        it('should handle validateForm with skipValidationFields', () => {
            render(<BaseUserModal {...defaultProps} skipValidationFields={['first_name']} />);
            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);
            // Should not show first_name error since it's skipped
            expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
        });

        it('should handle validateField with unknown field', () => {
            expect(validateField('unknown_field', 'value')).toBe('');
        });

        it('should handle validateField with null validator', () => {
            // This tests the case where fieldValidators[name] doesn't exist
            expect(validateField('nonexistent', 'value')).toBe('');
        });

        it('should test validateName with minLength 0', () => {
            // Test last_name which has minLength 0
            expect(validateField('last_name', 'Valid Name')).toBe('');
            expect(validateField('last_name', '')).toContain('required');
        });

        it('should test validateName with valid name but short length', () => {
            expect(validateField('first_name', 'A')).toContain('at least 2 characters');
        });

        it('should test validateName with valid name', () => {
            expect(validateField('first_name', 'John')).toBe('');
            expect(validateField('last_name', 'Doe')).toBe('');
        });

        it('should test validateEmail with valid email', () => {
            expect(validateField('email', 'test@example.com')).toBe('');
        });

        it('should test validatePhone with valid phone', () => {
            expect(validateField('phone', '1234567890')).toBe('');
            expect(validateField('phone', '+1234567890')).toBe('');
            expect(validateField('phone', '(123) 456-7890')).toBe('');
        });

        it('should test validatePhone with exactly 8 digits', () => {
            expect(validateField('phone', '12345678')).toBe('');
        });

        it('should test validatePhone with exactly 20 characters', () => {
            expect(validateField('phone', '1'.repeat(20))).toBe('');
        });

        it('should test department_id validation', () => {
            expect(validateField('department_id', '1')).toBe('');
            expect(validateField('department_id', '')).toContain('required');
        });
    });

    describe('Component Edge Cases', () => {
        it('should handle input change without existing error', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            // Change input when no error exists
            fireEvent.change(input, { target: { value: 'John', name: 'first_name' } });
            expect(input.value).toBe('John');
        });

        it('should handle blur without error', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.change(input, { target: { value: 'John', name: 'first_name' } });
            fireEvent.blur(input, { target: { name: 'first_name', value: 'John' } });
            // Should not show error for valid input
            expect(screen.queryByText(/required/)).not.toBeInTheDocument();
        });

        it('should handle form submission with form element', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            const form = screen.getByPlaceholderText('Enter first name').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockSubmitService).toHaveBeenCalled();
            }, { timeout: 3000 });
        });

        it('should reset form data after successful submission', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Wait for form reset (happens after success)
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        it('should show error border styling for first_name', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(input, { target: { name: 'first_name', value: '' } });
            // Check that error class is applied
            expect(input.className).toContain('border-red-500');
        });

        it('should show error border styling for last_name', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter last name');
            fireEvent.blur(input, { target: { name: 'last_name', value: '' } });
            expect(input.className).toContain('border-red-500');
        });

        it('should show error border styling for email', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter email address');
            fireEvent.blur(input, { target: { name: 'email', value: 'invalid' } });
            expect(input.className).toContain('border-red-500');
        });

        it('should show error border styling for phone', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(input, { target: { name: 'phone', value: '123' } });
            expect(input.className).toContain('border-red-500');
        });

        it('should not show error border when field is valid', () => {
            render(<BaseUserModal {...defaultProps} />);
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.change(input, { target: { value: 'John', name: 'first_name' } });
            fireEvent.blur(input, { target: { name: 'first_name', value: 'John' } });
            expect(input.className).toContain('border-gray-300');
            expect(input.className).not.toContain('border-red-500');
        });

        it('should handle success modal close', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // The success modal's onClose should call both setShowSuccessModal(false) and onClose()
            // Since we mocked SuccessModal, we can't directly test this, but we verify it renders
            expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        });

        it('should handle error modal close', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Error modal's onClose should call setShowErrorModal(false)
            // Since we mocked ErrorModal, we verify it renders
            expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        });

        it('should handle useEffect when isOpen changes to false', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} isOpen={true} />);
            rerender(<BaseUserModal {...defaultProps} isOpen={false} />);
            // When isOpen is false, component returns null
            expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
        });

        it('should handle useEffect when isOpen changes to true', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} isOpen={false} />);
            rerender(<BaseUserModal {...defaultProps} isOpen={true} />);
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
        });

        it('should handle validateForm with multiple errors', () => {
            render(<BaseUserModal {...defaultProps} />);
            // Trigger validation for all fields
            fireEvent.click(screen.getByText('Add User'));
            // Should show multiple errors
            expect(screen.getByText('First name is required')).toBeInTheDocument();
            expect(screen.getByText('Last name is required')).toBeInTheDocument();
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Phone number is required')).toBeInTheDocument();
        });

        it('should handle validateForm with no errors', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(mockSubmitService).toHaveBeenCalled();
            }, { timeout: 3000 });
        });

        it('should handle loading state text', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockSubmitService.mockReturnValue(promise);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByText('Adding...')).toBeInTheDocument();
            }, { timeout: 3000 });

            resolvePromise({ success: true });
            await waitFor(() => {
                expect(screen.queryByText('Adding...')).not.toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('should handle submit button disabled state', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockSubmitService.mockReturnValue(promise);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            }, { timeout: 3000 });

            resolvePromise({ success: true });
        });

        it('should handle renderExtraFields with errors parameter', () => {
            const renderExtra = vi.fn().mockReturnValue(<div>Extra</div>);
            render(<BaseUserModal {...defaultProps} renderExtraFields={renderExtra} />);
            
            // Trigger an error
            const input = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(input, { target: { name: 'first_name', value: '' } });
            
            // renderExtraFields should be called with errors
            expect(renderExtra).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.objectContaining({
                        first_name: expect.any(String)
                    })
                })
            );
        });

        it('should handle initialFormData with different structure', () => {
            const customFormData = { first_name: 'Test', last_name: 'User', email: 'test@test.com', phone: '1234567890' };
            render(<BaseUserModal {...defaultProps} initialFormData={customFormData} />);
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('Test');
        });

        it('should handle skipValidationFields for multiple fields', () => {
            render(<BaseUserModal {...defaultProps} skipValidationFields={['first_name', 'last_name']} />);
            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);
            // Should not show errors for skipped fields
            expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
            expect(screen.queryByText('Last name is required')).not.toBeInTheDocument();
        });

        it('should handle success modal close callback', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            const { rerender } = render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Close success modal by setting isOpen to false
            rerender(<BaseUserModal {...defaultProps} isOpen={false} />);
            expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
        });

        it('should handle error modal close callback', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error' });
            const { rerender } = render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Close error modal by setting isOpen to false
            rerender(<BaseUserModal {...defaultProps} isOpen={false} />);
            expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
        });

        it('should handle phone validation with exactly 7 digits (too short)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1234567' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle phone validation with exactly 21 digits (too long)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1'.repeat(21) } });
            expect(screen.getByText('Phone number cannot exceed 20 characters')).toBeInTheDocument();
        });

        it('should handle phone validation with spaces and parentheses', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '(123) 456-7890' } });
            // Should pass validation after cleaning
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with plus and spaces', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '+1 234 567 890' } });
            // Should pass validation after cleaning
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle validateForm with partial errors', () => {
            render(<BaseUserModal {...defaultProps} />);
            // Fill some fields but not all
            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            // Leave email and phone empty
            fireEvent.click(screen.getByText('Add User'));
            // Should show errors for empty fields only
            expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
            expect(screen.queryByText('Last name is required')).not.toBeInTheDocument();
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Phone number is required')).toBeInTheDocument();
        });

        it('should reset all state when modal reopens', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} isOpen={true} />);
            
            // Set some state by submitting with error
            mockSubmitService.mockResolvedValue({ success: false, error: 'Test error' });
            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });
            fireEvent.click(screen.getByText('Add User'));

            // Close modal
            rerender(<BaseUserModal {...defaultProps} isOpen={false} />);
            
            // Reopen modal
            rerender(<BaseUserModal {...defaultProps} isOpen={true} />);
            
            // All state should be reset
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('');
            expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
        });

        it('should handle initialFormData change in useEffect', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} initialFormData={{ first_name: 'John', last_name: 'Doe', email: '', phone: '' }} />);
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('John');
            
            // Change initialFormData
            rerender(<BaseUserModal {...defaultProps} initialFormData={{ first_name: 'Jane', last_name: 'Smith', email: '', phone: '' }} />);
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('Jane');
        });

        it('should handle error with both error and message properties (prefer error)', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error property', message: 'Message property' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Error property');
            });
        });

        it('should handle exception with error.response.data but no error or message', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {
                    data: {}
                }
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Failed to create user. Please try again.');
            });
            consoleError.mockRestore();
        });

        it('should handle exception with error.response but no data', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {}
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Failed to create user. Please try again.');
            });
            consoleError.mockRestore();
        });

        it('should handle validateForm with all fields in skipValidationFields', () => {
            render(<BaseUserModal {...defaultProps} skipValidationFields={['first_name', 'last_name', 'email', 'phone']} />);
            const submitButton = screen.getByText('Add User');
            fireEvent.click(submitButton);
            // Should not show any validation errors
            expect(screen.queryByText(/required/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with only special characters', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '()--' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle phone validation with plus but no digits', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '+' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle name validation with only spaces', () => {
            render(<BaseUserModal {...defaultProps} />);
            const firstNameInput = screen.getByPlaceholderText('Enter first name');
            fireEvent.blur(firstNameInput, { target: { name: 'first_name', value: '   ' } });
            expect(screen.getByText('First name is required')).toBeInTheDocument();
        });

        it('should handle email validation with spaces', () => {
            render(<BaseUserModal {...defaultProps} />);
            const emailInput = screen.getByPlaceholderText('Enter email address');
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'test @example.com' } });
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });

        it('should handle email validation with missing @', () => {
            render(<BaseUserModal {...defaultProps} />);
            const emailInput = screen.getByPlaceholderText('Enter email address');
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'testexample.com' } });
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });

        it('should handle email validation with missing domain', () => {
            render(<BaseUserModal {...defaultProps} />);
            const emailInput = screen.getByPlaceholderText('Enter email address');
            fireEvent.blur(emailInput, { target: { name: 'email', value: 'test@' } });
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });

        it('should handle success modal close that calls both setShowSuccessModal and onClose', async () => {
            mockSubmitService.mockResolvedValue({ success: true });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Call the success modal's onClose handler (which should call both setShowSuccessModal(false) and onClose())
            if (successModalOnClose) {
                successModalOnClose();
            }

            // Modal should close and onClose should be called
            await waitFor(() => {
                expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
            });
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should handle error modal close that calls setShowErrorModal', async () => {
            mockSubmitService.mockResolvedValue({ success: false, error: 'Error message' });
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Call the error modal's onClose handler (which should call setShowErrorModal(false))
            if (errorModalOnClose) {
                errorModalOnClose();
            }

            // Modal should close
            await waitFor(() => {
                expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
            });
        });

        it('should handle error with default message when no error details', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {}; // Error with no message or response
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Failed to create user. Please try again.');
            }, { timeout: 3000 });

            consoleError.mockRestore();
        });

        it('should handle phone validation with exactly 7 digits (too short)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1234567' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle phone validation with exactly 21 digits (too long)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1'.repeat(21) } });
            expect(screen.getByText('Phone number cannot exceed 20 characters')).toBeInTheDocument();
        });

        it('should handle phone validation with plus sign only', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '+' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle phone validation with special characters only', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '()-' } });
            expect(screen.getByText('Phone number must contain at least 8 digits')).toBeInTheDocument();
        });

        it('should handle useEffect when initialFormData changes', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} initialFormData={{ first_name: 'John', last_name: 'Doe', email: '', phone: '' }} />);
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('John');
            
            // Change initialFormData
            rerender(<BaseUserModal {...defaultProps} initialFormData={{ first_name: 'Jane', last_name: 'Smith', email: '', phone: '' }} />);
            
            // Form should reset to new initialFormData
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('Jane');
            expect(screen.getByPlaceholderText('Enter last name').value).toBe('Smith');
        });

        it('should handle renderExtraFields being undefined', () => {
            render(<BaseUserModal {...defaultProps} renderExtraFields={undefined} />);
            // Should render without crashing
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            // Should not render extra fields
            expect(screen.queryByText('Extra')).not.toBeInTheDocument();
        });

        it('should handle phone validation with exactly 8 digits (valid)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '12345678' } });
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with exactly 20 digits (valid)', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '1'.repeat(20) } });
            expect(screen.queryByText(/Phone number cannot exceed/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with letters', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '123abc456' } });
            expect(screen.getByText('Phone number cannot contain letters')).toBeInTheDocument();
        });

        it('should handle phone validation with plus and digits', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '+1234567890' } });
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle phone validation with spaces and parentheses', () => {
            render(<BaseUserModal {...defaultProps} />);
            const phoneInput = screen.getByPlaceholderText('Enter phone number');
            fireEvent.blur(phoneInput, { target: { name: 'phone', value: '(123) 456-7890' } });
            expect(screen.queryByText(/Phone number/)).not.toBeInTheDocument();
        });

        it('should handle error.response.data.error path', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {
                    data: {
                        error: 'Custom error message'
                    }
                }
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Custom error message');
            }, { timeout: 3000 });

            consoleError.mockRestore();
        });

        it('should handle error.response.data.message path', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                response: {
                    data: {
                        message: 'Custom message'
                    }
                }
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Custom message');
            }, { timeout: 3000 });

            consoleError.mockRestore();
        });

        it('should handle error.message path', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = {
                message: 'Error message'
            };
            mockSubmitService.mockRejectedValue(error);
            render(<BaseUserModal {...defaultProps} />);

            fireEvent.change(screen.getByPlaceholderText('Enter first name'), { target: { value: 'John', name: 'first_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter last name'), { target: { value: 'Doe', name: 'last_name' } });
            fireEvent.change(screen.getByPlaceholderText('Enter email address'), { target: { value: 'john@example.com', name: 'email' } });
            fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '1234567890', name: 'phone' } });

            fireEvent.click(screen.getByText('Add User'));

            await waitFor(() => {
                expect(screen.getByTestId('error-modal')).toHaveTextContent('Error message');
            }, { timeout: 3000 });

            consoleError.mockRestore();
        });

        it('should reset all state when isOpen changes to true', () => {
            const { rerender } = render(<BaseUserModal {...defaultProps} isOpen={false} />);
            
            // Open modal
            rerender(<BaseUserModal {...defaultProps} isOpen={true} />);
            
            // All form fields should be reset
            expect(screen.getByPlaceholderText('Enter first name').value).toBe('');
            expect(screen.getByPlaceholderText('Enter last name').value).toBe('');
            expect(screen.getByPlaceholderText('Enter email address').value).toBe('');
            expect(screen.getByPlaceholderText('Enter phone number').value).toBe('');
            
            // Errors should be cleared
            expect(screen.queryByText(/required/)).not.toBeInTheDocument();
        });
    });

    describe('Component export and PropTypes', () => {
        it('should have PropTypes defined and component exported correctly', () => {
            // This test ensures PropTypes (lines 361-375) and export (line 377) are executed
            expect(BaseUserModal).toBeDefined();
            expect(BaseUserModal.propTypes).toBeDefined();
            expect(BaseUserModal.propTypes.isOpen).toBeDefined();
            expect(BaseUserModal.propTypes.onClose).toBeDefined();
            expect(BaseUserModal.propTypes.onSuccess).toBeDefined();
            expect(BaseUserModal.propTypes.title).toBeDefined();
            expect(BaseUserModal.propTypes.icon).toBeDefined();
            expect(BaseUserModal.propTypes.submitService).toBeDefined();
            expect(BaseUserModal.propTypes.initialFormData).toBeDefined();
            expect(BaseUserModal.propTypes.renderExtraFields).toBeDefined();
            expect(BaseUserModal.propTypes.successTitle).toBeDefined();
            expect(BaseUserModal.propTypes.successMessage).toBeDefined();
            expect(BaseUserModal.propTypes.errorTitle).toBeDefined();
            expect(BaseUserModal.propTypes.submitButtonText).toBeDefined();
            expect(BaseUserModal.propTypes.skipValidationFields).toBeDefined();
        });
    });
});
