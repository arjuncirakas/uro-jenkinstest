import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PathwayValidator from '../PathwayValidator';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    validatePathway: vi.fn()
}));

vi.mock('../../services/guidelineService', () => ({
    guidelineService: {
        validatePathway: mocks.validatePathway
    }
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    AlertCircle: () => <span data-testid="alert-icon" />,
    CheckCircle: () => <span data-testid="check-icon" />,
    XCircle: () => <span data-testid="x-icon" />,
    AlertTriangle: () => <span data-testid="warning-icon" />,
    ClipboardCheck: () => <span data-testid="clipboard-icon" />
}));

describe('PathwayValidator Component', () => {
    const mockOnValidationChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should render nothing when patientId is missing', () => {
            const { container } = render(
                <PathwayValidator
                    patientId={null}
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render nothing when toPathway is missing', () => {
            const { container } = render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway={null}
                    onValidationChange={mockOnValidationChange}
                />
            );
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Loading State', () => {
        it('should show loading state while validating', async () => {
            mocks.validatePathway.mockImplementation(() => new Promise(() => { }));

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            expect(screen.getByText('Validating pathway transition...')).toBeInTheDocument();
        });
    });

    describe('Valid Pathway', () => {
        it('should show success message when pathway is valid', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    requiredActions: []
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Pathway transition is valid')).toBeInTheDocument();
            });
            expect(screen.getByTestId('check-icon')).toBeInTheDocument();
        });

        it('should call onValidationChange callback with validation data', async () => {
            const validationData = {
                isValid: true,
                errors: [],
                warnings: [],
                requiredActions: []
            };

            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: validationData
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mockOnValidationChange).toHaveBeenCalledWith(validationData);
            });
        });
    });

    describe('Invalid Pathway', () => {
        it('should show invalid message when pathway is not valid', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: false,
                    errors: ['Missing required investigation'],
                    warnings: [],
                    requiredActions: []
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Pathway Transition Invalid')).toBeInTheDocument();
            });
            expect(screen.getAllByTestId('x-icon').length).toBeGreaterThan(0);
        });
    });

    describe('Errors Display', () => {
        it('should display error messages', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: false,
                    errors: ['Missing PSA result', 'Consent form not signed'],
                    warnings: [],
                    requiredActions: []
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Errors')).toBeInTheDocument();
                expect(screen.getByText('Missing PSA result')).toBeInTheDocument();
                expect(screen.getByText('Consent form not signed')).toBeInTheDocument();
            });
        });
    });

    describe('Warnings Display', () => {
        it('should display warning messages', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: ['PSA value is borderline', 'Consider additional tests'],
                    requiredActions: []
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Warnings')).toBeInTheDocument();
                expect(screen.getByText('PSA value is borderline')).toBeInTheDocument();
                expect(screen.getByText('Consider additional tests')).toBeInTheDocument();
            });
            expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
        });
    });

    describe('Required Actions Display', () => {
        it('should display required actions', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    requiredActions: ['Schedule MRI', 'Complete consent form']
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Required Actions')).toBeInTheDocument();
                expect(screen.getByText('Schedule MRI')).toBeInTheDocument();
                expect(screen.getByText('Complete consent form')).toBeInTheDocument();
            });
            expect(screen.getByTestId('clipboard-icon')).toBeInTheDocument();
        });
    });

    describe('Combined Messages', () => {
        it('should display errors, warnings, and actions together', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: {
                    isValid: false,
                    errors: ['Critical error'],
                    warnings: ['Warning message'],
                    requiredActions: ['Required action']
                }
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Errors')).toBeInTheDocument();
                expect(screen.getByText('Warnings')).toBeInTheDocument();
                expect(screen.getByText('Required Actions')).toBeInTheDocument();
                expect(screen.getByText('Critical error')).toBeInTheDocument();
                expect(screen.getByText('Warning message')).toBeInTheDocument();
                expect(screen.getByText('Required action')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mocks.validatePathway.mockRejectedValue(new Error('Network error'));

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error validating pathway:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('should handle unsuccessful API response', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: false,
                error: 'Validation service unavailable'
            });

            render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mockOnValidationChange).not.toHaveBeenCalled();
            });
        });
    });

    describe('Props Changes', () => {
        it('should re-validate when patientId changes', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: { isValid: true, errors: [], warnings: [], requiredActions: [] }
            });

            const { rerender } = render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mocks.validatePathway).toHaveBeenCalledWith('123', 'assessment', 'treatment');
            });

            rerender(
                <PathwayValidator
                    patientId="456"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mocks.validatePathway).toHaveBeenCalledWith('456', 'assessment', 'treatment');
            });
        });

        it('should re-validate when toPathway changes', async () => {
            mocks.validatePathway.mockResolvedValue({
                success: true,
                data: { isValid: true, errors: [], warnings: [], requiredActions: [] }
            });

            const { rerender } = render(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="treatment"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mocks.validatePathway).toHaveBeenCalledWith('123', 'assessment', 'treatment');
            });

            rerender(
                <PathwayValidator
                    patientId="123"
                    fromPathway="assessment"
                    toPathway="surgery"
                    onValidationChange={mockOnValidationChange}
                />
            );

            await waitFor(() => {
                expect(mocks.validatePathway).toHaveBeenCalledWith('123', 'assessment', 'surgery');
            });
        });
    });
});
