import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OPDManagement from '../OPDManagement';
import { bookingService } from '../../../services/bookingService';
import { patientService } from '../../../services/patientService';
import React from 'react';

// Mock services
vi.mock('../../../services/bookingService', () => ({
    bookingService: {
        getTodaysAppointments: vi.fn(),
        getNoShowPatients: vi.fn(),
        getUpcomingAppointments: vi.fn(),
    }
}));

vi.mock('../../../services/patientService', () => ({
    patientService: {
        getNewPatients: vi.fn(),
        getPatientById: vi.fn(),
        getPatients: vi.fn(),
    }
}));

// Mock child components
vi.mock('../../../components/layout/NurseHeader', () => ({
    default: ({ title }) => <div data-testid="nurse-header">{title}</div>
}));

vi.mock('../../../components/NursePatientDetailsModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="patient-details-modal">Patient Modal</div> : null
}));

vi.mock('../../../components/BookInvestigationModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="investigation-modal">Investigation Modal</div> : null
}));

vi.mock('../../../components/AddScheduleModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="schedule-modal">Schedule Modal</div> : null
}));

vi.mock('../../../components/NoShowPatientModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="no-show-modal">No Show Modal</div> : null
}));

describe('OPDManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock responses
        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: [] }
        });
        bookingService.getNoShowPatients.mockResolvedValue({
            success: true,
            data: { noShowPatients: [] }
        });
        bookingService.getUpcomingAppointments.mockResolvedValue({
            success: true,
            data: { appointments: [], hasMore: false }
        });
        patientService.getNewPatients.mockResolvedValue({
            success: true,
            data: { patients: [] }
        });
    });

    it('renders the component with header', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('nurse-header')).toHaveTextContent('OPD Management');
        });
    });

    it('renders all three tabs: Investigation, Urologist, and Follow-up', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Investigation')).toBeInTheDocument();
            expect(screen.getByText('Urologist')).toBeInTheDocument();
            expect(screen.getByText('Follow-up')).toBeInTheDocument();
        });
    });

    it('defaults to investigation tab', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const investigationTab = screen.getByText('Investigation').closest('button');
            expect(investigationTab).toHaveClass('bg-teal-600');
        });
    });

    it('switches to urologist tab when clicked', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const urologistTab = screen.getByText('Urologist');
            fireEvent.click(urologistTab);
        });

        await waitFor(() => {
            const urologistTab = screen.getByText('Urologist').closest('button');
            expect(urologistTab).toHaveClass('bg-teal-600');
        });
    });

    it('switches to follow-up tab when clicked', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up').closest('button');
            expect(followupTab).toHaveClass('bg-teal-600');
        });
    });

    it('fetches all appointments when follow-up tab is selected', async () => {
        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            // Should call with null to fetch all appointments
            expect(bookingService.getTodaysAppointments).toHaveBeenCalledWith(null);
        });
    });

    it('displays follow-up appointments when follow-up tab is active', async () => {
        const mockFollowUpAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: null,
                urologist: 'Dr. Smith',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                age: 50,
                psa: '4.2',
                appointmentDate: '2025-01-15',
                appointmentTime: '10:00',
                urologist: 'Dr. Johnson',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockFollowUpAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('filters out non-follow-up appointments when follow-up tab is active', async () => {
        const mockAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: null,
                urologist: 'Dr. Smith',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                age: 50,
                psa: '4.2',
                appointmentDate: '2025-01-15',
                appointmentTime: '10:00',
                urologist: 'Dr. Johnson',
                type: 'urologist',
                appointment_type: 'urologist',
                status: 'scheduled'
            },
            {
                id: 3,
                patientName: 'Bob Wilson',
                age: 55,
                psa: '5.1',
                appointmentDate: '2025-01-15',
                appointmentTime: '11:00',
                urologist: 'Dr. Brown',
                type: 'investigation',
                appointment_type: 'investigation',
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
            expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
        });
    });

    it('filters out no-show appointments from follow-up tab', async () => {
        const mockAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: null,
                urologist: 'Dr. Smith',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'no_show'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                age: 50,
                psa: '4.2',
                appointmentDate: '2025-01-15',
                appointmentTime: '10:00',
                urologist: 'Dr. Johnson',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('displays empty message when no follow-up appointments found', async () => {
        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: [] }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.getByText(/No follow-up appointments found/)).toBeInTheDocument();
        });
    });

    it('handles follow-up appointments with appointment_type field', async () => {
        const mockAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: null,
                urologist: 'Dr. Smith',
                type: 'urologist',
                appointment_type: 'automatic', // Follow-up identified by appointment_type
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    it('excludes automatic appointments from urologist tab when follow-up tab exists', async () => {
        const mockAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: null,
                urologist: 'Dr. Smith',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                age: 50,
                psa: '4.2',
                appointmentDate: '2025-01-15',
                appointmentTime: '10:00',
                urologist: 'Dr. Johnson',
                type: 'urologist',
                appointment_type: 'urologist',
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const urologistTab = screen.getByText('Urologist');
            fireEvent.click(urologistTab);
        });

        await waitFor(() => {
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('displays follow-up appointments in correct table format', async () => {
        const mockAppointments = [
            {
                id: 1,
                patientName: 'John Doe',
                age: 45,
                psa: '3.5',
                appointmentDate: '2025-01-15',
                appointmentTime: '10:00',
                urologist: 'Dr. Smith',
                type: 'automatic',
                appointment_type: 'automatic',
                status: 'scheduled'
            }
        ];

        bookingService.getTodaysAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            // Check table headers (same as urologist tab)
            expect(screen.getByText('PATIENT')).toBeInTheDocument();
            expect(screen.getByText('DATE OF APPOINTMENT')).toBeInTheDocument();
            expect(screen.getByText('UROLOGIST')).toBeInTheDocument();
            expect(screen.getByText('ACTIONS')).toBeInTheDocument();
            
            // Check appointment data
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        });
    });

    it('handles error when fetching appointments for follow-up tab', async () => {
        bookingService.getTodaysAppointments.mockResolvedValue({
            success: false,
            error: 'Failed to fetch appointments'
        });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch appointments')).toBeInTheDocument();
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });
    });

    it('refreshes appointments when retry button is clicked in follow-up tab', async () => {
        bookingService.getTodaysAppointments
            .mockResolvedValueOnce({
                success: false,
                error: 'Failed to fetch appointments'
            })
            .mockResolvedValueOnce({
                success: true,
                data: { appointments: [] }
            });

        render(
            <MemoryRouter>
                <OPDManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            const followupTab = screen.getByText('Follow-up');
            fireEvent.click(followupTab);
        });

        await waitFor(() => {
            const retryButton = screen.getByText('Retry');
            fireEvent.click(retryButton);
        });

        await waitFor(() => {
            expect(bookingService.getTodaysAppointments).toHaveBeenCalledTimes(2);
        });
    });
});

