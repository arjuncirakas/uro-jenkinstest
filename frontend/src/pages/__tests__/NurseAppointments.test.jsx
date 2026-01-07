import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock bookingService
const mockGetAllAppointments = vi.fn();

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        getAllAppointments: (...args) => mockGetAllAppointments(...args)
    }
}));

// Mock NurseHeader
vi.mock('../../components/layout/NurseHeader', () => ({
    default: ({ title, subtitle }) => (
        <div data-testid="nurse-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
    )
}));

// Mock Calendar
vi.mock('../../components/Calendar', () => ({
    default: ({ appointments, loadingAppointments, appointmentsError, onRefresh }) => (
        <div data-testid="calendar">
            {loadingAppointments && <div>Loading...</div>}
            {appointmentsError && <div>Error: {appointmentsError}</div>}
            {appointments && appointments.length > 0 && (
                <div>Appointments: {appointments.length}</div>
            )}
            {onRefresh && <button onClick={onRefresh}>Refresh</button>}
        </div>
    )
}));

import Appointments from '../nurse/Appointments';

describe('Nurse Appointments', () => {
    const mockAppointments = [
        {
            id: 1,
            patient_name: 'John Doe',
            appointment_date: '2024-01-15',
            time: '09:00',
            status: 'confirmed',
            type: 'consultation'
        },
        {
            id: 2,
            patient_name: 'Jane Smith',
            appointment_date: '2024-01-15',
            time: '10:00',
            status: 'pending',
            type: 'follow_up'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAllAppointments.mockResolvedValue({
            success: true,
            data: { appointments: mockAppointments }
        });
    });

    describe('Rendering', () => {
        it('should render appointments page', () => {
            render(<Appointments />);
            expect(screen.getByTestId('nurse-header')).toBeInTheDocument();
            expect(screen.getByText(/Appointments/i)).toBeInTheDocument();
        });

        it('should render calendar component', () => {
            render(<Appointments />);
            expect(screen.getByTestId('calendar')).toBeInTheDocument();
        });

        it('should fetch appointments on mount', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });

        it('should display appointments in calendar', async () => {
            render(<Appointments />);
            await waitFor(() => {
                expect(screen.getByText(/Appointments: 2/i)).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading state while fetching', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            mockGetAllAppointments.mockReturnValue(promise);

            render(<Appointments />);
            
            await waitFor(() => {
                expect(screen.getByText(/Loading/i)).toBeInTheDocument();
            });

            resolvePromise({ success: true, data: { appointments: mockAppointments } });
        });
    });

    describe('Error Handling', () => {
        it('should handle fetch error', async () => {
            mockGetAllAppointments.mockResolvedValue({
                success: false,
                error: 'Failed to fetch appointments'
            });

            render(<Appointments />);

            await waitFor(() => {
                expect(screen.getByText(/Error: Failed to fetch appointments/i)).toBeInTheDocument();
            });
        });

        it('should handle API exception', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGetAllAppointments.mockRejectedValue(new Error('Network error'));

            render(<Appointments />);

            await waitFor(() => {
                expect(screen.getByText(/Error: Failed to fetch appointments/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle empty appointments array', async () => {
            mockGetAllAppointments.mockResolvedValue({
                success: true,
                data: { appointments: [] }
            });

            render(<Appointments />);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalled();
            });
        });
    });

    describe('Refresh Functionality', () => {
        it('should refresh appointments when refresh is called', async () => {
            render(<Appointments />);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalledTimes(1);
            });

            const refreshButton = screen.getByText(/Refresh/i);
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(mockGetAllAppointments).toHaveBeenCalledTimes(2);
            });
        });
    });
});
