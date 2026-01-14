import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import tokenService from '../../services/tokenService';

// Mock tokenService
vi.mock('../../services/tokenService', () => ({
  default: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    isAuthenticated: vi.fn(),
    getUserRole: vi.fn(),
    clearAuth: vi.fn(),
    isTokenExpired: vi.fn(),
    getUser: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while checking authentication', () => {
      tokenService.getAccessToken.mockReturnValue('token');
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');
      
      // Mock a pending fetch
      global.fetch.mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Verifying access...')).toBeInTheDocument();
    });
  });

  describe('No Tokens', () => {
    it('should redirect to login when no access token', async () => {
      tokenService.getAccessToken.mockReturnValue(null);
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      tokenService.clearAuth.mockReturnValue(true);

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should redirect to login when no refresh token', async () => {
      tokenService.getAccessToken.mockReturnValue('token');
      tokenService.getRefreshToken.mockReturnValue(null);
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should redirect to login when both tokens are missing', async () => {
      tokenService.getAccessToken.mockReturnValue(null);
      tokenService.getRefreshToken.mockReturnValue(null);
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Invalid Token Format', () => {
    it('should redirect to login when access token has invalid format', async () => {
      tokenService.getAccessToken.mockReturnValue('invalid-token');
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should redirect to login when refresh token has invalid format', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue('invalid-token');
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should handle token with wrong number of parts', async () => {
      tokenService.getAccessToken.mockReturnValue('header.payload'); // Only 2 parts
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Expired Tokens', () => {
    it('should redirect to login when both tokens are expired', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockImplementation((token) => {
        return token === validToken;
      });
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication Check', () => {
    it('should redirect to login when user is not authenticated', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(false);
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('should allow access when user has required role', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should redirect to unauthorized when user role is not in allowed roles', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('gp');

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).not.toHaveBeenCalled();
      });
    });

    it('should redirect to login when user has no role', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue(null);
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should allow access when no roles are specified', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should allow access when allowedRoles is empty array', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={[]}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Token Verification', () => {
    it('should verify token with API call and allow access on success', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      vi.stubGlobal('import.meta', { env: { VITE_API_URL: 'https://test-api.com/api' } });

      render(
        <MemoryRouter>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/profile'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${validToken}`
          })
        })
      );
    });

    it('should redirect to login when API returns 401', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');
      tokenService.clearAuth.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should redirect to login when API call fails with error', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');
      tokenService.clearAuth.mockReturnValue(true);

      global.fetch.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should redirect to login when API returns non-401 error', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('urologist');
      tokenService.clearAuth.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should use default API URL when VITE_API_URL is not set', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      vi.stubGlobal('import.meta', { env: {} });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('https://uroprep.ahimsa.global/api'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should preserve location state when redirecting to login', async () => {
      tokenService.getAccessToken.mockReturnValue(null);
      tokenService.getRefreshToken.mockReturnValue(null);
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should redirect to unauthorized when authenticated but wrong role', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);
      tokenService.getUserRole.mockReturnValue('gp');

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={['urologist']}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Should not show protected content
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with invalid JSON in payload', async () => {
      tokenService.getAccessToken.mockReturnValue('header.invalid-json.signature');
      tokenService.getRefreshToken.mockReturnValue('refresh-token');
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should handle empty string tokens', async () => {
      tokenService.getAccessToken.mockReturnValue('');
      tokenService.getRefreshToken.mockReturnValue('');
      tokenService.clearAuth.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(tokenService.clearAuth).toHaveBeenCalled();
      });
    });

    it('should re-check authentication when location changes', async () => {
      const validToken = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
      tokenService.getAccessToken.mockReturnValue(validToken);
      tokenService.getRefreshToken.mockReturnValue(validToken);
      tokenService.isTokenExpired.mockReturnValue(false);
      tokenService.isAuthenticated.mockReturnValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } })
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={['/page1']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Simulate location change
      rerender(
        <MemoryRouter initialEntries={['/page2']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should re-verify
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
