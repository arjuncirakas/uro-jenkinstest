import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Hoist mocks to avoid initialization issues
const mocks = vi.hoisted(() => ({
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
    isAuthenticated: vi.fn(),
    getUserRole: vi.fn(),
    clearAuth: vi.fn()
}));

vi.mock('../../services/tokenService', () => ({
    default: {
        getAccessToken: mocks.getAccessToken,
        getRefreshToken: mocks.getRefreshToken,
        isTokenExpired: mocks.isTokenExpired,
        isAuthenticated: mocks.isAuthenticated,
        getUserRole: mocks.getUserRole,
        clearAuth: mocks.clearAuth
    }
}));

// Mock fetch
globalThis.fetch = vi.fn();

describe('ProtectedRoute Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getAccessToken.mockReturnValue(null);
        mocks.getRefreshToken.mockReturnValue(null);
        mocks.isTokenExpired.mockReturnValue(false);
        mocks.isAuthenticated.mockReturnValue(false);
        mocks.getUserRole.mockReturnValue(null);
    });

    const renderWithRouter = (ui, initialRoute = '/protected') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
                    <Route path="/protected" element={ui} />
                </Routes>
            </MemoryRouter>
        );
    };

    describe('Loading State', () => {
        it('should show loading state while checking authentication', () => {
            const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            mocks.getAccessToken.mockReturnValue(validToken);
            mocks.getRefreshToken.mockReturnValue(validToken);
            mocks.isAuthenticated.mockReturnValue(true);

            // Mock fetch to hang
            globalThis.fetch.mockImplementation(() => new Promise(() => { }));

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            expect(screen.getByText('Verifying access...')).toBeInTheDocument();
        });
    });

    describe('No Tokens', () => {
        it('should redirect to login when no tokens exist', async () => {
            mocks.getAccessToken.mockReturnValue(null);
            mocks.getRefreshToken.mockReturnValue(null);

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
            expect(mocks.clearAuth).toHaveBeenCalled();
        });

        it('should redirect to login when access token is missing', async () => {
            mocks.getAccessToken.mockReturnValue(null);
            mocks.getRefreshToken.mockReturnValue('valid.refresh.token.here');

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Invalid Token Format', () => {
        it('should redirect to login when token format is invalid', async () => {
            mocks.getAccessToken.mockReturnValue('invalid-token');
            mocks.getRefreshToken.mockReturnValue('also-invalid');

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
            expect(mocks.clearAuth).toHaveBeenCalled();
        });

        it('should redirect when token has wrong number of parts', async () => {
            mocks.getAccessToken.mockReturnValue('only.two');
            mocks.getRefreshToken.mockReturnValue('valid.refresh.token.here');

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Token Expiration', () => {
        it('should redirect to login when both tokens are expired', async () => {
            const validTokenFormat = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

            mocks.getAccessToken.mockReturnValue(validTokenFormat);
            mocks.getRefreshToken.mockReturnValue(validTokenFormat);
            mocks.isTokenExpired.mockReturnValue(true);

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
            expect(mocks.clearAuth).toHaveBeenCalled();
        });
    });

    describe('Role-Based Access', () => {
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        beforeEach(() => {
            mocks.getAccessToken.mockReturnValue(validToken);
            mocks.getRefreshToken.mockReturnValue(validToken);
            mocks.isTokenExpired.mockReturnValue(false);
            mocks.isAuthenticated.mockReturnValue(true);
        });

        it('should redirect when user role is missing', async () => {
            mocks.getUserRole.mockReturnValue(null);

            renderWithRouter(
                <ProtectedRoute allowedRoles={['admin']}>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            // When role is missing but user is authenticated, it clears auth and redirects to login
            await waitFor(() => {
                expect(mocks.clearAuth).toHaveBeenCalled();
            });
        });

        it('should redirect to unauthorized when role not in allowed roles', async () => {
            mocks.getUserRole.mockReturnValue('user');
            globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });

            renderWithRouter(
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            });
        });

        it('should allow access when user has correct role', async () => {
            mocks.getUserRole.mockReturnValue('admin');
            globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });

            renderWithRouter(
                <ProtectedRoute allowedRoles={['admin']}>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });

        it('should allow access when no roles specified', async () => {
            mocks.getUserRole.mockReturnValue('any_role');
            globalThis.fetch.mockResolvedValue({ ok: true, status: 200 });

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(screen.getByText('Protected Content')).toBeInTheDocument();
            });
        });
    });

    describe('API Verification', () => {
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        beforeEach(() => {
            mocks.getAccessToken.mockReturnValue(validToken);
            mocks.getRefreshToken.mockReturnValue(validToken);
            mocks.isTokenExpired.mockReturnValue(false);
            mocks.isAuthenticated.mockReturnValue(true);
        });

        it('should redirect to login when API returns 401', async () => {
            // When API returns 401, component clears auth, so isAuthenticated becomes false
            // and it redirects to login
            mocks.isAuthenticated.mockReturnValue(false);
            globalThis.fetch.mockResolvedValue({ ok: false, status: 401 });

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(mocks.clearAuth).toHaveBeenCalled();
            });
        });

        it('should redirect when API throws error', async () => {
            mocks.isAuthenticated.mockReturnValue(false);
            globalThis.fetch.mockRejectedValue(new Error('Network error'));

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(mocks.clearAuth).toHaveBeenCalled();
            });
        });

        it('should handle non-401 error responses', async () => {
            // For non-401 errors, component throws an error which clears auth
            mocks.isAuthenticated.mockReturnValue(false);
            globalThis.fetch.mockResolvedValue({ ok: false, status: 500 });

            renderWithRouter(
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            );

            await waitFor(() => {
                expect(mocks.clearAuth).toHaveBeenCalled();
            });
        });
    });
});
