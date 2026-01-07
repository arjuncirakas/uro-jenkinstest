import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import authService from '../../../services/authService.js';

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockLocation = { state: null, pathname: '/login' };

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockLocation
    };
});

// Mock authService
vi.mock('../../../services/authService.js', () => ({
    default: {
        login: vi.fn(),
        logout: vi.fn(),
        verifyLoginOTP: vi.fn(),
        resendLoginOTP: vi.fn(),
        isAuthenticated: vi.fn(),
        getCurrentUser: vi.fn(),
        getRoleRoutes: vi.fn()
    }
}));

// Mock modals
vi.mock('../../modals/OTPModal', () => ({
    default: ({ isOpen, onClose, onVerify, onResend, email, loading, error }) =>
        isOpen ? (
            <div data-testid="otp-modal">
                <span data-testid="otp-email">{email}</span>
                <button data-testid="otp-verify" onClick={() => onVerify('123456')}>Verify</button>
                <button data-testid="otp-resend" onClick={onResend}>Resend</button>
                <button data-testid="otp-close" onClick={onClose}>Close</button>
                {loading && <span data-testid="otp-loading">Loading...</span>}
                {error && <span data-testid="otp-error">{error}</span>}
            </div>
        ) : null
}));

vi.mock('../../modals/SuccessModal', () => ({
    default: ({ isOpen, onClose, title, message }) =>
        isOpen ? (
            <div data-testid="success-modal">
                <span data-testid="success-title">{title}</span>
                <span data-testid="success-message">{message}</span>
                <button data-testid="success-close" onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock('../../modals/FailureModal', () => ({
    default: ({ isOpen, onClose, title, message }) =>
        isOpen ? (
            <div data-testid="failure-modal">
                <span data-testid="failure-title">{title}</span>
                <span data-testid="failure-message">{message}</span>
                <button data-testid="failure-close" onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock('../../modals/ForgotPasswordModal', () => ({
    default: ({ isOpen, onClose, onSuccess }) =>
        isOpen ? (
            <div data-testid="forgot-password-modal">
                <button data-testid="forgot-close" onClick={onClose}>Close</button>
                <button data-testid="forgot-success" onClick={() => onSuccess('Password reset email sent')}>Success</button>
            </div>
        ) : null
}));

const renderLogin = (initialEntries = ['/login']) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Login />
        </MemoryRouter>
    );
};

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        authService.isAuthenticated.mockReturnValue(false);
        authService.getCurrentUser.mockReturnValue(null);
        authService.logout.mockResolvedValue({ success: true });
        mockLocation.state = null;
        mockLocation.pathname = '/login';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Rendering', () => {
        it('should render login form correctly', () => {
            renderLogin();

            expect(screen.getByText('Welcome Back')).toBeInTheDocument();
            expect(screen.getByText('Sign in to your Urology Care System')).toBeInTheDocument();
            expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
            expect(screen.getByLabelText('Password')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
            expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
        });

        it('should render logo image', () => {
            renderLogin();
            const logo = screen.getByAltText('Uro - Urology Care System');
            expect(logo).toBeInTheDocument();
            expect(logo).toHaveAttribute('src', '/logo-uroprep.png');
        });
    });

    describe('Form Validation', () => {
        it('should show error for empty email', async () => {
            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            fireEvent.focus(emailInput);
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Email is required')).toBeInTheDocument();
            });
        });

        it('should show error for invalid email format', async () => {
            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        it('should show error for empty password', async () => {
            renderLogin();

            const passwordInput = screen.getByLabelText('Password');
            fireEvent.focus(passwordInput);
            fireEvent.blur(passwordInput);

            await waitFor(() => {
                expect(screen.getByText('Password is required')).toBeInTheDocument();
            });
        });

        it('should show error for password less than 6 characters', async () => {
            renderLogin();

            const passwordInput = screen.getByLabelText('Password');
            fireEvent.change(passwordInput, { target: { value: '12345' } });
            fireEvent.blur(passwordInput);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
            });
        });

        it('should clear email error when valid email is entered', async () => {
            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            fireEvent.change(emailInput, { target: { value: 'invalid' } });
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });

            fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });

            await waitFor(() => {
                expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
            });
        });

        it('should not validate field if not touched', () => {
            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            fireEvent.change(emailInput, { target: { value: 'invalid' } });

            // Error should not appear until blur
            expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
        });

        it('should show form error when submitting with validation errors', async () => {
            renderLogin();

            // Touch and blur fields to trigger validation without HTML5 intervention
            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');

            fireEvent.focus(emailInput);
            fireEvent.blur(emailInput);
            fireEvent.focus(passwordInput);
            fireEvent.blur(passwordInput);

            // Wait for validation errors to be set and displayed
            await waitFor(() => {
                expect(screen.getByText('Email is required')).toBeInTheDocument();
                expect(screen.getByText('Password is required')).toBeInTheDocument();
            });
        });
    });

    describe('Password Visibility Toggle', () => {
        it('should toggle password visibility', async () => {
            renderLogin();

            const passwordInput = screen.getByLabelText('Password');
            expect(passwordInput).toHaveAttribute('type', 'password');

            // Find the toggle button (it's a button without text, so we find by role)
            const toggleButtons = screen.getAllByRole('button');
            const toggleButton = toggleButtons.find(btn => btn.querySelector('svg'));

            fireEvent.click(toggleButton);

            expect(passwordInput).toHaveAttribute('type', 'text');

            fireEvent.click(toggleButton);

            expect(passwordInput).toHaveAttribute('type', 'password');
        });
    });

    describe('Form Submission', () => {
        it('should call authService.login on successful form submission', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, email: 'test@example.com', role: 'urologist' },
                    accessToken: 'token123',
                    refreshToken: 'refresh123'
                }
            });
            authService.isAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue({ id: 1, email: 'test@example.com' });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
            });

            // Wait for setTimeout navigation
            await act(async () => {
                vi.advanceTimersByTime(500);
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
            });
        });

        it('should show loading state during submission', async () => {
            authService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Signing in...')).toBeInTheDocument();
            });
        });

        it('should show OTP modal when OTP verification is required', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                },
                message: 'Please check your email for OTP verification.'
            });

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
                expect(screen.getByTestId('otp-email')).toHaveTextContent('test@example.com');
            });
        });

        it('should show failure modal on login failure', async () => {
            authService.login.mockResolvedValue({
                success: false,
                message: 'Invalid credentials'
            });

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
                expect(screen.getByTestId('failure-message')).toHaveTextContent('Invalid credentials');
            });
        });

        it('should show failure modal on network error', async () => {
            authService.login.mockRejectedValue(new Error('Network error'));

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
                expect(screen.getByTestId('failure-message')).toHaveTextContent('Network error');
            });
        });

        it('should handle unexpected response format', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {} // No user or token
            });

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
                expect(screen.getByTestId('failure-message')).toHaveTextContent('Unexpected response from server');
            });
        });

        it('should navigate immediately if tokens are available after login', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, email: 'test@example.com', role: 'urologist' },
                    accessToken: 'token123',
                    refreshToken: 'refresh123'
                }
            });
            // Mock immediate availability of tokens
            authService.isAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue({ id: 1, email: 'test@example.com' });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
            });

            // Should not have retried (no timeout wait in this test)
        });

        it('should retry token check if not properly set', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, email: 'test@example.com', role: 'urologist' },
                    accessToken: 'token123',
                    refreshToken: 'refresh123'
                }
            });
            // Return false initially, then true on subsequent calls
            let callCount = 0;
            authService.isAuthenticated.mockImplementation(() => {
                callCount++;
                return callCount > 1;
            });
            let userCallCount = 0;
            authService.getCurrentUser.mockImplementation(() => {
                userCallCount++;
                return userCallCount > 1 ? { id: 1, email: 'test@example.com' } : null;
            });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(authService.login).toHaveBeenCalled();
            });

            // Advance timer for retry
            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
            });
        });

        it('should show failure if token retry also fails', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, email: 'test@example.com', role: 'urologist' },
                    accessToken: 'token123',
                    refreshToken: 'refresh123'
                }
            });
            authService.isAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            renderLogin();

            const emailInput = screen.getByLabelText('Email Address');
            const passwordInput = screen.getByLabelText('Password');
            const submitButton = screen.getByRole('button', { name: 'Sign In' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
            });
        });
        it('should handle logout failure gracefully', async () => {
            authService.logout.mockRejectedValue(new Error('Logout failed'));
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, email: 'test@example.com', role: 'urologist' },
                    accessToken: 'token123',
                    refreshToken: 'refresh123'
                }
            });
            authService.isAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue({ id: 1, email: 'test@example.com' });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(authService.logout).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(authService.login).toHaveBeenCalled();
            });
        });
    });

    describe('OTP Verification', () => {
        it('should verify OTP and navigate on success', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, role: 'urologist' }
                }
            });
            authService.isAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue({ id: 1 });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            // Verify OTP
            fireEvent.click(screen.getByTestId('otp-verify'));

            await waitFor(() => {
                expect(authService.verifyLoginOTP).toHaveBeenCalledWith('test@example.com', '123456');
            });

            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/urologist/dashboard');
            });
        });

        it('should show error on OTP verification failure', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockResolvedValue({
                success: false,
                message: 'Invalid OTP code'
            });

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            // Verify OTP fails
            fireEvent.click(screen.getByTestId('otp-verify'));

            await waitFor(() => {
                expect(screen.getByTestId('otp-error')).toHaveTextContent('Invalid OTP code');
            });
        });

        it('should handle OTP verification network error', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockRejectedValue(new Error('Network error'));

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-verify'));

            await waitFor(() => {
                expect(screen.getByTestId('otp-error')).toHaveTextContent('Network error');
            });
        });

        it('should retry token check during OTP verification', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, role: 'urologist' }
                }
            });
            // Return false initially, then true on subsequent calls
            let callCount = 0;
            authService.isAuthenticated.mockImplementation(() => {
                callCount++;
                return callCount > 1;
            });
            let userCallCount = 0;
            authService.getCurrentUser.mockImplementation(() => {
                userCallCount++;
                return userCallCount > 1 ? { id: 1 } : null;
            });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-verify'));

            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalled();
            });
        });

        it('should show failure if OTP token retry fails', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, role: 'urologist' }
                }
            });
            authService.isAuthenticated.mockReturnValue(false);
            authService.getCurrentUser.mockReturnValue(null);

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-verify'));

            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
            });
        });

        it('should resend OTP successfully', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.resendLoginOTP.mockResolvedValue({
                success: true,
                message: 'OTP resent'
            });

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-resend'));

            await waitFor(() => {
                expect(authService.resendLoginOTP).toHaveBeenCalledWith('test@example.com');
            });
        });

        it('should handle resend OTP failure', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.resendLoginOTP.mockResolvedValue({
                success: false,
                message: 'Too many attempts'
            });

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-resend'));

            await waitFor(() => {
                expect(screen.getByTestId('otp-error')).toHaveTextContent('Too many attempts');
            });
        });

        it('should handle resend OTP network error', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.resendLoginOTP.mockRejectedValue(new Error('Network error'));

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-resend'));

            await waitFor(() => {
                expect(screen.getByTestId('otp-error')).toHaveTextContent('Network error');
            });
        });

        it('should close OTP modal and reset state', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });

            renderLogin();

            // Submit login form
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-close'));

            await waitFor(() => {
                expect(screen.queryByTestId('otp-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Forgot Password Modal', () => {
        it('should open forgot password modal', async () => {
            renderLogin();

            const forgotPasswordButton = screen.getByText('Forgot Password?');
            fireEvent.click(forgotPasswordButton);

            await waitFor(() => {
                expect(screen.getByTestId('forgot-password-modal')).toBeInTheDocument();
            });
        });

        it('should close forgot password modal', async () => {
            renderLogin();

            fireEvent.click(screen.getByText('Forgot Password?'));

            await waitFor(() => {
                expect(screen.getByTestId('forgot-password-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('forgot-close'));

            await waitFor(() => {
                expect(screen.queryByTestId('forgot-password-modal')).not.toBeInTheDocument();
            });
        });

        it('should show success message and close modal on password reset success', async () => {
            renderLogin();

            fireEvent.click(screen.getByText('Forgot Password?'));

            await waitFor(() => {
                expect(screen.getByTestId('forgot-password-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('forgot-success'));

            await waitFor(() => {
                expect(screen.queryByTestId('forgot-password-modal')).not.toBeInTheDocument();
                expect(screen.getByText('Password reset email sent')).toBeInTheDocument();
            });
        });
    });

    describe('Failure Modal', () => {
        it('should close failure modal and focus on email input', async () => {
            authService.login.mockResolvedValue({
                success: false,
                message: 'Invalid credentials'
            });

            renderLogin();

            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('failure-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('failure-close'));

            await waitFor(() => {
                expect(screen.queryByTestId('failure-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Success Modal', () => {
        it('should close success modal', async () => {
            authService.login.mockResolvedValue({
                success: true,
                data: {
                    requiresOTPVerification: true,
                    userId: 1,
                    email: 'test@example.com'
                }
            });
            authService.verifyLoginOTP.mockResolvedValue({
                success: true,
                data: {
                    user: { id: 1, role: 'urologist' }
                }
            });
            authService.isAuthenticated.mockReturnValue(true);
            authService.getCurrentUser.mockReturnValue({ id: 1 });
            authService.getRoleRoutes.mockReturnValue('/urologist/dashboard');

            renderLogin();

            // Submit login and OTP
            fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByTestId('otp-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('otp-verify'));

            await waitFor(() => {
                expect(screen.getByTestId('success-modal')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('success-close'));

            await waitFor(() => {
                expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Location State Handling', () => {
        it('should display success message from location state', async () => {
            mockLocation.state = { message: 'Registration successful!' };

            renderLogin();

            await waitFor(() => {
                expect(screen.getByText('Registration successful!')).toBeInTheDocument();
            });

            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
        });
    });

    describe('Existing Token Handling', () => {
        it('should log warning when user has existing tokens on login page', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            authService.isAuthenticated.mockReturnValue(true);

            renderLogin();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('User has existing tokens but is on login page')
            );

            consoleSpy.mockRestore();
        });
    });
});
