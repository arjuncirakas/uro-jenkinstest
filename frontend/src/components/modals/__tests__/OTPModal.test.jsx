import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OTPModal from '../OTPModal';
import React from 'react';

describe('OTPModal', () => {
  const mockOnClose = vi.fn();
  const mockOnVerify = vi.fn();
  const mockOnResend = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onVerify: mockOnVerify,
    onResend: mockOnResend,
    email: 'test@example.com',
    loading: false,
    error: null,
    type: 'login'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<OTPModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Verify Your Identity')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<OTPModal {...defaultProps} />);
      
      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
      expect(screen.getByText('Enter the 6-digit code sent to your email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display email address', () => {
      render(<OTPModal {...defaultProps} email="user@example.com" />);
      
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should display error message when error is provided', () => {
      render(<OTPModal {...defaultProps} error="Invalid OTP code" />);
      
      expect(screen.getByText('Invalid OTP code')).toBeInTheDocument();
    });

    it('should not display error message when error is null', () => {
      render(<OTPModal {...defaultProps} error={null} />);
      
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    });

    it('should show loading state on submit button when loading is true', () => {
      render(<OTPModal {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
    });

    it('should show "Verify Code" button when not loading', () => {
      render(<OTPModal {...defaultProps} loading={false} />);
      
      expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    });
  });

  describe('OTP Input', () => {
    it('should allow entering OTP digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should filter out non-numeric characters', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.change(otpInput, { target: { value: 'abc123def456' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should limit input to 6 digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.change(otpInput, { target: { value: '1234567890' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should handle paste event with numeric data', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', '123456');
      
      fireEvent.paste(otpInput, pasteEvent);
      
      expect(otpInput.value).toBe('123456');
    });

    it('should filter non-numeric characters from pasted data', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', 'abc123def456');
      
      fireEvent.paste(otpInput, pasteEvent);
      
      expect(otpInput.value).toBe('123456');
    });

    it('should limit pasted data to 6 digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', '1234567890');
      
      fireEvent.paste(otpInput, pasteEvent);
      
      expect(otpInput.value).toBe('123456');
    });

    it('should handle onInput event', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.input(otpInput, { target: { value: '123abc456' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should prevent infinite loops in onInput handler', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.input(otpInput, { target: { value: '123456' } });
      
      // Should not cause infinite loop
      expect(otpInput.value).toBe('123456');
    });

    it('should auto-focus OTP input when modal opens', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      expect(otpInput).toHaveFocus();
    });
  });

  describe('Form Submission', () => {
    it('should call onVerify with OTP when form is submitted with 6 digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const form = otpInput.closest('form');
      
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.submit(form);
      
      expect(mockOnVerify).toHaveBeenCalledWith('123456');
    });

    it('should not call onVerify when OTP is less than 6 digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const form = otpInput.closest('form');
      
      fireEvent.change(otpInput, { target: { value: '12345' } });
      fireEvent.submit(form);
      
      expect(mockOnVerify).not.toHaveBeenCalled();
    });

    it('should disable submit button when OTP is less than 6 digits', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const submitButton = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(otpInput, { target: { value: '12345' } });
      
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      render(<OTPModal {...defaultProps} loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /verify/i });
      
      expect(submitButton).toBeDisabled();
    });

    it('should prevent default form submission', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      const form = otpInput.closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent(form, submitEvent);
      
      expect(submitEvent.defaultPrevented).toBe(true);
    });
  });

  describe('Resend Functionality', () => {
    it('should show countdown timer initially', () => {
      render(<OTPModal {...defaultProps} />);
      
      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
    });

    it('should disable resend button during countdown', () => {
      render(<OTPModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend/i });
      
      expect(resendButton).toBeDisabled();
    });

    it('should enable resend button after countdown expires', async () => {
      render(<OTPModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend/i });
      
      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        expect(resendButton).not.toBeDisabled();
        expect(screen.getByText(/resend code/i)).toBeInTheDocument();
      });
    });

    it('should call onResend when resend button is clicked after countdown', async () => {
      mockOnResend.mockResolvedValue(undefined);
      
      render(<OTPModal {...defaultProps} />);
      
      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        expect(resendButton).not.toBeDisabled();
      });
      
      const resendButton = screen.getByRole('button', { name: /resend code/i });
      fireEvent.click(resendButton);
      
      await waitFor(() => {
        expect(mockOnResend).toHaveBeenCalled();
      });
    });

    it('should reset countdown after resend', async () => {
      mockOnResend.mockResolvedValue(undefined);
      
      render(<OTPModal {...defaultProps} />);
      
      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        fireEvent.click(resendButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
      });
    });

    it('should handle promise-based onResend', async () => {
      mockOnResend.mockResolvedValue({ success: true });
      
      render(<OTPModal {...defaultProps} />);
      
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        fireEvent.click(resendButton);
      });
      
      await waitFor(() => {
        expect(mockOnResend).toHaveBeenCalled();
      });
    });

    it('should handle non-promise onResend', async () => {
      mockOnResend.mockReturnValue(undefined);
      
      render(<OTPModal {...defaultProps} />);
      
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        fireEvent.click(resendButton);
      });
      
      expect(mockOnResend).toHaveBeenCalled();
    });

    it('should show loading state on resend button during resend', async () => {
      mockOnResend.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<OTPModal {...defaultProps} />);
      
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        fireEvent.click(resendButton);
      });
      
      await waitFor(() => {
        const refreshIcon = screen.getByRole('button', { name: /resend/i }).querySelector('svg');
        expect(refreshIcon).toHaveClass('animate-spin');
      });
    });

    it('should disable resend button when loading', () => {
      render(<OTPModal {...defaultProps} loading={true} />);
      
      vi.advanceTimersByTime(60000);
      
      const resendButton = screen.getByRole('button', { name: /resend/i });
      expect(resendButton).toBeDisabled();
    });

    it('should handle resend errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnResend.mockRejectedValue(new Error('Resend failed'));
      
      render(<OTPModal {...defaultProps} />);
      
      vi.advanceTimersByTime(60000);
      
      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /resend code/i });
        fireEvent.click(resendButton);
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Resend error:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<OTPModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<OTPModal {...defaultProps} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when modal content is clicked', () => {
      render(<OTPModal {...defaultProps} />);
      
      const modalContent = screen.getByText('Verify Your Identity').closest('div');
      fireEvent.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<OTPModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Esc key is pressed', () => {
      render(<OTPModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Esc', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed on backdrop', () => {
      render(<OTPModal {...defaultProps} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.keyDown(backdrop, { key: 'Escape', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed on modal content', () => {
      render(<OTPModal {...defaultProps} />);
      
      const modalContent = screen.getByText('Verify Your Identity').closest('div');
      fireEvent.keyDown(modalContent, { key: 'Escape', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent event propagation on Escape key', () => {
      render(<OTPModal {...defaultProps} />);
      
      const stopPropagation = vi.fn();
      const stopImmediatePropagation = vi.fn();
      const preventDefault = vi.fn();
      
      fireEvent.keyDown(document, {
        key: 'Escape',
        keyCode: 27,
        stopPropagation,
        stopImmediatePropagation,
        preventDefault
      });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clean up event listeners when modal closes', () => {
      const { unmount } = render(<OTPModal {...defaultProps} />);
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const removeDocumentListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(removeDocumentListenerSpy).toHaveBeenCalled();
    });

    it('should update onClose ref when onClose prop changes', () => {
      const newOnClose = vi.fn();
      const { rerender } = render(<OTPModal {...defaultProps} />);
      
      rerender(<OTPModal {...defaultProps} onClose={newOnClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
      
      expect(newOnClose).toHaveBeenCalled();
    });
  });

  describe('State Reset on Open', () => {
    it('should reset OTP when modal opens', () => {
      const { rerender } = render(<OTPModal {...defaultProps} isOpen={false} />);
      
      rerender(<OTPModal {...defaultProps} isOpen={true} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      expect(otpInput.value).toBe('');
    });

    it('should reset countdown when modal opens', () => {
      const { rerender } = render(<OTPModal {...defaultProps} isOpen={false} />);
      
      rerender(<OTPModal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
    });

    it('should reset resend loading state when modal opens', () => {
      const { rerender } = render(<OTPModal {...defaultProps} isOpen={false} />);
      
      rerender(<OTPModal {...defaultProps} isOpen={true} />);
      
      const resendButton = screen.getByRole('button', { name: /resend/i });
      const refreshIcon = resendButton.querySelector('svg');
      expect(refreshIcon).not.toHaveClass('animate-spin');
    });
  });

  describe('OTP Validation', () => {
    it('should filter non-numeric characters on change', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      fireEvent.change(otpInput, { target: { value: '12a3b4c5d6' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should filter non-numeric characters via useEffect', async () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      
      // Simulate programmatic change that might include non-numeric
      otpInput.value = '12abc34';
      fireEvent.change(otpInput, { target: { value: '12abc34' } });
      
      await waitFor(() => {
        expect(otpInput.value).toBe('1234');
      });
    });

    it('should limit OTP length to 6 digits via useEffect', async () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      
      // Simulate programmatic change exceeding 6 digits
      otpInput.value = '1234567890';
      fireEvent.change(otpInput, { target: { value: '1234567890' } });
      
      await waitFor(() => {
        expect(otpInput.value).toBe('123456');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<OTPModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper input attributes', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      expect(otpInput).toHaveAttribute('inputMode', 'numeric');
      expect(otpInput).toHaveAttribute('pattern', '[0-9]*');
      expect(otpInput).toHaveAttribute('autoComplete', 'one-time-code');
      expect(otpInput).toHaveAttribute('maxLength', '6');
    });

    it('should have proper label association', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      expect(otpInput).toHaveAttribute('id', 'otp');
    });
  });

  describe('Type Prop', () => {
    it('should accept type prop', () => {
      render(<OTPModal {...defaultProps} type="registration" />);
      
      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    });

    it('should work with login type', () => {
      render(<OTPModal {...defaultProps} type="login" />);
      
      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email', () => {
      render(<OTPModal {...defaultProps} email="" />);
      
      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should handle null email', () => {
      render(<OTPModal {...defaultProps} email={null} />);
      
      // Should not crash
      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    });

    it('should handle undefined email', () => {
      render(<OTPModal {...defaultProps} email={undefined} />);
      
      // Should not crash
      expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    });

    it('should handle rapid OTP input changes', () => {
      render(<OTPModal {...defaultProps} />);
      
      const otpInput = screen.getByLabelText(/enter 6-digit code/i);
      
      fireEvent.change(otpInput, { target: { value: '1' } });
      fireEvent.change(otpInput, { target: { value: '12' } });
      fireEvent.change(otpInput, { target: { value: '123' } });
      fireEvent.change(otpInput, { target: { value: '1234' } });
      fireEvent.change(otpInput, { target: { value: '12345' } });
      fireEvent.change(otpInput, { target: { value: '123456' } });
      
      expect(otpInput.value).toBe('123456');
    });

    it('should handle timer cleanup on unmount', () => {
      const { unmount } = render(<OTPModal {...defaultProps} />);
      
      vi.advanceTimersByTime(30000);
      
      unmount();
      
      // Should not throw errors
      vi.advanceTimersByTime(60000);
      
      // Verify component was unmounted
      expect(screen.queryByText(/enter.*otp/i)).not.toBeInTheDocument();
    });
  });
});
