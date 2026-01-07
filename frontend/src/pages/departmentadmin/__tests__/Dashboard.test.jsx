import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock service
const mockGetAllKPIs = vi.fn();
const mockGetKPITrends = vi.fn();

vi.mock('../../../services/departmentAdminService', () => ({
    default: {
        getAllKPIs: (...args) => mockGetAllKPIs(...args),
        getKPITrends: (...args) => mockGetKPITrends(...args)
    }
}));

import Dashboard from '../Dashboard';

describe('Department Admin Dashboard', () => {
    const mockKpiData = {
        averageWaitTime: {
            days: 5,
            totalPatients: 100
        },
        activeSurveillanceCompliance: {
            percentage: '85%',
            compliantPatients: 85,
            totalPatients: 100,
            nonCompliantPatients: 15
        },
        dischargeToGP: {
            percentageText: '75%',
            dischargedToGP: 75,
            totalDischarged: 100,
            dischargedWithoutGP: 25
        }
    };

    const mockTrends = {
        waitTimeTrends: [
            { period: '2024-01-01', avgWaitDays: 5 },
            { period: '2024-02-01', avgWaitDays: 6 }
        ],
        complianceTrends: [
            { period: '2024-01-01', complianceRate: 85 },
            { period: '2024-02-01', complianceRate: 90 }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAllKPIs.mockResolvedValue({
            success: true,
            data: mockKpiData
        });
        mockGetKPITrends.mockResolvedValue({
            success: true,
            data: mockTrends
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the dashboard', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
            });
        });

        it('should show loading state initially', () => {
            mockGetAllKPIs.mockImplementation(() => new Promise(() => {}));
            render(<Dashboard />);
            expect(screen.getByText(/Loading KPI data/i)).toBeInTheDocument();
        });

        it('should render header with title and description', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
                expect(screen.getByText(/Real-time performance metrics and analytics/i)).toBeInTheDocument();
            });
        });

        it('should render date range filters', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('From:')).toBeInTheDocument();
                expect(screen.getByText('To:')).toBeInTheDocument();
            });
        });
    });

    describe('KPI Cards', () => {
        it('should display average wait time', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Average Wait Time/i)).toBeInTheDocument();
                expect(screen.getByText(/5.*days/i)).toBeInTheDocument();
            });
        });

        it('should display surveillance compliance', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Surveillance Compliance/i)).toBeInTheDocument();
                expect(screen.getByText('85%')).toBeInTheDocument();
            });
        });

        it('should display discharge to GP percentage', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Discharged to GP/i)).toBeInTheDocument();
                expect(screen.getByText('75%')).toBeInTheDocument();
            });
        });

        it('should display patient counts', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Based on 100 patients/i)).toBeInTheDocument();
                expect(screen.getByText(/85 \/ 100 patients/i)).toBeInTheDocument();
            });
        });
    });

    describe('Date Range Filtering', () => {
        it('should update start date filter', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const dateInputs = screen.getAllByRole('textbox');
                const startDateInput = dateInputs.find(input => input.type === 'date' && input.previousElementSibling?.textContent === 'From:') || 
                                     screen.getAllByDisplayValue('')[0];
                if (startDateInput) {
                    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
                    expect(startDateInput.value).toBe('2024-01-01');
                }
            });
        });

        it('should update end date filter', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const dateInputs = screen.getAllByRole('textbox');
                const endDateInput = dateInputs.find(input => input.type === 'date' && input.previousElementSibling?.textContent === 'To:') ||
                                    screen.getAllByDisplayValue('')[1];
                if (endDateInput) {
                    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });
                    expect(endDateInput.value).toBe('2024-12-31');
                }
            });
        });

        it('should show message when dates are not selected', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Showing all data - select dates to filter/i)).toBeInTheDocument();
            });
        });

        it('should fetch data when date range changes', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(mockGetAllKPIs).toHaveBeenCalled();
            });

            const startDateInput = screen.getByLabelText('From:').nextElementSibling;
            fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

            await waitFor(() => {
                expect(mockGetAllKPIs).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Trends Section', () => {
        it('should render wait time trends chart', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Wait Time Trends')).toBeInTheDocument();
            });
        });

        it('should render compliance trends chart', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Compliance Trends')).toBeInTheDocument();
            });
        });

        it('should change trend period', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const periodSelect = screen.getByDisplayValue('Monthly');
                fireEvent.change(periodSelect, { target: { value: 'week' } });
                expect(periodSelect.value).toBe('week');
            });
        });

        it('should change trend months', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const monthsSelect = screen.getByDisplayValue('Last 12 months');
                fireEvent.change(monthsSelect, { target: { value: '6' } });
                expect(monthsSelect.value).toBe('6');
            });
        });

        it('should show no trend data message when data is empty', async () => {
            mockGetKPITrends.mockResolvedValue({
                success: true,
                data: {
                    waitTimeTrends: [],
                    complianceTrends: []
                }
            });

            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getAllByText(/No trend data available/i).length).toBeGreaterThan(0);
            });
        });

        it('should fetch trends when period changes', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalled();
            });

            const periodSelect = screen.getByDisplayValue('Monthly');
            fireEvent.change(periodSelect, { target: { value: 'day' } });

            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalledTimes(2);
            });
        });

        it('should fetch trends when months change', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalled();
            });

            const monthsSelect = screen.getByDisplayValue('Last 12 months');
            fireEvent.change(monthsSelect, { target: { value: '3' } });

            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Detailed Metrics Table', () => {
        it('should display wait time statistics', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Wait Time Statistics/i)).toBeInTheDocument();
                expect(screen.getByText(/Average:/i)).toBeInTheDocument();
                expect(screen.getByText(/Total Patients:/i)).toBeInTheDocument();
            });
        });

        it('should display active surveillance metrics', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Active Surveillance/i)).toBeInTheDocument();
                expect(screen.getByText(/Compliance Rate:/i)).toBeInTheDocument();
                expect(screen.getByText(/Compliant:/i)).toBeInTheDocument();
                expect(screen.getByText(/Non-Compliant:/i)).toBeInTheDocument();
            });
        });

        it('should display discharge statistics', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(/Discharge Statistics/i)).toBeInTheDocument();
                expect(screen.getByText(/Discharged to GP:/i)).toBeInTheDocument();
                expect(screen.getByText(/Total Discharged:/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle KPI fetch error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetAllKPIs.mockRejectedValue(new Error('Network error'));

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText(/Error:/i)).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should show retry button on error', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetAllKPIs.mockRejectedValue(new Error('Network error'));

            render(<Dashboard />);

            await waitFor(() => {
                const retryButton = screen.getByText(/Retry/i);
                expect(retryButton).toBeInTheDocument();
                fireEvent.click(retryButton);
                expect(mockGetAllKPIs).toHaveBeenCalledTimes(2);
            });

            consoleError.mockRestore();
        });

        it('should handle trends fetch error gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetKPITrends.mockRejectedValue(new Error('Trends error'));

            render(<Dashboard />);

            await waitFor(() => {
                // Dashboard should still render even if trends fail
                expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
            });

            consoleError.mockRestore();
        });

        it('should handle API failure response', async () => {
            mockGetAllKPIs.mockResolvedValue({
                success: false,
                message: 'Failed to fetch KPI data'
            });

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText(/Error:/i)).toBeInTheDocument();
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing KPI data', async () => {
            mockGetAllKPIs.mockResolvedValue({
                success: true,
                data: null
            });

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
            });
        });

        it('should handle missing wait time data', async () => {
            mockGetAllKPIs.mockResolvedValue({
                success: true,
                data: {
                    ...mockKpiData,
                    averageWaitTime: null
                }
            });

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText(/0.*days/i)).toBeInTheDocument();
            });
        });

        it('should handle missing compliance data', async () => {
            mockGetAllKPIs.mockResolvedValue({
                success: true,
                data: {
                    ...mockKpiData,
                    activeSurveillanceCompliance: null
                }
            });

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText('0%')).toBeInTheDocument();
            });
        });

        it('should handle missing discharge data', async () => {
            mockGetAllKPIs.mockResolvedValue({
                success: true,
                data: {
                    ...mockKpiData,
                    dischargeToGP: null
                }
            });

            render(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText('0%')).toBeInTheDocument();
            });
        });

        it('should handle empty date range', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const dateInputs = screen.getAllByRole('textbox').filter(input => input.type === 'date');
                expect(dateInputs.length).toBeGreaterThanOrEqual(2);
                expect(dateInputs[0].value).toBe('');
                expect(dateInputs[1].value).toBe('');
            });
        });
    });

    describe('Data Refresh', () => {
        it('should refresh data when date range changes', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(mockGetAllKPIs).toHaveBeenCalledTimes(1);
            });

            const startDateInput = screen.getByLabelText('From:').nextElementSibling;
            fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

            await waitFor(() => {
                expect(mockGetAllKPIs).toHaveBeenCalledTimes(2);
            });
        });

        it('should refresh trends when period changes', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalledTimes(1);
            });

            const periodSelect = screen.getByDisplayValue('Monthly');
            fireEvent.change(periodSelect, { target: { value: 'week' } });

            await waitFor(() => {
                expect(mockGetKPITrends).toHaveBeenCalledTimes(2);
            });
        });
    });
});

