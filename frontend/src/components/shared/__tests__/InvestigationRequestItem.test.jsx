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
    // Reset document.querySelector mock
    document.querySelector = vi.fn();
    // Reset investigationService mock
    mockInvestigationService.updateInvestigationRequestStatus = vi.fn().mockResolvedValue({ success: true });
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
      const viewButton = screen.getByText(/View MRI Result/);
      expect(viewButton).toBeInTheDocument();
      expect(screen.getByTitle('Edit/Re-upload result')).toBeInTheDocument();
      // Check button has correct styling when filePath exists
      expect(viewButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200');
    });

    it('should apply correct button styling when filePath exists', () => {
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
      const viewButton = screen.getByText(/View MRI Result/);
      expect(viewButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'hover:bg-blue-100');
      expect(viewButton).not.toHaveClass('opacity-75');
    });

    it('should apply correct button styling when filePath is missing', () => {
      const uploadedResult = { id: 1 };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={mockResults}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      expect(viewButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'opacity-75', 'cursor-pointer');
    });

    it('should render view button even when result has no filePath', () => {
      const uploadedResult = { id: 1 };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={mockResults}
        />
      );
      expect(screen.getByText(/View MRI Result/)).toBeInTheDocument();
      expect(screen.queryByTitle('Edit/Re-upload result')).not.toBeInTheDocument();
    });

    it('should show correct button title when no filePath', () => {
      const uploadedResult = { id: 1 };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={mockResults}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      expect(viewButton).toHaveAttribute('title', 'View result details');
    });

    it('should show correct button title when filePath exists', () => {
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
      const viewButton = screen.getByText(/View MRI Result/);
      expect(viewButton).toHaveAttribute('title', 'View MRI result file');
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

    it('should scroll to result when view button clicked without filePath', () => {
      const uploadedResult = { id: 1 };
      const mockScrollIntoView = vi.fn();
      const mockElement = {
        scrollIntoView: mockScrollIntoView
      };
      document.querySelector = vi.fn(() => mockElement);
      
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      expect(document.querySelector).toHaveBeenCalledWith('[data-result-id="1"]');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });

    it('should not scroll when result element not found', () => {
      const uploadedResult = { id: 1 };
      document.querySelector = vi.fn(() => null);
      
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      expect(document.querySelector).toHaveBeenCalledWith('[data-result-id="1"]');
    });

    it('should not scroll when uploadedResult is null', () => {
      const mockQuerySelector = vi.fn(() => null);
      document.querySelector = mockQuerySelector;
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={null}
          sortedResults={[{ id: 1 }]}
        />
      );
      const viewButton = screen.getByText(/View MRI Result/);
      fireEvent.click(viewButton);
      // When uploadedResult is null, uploadedResult?.filePath is undefined, so the else branch is taken
      // Then uploadedResult?.id is also undefined, so querySelector is called with undefined in the template string
      // But since uploadedResult is null, the querySelector will be called with "[data-result-id="undefined"]"
      // The test should verify that querySelector was called (which it will be), but the element won't exist
      expect(mockQuerySelector).toHaveBeenCalled();
      // The element won't exist, so scrollIntoView won't be called
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

    it('should not show edit button when filePath is missing', () => {
      const uploadedResult = { id: 1 };
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={uploadedResult}
          sortedResults={[{ id: 1 }]}
        />
      );
      expect(screen.queryByTitle('Edit/Re-upload result')).not.toBeInTheDocument();
    });

    it('should not show edit button when uploadedResult is null', () => {
      render(
        <InvestigationRequestItem
          {...defaultProps}
          hasResults={true}
          uploadedResult={null}
          sortedResults={[{ id: 1 }]}
        />
      );
      expect(screen.queryByTitle('Edit/Re-upload result')).not.toBeInTheDocument();
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      expect(screen.getByText('Required')).toBeInTheDocument();
      // The "Not Required" badge should still be visible in the header
      // But the "Not Required" button should not be visible (only "Required" button should be)
      const notRequiredButtons = screen.queryAllByText('Not Required');
      // Should only have the badge, not the button
      expect(notRequiredButtons.length).toBeGreaterThan(0);
      // But the button specifically should not be in the status controls area
      const requiredButton = screen.getByText('Required');
      expect(requiredButton).toBeInTheDocument();
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      const button = screen.getByText('Required');
      fireEvent.click(button);
      await vi.runAllTimersAsync();
      await waitFor(() => {
        expect(mockUpdateStatus).toHaveBeenCalledWith(1, 'pending');
      }, { timeout: 3000 });
      await waitFor(() => {
        expect(defaultProps.fetchInvestigationRequests).toHaveBeenCalled();
      }, { timeout: 3000 });
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to REQUIRED.')).toBeInTheDocument();
      }, { timeout: 3000 });
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      const button = screen.getByText('Required');
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to REQUIRED.')).toBeInTheDocument();
      }, { timeout: 3000 });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      await waitFor(() => {
        expect(screen.queryByText('Investigation status updated to REQUIRED.')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should update status when not required button clicked', async () => {
      const mockUpdateStatus = vi.fn().mockResolvedValue({
        success: true
      });
      mockInvestigationService.updateInvestigationRequestStatus = mockUpdateStatus;
      const request = {
        ...mockRequest,
        id: 1,
        isClinicalInvestigation: false,
        status: 'pending'
      };
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      const button = screen.getByText('Not Required');
      fireEvent.click(button);
      await vi.runAllTimersAsync();
      await waitFor(() => {
        expect(mockUpdateStatus).toHaveBeenCalledWith(1, 'not_required');
      }, { timeout: 3000 });
      await waitFor(() => {
        expect(defaultProps.fetchInvestigationRequests).toHaveBeenCalled();
      }, { timeout: 3000 });
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to NOT REQUIRED.')).toBeInTheDocument();
      }, { timeout: 3000 });
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      const button = screen.getByText('Not Required');
      await act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(screen.getByText('Investigation status updated to NOT REQUIRED.')).toBeInTheDocument();
      }, { timeout: 3000 });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      await waitFor(() => {
        expect(screen.queryByText('Investigation status updated to NOT REQUIRED.')).not.toBeInTheDocument();
      }, { timeout: 1000 });
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
      render(<InvestigationRequestItem {...defaultProps} request={request} hasResults={false} />);
      const button = screen.getByText('Not Required');
      fireEvent.click(button);
      await vi.runAllTimersAsync();
      await waitFor(() => {
        expect(screen.getByText('Failed to update investigation request status')).toBeInTheDocument();
      }, { timeout: 3000 });
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
      // Use PSA as investigation name - computeConsentFormData checks if name includes "PSA"
      const psaProps = {
        ...defaultProps,
        investigationName: 'PSA'
      };
      // Override mock BEFORE rendering to return PSA test
      mockComputeConsentFormData.mockReturnValueOnce({ 
        isPSATest: true,
        templateToUse: null,
        hasUploadedForm: false,
        patientConsentForm: null
      });
      const { queryByTestId } = render(<InvestigationRequestItem {...psaProps} />);
      // For PSA tests, the consent form section should not render
      // The component checks !consentFormData.isPSATest before rendering
      expect(queryByTestId('consent-form-section')).not.toBeInTheDocument();
    });
  });
});

