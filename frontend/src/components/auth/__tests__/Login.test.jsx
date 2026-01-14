import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import authService from '../../../services/authService';

// Mock dependencies
vi.mock('../../../services/authService', () => ({
  default: {
    login: vi.fn(),
    verifyLoginOTP: vi.fn(),
    resendLoginOTP: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    getRoleRoutes: vi.fn()
  }
}));

vi.mock('../../../components/modals/OTPModal', () => ({
  default: ({ isOpen, onVerify, onResend, email, loading, error }) => (
    isOpen ? (
      <div data-testid="otp-modal">
        <div>OTP Modal for {email}</div>
        <button onClick={() => onVerify('123456')}>Verify</button>
        <button onClick={onResend}>Resend</button>
        {loading && <div>Loading...</div>}
        {error && <div>{error}</div>}
      </div>
    ) : null
  )
}));

vi.mock('../../../components/modals/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/FailureModal', () => ({
  default: ({ isOpen, message, onClose }) => (
    isOpen ? (
      <div data-testid="failure-modal">
        <div>{message}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../components/modals/ForgotPasswordModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="forgot-password-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/login', state: null };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation
  };
});

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.isAuthenticated.mockReturnValue(false);
    authService.getCurrentUser.mockReturnValue(null);
    authService.getRoleRoutes.mockReturnValue('/dashboard');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should display success message from location state', () => {
      mockLocation.state = { message: 'Registration successful' };
      
      render(
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { message: 'Registration successful' } }]}>
          <Login />
        </MemoryRouter>
      );
      
      expect(screen.getByText('Registration successful')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update email when input changes', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update password when input changes', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      expect(passwordInput.value).toBe('password123');
    });

    it('should toggle password visibility', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /toggle password/i });
      
      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    });
  });

  describe('Validation', () => {
    it('should validate email is required', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it('should validate email format', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });

    it('should validate password is required', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('should validate password minimum length', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.blur(passwordInput);
      
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });

    it('should clear errors when user starts typing', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      const emailInput = screen.getByLabelText(/email address/i);
      
      // Trigger error
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      // Then type
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      // Error should be cleared
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid credentials', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token',
          requiresOTPVerification: false
        }
      });
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'urologist' });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show OTP modal when OTP verification is required', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          requiresOTPVerification: true
        }
      });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard on successful direct login', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token',
          requiresOTPVerification: false
        }
      });
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'urologist' });
      authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
      });
    });

    it('should set cookie banner flag on successful login', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token',
          requiresOTPVerification: false
        }
      });
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'urologist' });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(sessionStorage.getItem('showCookieBanner')).toBe('true');
      });
    });

    it('should handle login failure', async () => {
      authService.login.mockResolvedValue({
        success: false,
        message: 'Invalid credentials'
      });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      authService.login.mockRejectedValue(new Error('Network error'));
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
      });
    });

    it('should clear tokens before login attempt', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token',
          requiresOTPVerification: false
        }
      });
      authService.logout.mockResolvedValue({ success: true });
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'urologist' });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
      });
    });
  });

  describe('OTP Verification', () => {
    it('should verify OTP and navigate on success', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          requiresOTPVerification: true
        }
      });
      authService.verifyLoginOTP.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token'
        }
      });
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'urologist' });
      authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByText('Verify');
      fireEvent.click(verifyButton);
      
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(authService.verifyLoginOTP).toHaveBeenCalledWith('test@example.com', '123456');
        expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
      });
    });

    it('should handle OTP verification failure', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          requiresOTPVerification: true
        }
      });
      authService.verifyLoginOTP.mockResolvedValue({
        success: false,
        message: 'Invalid OTP'
      });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByText('Verify');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
      });
    });

    it('should resend OTP', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          requiresOTPVerification: true
        }
      });
      authService.resendLoginOTP.mockResolvedValue({
        success: true,
        message: 'OTP resent'
      });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
      
      const resendButton = screen.getByText('Resend');
      fireEvent.click(resendButton);
      
      await waitFor(() => {
        expect(authService.resendLoginOTP).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('Forgot Password', () => {
    it('should open forgot password modal', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);
      
      expect(screen.getByTestId('forgot-password-modal')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unexpected response format', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {}
      });
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
      });
    });

    it('should handle token not set after login', async () => {
      authService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' },
          accessToken: 'token',
          requiresOTPVerification: false
        }
      });
      authService.isAuthenticated.mockReturnValue(false);
      authService.getCurrentUser.mockReturnValue(null);
      
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );
      
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
      });
    });
  });
});
