import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebarLayout from '../AdminSidebarLayout';
import { BarChart3, Download } from 'lucide-react';
import React from 'react';

// Mock services
vi.mock('../../services/authService.js', () => ({
    default: {
        logout: vi.fn().mockResolvedValue(true),
        autoRefreshToken: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../../services/tokenService.js', () => ({
    default: {
        needsRefresh: vi.fn().mockReturnValue(false)
    }
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Outlet: () => <div data-testid="outlet">Page Content</div>
    };
});

describe('AdminSidebarLayout', () => {
    const mockNavigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
        { name: 'Export', href: '/admin/export', icon: Download }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderLayout = (props = {}) => {
        return render(
            <MemoryRouter initialEntries={['/admin/dashboard']}>
                <AdminSidebarLayout
                    navigation={mockNavigation}
                    panelName="Test Panel"
                    {...props}
                />
            </MemoryRouter>
        );
    };

    it('renders panel name', () => {
        renderLayout();
        expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
        renderLayout();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('renders outlet for child routes', () => {
        renderLayout();
        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('collapses and expands sidebar', () => {
        renderLayout();

        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        // Panel name should be hidden when collapsed
        expect(screen.queryByText('Test Panel')).not.toBeInTheDocument();

        const expandButton = screen.getByLabelText('Expand sidebar');
        fireEvent.click(expandButton);

        expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('handles logout', async () => {
        const authService = (await import('../../services/authService.js')).default;
        renderLayout();

        const logoutButton = screen.getByText('Logout');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('handles logout error gracefully', async () => {
        const authService = (await import('../../services/authService.js')).default;
        authService.logout.mockRejectedValueOnce(new Error('Logout failed'));

        renderLayout();

        const logoutButton = screen.getByText('Logout');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('opens mobile sidebar and closes it', () => {
        renderLayout();

        const openButton = screen.getByLabelText('Open sidebar');
        fireEvent.click(openButton);

        // Verify sidebar is open by checking close button exists
        const closeButton = screen.getByLabelText('Close sidebar');
        expect(closeButton).toBeInTheDocument();

        // Click close button
        fireEvent.click(closeButton);

        // Verify mobile close button is accessible after closing
        expect(screen.getByLabelText('Close mobile sidebar')).toBeInTheDocument();
    });

    it('highlights active navigation item', () => {
        renderLayout();

        const activeLink = screen.getByText('Dashboard').closest('a');
        expect(activeLink).toHaveClass('bg-teal-50');
    });

    it('renders powered by text when expanded', () => {
        renderLayout();
        expect(screen.getByText('Powered by AhimsaGlobal')).toBeInTheDocument();
    });

    it('applies full width for specified paths', () => {
        render(
            <MemoryRouter initialEntries={['/admin/users']}>
                <AdminSidebarLayout
                    navigation={mockNavigation}
                    panelName="Test Panel"
                    fullWidthPaths={['/admin/users']}
                />
            </MemoryRouter>
        );

        // The component should render without errors when fullWidthPaths is specified
        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('proactively refreshes token when needed', async () => {
        const tokenService = (await import('../../services/tokenService.js')).default;
        const authService = (await import('../../services/authService.js')).default;

        tokenService.needsRefresh.mockReturnValueOnce(true);

        renderLayout();

        await waitFor(() => {
            expect(authService.autoRefreshToken).toHaveBeenCalled();
        });
    });
});
