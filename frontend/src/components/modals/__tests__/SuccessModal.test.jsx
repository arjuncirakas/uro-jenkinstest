import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuccessModal from '../SuccessModal';

describe('SuccessModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SuccessModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          title="Custom Success"
        />
      );
      expect(screen.getByText('Custom Success')).toBeInTheDocument();
    });

    it('should display default title when title is not provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          message="Custom success message"
        />
      );
      expect(screen.getByText('Custom success message')).toBeInTheDocument();
    });

    it('should display default message when message is not provided and no details', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
    });

    it('should display subtitle when message is not provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
    });
  });

  describe('Details Display', () => {
    it('should display patient details when provided', () => {
      const details = {
        name: 'John Doe',
        upi: 'UPI123',
        phone: '1234567890',
        email: 'john@example.com'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('Patient Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('UPI123')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display only name when only name is provided', () => {
      const details = {
        name: 'John Doe'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText(/upi/i)).not.toBeInTheDocument();
    });

    it('should display only UPI when only UPI is provided', () => {
      const details = {
        upi: 'UPI123'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('UPI123')).toBeInTheDocument();
      expect(screen.queryByText(/name/i)).not.toBeInTheDocument();
    });

    it('should display only phone when only phone is provided', () => {
      const details = {
        phone: '1234567890'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });

    it('should display only email when only email is provided', () => {
      const details = {
        email: 'john@example.com'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should not display Patient Details section when details is null', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={null}
        />
      );
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });

    it('should not display Patient Details section when details is undefined', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });

    it('should not display Patient Details section when details is empty object', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={{}}
        />
      );
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onConfirm when Continue is clicked and onConfirm is provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should call onClose when Continue is clicked and onConfirm is not provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Auto-close', () => {
    it('should auto-close after 5 seconds', async () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not auto-close before 5 seconds', async () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(4000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      unmount();
      
      vi.advanceTimersByTime(5000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should reset timer when isOpen changes', async () => {
      const { rerender } = render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(3000);
      
      rerender(
        <SuccessModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      
      rerender(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(3000);
      expect(mockOnClose).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={null}
        />
      );
      // Should not crash
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should handle details with all fields', () => {
      const details = {
        name: 'John Doe',
        upi: 'UPI123',
        phone: '1234567890',
        email: 'john@example.com'
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('UPI123')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle empty string details', () => {
      const details = {
        name: '',
        upi: '',
        phone: '',
        email: ''
      };
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          details={details}
        />
      );
      // Should not display empty fields
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });
  });
});
