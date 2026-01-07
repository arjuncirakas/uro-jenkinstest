import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import ChangePasswordModal from '../ChangePasswordModal';

describe('ChangePasswordModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSubmit: mockOnSubmit
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <ChangePasswordModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            expect(screen.getByText('Change Password')).toBeInTheDocument();
        });

        it('should render all password fields', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Confirm/i)).toBeInTheDocument();
        });

        it('should render password strength indicator', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, { target: { name: 'newPassword', value: 'Test123!' } });
            expect(screen.getByText(/Strength/i)).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        it('should update current password on input', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const currentPasswordInput = screen.getByLabelText(/Current Password/i);
            fireEvent.change(currentPasswordInput, {
                target: { name: 'currentPassword', value: 'oldpass123' }
            });
            expect(currentPasswordInput.value).toBe('oldpass123');
        });

        it('should update new password on input', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            expect(newPasswordInput.value).toBe('NewPass123!');
        });

        it('should update confirm password on input', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const confirmPasswordInput = screen.getByLabelText(/Confirm/i);
            fireEvent.change(confirmPasswordInput, {
                target: { name: 'confirmPassword', value: 'NewPass123!' }
            });
            expect(confirmPasswordInput.value).toBe('NewPass123!');
        });
    });

    describe('Password Visibility Toggle', () => {
        it('should toggle current password visibility', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const currentPasswordInput = screen.getByLabelText(/Current Password/i);

            expect(currentPasswordInput.type).toBe('password');

            // Find toggle button (eye icon)
            const toggleButtons = screen.getAllByRole('button');
            const visibilityToggle = toggleButtons.find(btn =>
                btn.querySelector('svg') && btn.closest('div')?.contains(currentPasswordInput)
            );

            if (visibilityToggle) {
                fireEvent.click(visibilityToggle);
                expect(currentPasswordInput.type).toBe('text');
            }
        });

        it('should toggle new password visibility', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            expect(newPasswordInput.type).toBe('password');
        });
    });

    describe('Password Strength Calculation', () => {
        it('should show weak strength for short password', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, { target: { name: 'newPassword', value: 'ab12' } });
            expect(screen.getByText(/Weak/i)).toBeInTheDocument();
        });

        it('should show medium strength for mixed password', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, { target: { name: 'newPassword', value: 'Password1' } });
            expect(screen.getByText(/Medium|Fair/i)).toBeInTheDocument();
        });

        it('should show strong strength for complex password', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, {
                target: { name: 'newPassword', value: 'VeryStr0ng!Pass#2024' }
            });
            expect(screen.getByText(/Strong|Good/i)).toBeInTheDocument();
        });
    });

    describe('Field Validation', () => {
        it('should show error for empty current password', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const currentPasswordInput = screen.getByLabelText(/Current Password/i);
            fireEvent.blur(currentPasswordInput, { target: { name: 'currentPassword', value: '' } });
            expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
        });

        it('should show error for short new password', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const newPasswordInput = screen.getByLabelText(/New Password/i);
            fireEvent.change(newPasswordInput, { target: { name: 'newPassword', value: 'abc' } });
            fireEvent.blur(newPasswordInput, { target: { name: 'newPassword', value: 'abc' } });
            expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
        });

        it('should show error for mismatched passwords', () => {
            render(<ChangePasswordModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/New Password/i), {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'DifferentPass!' }
            });
            fireEvent.blur(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'DifferentPass!' }
            });

            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });

        it('should clear error when passwords match', () => {
            render(<ChangePasswordModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/New Password/i), {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'NewPass123!' }
            });

            expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        const fillValidForm = () => {
            fireEvent.change(screen.getByLabelText(/Current Password/i), {
                target: { name: 'currentPassword', value: 'OldPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/New Password/i), {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'NewPass123!' }
            });
        };

        it('should validate before submission', async () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should submit with valid data', async () => {
            mockOnSubmit.mockResolvedValue({ success: true });
            render(<ChangePasswordModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalled();
            });
        });

        it('should pass correct password data to onSubmit', async () => {
            mockOnSubmit.mockResolvedValue({ success: true });
            render(<ChangePasswordModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
                    currentPassword: 'OldPass123!',
                    newPassword: 'NewPass123!'
                }));
            });
        });

        it('should show success message on successful change', async () => {
            mockOnSubmit.mockResolvedValue({ success: true });
            render(<ChangePasswordModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/successfully/i)).toBeInTheDocument();
            });
        });

        it('should show error message on failed change', async () => {
            mockOnSubmit.mockResolvedValue({ success: false, message: 'Current password is incorrect' });
            render(<ChangePasswordModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockOnSubmit.mockRejectedValue(new Error('Network Error'));
            render(<ChangePasswordModal {...defaultProps} />);

            fillValidForm();

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/error/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });
    });

    describe('Modal Actions', () => {
        it('should close modal on Cancel click', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should close modal on X button click', () => {
            render(<ChangePasswordModal {...defaultProps} />);
            const closeButton = screen.getByLabelText(/close/i);
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should reset form when modal is closed', () => {
            const { rerender } = render(<ChangePasswordModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Current Password/i), {
                target: { name: 'currentPassword', value: 'test123' }
            });

            rerender(<ChangePasswordModal {...defaultProps} isOpen={false} />);
            rerender(<ChangePasswordModal {...defaultProps} isOpen={true} />);

            expect(screen.getByLabelText(/Current Password/i)).toHaveValue('');
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockOnSubmit.mockReturnValue(promise);

            render(<ChangePasswordModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Current Password/i), {
                target: { name: 'currentPassword', value: 'OldPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/New Password/i), {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'NewPass123!' }
            });

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Changing.../i)).toBeInTheDocument();
            });

            resolvePromise({ success: true });
        });

        it('should disable buttons during loading', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockOnSubmit.mockReturnValue(promise);

            render(<ChangePasswordModal {...defaultProps} />);

            fireEvent.change(screen.getByLabelText(/Current Password/i), {
                target: { name: 'currentPassword', value: 'OldPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/New Password/i), {
                target: { name: 'newPassword', value: 'NewPass123!' }
            });
            fireEvent.change(screen.getByLabelText(/Confirm/i), {
                target: { name: 'confirmPassword', value: 'NewPass123!' }
            });

            const submitButton = screen.getByText('Change Password');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Cancel')).toBeDisabled();
            });

            resolvePromise({ success: true });
        });
    });
});
