import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InvestigationManagement from '../InvestigationManagement';
import { investigationService } from '../../../services/investigationService';
import React from 'react';

// Mock services
vi.mock('../../../services/investigationService', () => ({
    investigationService: {
        getAllInvestigations: vi.fn(),
        getInvestigationRequests: vi.fn(),
        getInvestigationResults: vi.fn(),
        viewFile: vi.fn(),
        updateInvestigationRequestStatus: vi.fn(),
    }
}));

vi.mock('../../../services/patientService', () => ({
    patientService: {
        getPatientById: vi.fn(),
    }
}));

// Mock child components to avoid deep rendering issues
vi.mock('../../../components/layout/NurseHeader', () => ({
    default: ({ title }) => <div data-testid="nurse-header">{title}</div>
}));

vi.mock('../../../components/NursePatientDetailsModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="patient-details-modal">Patient Modal</div> : null
}));

vi.mock('../../../components/AddInvestigationResultModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="add-result-modal">Add Result Modal</div> : null
}));

vi.mock('../../../components/PDFViewerModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="pdf-modal">PDF Modal</div> : null
}));

describe('InvestigationManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        investigationService.getAllInvestigations.mockResolvedValue({ success: true, data: [] });

        render(
            <MemoryRouter>
                <InvestigationManagement />
            </MemoryRouter>
        );

        expect(screen.getByTestId('nurse-header')).toHaveTextContent('Investigation Management');
        // Initial render triggers useEffect, which calls getAllInvestigations
        await waitFor(() => {
            expect(investigationService.getAllInvestigations).toHaveBeenCalled();
        });
        // Investigation Table should be present (headers)
        expect(screen.getByText(/All Investigations/)).toBeInTheDocument();
    });

    it('renders investigations data', async () => {
        const mockData = [
            {
                id: 1,
                patientName: 'John Doe',
                upi: 'UPI123',
                age: 45,
                psa: '3.5',
                urologist: 'Dr. Smith',
                appointmentDate: '2025-01-01',
                appointmentTime: '10:00',
                mri: 'not_required',
                biopsy: 'pending',
                trus: 'completed'
            }
        ];
        investigationService.getAllInvestigations.mockResolvedValue({ success: true, data: mockData });

        render(
            <MemoryRouter>
                <InvestigationManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('UPI: UPI123 • 45 years old')).toBeInTheDocument();
            expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        });
    });

    it('handles error fetching investigations', async () => {
        investigationService.getAllInvestigations.mockResolvedValue({ success: false, error: 'Network Error' });

        render(
            <MemoryRouter>
                <InvestigationManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Network Error')).toBeInTheDocument();
        });
    });
});
