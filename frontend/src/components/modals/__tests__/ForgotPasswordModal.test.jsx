/**
 * Tests for ForgotPasswordModal
 * Ensures 100% coverage including all steps, validation, and error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordModal from '../ForgotPasswordModal';
import React from 'react';

// Mock authService
const mockRequestPasswordReset = vi.fn();
const mockVerifyPasswordResetOTP = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../services/authService', () => ({
  default: {
    requestPasswordReset: mockRequestPasswordReset,
    verifyPasswordResetOTP: mockVerifyPasswordResetOTP,
    resetPassword: mockResetPassword
  }
}));

describe('ForgotPasswordModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Email Input', () => {
    it('should render email input step when modal is open', () => {
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      render(<ForgotPasswordModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });

    it('should handle email input change', () => {
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should send OTP successfully', async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: true });
      
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const sendButton = screen.getByRole('button', { name: /send otp/i });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
      });
    });

    it('should show error when OTP request fails', async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: false, message: 'Email not found' });
      
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const sendButton = screen.getByRole('button', { name: /send otp/i });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email not found/i)).toBeInTheDocument();
      });
    });

    it('should handle OTP request error', async () => {
      mockRequestPasswordReset.mockRejectedValue(new Error('Network error'));
      
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const sendButton = screen.getByRole('button', { name: /send otp/i });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to send otp/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: OTP Verification', () => {
    beforeEach(async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: true });
      
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const sendButton = screen.getByRole('button', { name: /send otp/i });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
      });
    });

    it('should render OTP input step', () => {
      expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify otp/i })).toBeInTheDocument();
    });

    it('should handle OTP input change', () => {
      const otpInput = screen.getByLabelText(/otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should verify OTP successfully', async () => {
      mockVerifyPasswordResetOTP.mockResolvedValue({ 
        success: true, 
        data: { resetToken: 'test-token' } 
      });
      
      const otpInput = screen.getByLabelText(/otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(mockVerifyPasswordResetOTP).toHaveBeenCalledWith('test@example.com', '123456');
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should show error when OTP verification fails', async () => {
      mockVerifyPasswordResetOTP.mockResolvedValue({ success: false, message: 'Invalid OTP' });
      
      const otpInput = screen.getByLabelText(/otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
      });
    });

    it('should handle OTP verification error', async () => {
      mockVerifyPasswordResetOTP.mockRejectedValue(new Error('Network error'));
      
      const otpInput = screen.getByLabelText(/otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: New Password', () => {
    beforeEach(async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: true });
      mockVerifyPasswordResetOTP.mockResolvedValue({ 
        success: true, 
        data: { resetToken: 'test-token' } 
      });
      
      render(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      // Step 1: Enter email and send OTP
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
      });
      
      // Step 2: Enter OTP and verify
      const otpInput = screen.getByLabelText(/otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should render new password step', () => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('should toggle password visibility', () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const toggleButton = passwordInput.parentElement.querySelector('button');
      
      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('should validate password length', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      fireEvent.change(passwordInput, { target: { value: 'Short1!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 14 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password match', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength - missing uppercase', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'lowercase123!password' } });
      fireEvent.change(confirmInput, { target: { value: 'lowercase123!password' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must contain uppercase/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength - missing lowercase', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'UPPERCASE123!PASSWORD' } });
      fireEvent.change(confirmInput, { target: { value: 'UPPERCASE123!PASSWORD' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must contain uppercase/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength - missing numbers', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword!' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must contain uppercase/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength - missing special characters', async () => {
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must contain uppercase/i)).toBeInTheDocument();
      });
    });

    it('should reset password successfully', async () => {
      mockResetPassword.mockResolvedValue({ success: true });
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-token', 'ValidPassword123!');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle password reset error', async () => {
      mockResetPassword.mockResolvedValue({ success: false, message: 'Reset failed' });
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/reset failed/i)).toBeInTheDocument();
      });
    });

    it('should handle password reset exception', async () => {
      mockResetPassword.mockRejectedValue(new Error('Network error'));
      
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
      
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to reset password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Close and Reset', () => {
    it('should reset all state when closed', async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: true });
      
      const { rerender } = render(
        <ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      
      // Go to step 2
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/otp/i)).toBeInTheDocument();
      });
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
      
      // Reopen modal - should be back at step 1
      rerender(<ForgotPasswordModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/otp/i)).not.toBeInTheDocument();
    });
  });
});







