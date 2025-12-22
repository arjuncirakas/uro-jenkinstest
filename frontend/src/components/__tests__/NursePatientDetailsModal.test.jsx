import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
        getPatientInvestigationResults: vi.fn().mockResolvedValue({ success: true, data: [] })
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
        getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] })
    }
}));

describe('NursePatientDetailsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when isOpen is false', async () => {
        const NursePatientDetailsModal = (await import('../NursePatientDetailsModal')).default;

        const { container } = render(
            <NursePatientDetailsModal
                isOpen={false}
                onClose={vi.fn()}
                patient={{ id: 1, name: 'Test Patient' }}
                onPatientUpdated={vi.fn()}
            />
        );

        // When isOpen is false, the modal should not render any content
        expect(container.firstChild).toBeNull();
    });

    it('should render modal header when isOpen is true', async () => {
        const NursePatientDetailsModal = (await import('../NursePatientDetailsModal')).default;

        render(
            <NursePatientDetailsModal
                isOpen={true}
                onClose={vi.fn()}
                patient={{ id: 1, name: 'Test Patient', upi: 'UPI123' }}
                onPatientUpdated={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test Patient')).toBeInTheDocument();
        });
    });
});
