import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DPOContactModal from '../DPOContactModal';
import { securityDashboardService } from '../../../services/securityDashboardService';
import React from 'react';

// Mock services
vi.mock('../../../services/securityDashboardService', () => ({
  securityDashboardService: {
    getDPOContactInfo: vi.fn(),
    setDPOContactInfo: vi.fn()
  }
}));

describe('DPOContactModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<DPOContactModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText('Data Protection Officer Contact Information')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Data Protection Officer Contact Information')).toBeInTheDocument();
    });

    it('should display form fields', async () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contact number/i)).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching DPO info', () => {
      securityDashboardService.getDPOContactInfo.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);
      // Loading spinner should be visible
      expect(screen.getByRole('status') || document.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch existing DPO info when modal opens', async () => {
      const dpoData = {
        id: 1,
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: dpoData
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(securityDashboardService.getDPOContactInfo).toHaveBeenCalled();
        expect(screen.getByDisplayValue('John DPO')).toBeInTheDocument();
        expect(screen.getByDisplayValue('dpo@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      });
    });

    it('should reset form when no DPO info exists', async () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      securityDashboardService.getDPOContactInfo.mockRejectedValue(
        new Error('Network error')
      );

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch DPO contact information')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });
    });

    it('should show error when name is empty', async () => {
      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('should show error when email is empty', async () => {
      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should show error when contact number is empty', async () => {
      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Contact number is required')).toBeInTheDocument();
      });
    });

    it('should show error when email format is invalid', async () => {
      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should show error when contact number format is invalid', async () => {
      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '123' } }); // Too short
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid contact number format')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });
    });

    it('should submit form with valid data', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: true,
        message: 'DPO contact information added successfully'
      });

      const onClose = vi.fn();
      render(<DPOContactModal isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.setDPOContactInfo).toHaveBeenCalledWith(
          'John DPO',
          'dpo@example.com',
          '+1234567890'
        );
      });
    });

    it('should display success message on successful submission', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: true,
        message: 'DPO contact information added successfully'
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/DPO contact information added successfully/i)).toBeInTheDocument();
      });
    });

    it('should close modal after successful submission', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: true,
        message: 'DPO contact information added successfully'
      });

      const onClose = vi.fn();
      vi.useFakeTimers();

      render(<DPOContactModal isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should display error message on failed submission', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: false,
        error: 'Failed to save DPO contact information'
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save DPO contact information')).toBeInTheDocument();
      });
    });

    it('should handle submission errors', async () => {
      securityDashboardService.setDPOContactInfo.mockRejectedValue(
        new Error('Network error')
      );

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save DPO contact information')).toBeInTheDocument();
      });
    });

    it('should trim whitespace from inputs', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: true,
        message: 'DPO contact information added successfully'
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: '  John DPO  ' } });
        fireEvent.change(emailInput, { target: { value: '  dpo@example.com  ' } });
        fireEvent.change(contactInput, { target: { value: '  +1234567890  ' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.setDPOContactInfo).toHaveBeenCalledWith(
          'John DPO',
          'dpo@example.com',
          '+1234567890'
        );
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });
    });

    it('should close modal when cancel button is clicked', async () => {
      const onClose = vi.fn();
      render(<DPOContactModal isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('should close modal when X button is clicked', async () => {
      const onClose = vi.fn();
      render(<DPOContactModal isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const closeButton = screen.getByLabelText(/close modal/i);
        fireEvent.click(closeButton);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('should clear error message when input changes', async () => {
      securityDashboardService.setDPOContactInfo.mockResolvedValue({
        success: false,
        error: 'Test error'
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'Jane DPO' } });

      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      securityDashboardService.setDPOContactInfo.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const contactInput = screen.getByLabelText(/contact number/i);
        fireEvent.change(nameInput, { target: { value: 'John DPO' } });
        fireEvent.change(emailInput, { target: { value: 'dpo@example.com' } });
        fireEvent.change(contactInput, { target: { value: '+1234567890' } });
        const submitButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /saving/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null DPO data', async () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: null
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });
    });

    it('should handle empty string values in DPO data', async () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: true,
        data: {
          name: '',
          email: '',
          contact_number: ''
        }
      });

      render(<DPOContactModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue('');
        expect(inputs.length).toBeGreaterThan(0);
      });
    });
  });
});
