import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UrologistSidebar from '../UrologistSidebar';
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

describe('UrologistSidebar', () => {
    const mockOnClose = vi.fn();
    const mockOnOpenAddPatient = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderSidebar = (initialPath = '/urologist/dashboard') => {
        return render(
            <MemoryRouter initialEntries={[initialPath]}>
                <UrologistSidebar isOpen={true} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );
    };

    it('renders correctly when open', () => {
        renderSidebar();
        expect(screen.getByText('Urologist Panel')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Patients')).toBeInTheDocument();
        expect(screen.getByText('Appointments')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
        renderSidebar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Patients')).toBeInTheDocument();
        expect(screen.getByText('Appointments')).toBeInTheDocument();
    });

    it('handles navigation item click', () => {
        renderSidebar();
        const link = screen.getByText('Appointments').closest('a');
        fireEvent.click(link);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles collapse toggle', () => {
        renderSidebar();
        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        // Panel name should be hidden when collapsed
        expect(screen.queryByText('Urologist Panel')).not.toBeInTheDocument();

        // Expand
        const expandButton = screen.getByLabelText('Expand sidebar');
        fireEvent.click(expandButton);

        expect(screen.getByText('Urologist Panel')).toBeInTheDocument();
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

    it('renders Terms, Privacy, and NPP buttons when expanded', () => {
        renderSidebar();
        expect(screen.getByText('Terms')).toBeInTheDocument();
        expect(screen.getByText('Privacy')).toBeInTheDocument();
        expect(screen.getByText('NPP')).toBeInTheDocument();
    });

    it('hides Terms, Privacy, and NPP buttons when collapsed', () => {
        renderSidebar();
        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        expect(screen.queryByText('Terms')).not.toBeInTheDocument();
        expect(screen.queryByText('Privacy')).not.toBeInTheDocument();
        expect(screen.queryByText('NPP')).not.toBeInTheDocument();
    });

    it('opens Terms modal when Terms button is clicked', () => {
        renderSidebar();
        const termsButton = screen.getByText('Terms');
        fireEvent.click(termsButton);
        
        // Modal should be rendered
        expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
    });

    it('opens Privacy modal when Privacy button is clicked', () => {
        renderSidebar();
        const privacyButton = screen.getByText('Privacy');
        fireEvent.click(privacyButton);
        
        // Modal should be rendered
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders separator between Terms and Privacy buttons', () => {
        renderSidebar();
        const separator = screen.getByText('|');
        expect(separator).toBeInTheDocument();
    });

    it('Terms, Privacy, and NPP buttons have correct styling', () => {
        renderSidebar();
        const termsButton = screen.getByText('Terms');
        const privacyButton = screen.getByText('Privacy');
        const nppButton = screen.getByText('NPP');
        
        expect(termsButton).toHaveClass('text-gray-500', 'hover:text-teal-600');
        expect(privacyButton).toHaveClass('text-gray-500', 'hover:text-teal-600');
        expect(nppButton).toHaveClass('text-gray-500', 'hover:text-teal-600');
    });

    it('closes Terms modal when close button is clicked', () => {
        renderSidebar();
        const termsButton = screen.getByText('Terms');
        fireEvent.click(termsButton);
        
        // Modal should be open
        expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
        
        // Close modal
        const closeButton = screen.getByLabelText('Close modal');
        fireEvent.click(closeButton);
        
        // Modal should be closed
        expect(screen.queryByText('Terms and Conditions')).not.toBeInTheDocument();
    });

    it('closes Privacy modal when close button is clicked', () => {
        renderSidebar();
        const privacyButton = screen.getByText('Privacy');
        fireEvent.click(privacyButton);
        
        // Modal should be open
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        
        // Close modal
        const closeButton = screen.getByLabelText('Close modal');
        fireEvent.click(closeButton);
        
        // Modal should be closed
        expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
    });

    it('opens NPP modal when NPP button is clicked', () => {
        renderSidebar();
        const nppButton = screen.getByText('NPP');
        fireEvent.click(nppButton);
        
        // Modal should be rendered
        expect(screen.getByText('Notice of Privacy Practices')).toBeInTheDocument();
    });

    it('closes NPP modal when close button is clicked', () => {
        renderSidebar();
        const nppButton = screen.getByText('NPP');
        fireEvent.click(nppButton);
        
        // Modal should be open
        expect(screen.getByText('Notice of Privacy Practices')).toBeInTheDocument();
        
        // Close modal
        const closeButton = screen.getByLabelText('Close modal');
        fireEvent.click(closeButton);
        
        // Modal should be closed
        expect(screen.queryByText('Notice of Privacy Practices')).not.toBeInTheDocument();
    });

    it('expands Patients submenu when on patients route', () => {
        renderSidebar('/urologist/patients/patients-under-me');
        expect(screen.getByText('Patients Under Me')).toBeInTheDocument();
        expect(screen.getByText('Surgery Pathway')).toBeInTheDocument();
        expect(screen.getByText('Post-op Followup')).toBeInTheDocument();
        expect(screen.getByText('All Patients')).toBeInTheDocument();
    });

    it('handles Patients menu toggle', () => {
        renderSidebar();
        const patientsLink = screen.getByText('Patients').closest('div');
        const toggleButton = patientsLink.querySelector('button');
        
        // Initially should be collapsed (if not on patients route)
        fireEvent.click(toggleButton);
        
        // Should expand submenu
        expect(screen.getByText('Patients Under Me')).toBeInTheDocument();
    });

    it('calls onOpenAddPatient when new patient button clicked', () => {
        renderSidebar();
        fireEvent.click(screen.getByText('New Patient'));
        expect(mockOnOpenAddPatient).toHaveBeenCalled();
    });

    it('highlights active navigation item', () => {
        renderSidebar('/urologist/dashboard');
        const dashboardLink = screen.getByText('Dashboard').closest('a');
        expect(dashboardLink).toHaveClass('bg-teal-50');
    });

    it('highlights Patients when on patients route', () => {
        renderSidebar('/urologist/patients/patients-under-me');
        const patientsLink = screen.getByText('Patients').closest('div');
        expect(patientsLink).toHaveClass('bg-teal-50');
    });

    it('highlights Appointments when on appointments route', () => {
        renderSidebar('/urologist/appointments');
        const appointmentsLink = screen.getByText('Appointments').closest('a');
        expect(appointmentsLink).toHaveClass('bg-teal-50');
    });

    it('applies correct translation when closed', () => {
        const { container } = render(
            <MemoryRouter>
                <UrologistSidebar isOpen={false} onClose={mockOnClose} onOpenAddPatient={mockOnOpenAddPatient} />
            </MemoryRouter>
        );

        const sidebar = container.firstChild;
        expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('shows collapsed state styling', () => {
        const { container } = renderSidebar();
        const collapseButton = screen.getByLabelText('Collapse sidebar');
        fireEvent.click(collapseButton);

        const sidebar = container.firstChild;
        expect(sidebar.className).toContain('w-[80px]');
    });

    it('shows expanded state styling', () => {
        const { container } = renderSidebar();
        const sidebar = container.firstChild;
        expect(sidebar.className).toContain('w-[280px]');
    });
});
