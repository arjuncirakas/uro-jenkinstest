import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock guidelineService
const mockCheckPathwayCompliance = vi.fn();
const mockCheckInvestigationCompliance = vi.fn();

vi.mock('../../services/guidelineService', () => ({
    guidelineService: {
        checkPathwayCompliance: (...args) => mockCheckPathwayCompliance(...args),
        checkInvestigationCompliance: (...args) => mockCheckInvestigationCompliance(...args)
    }
}));

import ComplianceChecker from '../ComplianceChecker';

describe('ComplianceChecker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        it('should return null when patientId is not provided', () => {
            const { container } = render(
                <ComplianceChecker
                    patientId={null}
                    checkType="pathway"
                    checkData={{}}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should return null when checkType is not provided', () => {
            const { container } = render(
                <ComplianceChecker
                    patientId="123"
                    checkType={null}
                    checkData={{}}
                />
            );
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Loading State', () => {
        it('should show loading state while checking compliance', async () => {
            mockCheckPathwayCompliance.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{ fromPathway: 'active_monitoring', toPathway: 'surgery' }}
                />
            );

            expect(screen.getByText('Checking compliance...')).toBeInTheDocument();
        });
    });

    describe('Pathway Compliance Check', () => {
        it('should call checkPathwayCompliance for pathway check type', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: { errors: [], warnings: [], requiredActions: [] }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{ fromPathway: 'active_monitoring', toPathway: 'surgery' }}
                />
            );

            await waitFor(() => {
                expect(mockCheckPathwayCompliance).toHaveBeenCalledWith(
                    '123',
                    'active_monitoring',
                    'surgery'
                );
            });
        });

        it('should display compliant message when no errors or warnings', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: { errors: [], warnings: [], requiredActions: [] }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{ fromPathway: 'active_monitoring', toPathway: 'surgery' }}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Compliant with guidelines')).toBeInTheDocument();
            });
        });
    });

    describe('Investigation Compliance Check', () => {
        it('should call checkInvestigationCompliance for investigation check type', async () => {
            mockCheckInvestigationCompliance.mockResolvedValue({
                success: true,
                data: { errors: [], warnings: [], requiredActions: [] }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="investigation"
                    checkData={{ investigationType: 'biopsy', investigationName: 'PSA Test' }}
                />
            );

            await waitFor(() => {
                expect(mockCheckInvestigationCompliance).toHaveBeenCalledWith(
                    '123',
                    'biopsy',
                    'PSA Test'
                );
            });
        });
    });

    describe('Error Display', () => {
        it('should display compliance errors', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: {
                    errors: ['Error 1', 'Error 2'],
                    warnings: [],
                    requiredActions: []
                }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Compliance Errors')).toBeInTheDocument();
                expect(screen.getByText('Error 1')).toBeInTheDocument();
                expect(screen.getByText('Error 2')).toBeInTheDocument();
            });
        });
    });

    describe('Warning Display', () => {
        it('should display compliance warnings', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: {
                    errors: [],
                    warnings: ['Warning 1', 'Warning 2'],
                    requiredActions: []
                }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Warnings')).toBeInTheDocument();
                expect(screen.getByText('Warning 1')).toBeInTheDocument();
                expect(screen.getByText('Warning 2')).toBeInTheDocument();
            });
        });
    });

    describe('Required Actions Display', () => {
        it('should display required actions', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: {
                    errors: [],
                    warnings: [],
                    requiredActions: ['Action 1', 'Action 2']
                }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Required Actions')).toBeInTheDocument();
                expect(screen.getByText('Action 1')).toBeInTheDocument();
                expect(screen.getByText('Action 2')).toBeInTheDocument();
            });
        });
    });

    describe('Validation Change Callback', () => {
        it('should call onValidationChange when compliance data is received', async () => {
            const mockOnValidationChange = vi.fn();
            const complianceData = {
                errors: [],
                warnings: ['Some warning'],
                requiredActions: []
            };

            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: complianceData
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mockOnValidationChange).toHaveBeenCalledWith(complianceData);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockCheckPathwayCompliance.mockRejectedValue(new Error('API Error'));

            const { container } = render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                />
            );

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Multiple Compliance Issues', () => {
        it('should display all sections when errors, warnings, and actions exist', async () => {
            mockCheckPathwayCompliance.mockResolvedValue({
                success: true,
                data: {
                    errors: ['Error message'],
                    warnings: ['Warning message'],
                    requiredActions: ['Required action']
                }
            });

            render(
                <ComplianceChecker
                    patientId="123"
                    checkType="pathway"
                    checkData={{}}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Compliance Errors')).toBeInTheDocument();
                expect(screen.getByText('Warnings')).toBeInTheDocument();
                expect(screen.getByText('Required Actions')).toBeInTheDocument();
            });
        });
    });
});
