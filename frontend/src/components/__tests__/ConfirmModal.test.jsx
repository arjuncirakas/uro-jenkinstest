import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ConfirmModal
          isOpen={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          title="Custom Title"
        />
      );
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display default title when title is not provided', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          message="Custom message"
        />
      );
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('should display default message when message is not provided', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });

    it('should display custom confirm text', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          confirmText="Custom Confirm"
        />
      );
      expect(screen.getByText('Custom Confirm')).toBeInTheDocument();
    });

    it('should display default confirm text', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should display custom cancel text', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          cancelText="Custom Cancel"
        />
      );
      expect(screen.getByText('Custom Cancel')).toBeInTheDocument();
    });

    it('should display default cancel text', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onConfirm(true) when Save Changes is clicked', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      expect(mockOnConfirm).toHaveBeenCalledWith(true);
    });

    it('should call onConfirm(false) when Don\'t Save is clicked', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const dontSaveButton = screen.getByText("Don't Save");
      fireEvent.click(dontSaveButton);
      expect(mockOnConfirm).toHaveBeenCalledWith(false);
    });

    it('should call onCancel when Cancel is clicked', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Delete Modal Mode', () => {
    it('should not show Don\'t Save button when isDeleteModal is true', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isDeleteModal={true}
        />
      );
      expect(screen.queryByText("Don't Save")).not.toBeInTheDocument();
    });

    it('should call onConfirm() without arguments when isDeleteModal is true', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isDeleteModal={true}
          confirmText="Delete"
        />
      );
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      expect(mockOnConfirm).toHaveBeenCalledWith();
    });

    it('should show Don\'t Save button when showSaveButton is true and isDeleteModal is false', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          showSaveButton={true}
          isDeleteModal={false}
        />
      );
      expect(screen.getByText("Don't Save")).toBeInTheDocument();
    });

    it('should not show Don\'t Save button when showSaveButton is false', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          showSaveButton={false}
        />
      );
      expect(screen.queryByText("Don't Save")).not.toBeInTheDocument();
    });
  });

  describe('Custom Button Classes', () => {
    it('should apply custom confirm button class', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      );
      const confirmButton = screen.getByText('Save Changes');
      expect(confirmButton.className).toContain('bg-red-600');
    });

    it('should use default button class when not provided', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const confirmButton = screen.getByText('Save Changes');
      expect(confirmButton.className).toContain('bg-blue-600');
    });
  });
});
