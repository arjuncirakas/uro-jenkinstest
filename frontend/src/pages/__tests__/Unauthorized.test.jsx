import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Unauthorized from '../Unauthorized';
import authService from '../../services/authService';

// Mock dependencies
vi.mock('../../services/authService', () => ({
  default: {
    getUserRole: vi.fn(),
    logout: vi.fn()
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Unauthorized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render unauthorized page', () => {
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });

    it('should display error code', () => {
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      expect(screen.getByText(/403.*forbidden/i)).toBeInTheDocument();
    });

    it('should display support contact', () => {
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      expect(screen.getByText(/techsupport@ahimsa.global/i)).toBeInTheDocument();
    });
  });

  describe('Go to Dashboard', () => {
    it('should navigate to superadmin dashboard for superadmin role', () => {
      authService.getUserRole.mockReturnValue('superadmin');
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/superadmin/dashboard');
    });

    it('should navigate to urologist dashboard for urologist role', () => {
      authService.getUserRole.mockReturnValue('urologist');
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
    });

    it('should navigate to GP dashboard for GP role', () => {
      authService.getUserRole.mockReturnValue('gp');
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/gp/dashboard');
    });

    it('should navigate to nurse OPD for urology_nurse role', () => {
      authService.getUserRole.mockReturnValue('urology_nurse');
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/nurse/opd-management');
    });

    it('should navigate to login for unknown role', () => {
      authService.getUserRole.mockReturnValue('unknown');
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate to login when role is null', () => {
      authService.getUserRole.mockReturnValue(null);
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const goHomeButton = screen.getByText(/go to dashboard/i);
      fireEvent.click(goHomeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Logout', () => {
    it('should logout and navigate to login on success', async () => {
      authService.logout.mockResolvedValue({ success: true });
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const logoutButton = screen.getByText(/logout/i);
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should navigate to login even if logout fails', async () => {
      authService.logout.mockRejectedValue(new Error('Logout failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <BrowserRouter>
          <Unauthorized />
        </BrowserRouter>
      );
      
      const logoutButton = screen.getByText(/logout/i);
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });
});
