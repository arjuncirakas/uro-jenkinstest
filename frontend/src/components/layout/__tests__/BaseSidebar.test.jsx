import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BaseSidebar from '../BaseSidebar';
import { HiHome } from 'react-icons/hi';
import { FaUsers } from 'react-icons/fa';
import React from 'react';

// Mock authService
vi.mock('../../../services/authService', () => ({
    default: {
        logout: vi.fn().mockResolvedValue(true)
    }
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('BaseSidebar', () => {
    const mockOnClose = vi.fn();
    const mockOnOpenAddPatient = vi.fn();

    const navigationItems = [
        { name: 'Dashboard', icon: HiHome, path: '/test/dashboard', paths: ['/test/dashboard', '/test'] },
        { name: 'Users', icon: FaUsers, path: '/test/users' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderSidebar = (props = {}, initialPath = '/test/dashboard') => {
        return render(
            <MemoryRouter initialEntries={[initialPath]}>
                <BaseSidebar
                    isOpen={true}
                    onClose={mockOnClose}
                    onOpenAddPatient={mockOnOpenAddPatient}
                    navigationItems={navigationItems}
                    panelName="Test Panel"
                    newButtonLabel="New Item"
                    {...props}
                />
            </MemoryRouter>
        );
    };

    it('renders panel name', () => {
        renderSidebar();
        expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
        renderSidebar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders new button with custom label', () => {
        renderSidebar();
        expect(screen.getByText('New Item')).toBeInTheDocument();
    });

    it('calls onOpenAddPatient when new button clicked', () => {
        renderSidebar();
        fireEvent.click(screen.getByText('New Item'));
        expect(mockOnOpenAddPatient).toHaveBeenCalled();
    });

    it('calls onClose when navigation link clicked', () => {
        renderSidebar();
        fireEvent.click(screen.getByText('Users'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('toggles collapsed state', () => {
        renderSidebar();

        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        // Panel name should be hidden when collapsed
        expect(screen.queryByText('Test Panel')).not.toBeInTheDocument();

        // Expand
        const expandButton = screen.getByLabelText('Expand sidebar');
        fireEvent.click(expandButton);

        expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('handles logout', async () => {
        const authService = (await import('../../../services/authService')).default;
        renderSidebar();

        fireEvent.click(screen.getByText('Logout'));

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('handles logout error gracefully', async () => {
        const authService = (await import('../../../services/authService')).default;
        authService.logout.mockRejectedValueOnce(new Error('Logout failed'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        renderSidebar();
        fireEvent.click(screen.getByText('Logout'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        consoleSpy.mockRestore();
    });

    it('highlights active navigation item', () => {
        renderSidebar({}, '/test/dashboard');

        const dashboardLink = screen.getByText('Dashboard').closest('a');
        expect(dashboardLink).toHaveClass('bg-teal-50');
    });

    it('renders powered by text when expanded', () => {
        renderSidebar();
        expect(screen.getByText('Powered by AhimsaGlobal')).toBeInTheDocument();
    });

    it('hides powered by text when collapsed', () => {
        renderSidebar();

        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        expect(screen.queryByText('Powered by AhimsaGlobal')).not.toBeInTheDocument();
    });

    it('applies correct translation when closed', () => {
        const { container } = renderSidebar({ isOpen: false });

        const sidebar = container.firstChild;
        expect(sidebar).toHaveClass('-translate-x-full');
    });
});
