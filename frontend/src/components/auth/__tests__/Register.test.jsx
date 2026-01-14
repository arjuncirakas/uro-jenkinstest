import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../Register';
import authService from '../../../services/authService';

// Mock dependencies
vi.mock('../../../services/authService', () => ({
  default: {
    register: vi.fn(),
    verifyOTP: vi.fn(),
    resendOTP: vi.fn()
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
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="failure-modal">{message}</div> : null
  )
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

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render registration form', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update firstName when input changes', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const firstNameInput = screen.getByLabelText(/first name/i);
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      expect(firstNameInput.value).toBe('John');
    });

    it('should update role selection', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const roleSelect = screen.getByLabelText(/role/i);
      fireEvent.change(roleSelect, { target: { value: 'gp' } });
      expect(roleSelect.value).toBe('gp');
    });

    it('should toggle password visibility', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const passwordInput = screen.getByLabelText(/^password/i);
      const toggleButton = screen.getAllByRole('button', { name: /toggle password/i })[0];
      
      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    });
  });

  describe('Validation', () => {
    it('should validate firstName is required', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    it('should validate firstName minimum length', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const firstNameInput = screen.getByLabelText(/first name/i);
      fireEvent.change(firstNameInput, { target: { value: 'J' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });

    it('should validate email format', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });

    it('should validate password requirements', () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument();
    });

    it('should validate passwords match', () => {
      render(
        <BrowserRouter>
          <Register />
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

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      authService.register.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com'
        }
      });
      
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/organization/i), { target: { value: 'Test Org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled();
      });
    });

    it('should show OTP modal after successful registration', async () => {
      authService.register.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com'
        }
      });
      
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/organization/i), { target: { value: 'Test Org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
    });

    it('should handle registration failure', async () => {
      authService.register.mockResolvedValue({
        success: false,
        message: 'Email already exists'
      });
      
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/organization/i), { target: { value: 'Test Org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('OTP Verification', () => {
    it('should verify OTP and navigate on success', async () => {
      authService.register.mockResolvedValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com'
        }
      });
      authService.verifyOTP.mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, role: 'urologist' }
        }
      });
      
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/organization/i), { target: { value: 'Test Org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPassword123!@#' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!@#' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByText('Verify');
      fireEvent.click(verifyButton);
      
      vi.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(authService.verifyOTP).toHaveBeenCalledWith('test@example.com', '123456', 'registration');
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });
});
