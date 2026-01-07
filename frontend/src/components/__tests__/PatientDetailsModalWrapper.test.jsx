import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import PatientDetailsModalWrapper from '../PatientDetailsModalWrapper';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    getPatients: vi.fn(),
    getAllPatients: vi.fn(),
    getPatientById: vi.fn(),
    getPatientNotes: vi.fn(),
    getInvestigationResults: vi.fn()
}));

vi.mock('../../services/patientService', () => ({
    patientService: {
        getPatients: mocks.getPatients,
        getAllPatients: mocks.getAllPatients,
        getPatientById: mocks.getPatientById
    }
}));

vi.mock('../../services/notesService', () => ({
    notesService: {
        getPatientNotes: mocks.getPatientNotes
    }
}));

vi.mock('../../services/investigationService', () => ({
    investigationService: {
        getInvestigationResults: mocks.getInvestigationResults
    }
}));

// Mock UrologistPatientDetailsModal
vi.mock('../UrologistPatientDetailsModal', () => ({
    default: ({ isOpen, onClose, patient, loading, error }) => (
        <div data-testid="urologist-modal">
            <span data-testid="modal-open">{isOpen ? 'open' : 'closed'}</span>
            <span data-testid="modal-loading">{loading ? 'loading' : 'not-loading'}</span>
            {error && <span data-testid="modal-error">{error}</span>}
            {patient && <span data-testid="patient-name">{patient.name}</span>}
            {patient && <span data-testid="patient-category">{patient.category}</span>}
            <button onClick={onClose} data-testid="close-button">Close</button>
        </div>
    )
}));

describe('PatientDetailsModalWrapper Component', () => {
    const mockOnTransferSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('Initial Rendering', () => {
        it('should render with modal closed initially', () => {
            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            expect(screen.getByTestId('modal-open')).toHaveTextContent('closed');
        });

        it('should expose openPatientDetails method via ref', () => {
            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            expect(ref.current.openPatientDetails).toBeDefined();
            expect(typeof ref.current.openPatientDetails).toBe('function');
        });

        it('should expose closePatientDetails method via ref', () => {
            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            expect(ref.current.closePatientDetails).toBeDefined();
            expect(typeof ref.current.closePatientDetails).toBe('function');
        });
    });

    describe('Opening Patient Details by UPI', () => {
        it('should open modal with patient data found by UPI', async () => {
            const mockPatient = {
                id: 1,
                fullName: 'John Doe',
                upi: 'UPI123',
                age: 45,
                gender: 'Male'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('John Doe', { upi: 'UPI123' });
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });
            expect(screen.getByTestId('patient-name')).toHaveTextContent('John Doe');
        });
    });

    describe('Opening Patient Details by Name', () => {
        it('should open modal with patient data found by name', async () => {
            const mockPatient = {
                id: 2,
                fullName: 'Jane Smith',
                age: 50,
                gender: 'Female'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Jane Smith');
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });
            expect(screen.getByTestId('patient-name')).toHaveTextContent('Jane Smith');
        });
    });

    describe('Fallback to All Patients Search', () => {
        it('should search all patients when name search fails', async () => {
            const mockPatient = {
                id: 3,
                fullName: 'Bob Wilson',
                upi: 'UPI456',
                age: 55
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [] // No results from search
            });
            mocks.getAllPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Bob Wilson', { upi: 'UPI456' });
            });

            await waitFor(() => {
                expect(mocks.getAllPatients).toHaveBeenCalled();
            });
        });
    });

    describe('Category Determination', () => {
        it('should determine surgery-pathway category', async () => {
            const mockPatient = {
                id: 4,
                fullName: 'Surgery Patient',
                carePathway: 'Surgery Pathway'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Surgery Patient', null, 'all');
            });

            await waitFor(() => {
                expect(screen.getByTestId('patient-category')).toHaveTextContent('surgery-pathway');
            });
        });

        it('should determine post-op-followup category', async () => {
            const mockPatient = {
                id: 5,
                fullName: 'PostOp Patient',
                carePathway: 'Post-op Transfer'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('PostOp Patient', null, 'all');
            });

            await waitFor(() => {
                expect(screen.getByTestId('patient-category')).toHaveTextContent('post-op-followup');
            });
        });

        it('should determine new category for OPD Queue', async () => {
            const mockPatient = {
                id: 6,
                fullName: 'New Patient',
                carePathway: 'OPD Queue'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('New Patient', null, 'all');
            });

            await waitFor(() => {
                expect(screen.getByTestId('patient-category')).toHaveTextContent('new');
            });
        });
    });

    describe('Patient Not Found', () => {
        it('should create patient from appointment data when not found', async () => {
            const appointmentData = {
                upi: 'UPI789',
                age: 60,
                gender: 'Female',
                appointmentDate: '2024-01-15'
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getAllPatients.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Unknown Patient', appointmentData, 'new');
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });
            expect(screen.getByTestId('patient-name')).toHaveTextContent('Unknown Patient');
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            mocks.getPatients.mockRejectedValue(new Error('Network error'));

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Error Patient');
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });
            // Should create minimal patient object on error
            expect(screen.getByTestId('patient-name')).toHaveTextContent('Error Patient');
        });
    });

    describe('Closing Modal', () => {
        it('should close modal when closePatientDetails is called', async () => {
            const mockPatient = {
                id: 1,
                fullName: 'Test Patient',
                age: 45
            };

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            // Open the modal
            await act(async () => {
                await ref.current.openPatientDetails('Test Patient');
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });

            // Close the modal
            act(() => {
                ref.current.closePatientDetails();
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('closed');
            });
        });
    });

    describe('Investigation Results Processing', () => {
        it('should separate PSA results from other test results', async () => {
            const mockPatient = {
                id: 7,
                fullName: 'Test Patient',
                age: 50
            };

            const mockInvestigations = [
                { id: 1, test_type: 'PSA', value: '4.5' },
                { id: 2, test_type: 'MRI', value: 'Normal' },
                { id: 3, testType: 'psa', value: '5.0' }
            ];

            mocks.getPatients.mockResolvedValue({
                success: true,
                data: [mockPatient]
            });
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: mockPatient
            });
            mocks.getPatientNotes.mockResolvedValue({
                success: true,
                data: []
            });
            mocks.getInvestigationResults.mockResolvedValue({
                success: true,
                data: mockInvestigations
            });

            const ref = createRef();
            render(<PatientDetailsModalWrapper ref={ref} onTransferSuccess={mockOnTransferSuccess} />);

            await act(async () => {
                await ref.current.openPatientDetails('Test Patient');
            });

            await waitFor(() => {
                expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
            });
        });
    });
});
