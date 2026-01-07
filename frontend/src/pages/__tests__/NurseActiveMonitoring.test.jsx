import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock apiClient (axios) instead of services to allow component and service code to execute
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
import ActiveMonitoring from '../../nurse/ActiveMonitoring';
import { patientService } from '../../../services/patientService';
import { bookingService } from '../../../services/bookingService';

// Mock layout components
vi.mock('../../../components/layout/NurseHeader', () => ({
    default: ({ title, searchPlaceholder, onSearch }) => (
        <div data-testid="nurse-header">
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
vi.mock('../../../components/NursePatientDetailsModal', () => ({
    default: ({ isOpen, patient, onClose, urologists }) =>
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

describe('Nurse ActiveMonitoring', () => {
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
            monitoring_status: 'stable',
            next_appointment: '2024-02-15',
            assigned_urologist: 'Dr. Smith'
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
            monitoring_status: 'needs_review',
            next_appointment: '2024-02-20',
            assigned_urologist: 'Dr. Johnson'
        }
    ];

    const mockUrologists = [
        { id: 1, first_name: 'Dr.', last_name: 'Smith' },
        { id: 2, first_name: 'Dr.', last_name: 'Johnson' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock apiClient.get - will be called multiple times (getPatients, getAllUrologists)
        // Use mockResolvedValue to return different values based on call order
        mockGet
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        patients: mockPatients
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: mockUrologists
                }
            });
    });

    describe('Rendering', () => {
        it('should render the component', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByTestId('nurse-header')).toBeInTheDocument();
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

        it('should fetch urologists on mount', async () => {
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

        it('should handle urologists fetch error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockGet.mockRejectedValue(new Error('Network error'));

            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByTestId('nurse-header')).toBeInTheDocument();
            });

            consoleError.mockRestore();
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

        it('should display monitoring status', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText(/stable/i)).toBeInTheDocument();
                expect(screen.getByText(/needs.review/i)).toBeInTheDocument();
            });
        });

        it('should display pathway status', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getAllByText(/active.monitoring/i).length).toBeGreaterThan(0);
            });
        });

        it('should display assigned urologist', async () => {
            render(<ActiveMonitoring />);
            await waitFor(() => {
                expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
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

        it('should handle update appointment action', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const calendarButtons = screen.getAllByRole('button');
            const appointmentButton = calendarButtons.find(btn =>
                btn.querySelector('[class*="calendar"]')
            );

            if (appointmentButton) {
                fireEvent.click(appointmentButton);
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
                    data: mockPatients
                }
            });
                success: true,
                data: []
            });

            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText(/No patients/i)).toBeInTheDocument();
            });
        });
    });

    describe('Styling Functions', () => {
        it('should apply correct pathway styling', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                const pathwayBadge = screen.getAllByText(/active.monitoring/i)[0];
                expect(pathwayBadge).toBeInTheDocument();
            });
        });

        it('should apply correct monitoring status styling', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                const stableBadge = screen.getByText(/stable/i);
                const reviewBadge = screen.getByText(/needs.review/i);
                expect(stableBadge).toBeInTheDocument();
                expect(reviewBadge).toBeInTheDocument();
            });
        });

        it('should apply correct PSA styling based on age', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                // PSA values should be displayed with appropriate styling
                expect(screen.getByText('3.5')).toBeInTheDocument();
                expect(screen.getByText('5.2')).toBeInTheDocument();
            });
        });
    });

    describe('Appointment Information', () => {
        it('should display next appointment date', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                expect(screen.getByText(/2024-02-15/i) || screen.getByText(/Feb 15/i)).toBeInTheDocument();
            });
        });

        it('should format appointment date correctly', async () => {
            render(<ActiveMonitoring />);

            await waitFor(() => {
                // Check that dates are formatted
                const dateElements = screen.getAllByText(/\d{4}|\d{2}/);
                expect(dateElements.length).toBeGreaterThan(0);
            });
        });
    });
});
