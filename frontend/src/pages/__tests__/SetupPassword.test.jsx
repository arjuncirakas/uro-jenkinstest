import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SetupPassword from '../SetupPassword';
import authService from '../../services/authService';

// Mock dependencies
vi.mock('../../services/authService', () => ({
  default: {
    setupPassword: vi.fn()
  }
}));

// Mock useNavigate and useSearchParams
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams]
  };
});

describe('SetupPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams.delete('token');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Token Handling', () => {
    it('should extract token from URL and store in sessionStorage', () => {
      mockSearchParams.set('token', 'test-token-123');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(sessionStorage.getItem('setupToken')).toBe('test-token-123');
    });

    it('should use token from sessionStorage if URL has no token', () => {
      sessionStorage.setItem('setupToken', 'stored-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(sessionStorage.getItem('setupToken')).toBe('stored-token');
    });

    it('should show error modal when no token is available', () => {
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(screen.getByText(/invalid or missing setup token/i)).toBeInTheDocument();
    });

    it('should clear token from URL after storing', () => {
      mockSearchParams.set('token', 'test-token-123');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(mockNavigate).toHaveBeenCalledWith('/setup-password', { replace: true });
    });
  });

  describe('Form Rendering', () => {
    it('should render password input fields', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      expect(screen.getByRole('button', { name: /set password/i })).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
      
      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    });

    it('should toggle confirm password visibility', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const toggleButton = screen.getAllByRole('button', { name: /toggle password visibility/i })[1];
      
      expect(confirmInput.type).toBe('password');
      fireEvent.click(toggleButton);
      expect(confirmInput.type).toBe('text');
    });
  });

  describe('Password Validation', () => {
    it('should validate password is required', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('should validate password minimum length', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'Short1!' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/at least 14 characters/i)).toBeInTheDocument();
    });

    it('should validate password has lowercase letter', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'UPPERCASE123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument();
    });

    it('should validate password has uppercase letter', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'lowercase123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument();
    });

    it('should validate password has number', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'NoNumbers!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/number/i)).toBeInTheDocument();
    });

    it('should validate password has special character', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'NoSpecial123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/special character/i)).toBeInTheDocument();
    });

    it('should validate password has no spaces', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'Has Spaces123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/cannot contain spaces/i)).toBeInTheDocument();
    });

    it('should validate passwords match', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  describe('Password Strength', () => {
    it('should calculate password strength correctly', () => {
      sessionStorage.setItem('setupToken', 'test-token');
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      
      // Should show strength indicator
      expect(screen.getByText(/strength/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid password', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockResolvedValue({
        success: true,
        message: 'Password set successfully'
      });
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(authService.setupPassword).toHaveBeenCalledWith(
          'test-token',
          'ValidPassword123!@#'
        );
      });
    });

    it('should show success modal on successful submission', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockResolvedValue({
        success: true,
        message: 'Password set successfully'
      });
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/password set successfully/i)).toBeInTheDocument();
      });
    });

    it('should navigate to login on success', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockResolvedValue({
        success: true,
        message: 'Password set successfully'
      });
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle API errors', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockResolvedValue({
        success: false,
        error: 'Token expired'
      });
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockRejectedValue(new Error('Network error'));
      
      render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Cleanup', () => {
    it('should remove token from sessionStorage on success', async () => {
      sessionStorage.setItem('setupToken', 'test-token');
      authService.setupPassword.mockResolvedValue({
        success: true,
        message: 'Password set successfully'
      });
      
      const { unmount } = render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(authService.setupPassword).toHaveBeenCalled();
      });
      
      // Simulate success modal shown
      const { rerender } = render(
        <BrowserRouter>
          <SetupPassword />
        </BrowserRouter>
      );
      
      unmount();
      
      // Token should be cleaned up
      expect(sessionStorage.getItem('setupToken')).toBeNull();
    });
  });
});
