import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorModal from '../ErrorModal';

describe('ErrorModal', () => {
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
        <ErrorModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          title="Custom Error"
        />
      );
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });

    it('should display default title when title is not provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Custom error message"
        />
      );
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should display default message when message is not provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  describe('Error List Display', () => {
    it('should display error list when errors array is provided', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'phone', message: 'Phone is invalid' }
      ];
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={errors}
        />
      );
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is invalid')).toBeInTheDocument();
    });

    it('should format field names with spaces', () => {
      const errors = [
        { field: 'firstName', message: 'First name is required' }
      ];
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={errors}
        />
      );
      expect(screen.getByText(/first name/i)).toBeInTheDocument();
    });

    it('should not display error list when errors array is empty', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={[]}
        />
      );
      expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
    });

    it('should not display error list when errors is null', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={null}
        />
      );
      expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
    });

    it('should not display error list when errors is undefined', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onConfirm when Try Again is clicked and onConfirm is provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should call onClose when Try Again is clicked and onConfirm is not provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Auto-close', () => {
    it('should auto-close after 8 seconds', async () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(8000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not auto-close before 8 seconds', async () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(7000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      unmount();
      
      vi.advanceTimersByTime(8000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should reset timer when isOpen changes', async () => {
      const { rerender } = render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(4000);
      
      rerender(
        <ErrorModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      
      rerender(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(4000);
      expect(mockOnClose).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(4000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={null}
        />
      );
      // Should not crash
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should handle multiple errors', () => {
      const errors = [
        { field: 'field1', message: 'Error 1' },
        { field: 'field2', message: 'Error 2' },
        { field: 'field3', message: 'Error 3' }
      ];
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={errors}
        />
      );
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
    });

    it('should handle errors with special characters in field names', () => {
      const errors = [
        { field: 'field_name', message: 'Error message' }
      ];
      render(
        <ErrorModal
          isOpen={true}
          onClose={mockOnClose}
          errors={errors}
        />
      );
      expect(screen.getByText(/field name/i)).toBeInTheDocument();
    });
  });
});
