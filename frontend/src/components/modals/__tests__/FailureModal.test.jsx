import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FailureModal from '../FailureModal';

describe('FailureModal', () => {
  const mockOnClose = vi.fn();

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
        <FailureModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText('Operation Failed')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });

    it('should display default title', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
          title="Custom Error"
        />
      );
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });

    it('should display default message', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
          message="Custom error message"
        />
      );
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Auto-close', () => {
    it('should auto-close after 8 seconds', async () => {
      render(
        <FailureModal
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
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(7000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <FailureModal
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
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      vi.advanceTimersByTime(4000);
      
      rerender(
        <FailureModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      
      rerender(
        <FailureModal
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

  describe('Manual Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button is clicked', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={null}
        />
      );
      
      // Should not crash
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(
        <FailureModal
          isOpen={true}
          onClose={mockOnClose}
          message=""
        />
      );
      
      // Should render without crashing
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });
  });
});
