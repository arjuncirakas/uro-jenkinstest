/**
 * Tests for InvestigationRequestItem component
 * Ensures 100% coverage including all rendering scenarios and interactions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InvestigationRequestItem from '../InvestigationRequestItem';
import React from 'react';

// Mock dependencies
vi.mock('../ConsentFormSection', () => ({
  default: ({ investigationName }) => <div data-testid="consent-form-section">{investigationName}</div>
}));

vi.mock('../InvestigationResultItem', () => ({
  default: ({ result }) => <div data-testid="result-item">{result.id}</div>
}));

const mockComputeConsentFormData = vi.fn(() => ({
  isPSATest: false,
  templateToUse: { id: 1 },
  hasUploadedForm: false,
  patientConsentForm: null
}));

vi.mock('../../utils/consentFormHelpers', () => ({
  computeConsentFormData: mockComputeConsentFormData
}));

describe('InvestigationRequestItem', () => {
  const mockRequest = {
    id: 1,
    investigationName: 'MRI',
    status: 'pending',
    notes: 'Test notes'
  };

  const mockPatient = {
    id: 1,
    name: 'Test Patient'
  };

  const mockInvestigationService = {
    updateInvestigationRequestStatus: vi.fn()
  };

  const defaultProps = {
    request: mockRequest,
    investigationName: 'MRI',
    hasResults: false,
    uploadedResult: null,
    sortedResults: [],
    patient: mockPatient,
    consentFormTemplates: [],
    printingConsentForm: false,
    uploadingConsentForms: {},
    getConsentFormTemplate: vi.fn(),
    getPatientConsentForm: vi.fn(),
    getPrintButtonTitle: vi.fn(() => 'Print'),
    handlePrintConsentForm: vi.fn(),
    handleConsentFormUpload: vi.fn(),
    handleViewConsentForm: vi.fn(),
    handleEditResult: vi.fn(),
    handleViewFile: vi.fn(),
    renderUploadButton: vi.fn(() => <button>Upload</button>),
    investigationService: mockInvestigationService,
    setErrorModalTitle: vi.fn(),
    setErrorModalMessage: vi.fn(),
    setIsErrorModalOpen: vi.fn(),
    setSuccessModalTitle: vi.fn(),
    setSuccessModalMessage: vi.fn(),
    setIsSuccessModalOpen: vi.fn(),
    fetchInvestigationRequests: vi.fn(),
    showErrorAlert: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.dispatchEvent = vi.fn();
    // Reset mock to default non-PSA value
    mockComputeConsentFormData.mockReturnValue({
      isPSATest: false,
      templateToUse: { id: 1 },
      hasUploadedForm: false,
      patientConsentForm: null
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render investigation request item', () => {
      render(<InvestigationRequestItem {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'MRI' })).toBeInTheDocument();
    });

    it('should show not required badge when status is not_required', () => {
      const request = { ...mockRequest, status: 'not_required' };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      expect(screen.getByText('Not Required')).toBeInTheDocument();
    });

    it('should render notes when no results', () => {
      render(<InvestigationRequestItem {...defaultProps} />);
      expect(screen.getByText('Test notes')).toBeInTheDocument();
    });

    it('should render upload button when no results', () => {
      render(<InvestigationRequestItem {...defaultProps} />);
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    const mockResults = [
      { id: 1, date: '2025-01-15', result: 'Normal' },
      { id: 2, date: '2025-01-16', result: 'Abnormal' }
    ];

    it('should render result items when hasResults is true', () => {
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          sortedResults={mockResults}
        />
      );
      expect(screen.getAllByTestId('result-item')).toHaveLength(2);
    });

    it('should render view and edit buttons when result has filePath', () => {
      const uploadedResult = {
        id: 1,
        filePath: 'uploads/test.pdf'
      };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={mockResults}
        />
      );
      expect(screen.getByText(/View MRI Result/)).toBeInTheDocument();
      expect(screen.getByTitle('Edit/Re-upload result')).toBeInTheDocument();
    });

    it('should not render view/edit buttons when result has no filePath', () => {
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={{ id: 1 }}
          sortedResults={mockResults}
        />
      );
      expect(screen.queryByText(/View.*Result/)).not.toBeInTheDocument();
    });
  });

  describe('View File', () => {
    it('should call handleViewFile when view button clicked', () => {
      const handleViewFile = vi.fn();
      const uploadedResult = {
        id: 1,
        filePath: 'uploads/test.pdf'
      };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
          handleViewFile={handleViewFile}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      expect(handleViewFile).toHaveBeenCalledWith('uploads/test.pdf');
    });

    it('should open file in new window when handleViewFile not provided', () => {
      const uploadedResult = {
        id: 1,
        filePath: 'uploads/test.pdf'
      };
      window.open = vi.fn();
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
          handleViewFile={undefined}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      expect(window.open).toHaveBeenCalled();
    });

    it('should handle HTTP file paths', () => {
      const handleViewFile = vi.fn();
      const uploadedResult = {
        id: 1,
        filePath: 'https://example.com/file.pdf'
      };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
          handleViewFile={handleViewFile}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      expect(handleViewFile).toHaveBeenCalledWith('https://example.com/file.pdf');
    });
  });

  describe('Edit Result', () => {
    it('should call handleEditResult when edit button clicked', () => {
      const handleEditResult = vi.fn();
      const uploadedResult = {
        id: 1,
        filePath: 'uploads/test.pdf'
      };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
          handleEditResult={handleEditResult}
        />
      );
      const editButton = screen.getByTitle('Edit/Re-upload result');
      fireEvent.click(editButton);
      expect(handleEditResult).toHaveBeenCalledWith(mockRequest, uploadedResult);
    });
  });

  describe('Status Update', () => {
    it('should show not required button when conditions are met', () => {
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'pending'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      expect(screen.getByText('Not Required')).toBeInTheDocument();
    });

    it('should not show not required button when hasResults is true', () => {
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          sortedResults={[{ id: 1 }]}
        />
      );
      expect(screen.queryByText('Not Required')).not.toBeInTheDocument();
    });

    it('should not show not required button for clinical investigation', () => {
      const request = {
        ...mockRequest,
        isClinicalInvestigation: true
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      expect(screen.queryByText('Not Required')).not.toBeInTheDocument();
    });

    it('should show Required button when status is not_required', () => {
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'not_required'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.queryByText('Not Required')).not.toBeInTheDocument();
    });

    it('should update status to pending when Required button clicked', async () => {
      const mockUpdateStatus = vi.fn().mockResolvedValue({ success: true });
      mockInvestigationService.updateInvestigationRequestStatus = mockUpdateStatus;
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'not_required'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      const button = screen.getByText('Required');
      fireEvent.click(button);
      await waitFor(() => {
        expect(mockUpdateStatus).toHaveBeenCalledWith(1, 'pending');
      });
      await waitFor(() => {
        expect(defaultProps.fetchInvestigationRequests).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to REQUIRED.')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss Required toast after 3 seconds', async () => {
      const mockUpdateStatus = vi.fn().mockResolvedValue({ success: true });
      mockInvestigationService.updateInvestigationRequestStatus = mockUpdateStatus;
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'not_required'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      const button = screen.getByText('Required');
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to REQUIRED.')).toBeInTheDocument();
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      await waitFor(() => {
        expect(screen.queryByText('Investigation status updated to REQUIRED.')).not.toBeInTheDocument();
      });
    });

    it('should update status when not required button clicked', async () => {
      mockInvestigationService.updateInvestigationRequestStatus.mockResolvedValue({
        success: true
      });
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'pending'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      const button = screen.getByText('Not Required');
      await act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(mockInvestigationService.updateInvestigationRequestStatus).toHaveBeenCalledWith(1, 'not_required');
      });
      expect(defaultProps.fetchInvestigationRequests).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to NOT REQUIRED.')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss toast after 3 seconds', async () => {
      const mockUpdateStatus = vi.fn().mockResolvedValue({ success: true });
      mockInvestigationService.updateInvestigationRequestStatus = mockUpdateStatus;
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'pending'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      const button = screen.getByText('Not Required');
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to NOT REQUIRED.')).toBeInTheDocument();
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      await waitFor(() => {
        expect(screen.queryByText('Investigation status updated to NOT REQUIRED.')).not.toBeInTheDocument();
      });
    });

    it('should handle status update error', async () => {
      const mockUpdateStatus = vi.fn().mockRejectedValue(new Error('Update failed'));
      mockInvestigationService.updateInvestigationRequestStatus = mockUpdateStatus;
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'pending'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      const button = screen.getByText('Not Required');
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Failed to update investigation request status')).toBeInTheDocument();
      });
    });

    it('should not update status when request has no id', async () => {
      const request = {
        ...mockRequest,
        id: null,
        isClinicalInvestigation: false
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} />);
      expect(screen.queryByText('Not Required')).not.toBeInTheDocument();
    });
  });

  describe('Consent Form Section', () => {
    it('should render consent form section for non-PSA tests', () => {
      render(<InvestigationRequestItem {...defaultProps} />);
      expect(screen.getByTestId('consent-form-section')).toBeInTheDocument();
    });

    it('should not render consent form section for PSA tests', () => {
      // Override mock for this specific test to return PSA test
      mockComputeConsentFormData.mockReturnValueOnce({ 
        isPSATest: true,
        templateToUse: null,
        hasUploadedForm: false,
        patientConsentForm: null
      });
      const { queryByTestId } = render(<InvestigationRequestItem {...defaultProps} />);
      // For PSA tests, the consent form section should not render
      // The component checks !consentFormData.isPSATest before rendering
      expect(queryByTestId('consent-form-section')).not.toBeInTheDocument();
    });
  });
});

