import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SecurityTeamModal from '../SecurityTeamModal';
import { securityDashboardService } from '../../../services/securityDashboardService';
import React from 'react';

// Mock services
vi.mock('../../../services/securityDashboardService', () => ({
  securityDashboardService: {
    getSecurityTeamMembers: vi.fn(),
    addSecurityTeamMember: vi.fn(),
    removeSecurityTeamMember: vi.fn()
  }
}));

describe('SecurityTeamModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should not render when modal is closed', () => {
      render(<SecurityTeamModal isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByText('Manage Security Team')).not.toBeInTheDocument();
    });

    it('should render when modal is open', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Manage Security Team')).toBeInTheDocument();
    });

    it('should display existing team members list', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display empty state when no team members', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('No security team members added yet.')).toBeInTheDocument();
      });
    });

    it('should close modal when close button clicked', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      const onClose = vi.fn();
      render(<SecurityTeamModal isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Add Team Member Form', () => {
    it('should submit form with valid name and email', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.addSecurityTeamMember.mockResolvedValue({
        success: true,
        data: { id: 1, name: 'John Doe', email: 'john@example.com' }
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.addSecurityTeamMember).toHaveBeenCalledWith(
          'John Doe',
          'john@example.com'
        );
      });
    });

    it('should validate empty name', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      expect(securityDashboardService.addSecurityTeamMember).not.toHaveBeenCalled();
    });

    it('should validate empty email', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should validate invalid email format', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should handle duplicate email error', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.addSecurityTeamMember.mockResolvedValue({
        success: false,
        error: 'Security team member with this email already exists'
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });

    it('should handle API error', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.addSecurityTeamMember.mockResolvedValue({
        success: false,
        error: 'API error'
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('API error')).toBeInTheDocument();
      });
    });

    it('should display success message after adding member', async () => {
      securityDashboardService.getSecurityTeamMembers
        .mockResolvedValueOnce({
          success: true,
          data: []
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, name: 'John Doe', email: 'john@example.com' }]
        });
      securityDashboardService.addSecurityTeamMember.mockResolvedValue({
        success: true,
        data: { id: 1, name: 'John Doe', email: 'john@example.com' }
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByText('Add Member');

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Security team member added successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Team Members List', () => {
    it('should display all team members', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should remove team member on remove button click', async () => {
      securityDashboardService.getSecurityTeamMembers
        .mockResolvedValueOnce({
          success: true,
          data: [
            { id: 1, name: 'John Doe', email: 'john@example.com' }
          ]
        })
        .mockResolvedValueOnce({
          success: true,
          data: []
        });
      securityDashboardService.removeSecurityTeamMember.mockResolvedValue({
        success: true
      });

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const removeButton = screen.getByLabelText('Remove John Doe');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.removeSecurityTeamMember).toHaveBeenCalledWith(1);
      });
    });

    it('should not remove if confirmation cancelled', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' }
        ]
      });

      window.confirm = vi.fn(() => false);

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const removeButton = screen.getByLabelText('Remove John Doe');
        fireEvent.click(removeButton);
      });

      expect(securityDashboardService.removeSecurityTeamMember).not.toHaveBeenCalled();
    });

    it('should handle remove error', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' }
        ]
      });
      securityDashboardService.removeSecurityTeamMember.mockResolvedValue({
        success: false,
        error: 'Failed to remove'
      });

      window.confirm = vi.fn(() => true);

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        const removeButton = screen.getByLabelText('Remove John Doe');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to remove/i)).toBeInTheDocument();
      });
    });

    it('should display empty list state', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: []
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('No security team members added yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined data', async () => {
      securityDashboardService.getSecurityTeamMembers.mockResolvedValue({
        success: true,
        data: null
      });

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('No security team members added yet.')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      securityDashboardService.getSecurityTeamMembers.mockRejectedValue(
        new Error('Network error')
      );

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch security team members')).toBeInTheDocument();
      });
    });

    it('should show loading state', async () => {
      securityDashboardService.getSecurityTeamMembers.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<SecurityTeamModal isOpen={true} onClose={vi.fn()} />);

      // Loading spinner should be visible
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
