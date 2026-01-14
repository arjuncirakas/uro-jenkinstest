import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessModal from '../SuccessModal';

// Mock useEscapeKey
vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn(() => [false, vi.fn()])
}));

describe('SuccessModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should display default title when not provided', () => {
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
          message="Custom message"
        />
      );
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('should display default message when not provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
    });
  });

  describe('Appointment Details', () => {
    it('should display appointment details when provided', () => {
      const appointmentDetails = {
        date: '2024-01-15',
        time: '10:00 AM',
        urologist: 'Dr. Smith',
        frequency: 'Monthly',
        total: 12
      };
      
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          appointmentDetails={appointmentDetails}
        />
      );
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText(/12 appointments/i)).toBeInTheDocument();
    });

    it('should not display appointment details section when not provided', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText(/follow-up appointments scheduled/i)).not.toBeInTheDocument();
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByLabelText(/close modal/i);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Continue button is clicked', () => {
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

    it('should handle empty message', () => {
      render(
        <SuccessModal
          isOpen={true}
          onClose={mockOnClose}
          message=""
        />
      );
      // Should display default message
      expect(screen.getByText(/operation completed successfully/i)).toBeInTheDocument();
    });
  });
});
