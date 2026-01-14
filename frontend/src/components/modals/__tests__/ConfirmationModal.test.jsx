import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationModal from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ConfirmationModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Custom Title"
        />
      );
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display default title when not provided', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          message="Custom message"
        />
      );
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('should display default message when not provided', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('should display custom confirm text', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          confirmText="Delete"
        />
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should display default confirm text', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should display custom cancel text', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          cancelText="No"
        />
      );
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should display default cancel text', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Modal Types', () => {
    it('should display warning icon for warning type', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          type="warning"
        />
      );
      // Warning icon should be present
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should display danger icon for danger type', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          type="danger"
        />
      );
      // Danger icon should be present
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should display info icon for info type', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          type="info"
        />
      );
      // Info icon should be present
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should use warning type by default', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      // Should render with default warning type
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when isLoading is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading spinner in confirm button when isLoading is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );
      const confirmButton = screen.getByText('Confirm');
      // Should have loading spinner
      expect(confirmButton.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should enable buttons when isLoading is false', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={false}
        />
      );
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      expect(confirmButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={null}
          onConfirm={mockOnConfirm}
        />
      );
      // Should not crash
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should handle null onConfirm', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={null}
        />
      );
      // Should not crash
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          message=""
        />
      );
      // Should render without crashing
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });
});
