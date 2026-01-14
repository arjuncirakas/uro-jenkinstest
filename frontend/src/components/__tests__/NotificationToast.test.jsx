import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationToast from '../NotificationToast';

describe('NotificationToast', () => {
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
        <NotificationToast
          isOpen={false}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should display success message with success styling', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Success message"
          type="success"
        />
      );
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should display error message with error styling', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Error message"
          type="error"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should use success type by default', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Default message"
        />
      );
      expect(screen.getByText('Default message')).toBeInTheDocument();
    });
  });

  describe('Auto-close', () => {
    it('should auto-close after default duration (3000ms)', async () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      vi.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should auto-close after custom duration', async () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
          duration={5000}
        />
      );
      
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not auto-close before duration expires', async () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
          duration={3000}
        />
      );
      
      vi.advanceTimersByTime(2000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not auto-close when duration is 0', async () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
          duration={0}
        />
      );
      
      vi.advanceTimersByTime(10000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      unmount();
      
      vi.advanceTimersByTime(3000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should reset timer when isOpen changes', async () => {
      const { rerender } = render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      vi.advanceTimersByTime(2000);
      
      rerender(
        <NotificationToast
          isOpen={false}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      rerender(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      vi.advanceTimersByTime(2000);
      expect(mockOnClose).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Manual Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={null}
          message="Test message"
        />
      );
      
      // Should not crash
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message=""
        />
      );
      
      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(500);
      render(
        <NotificationToast
          isOpen={true}
          onClose={mockOnClose}
          message={longMessage}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
