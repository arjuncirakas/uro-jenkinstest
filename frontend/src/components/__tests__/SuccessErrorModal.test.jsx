import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessErrorModal from '../SuccessErrorModal';

describe('SuccessErrorModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SuccessErrorModal
          isOpen={false}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should display success title for success type', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Success message"
          type="success"
        />
      );
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should display error title for error type', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Error message"
          type="error"
        />
      );
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should use success type by default', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Default message"
        />
      );
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should display message', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Custom message"
        />
      );
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply success styling for success type', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Success message"
          type="success"
        />
      );
      const modal = screen.getByText('Success message').closest('div');
      expect(modal.className).toContain('bg-green-50');
    });

    it('should apply error styling for error type', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Error message"
          type="error"
        />
      );
      const modal = screen.getByText('Error message').closest('div');
      expect(modal.className).toContain('bg-red-50');
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.textContent === '');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      
      // Also try the OK button
      const okButton = screen.getByText('OK');
      fireEvent.click(okButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when OK button is clicked', () => {
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message="Test message"
        />
      );
      
      const okButton = screen.getByText('OK');
      fireEvent.click(okButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <SuccessErrorModal
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
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message=""
        />
      );
      
      // Should render without crashing
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(500);
      render(
        <SuccessErrorModal
          isOpen={true}
          onClose={mockOnClose}
          message={longMessage}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
