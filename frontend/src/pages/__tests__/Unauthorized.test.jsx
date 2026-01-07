import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Unauthorized from '../Unauthorized';
import authService from '../../services/authService';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../services/authService', () => ({
    default: {
        getUserRole: vi.fn(),
        logout: vi.fn(),
    },
}));

describe('Unauthorized Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render access denied message', () => {
        render(<Unauthorized />);

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
        expect(screen.getByText(/Error Code: 403/)).toBeInTheDocument();
    });

    describe('Go to Dashboard functionality', () => {
        const roles = [
            { role: 'superadmin', path: '/superadmin/dashboard' },
            { role: 'urologist', path: '/urologist/dashboard' },
            { role: 'gp', path: '/gp/dashboard' },
            { role: 'urology_nurse', path: '/nurse/opd-management' },
        ];

        roles.forEach(({ role, path }) => {
            it(`should navigate to correct dashboard for ${role}`, () => {
                authService.getUserRole.mockReturnValue(role);

                render(<Unauthorized />);

                const dashboardBtn = screen.getByText('Go to Dashboard');
                fireEvent.click(dashboardBtn);

                expect(authService.getUserRole).toHaveBeenCalled();
                expect(mockNavigate).toHaveBeenCalledWith(path);
            });
        });

        it('should navigate to login if role is unknown', () => {
            authService.getUserRole.mockReturnValue('unknown_role');

            render(<Unauthorized />);

            const dashboardBtn = screen.getByText('Go to Dashboard');
            fireEvent.click(dashboardBtn);

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('should navigate to login if getUserRole returns null', () => {
            authService.getUserRole.mockReturnValue(null);

            render(<Unauthorized />);

            const dashboardBtn = screen.getByText('Go to Dashboard');
            fireEvent.click(dashboardBtn);

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('Logout functionality', () => {
        it('should handle successful logout', async () => {
            authService.logout.mockResolvedValue({});

            render(<Unauthorized />);

            const logoutBtn = screen.getByText('Logout');
            fireEvent.click(logoutBtn);

            expect(authService.logout).toHaveBeenCalled();
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });
        });

        it('should handle logout failure but still navigate to login', async () => {
            authService.logout.mockRejectedValue(new Error('Logout failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(<Unauthorized />);

            const logoutBtn = screen.getByText('Logout');
            fireEvent.click(logoutBtn);

            expect(authService.logout).toHaveBeenCalled();
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });

            consoleSpy.mockRestore();
        });
    });

    it('should render contact support info', () => {
        render(<Unauthorized />);
        expect(screen.getByText(/Contact support at/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'techsupport@ahimsa.global' })).toHaveAttribute('href', 'mailto:techsupport@ahimsa.global');
    });
});
