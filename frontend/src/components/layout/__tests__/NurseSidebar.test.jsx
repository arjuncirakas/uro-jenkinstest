import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NurseSidebar from '../NurseSidebar';
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

describe('NurseSidebar', () => {
    const mockOnClose = vi.fn();
    const mockOnOpenAddPatient = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        expect(screen.getByText('Nurse Panel')).toBeInTheDocument();
        expect(screen.getByText('OPD Management')).toBeInTheDocument();
        expect(screen.getByText('Investigations')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('handles navigation item click', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const link = screen.getByText('OPD Management').closest('a');
        fireEvent.click(link);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles collapse toggle', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        // Find collapse button (it has aria-label "Collapse sidebar" initially)
        const toggleButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(toggleButton);

        // After click, it should be collapsed
        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();

        // Text should be hidden or behavior changed (depends on CSS, but we can check if "Nurse Panel" is still visible or specific class applied)
        // Checking for class names is brittle, but we can verify state change via toggle logic
    });

    it('handles add patient button click', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const addButton = screen.getByText('New Patient').closest('button');
        fireEvent.click(addButton);
        expect(mockOnOpenAddPatient).toHaveBeenCalled();
    });

    it('highlights active menu item', () => {
        render(
            <MemoryRouter initialEntries={['/nurse/opd-management']}>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const activeLink = screen.getByText('OPD Management').closest('a');
        // Check for active classes
        // Note: class string might be exact match or contains.
        expect(activeLink.className).toContain('bg-teal-50');
        expect(activeLink.className).toContain('text-teal-700');
    });

    it('handles logout', async () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
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
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const logoutButton = screen.getByText('Logout').closest('button');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
            // Should still navigate to login on error
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('renders all navigation items', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        
        // Verify all navigation items are rendered (lines 11-19)
        expect(screen.getByText('OPD Management')).toBeInTheDocument();
        expect(screen.getByText('Investigations')).toBeInTheDocument();
        expect(screen.getByText('Appointments')).toBeInTheDocument();
        expect(screen.getByText('Active Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Surgery')).toBeInTheDocument();
        expect(screen.getByText('Post-Op Follow-up')).toBeInTheDocument();
        expect(screen.getByText('Patient List')).toBeInTheDocument();
    });

    it('passes correct props to BaseSidebar', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        
        // Verify BaseSidebar receives correct props (lines 21-30)
        expect(screen.getByText('Nurse Panel')).toBeInTheDocument();
        expect(screen.getByText('New Patient')).toBeInTheDocument();
    });

    it('renders Terms, Privacy, and NPP links when expanded', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        expect(screen.getByText('Terms')).toBeInTheDocument();
        expect(screen.getByText('Privacy')).toBeInTheDocument();
        expect(screen.getByText('NPP')).toBeInTheDocument();
    });

    it('hides Terms, Privacy, and NPP links when collapsed', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        expect(screen.queryByText('Terms')).not.toBeInTheDocument();
        expect(screen.queryByText('Privacy')).not.toBeInTheDocument();
        expect(screen.queryByText('NPP')).not.toBeInTheDocument();
    });

    it('opens NPP modal when NPP button is clicked', () => {
        render(
            <MemoryRouter>
                <NurseSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
        const nppButton = screen.getByText('NPP');
        fireEvent.click(nppButton);
        
        // Modal should be rendered
        expect(screen.getByText('Notice of Privacy Practices')).toBeInTheDocument();
    });
});
