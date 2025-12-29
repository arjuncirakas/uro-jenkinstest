import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn()
}));

// Mock all services before importing component
vi.mock('../../services/notesService', () => ({
    notesService: {
        getPatientNotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
        addNote: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
        updateNote: vi.fn().mockResolvedValue({ success: true }),
        deleteNote: vi.fn().mockResolvedValue({ success: true })
    }
}));

vi.mock('../../services/investigationService', () => ({
    investigationService: {
        getPatientInvestigations: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getPatientInvestigationResults: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getInvestigationRequests: vi.fn().mockResolvedValue({ success: true, data: [] }),
        viewFile: vi.fn().mockResolvedValue({ success: true })
    }
}));

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        getPatientAppointments: vi.fn().mockResolvedValue({ success: true, data: [] })
    }
}));

vi.mock('../../services/patientService', () => ({
    patientService: {
        updatePatient: vi.fn().mockResolvedValue({ success: true }),
        getPatientById: vi.fn().mockResolvedValue({ success: true, data: {} })
    }
}));

vi.mock('../../services/consentFormService', () => ({
    consentFormService: {
        getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getConsentFormFile: vi.fn()
    }
}));

vi.mock('../../services/authService', () => ({
    default: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: 1, role: 'urologist' })
    }
}));

vi.mock('../../services/mdtService', () => ({
    mdtService: {
        getMDTSchedules: vi.fn().mockResolvedValue({ success: true, data: [] })
    }
}));

// Mock AddInvestigationResultModal
vi.mock('../AddInvestigationResultModal', () => ({
    default: ({ isOpen, onClose, investigationRequest, existingResult, patient }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="add-investigation-result-modal">
                <div>Modal Open</div>
                {investigationRequest && <div data-testid="investigation-request">{investigationRequest.investigationName || investigationRequest.investigation_name}</div>}
                {existingResult && <div data-testid="existing-result">{existingResult.id || 'existing'}</div>}
                {patient && <div data-testid="patient">{patient.name}</div>}
                <button onClick={onClose} data-testid="close-modal">Close</button>
            </div>
        );
    }
}));

describe('UrologistPatientDetailsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.open
        global.window.open = vi.fn();
    });

    it('should not render when isOpen is false', async () => {
        const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

        const { container } = render(
            <UrologistPatientDetailsModal
                isOpen={false}
                onClose={vi.fn()}
                patient={{ id: 1, name: 'Test Patient' }}
                loading={false}
                error={null}
                onTransferSuccess={vi.fn()}
            />
        );

        // When isOpen is false, the modal should not render any content
        expect(container.firstChild).toBeNull();
    }, 10000);

    it('should render modal header when isOpen is true', async () => {
        const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

        render(
            <UrologistPatientDetailsModal
                isOpen={true}
                onClose={vi.fn()}
                patient={{ id: 1, name: 'Test Patient', upi: 'UPI123' }}
                loading={false}
                error={null}
                onTransferSuccess={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test Patient')).toBeInTheDocument();
        });
    });

    describe('Edit/Re-upload functionality', () => {
        it('should show Edit button next to View button when result is uploaded', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    status: 'pending'
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    filePath: 'uploads/test-file.pdf',
                    file_path: 'uploads/test-file.pdf',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15'
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load and switch to Clinical Investigation tab
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Wait for the View button to appear
            await waitFor(() => {
                const viewButtons = screen.queryAllByText(/View.*Result/i);
                expect(viewButtons.length).toBeGreaterThan(0);
            }, { timeout: 5000 });

            // Check if Edit button is present
            const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
            expect(editButtons.length).toBeGreaterThan(0);
        });

        it('should open AddInvestigationResultModal with existing result when Edit button is clicked', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    status: 'pending'
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    filePath: 'uploads/test-file.pdf',
                    file_path: 'uploads/test-file.pdf',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15'
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load and switch to Clinical Investigation tab
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Wait for Edit button and click it
            await waitFor(() => {
                const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
                if (editButtons.length > 0) {
                    fireEvent.click(editButtons[0]);
                }
            }, { timeout: 5000 });

            // Check if modal opens with existing result
            await waitFor(() => {
                expect(screen.getByTestId('add-investigation-result-modal')).toBeInTheDocument();
                expect(screen.getByTestId('existing-result')).toBeInTheDocument();
            });
        });

        it('should handle Edit button click when investigation request is clinical investigation', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    noteId: 100,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    investigationType: 'imaging',
                    investigation_type: 'imaging',
                    scheduledDate: '2025-01-15',
                    scheduled_date: '2025-01-15',
                    status: 'pending',
                    notes: 'Test notes',
                    isClinicalInvestigation: true
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    filePath: 'uploads/test-file.pdf',
                    file_path: 'uploads/test-file.pdf',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15'
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load and switch to Clinical Investigation tab
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Wait for Edit button and click it
            await waitFor(() => {
                const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
                if (editButtons.length > 0) {
                    fireEvent.click(editButtons[0]);
                }
            }, { timeout: 5000 });

            // Check if modal opens
            await waitFor(() => {
                expect(screen.getByTestId('add-investigation-result-modal')).toBeInTheDocument();
            });
        });

        it('should handle Edit button in view results modal section', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    status: 'pending'
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    filePath: 'uploads/test-file.pdf',
                    file_path: 'uploads/test-file.pdf',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15',
                    date: '2025-01-15'
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load and switch to Clinical Investigation tab
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Wait for View button to appear and click it to open view results modal
            await waitFor(() => {
                const viewButtons = screen.queryAllByText(/View.*Result/i);
                if (viewButtons.length > 0) {
                    fireEvent.click(viewButtons[0]);
                }
            }, { timeout: 5000 });

            // Wait for view results modal to open and check for Edit button
            await waitFor(() => {
                const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
                // Edit button should be present in view results modal
                expect(editButtons.length).toBeGreaterThan(0);
            }, { timeout: 5000 });
        });

        it('should not show Edit button when filePath is missing', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    status: 'pending'
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15'
                    // No filePath
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Edit button should not appear when there's no filePath
            await waitFor(() => {
                const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
                expect(editButtons.length).toBe(0);
            }, { timeout: 5000 });
        });

        it('should reset selectedExistingResult when modal closes', async () => {
            const { investigationService } = await import('../../services/investigationService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigationName: 'MRI',
                    investigation_name: 'MRI',
                    status: 'pending'
                }
            ];

            const mockTestResults = [
                {
                    id: 1,
                    testName: 'MRI',
                    test_name: 'MRI',
                    filePath: 'uploads/test-file.pdf',
                    file_path: 'uploads/test-file.pdf',
                    result: 'Normal',
                    notes: 'Test notes',
                    testDate: '2025-01-15',
                    test_date: '2025-01-15'
                }
            ];

            investigationService.getInvestigationRequests = vi.fn().mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults = vi.fn().mockResolvedValue({
                success: true,
                data: mockTestResults
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    loading={false}
                    error={null}
                    onTransferSuccess={vi.fn()}
                />
            );

            // Wait for data to load and switch to Clinical Investigation tab
            await waitFor(() => {
                const clinicalInvestigationTab = screen.queryByText('Clinical Investigation');
                if (clinicalInvestigationTab) {
                    fireEvent.click(clinicalInvestigationTab);
                }
            });

            // Wait for Edit button and click it
            await waitFor(() => {
                const editButtons = document.querySelectorAll('button[title="Edit/Re-upload result"]');
                if (editButtons.length > 0) {
                    fireEvent.click(editButtons[0]);
                }
            }, { timeout: 5000 });

            // Check if modal opens
            await waitFor(() => {
                expect(screen.getByTestId('add-investigation-result-modal')).toBeInTheDocument();
            });

            // Close the modal
            const closeButton = screen.getByTestId('close-modal');
            fireEvent.click(closeButton);

            // Modal should be closed
            await waitFor(() => {
                expect(screen.queryByTestId('add-investigation-result-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Consent Form Print Button', () => {
        it('should disable Print button when template is not available', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigation_name: 'TRUS GUIDED BIOPSY',
                    investigationName: 'TRUS GUIDED BIOPSY',
                    status: 'pending',
                    test_date: '2025-12-29'
                }
            ];

            consentFormService.getConsentFormTemplates.mockResolvedValue({
                success: true,
                data: [] // No templates available
            });

            consentFormService.getPatientConsentForms.mockResolvedValue({
                success: true,
                data: []
            });

            investigationService.getInvestigationRequests.mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    onPatientUpdated={vi.fn()}
                />
            );

            await waitFor(() => {
                const tab = screen.queryByText('Clinical Investigation');
                if (tab) {
                    fireEvent.click(tab);
                }
            });

            await waitFor(() => {
                const printButtons = screen.getAllByText('Print');
                if (printButtons.length > 0) {
                    const printButton = printButtons[0];
                    expect(printButton).toBeDisabled();
                    expect(printButton).toHaveAttribute('title', 'Consent form template not available. Please create one in the superadmin panel.');
                }
            }, { timeout: 5000 });
        });

        it('should enable Print button when template is available', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigation_name: 'TRUS GUIDED BIOPSY',
                    investigationName: 'TRUS GUIDED BIOPSY',
                    status: 'pending',
                    test_date: '2025-12-29'
                }
            ];

            const mockTemplate = {
                id: 1,
                test_name: 'TRUS GUIDED BIOPSY',
                template_file_url: 'http://example.com/template.pdf',
                is_auto_generated: false
            };

            consentFormService.getConsentFormTemplates.mockResolvedValue({
                success: true,
                data: [mockTemplate]
            });

            consentFormService.getPatientConsentForms.mockResolvedValue({
                success: true,
                data: []
            });

            investigationService.getInvestigationRequests.mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    onPatientUpdated={vi.fn()}
                />
            );

            await waitFor(() => {
                const tab = screen.queryByText('Clinical Investigation');
                if (tab) {
                    fireEvent.click(tab);
                }
            });

            await waitFor(() => {
                const printButtons = screen.getAllByText('Print');
                if (printButtons.length > 0) {
                    const printButton = printButtons[0];
                    expect(printButton).not.toBeDisabled();
                    expect(printButton).toHaveAttribute('title', 'Print consent form');
                }
            }, { timeout: 5000 });
        });

        it('should show Template Not Available badge when template is missing', async () => {
            const { consentFormService } = await import('../../services/consentFormService');
            const UrologistPatientDetailsModal = (await import('../UrologistPatientDetailsModal')).default;

            const mockInvestigationRequests = [
                {
                    id: 1,
                    investigation_name: 'TRUS VOLUME ASSESSMENT',
                    investigationName: 'TRUS VOLUME ASSESSMENT',
                    status: 'pending',
                    test_date: '2025-12-29'
                }
            ];

            consentFormService.getConsentFormTemplates.mockResolvedValue({
                success: true,
                data: []
            });

            consentFormService.getPatientConsentForms.mockResolvedValue({
                success: true,
                data: []
            });

            investigationService.getInvestigationRequests.mockResolvedValue({
                success: true,
                data: mockInvestigationRequests
            });

            investigationService.getPatientInvestigationResults.mockResolvedValue({
                success: true,
                data: []
            });

            render(
                <UrologistPatientDetailsModal
                    isOpen={true}
                    onClose={vi.fn()}
                    patient={{ id: 1, name: 'Test Patient' }}
                    onPatientUpdated={vi.fn()}
                />
            );

            await waitFor(() => {
                const tab = screen.queryByText('Clinical Investigation');
                if (tab) {
                    fireEvent.click(tab);
                }
            });

            await waitFor(() => {
                const badge = screen.queryByText('Template Not Available');
                expect(badge).toBeInTheDocument();
            }, { timeout: 5000 });
        });
    });
});

