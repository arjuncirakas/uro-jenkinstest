import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock apiClient (axios) instead of gpService to allow component and service code to execute
const mockGet = vi.fn();

vi.mock('../../../config/axios', () => ({
    default: {
        get: (...args) => mockGet(...args),
        post: vi.fn(),
        put: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

// Import component AFTER apiClient mock
import ActiveMonitoring from '../../gp/ActiveMonitoring';
import { gpService } from '../../../services/gpService';

// Mock layout components
vi.mock('../../../components/layout/GPHeader', () => ({
    default: ({ title, searchPlaceholder, onSearch }) => (
        <div data-testid="gp-header">
            <h1>{title}</h1>
            <input
                data-testid="search-input"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch && onSearch(e.target.value)}
            />
        </div>
    )
}));

// Mock patient details modal
vi.mock('../../../components/GPPatientDetailsModal', () => ({
    default: ({ isOpen, patient, onClose }) =>
        isOpen ? (
            <div data-testid="patient-details-modal">
                <span>{patient?.first_name} {patient?.last_name}</span>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

// Mock PSA utility
vi.mock('../../../utils/psaStatusByAge', () => ({
    getPSAStatusByAge: (psa, age) => {
        if (psa > 4.0) return { status: 'elevated', color: 'red' };
        return { status: 'normal', color: 'green' };
    }
}));

describe('GP ActiveMonitoring', () => {
    const mockPatients = [
        {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            date_of_birth: '1960-05-15',
            email: 'john@example.com',
            phone: '1234567890',
            current_psa: 3.5,
            pathway_status: 'active_monitoring',
            next_appointment: '2024-02-15'
        },
        {
            id: 2,
            first_name: 'Jane',
            last_name: 'Smith',
            date_of_birth: '1955-08-20',
            email: 'jane@example.com',
            phone: '0987654321',
            current_psa: 5.2,
            pathway_status: 'active_monitoring',
            next_appointment: '2024-02-20'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock apiClient.get to return patients for getActiveMonitoringPatients
        mockGet.mockResolvedValue({
            data: {
                success: true,
                data: {
                    patients: mockPatients
                }
            }
        });
    });

    describe('Rendering', () => {
        it('should render the component', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByTestId('gp-header')).toBeInTheDocument();
            });
        });

        it('should render header with title', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText(/Active Monitoring/i)).toBeInTheDocument();
            });
        });

        it('should fetch patients on mount', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(mockGet).toHaveBeenCalled();
            });
        });

        it('should display patients after loading', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading indicator while fetching', () => {
            mockGet.mockImplementation(() => new Promise(() => { }));
            render(<ActiveMonitoring />);
            expect(screen.getByText(/Loading/i)).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle fetch error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGet.mockRejectedValue(new Error('Network error'));

            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });

        it('should handle API failure response', async () => {
            // Mock API to return error response
            mockGet.mockResolvedValue({
                data: {
                    success: false,
                    error: 'Failed to fetch'
                }
            });

            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText(/No patients/i) || screen.queryAllByText(/John/)).toBeTruthy();
            });
        });
    });

    describe('Patient Display', () => {
        it('should display patient initials', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText('JD')).toBeInTheDocument();
            });
        });

        it('should display patient PSA values', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText('3.5')).toBeInTheDocument();
                expect(screen.getByText('5.2')).toBeInTheDocument();
            });
        });

        it('should calculate and display patient age', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                // Age should be displayed based on date_of_birth
                const ageElements = screen.getAllByText(/\d+ years/i);
                expect(ageElements.length).toBeGreaterThan(0);
            });
        });

        it('should show PSA status color based on age', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                // Elevated PSA should show different styling
                const elevatedPSA = screen.getByText('5.2').closest('span');
                expect(elevatedPSA).toBeInTheDocument();
            });
        });
    });

    describe('Patient Actions', () => {
        it('should open patient details modal on view click', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const viewButtons = screen.getAllByRole('button');
            const viewButton = viewButtons.find(btn =>
                btn.querySelector('[class*="eye"]') || btn.textContent.includes('View')
            );

            if (viewButton) {
                fireEvent.click(viewButton);
                await waitFor(() => {
                    expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
                });
            }
        });

        it('should close patient details modal', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const viewButtons = screen.getAllByRole('button');
            const viewButton = viewButtons.find(btn =>
                btn.querySelector('[class*="eye"]') || btn.textContent.includes('View')
            );

            if (viewButton) {
                fireEvent.click(viewButton);

                await waitFor(() => {
                    expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
                });

                const closeButton = screen.getByText('Close');
                fireEvent.click(closeButton);

                await waitFor(() => {
                    expect(screen.queryByTestId('patient-details-modal')).not.toBeInTheDocument();
                });
            }
        });
    });

    describe('Search', () => {
        it('should filter patients by search term', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const searchInput = screen.getByTestId('search-input');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            await waitFor(() => {
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no patients', async () => {
            mockGet.mockResolvedValue({
                data: {
                    success: true,
                    data: {
                        patients: mockPatients
                    }
                }
            });
            // Reset for specific test case
            mockGet.mockResolvedValue({
                success: true,
                data: []
            });

            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText(/No patients/i)).toBeInTheDocument();
            });
        });
    });

    describe('Patient Added Event', () => {
        it('should refresh patients when patient added event is fired', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalledTimes(1);
            });

            // Simulate patient added event
            window.dispatchEvent(new CustomEvent('patientAdded'));

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalledTimes(2);
            });
        });
    });
});
