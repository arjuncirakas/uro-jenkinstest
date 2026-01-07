import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetupPassword from '../SetupPassword';
import authService from '../../services/authService';

// Hoist mocks
const mocks = vi.hoisted(() => {
    return {
        navigate: vi.fn(),
        searchParamsGet: vi.fn(),
        setSearchParams: vi.fn(),
        setupPassword: vi.fn(),
    };
});

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [{ get: mocks.searchParamsGet }, mocks.setSearchParams],
}));

vi.mock('../../services/authService', () => ({
    default: {
        setupPassword: mocks.setupPassword,
    },
}));

vi.mock('lucide-react', () => ({
    Eye: () => <span data-testid="eye-icon" />,
    EyeOff: () => <span data-testid="eye-off-icon" />,
    Lock: () => <span data-testid="lock-icon" />,
    CheckCircle: () => <span data-testid="check-icon" />,
    XCircle: () => <span data-testid="x-icon" />,
    AlertCircle: () => <span data-testid="alert-icon" />,
}));

describe('SetupPassword Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.searchParamsGet.mockReturnValue(null); // Default no token in URL
        sessionStorage.clear();
    });

    describe('Token Handling', () => {
        it.skip('should extract token from URL, store in sessionStorage, and clear URL', async () => {
            mocks.searchParamsGet.mockImplementation((key) => key === 'token' ? 'url-token-123' : null);
            const setItemSpy = vi.spyOn(sessionStorage, 'setItem');

            render(<SetupPassword />);

            await waitFor(() => {
                expect(setItemSpy).toHaveBeenCalledWith('setupToken', 'url-token-123');
                expect(mocks.navigate).toHaveBeenCalledWith('/setup-password', expect.objectContaining({ replace: true }));
            });
        });

        it('should use token from sessionStorage if URL has no token', () => {
            mocks.searchParamsGet.mockReturnValue(null);
            sessionStorage.setItem('setupToken', 'stored-token-456');

            render(<SetupPassword />);

            expect(screen.queryByText('Invalid or missing setup token')).not.toBeInTheDocument();
        });

        it('should show error if no token is found', () => {
            mocks.searchParamsGet.mockReturnValue(null);
            sessionStorage.clear();

            render(<SetupPassword />);

            expect(screen.getByText('Setup Failed')).toBeInTheDocument();

            const btn = screen.getByText('Go to Login');
            fireEvent.click(btn);
            expect(mocks.navigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('Form Interaction & Validation', () => {
        beforeEach(() => {
            sessionStorage.setItem('setupToken', 'valid-token');
        });

        it('should toggle password visibility', () => {
            render(<SetupPassword />);
            const inputs = screen.getAllByPlaceholderText(/password/i);
            const passwordInput = inputs[0];
            const toggleBtns = screen.getAllByRole('button').filter(btn => btn.querySelector('[data-testid^="eye"]'));

            expect(passwordInput).toHaveAttribute('type', 'password');
            fireEvent.click(toggleBtns[0]);
            expect(passwordInput).toHaveAttribute('type', 'text');
        });

        it('should show validation errors for weak password', async () => {
            render(<SetupPassword />);
            const pwdInput = screen.getByPlaceholderText('Enter your password');

            fireEvent.change(pwdInput, { target: { value: 'short' } });
            await waitFor(() => {
                expect(screen.getByText('Password must be at least 14 characters long')).toBeInTheDocument();
            });
        });

        it('should update strength meter', async () => {
            render(<SetupPassword />);
            const pwdInput = screen.getByPlaceholderText('Enter your password');

            // Force tooltips to be visible or just check existence
            // The element exists in DOM even if invisible
            expect(screen.getByText(/1\/6 complete/i)).toBeInTheDocument();

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });

            await waitFor(() => {
                expect(screen.getByText(/6\/6 complete/i)).toBeInTheDocument();
            });
        });

        it('should show extended UI state (EyeOff icons)', () => {
            render(<SetupPassword />);
            const toggleBtns = screen.getAllByRole('button').filter(btn =>
                btn.querySelector('[data-testid^="eye"]')
            );

            fireEvent.click(toggleBtns[0]);
            fireEvent.click(toggleBtns[1]);

            expect(screen.getAllByTestId('eye-off-icon')).toHaveLength(2);
        });

        it('should show validation error for mismatch passwords', () => {
            render(<SetupPassword />);
            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!@#' } });

            expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        beforeEach(() => {
            sessionStorage.setItem('setupToken', 'valid-token');
            mocks.searchParamsGet.mockReturnValue(null);
        });

        it('should submit successfully with valid data', async () => {
            mocks.setupPassword.mockResolvedValue({ success: true });
            const removeItemSpy = vi.spyOn(sessionStorage, 'removeItem');

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            const validPass = 'ValidPass123!@#';
            fireEvent.change(pwdInput, { target: { value: validPass } });
            fireEvent.change(confirmInput, { target: { value: validPass } });

            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('Password Setup Complete!')).toBeInTheDocument();
            });

            const loginBtn = screen.getByRole('button', { name: 'Go to Login' });
            fireEvent.click(loginBtn);

            expect(sessionStorage.getItem('setupToken')).toBeNull();
            expect(mocks.navigate).toHaveBeenCalledWith('/login');
        });

        it('should handle submission with specific token error (invalid)', async () => {
            mocks.setupPassword.mockResolvedValue({ success: false, message: 'Invalid token provided' });

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('Setup Failed')).toBeInTheDocument();
            });

            expect(screen.getByText('Go to Login')).toBeInTheDocument();
        });

        it('should handle submission with generic error (stay on page) and retry', async () => {
            mocks.setupPassword.mockRejectedValue(new Error('Network error'));

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });

            const tryAgainBtn = screen.getByRole('button', { name: 'Try Again' });
            expect(tryAgainBtn).toBeInTheDocument();

            fireEvent.click(tryAgainBtn);

            await waitFor(() => {
                expect(screen.queryByText('Network error')).not.toBeInTheDocument();
            });
        });

        it('should handle API validation errors', async () => {
            const errorResponse = {
                response: {
                    data: {
                        message: 'Password previously used'
                    }
                }
            };

            mocks.setupPassword.mockRejectedValue(errorResponse);

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            const validPass = 'ValidPass123!@#';
            fireEvent.change(pwdInput, { target: { value: validPass } });
            fireEvent.change(confirmInput, { target: { value: validPass } });

            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('Password previously used')).toBeInTheDocument();
            });
        });
    });

    describe('Modal Logic', () => {
        it('should navigate to login when clicking backdrop on invalid token error', async () => {
            mocks.setupPassword.mockResolvedValue({ success: false, message: 'Invalid token' });
            sessionStorage.setItem('setupToken', 'invalid');
            mocks.searchParamsGet.mockReturnValue(null);

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal-backdrop')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('error-modal-backdrop'));
            expect(mocks.navigate).toHaveBeenCalledWith('/login');
        });

        it('should NOT navigate when clicking backdrop on generic error', async () => {
            mocks.setupPassword.mockRejectedValue(new Error('Network error'));
            sessionStorage.setItem('setupToken', 'valid-token');
            mocks.searchParamsGet.mockReturnValue(null);

            render(<SetupPassword />);

            const pwdInput = screen.getByPlaceholderText('Enter your password');
            const confirmInput = screen.getByPlaceholderText('Confirm your password');
            const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });

            fireEvent.change(pwdInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPass123!@#' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByTestId('error-modal-backdrop')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('error-modal-backdrop'));
            expect(mocks.navigate).not.toHaveBeenCalled();
        });
    });
});
