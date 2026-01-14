import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileDropdown from '../ProfileDropdown';
import authService from '../../services/authService';
import { securityDashboardService } from '../../services/securityDashboardService';

// Mock dependencies
vi.mock('../../services/authService', () => ({
  default: {
    getProfile: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('../../services/securityDashboardService', () => ({
  securityDashboardService: {
    getDPOContactInfo: vi.fn()
  }
}));

describe('ProfileDropdown', () => {
  const mockOnClose = vi.fn();
  const mockButtonRef = { current: document.createElement('button') };

  beforeEach(() => {
    vi.clearAllMocks();
    authService.getProfile.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'urologist'
        }
      }
    });
    securityDashboardService.getDPOContactInfo.mockResolvedValue({
      success: true,
      data: {
        name: 'DPO Name',
        email: 'dpo@example.com',
        contact_number: '1234567890'
      }
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ProfileDropdown
          isOpen={false}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should display user initials', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should display user full name', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display user email', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should display user role', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/urologist/i)).toBeInTheDocument();
      });
    });
  });

  describe('Name Handling', () => {
    it('should handle snake_case name fields', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 1,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            role: 'nurse'
          }
        }
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle missing name fields', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
            role: 'urologist'
          }
        }
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should calculate initials correctly', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 1,
            firstName: 'Alice',
            lastName: 'Brown',
            email: 'alice@example.com',
            role: 'gp'
          }
        }
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('AB')).toBeInTheDocument();
      });
    });
  });

  describe('Role Display', () => {
    it('should display formatted role name', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'department_admin'
          }
        }
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/department admin/i)).toBeInTheDocument();
      });
    });

    it('should handle unknown role', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'unknown_role'
          }
        }
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/unknown role/i)).toBeInTheDocument();
      });
    });
  });

  describe('DPO Contact Info', () => {
    it('should display DPO contact information', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('DPO Name')).toBeInTheDocument();
        expect(screen.getByText('dpo@example.com')).toBeInTheDocument();
      });
    });

    it('should handle missing DPO info gracefully', async () => {
      securityDashboardService.getDPOContactInfo.mockResolvedValue({
        success: false
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        // Should not crash
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should handle DPO fetch error silently', async () => {
      securityDashboardService.getDPOContactInfo.mockRejectedValue(new Error('DPO fetch failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      // Should not show error to user
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
      
      fireEvent.mouseDown(document.body);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking on dropdown content', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        const dropdownContent = screen.getByText(/john doe/i).closest('div');
        fireEvent.mouseDown(dropdownContent);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking on button', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        fireEvent.mouseDown(mockButtonRef.current);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('State Reset', () => {
    it('should reset state when dropdown closes', async () => {
      const { rerender } = render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
      
      rerender(
        <ProfileDropdown
          isOpen={false}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      // State should be reset
      rerender(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      // Should fetch profile again
      await waitFor(() => {
        expect(authService.getProfile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle profile fetch error', async () => {
      authService.getProfile.mockRejectedValue(new Error('Profile fetch failed'));
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it('should handle unsuccessful profile response', async () => {
      authService.getProfile.mockResolvedValue({
        success: false,
        error: 'Profile not found'
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it('should handle missing user data in response', async () => {
      authService.getProfile.mockResolvedValue({
        success: true,
        data: {}
      });
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null buttonRef', async () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={null}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should handle null onClose', () => {
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={null}
          buttonRef={mockButtonRef}
        />
      );
      
      // Should not crash
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should handle loading state', async () => {
      authService.getProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: { user: {} } }), 100)));
      
      render(
        <ProfileDropdown
          isOpen={true}
          onClose={mockOnClose}
          buttonRef={mockButtonRef}
        />
      );
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });
});
