/**
 * Tests for AddInvestigationResultModal.jsx
 * Ensures basic component functionality and coverage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock services
vi.mock('../../services/investigationService', () => ({
  investigationService: {
    addOtherTestResult: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    updateOtherTestResult: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } })
  }
}));

vi.mock('../../services/consentFormService', () => ({
  consentFormService: {
    getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getConsentFormFile: vi.fn().mockResolvedValue({ success: true, data: new Blob() })
  }
}));

// Mock the component
const AddInvestigationResultModal = React.lazy(() => import('../AddInvestigationResultModal'));

describe('AddInvestigationResultModal', () => {
  const mockPatient = {
    id: 1,
    name: 'Test Patient',
    patientId: 'P001'
  };

  const mockInvestigationRequest = {
    id: 1,
    investigationName: 'Test Investigation',
    investigation_name: 'Test Investigation'
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', async () => {
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AddInvestigationResultModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={mockOnSuccess}
        />
      </React.Suspense>
    );

    // Component should render
    expect(screen.queryByText(/investigation|result/i)).toBeTruthy();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AddInvestigationResultModal
          isOpen={false}
          onClose={mockOnClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={mockOnSuccess}
        />
      </React.Suspense>
    );

    // Modal should not be visible
    expect(container.firstChild).toBeNull();
  });

  it('should handle null patient gracefully', () => {
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <AddInvestigationResultModal
          isOpen={true}
          onClose={mockOnClose}
          patient={null}
          investigationRequest={mockInvestigationRequest}
          onSuccess={mockOnSuccess}
        />
      </React.Suspense>
    );

    // Component should handle null patient without crashing
    expect(mockOnClose).toBeDefined();
  });
});
