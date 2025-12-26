import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GPSidebar from '../GPSidebar';
import authService from '../../../services/authService';

// Mock authService
vi.mock('../../../services/authService', () => ({
    default: {
        logout: vi.fn().mockResolvedValue({})
    }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('GPSidebar', () => {
    const mockOnClose = vi.fn();
    const mockOnOpenAddPatient = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        expect(screen.getByText('GP Panel')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Referred Patients')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('handles navigation item click', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const link = screen.getByText('Dashboard').closest('a');
        fireEvent.click(link);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles collapse toggle', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const toggleButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(toggleButton);

        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('handles add patient button click', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const addButton = screen.getByText('New Patient').closest('button');
        fireEvent.click(addButton);
        expect(mockOnOpenAddPatient).toHaveBeenCalled();
    });

    it('highlights active menu item', () => {
        render(
            <MemoryRouter initialEntries={['/gp/dashboard']}>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const activeLink = screen.getByText('Dashboard').closest('a');
        expect(activeLink.className).toContain('bg-teal-50');
        expect(activeLink.className).toContain('text-teal-700');
    });

    it('handles logout', async () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const logoutButton = screen.getByText('Logout').closest('button');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('handles logout error gracefully', async () => {
        authService.logout.mockRejectedValue(new Error('Logout failed'));

        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const logoutButton = screen.getByText('Logout').closest('button');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('renders all navigation items', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        
        // Verify all navigation items are rendered (lines 12-17)
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Referred Patients')).toBeInTheDocument();
        expect(screen.getByText('Active Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Medication')).toBeInTheDocument();
    });

    it('passes correct props to BaseSidebar', () => {
        render(
            <MemoryRouter>
                <GPSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        
        // Verify BaseSidebar receives correct props (lines 19-28)
        expect(screen.getByText('GP Panel')).toBeInTheDocument();
        expect(screen.getByText('New Patient')).toBeInTheDocument();
    });
});
