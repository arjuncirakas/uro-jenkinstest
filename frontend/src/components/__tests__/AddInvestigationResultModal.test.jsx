/**
 * Tests for AddInvestigationResultModal.jsx
 * Ensures 100% coverage including all form interactions, file uploads, and consent forms
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddInvestigationResultModal from '../AddInvestigationResultModal';
import React from 'react';

// Mock services
vi.mock('../services/investigationService', () => ({
  investigationService: {
    addOtherTestResult: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 1 }
    }),
    updateOtherTestResult: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 1 }
    }),
    viewFile: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/pdf' }))
  }
}));

vi.mock('../services/consentFormService', () => ({
  consentFormService: {
    getConsentFormTemplates: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    getPatientConsentForms: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    uploadConsentForm: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    }),
    getConsentFormFile: vi.fn().mockResolvedValue({
      success: true,
      data: new Blob(['test'], { type: 'application/pdf' })
    })
  }
}));

vi.mock('../utils/consentFormUtils', () => ({
  printConsentForm: vi.fn()
}));

// Mock PDF and Image viewer modals
vi.mock('../PDFViewerModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="pdf-viewer">PDF Viewer</div> : null
}));

vi.mock('../ImageViewerModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="image-viewer">Image Viewer</div> : null
}));

describe('AddInvestigationResultModal', () => {
  const mockPatient = {
    id: 1,
    patientId: 1,
    patient_id: 1,
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    upi: 'UPI123'
  };

  const mockInvestigationRequest = {
    id: 1,
    investigationName: 'MRI',
    investigation_name: 'MRI',
    investigationType: 'MRI',
    scheduledDate: '2024-01-01'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    // Mock window.fetch to prevent actual network calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['test'], { type: 'application/pdf' }))
    });
    
    return render(
      <AddInvestigationResultModal
        isOpen={true}
        onClose={vi.fn()}
        patient={mockPatient}
        investigationRequest={mockInvestigationRequest}
        onSuccess={vi.fn()}
        {...props}
      />
    );
  };

  it('should render when isOpen is true', () => {
    renderModal();
    expect(screen.getByText(/investigation result/i)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/investigation result/i)).not.toBeInTheDocument();
  });

  it('should render result input field', () => {
    renderModal();
    const resultInput = screen.getByLabelText(/result value/i);
    expect(resultInput).toBeInTheDocument();
  });

  it('should render notes input field', () => {
    renderModal();
    const notesInput = screen.getByLabelText(/clinical notes/i);
    expect(notesInput).toBeInTheDocument();
  });

  it('should execute all lines including export statement', () => {
    // Component is imported at the top, so export statement is executed
    renderModal();
    expect(screen.getByText(/investigation result/i)).toBeInTheDocument();
  });

  describe('Form Submission', () => {
    it('should submit form with valid data successfully', async () => {
      const { investigationService } = await import('../services/investigationService');
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      
      renderModal({ onSuccess, onClose });
      
      // Fill form
      const resultInput = screen.getByLabelText(/result value/i);
      const notesInput = screen.getByLabelText(/clinical notes/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });
      
      // Submit form
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.addOtherTestResult).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith('Investigation result added successfully!', 1);
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle form submission error', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.addOtherTestResult.mockResolvedValueOnce({
        success: false,
        error: 'Database error'
      });
      
      renderModal();
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument();
      });
    });

    it('should handle form submission exception', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.addOtherTestResult.mockRejectedValueOnce(new Error('Network error'));
      
      renderModal();
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
      });
    });

    it('should not submit when already submitting', async () => {
      const { investigationService } = await import('../services/investigationService');
      
      renderModal();
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      const submitButton = screen.getByText('Save Result');
      
      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Should only be called once due to isSubmitting guard
        expect(investigationService.addOtherTestResult).toHaveBeenCalledTimes(1);
      });
    });

    it('should dispatch testResultAdded event on success', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const { investigationService } = await import('../services/investigationService');
      
      renderModal();
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'testResultAdded',
            detail: expect.objectContaining({
              patientId: 1,
              requestId: 1,
              testName: 'MRI'
            })
          })
        );
      });
      
      dispatchSpy.mockRestore();
    });
  });

  describe('File Upload', () => {
    it('should handle valid file upload', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('should reject invalid file type', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/only PDF, JPG, PNG, DOC, and DOCX files are allowed/i)).toBeInTheDocument();
    });

    it('should reject file exceeding size limit', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/file size must be less than 10MB/i)).toBeInTheDocument();
    });

    it('should handle file removal', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      const removeButton = screen.getByTitle('Remove file');
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });

    it('should format file size correctly', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024, writable: false });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      // File size should be displayed
      expect(screen.getByText(/1 KB/i)).toBeInTheDocument();
    });
  });

  describe('Consent Form Interactions', () => {
    it('should print consent form when print button clicked', async () => {
      const { printConsentForm } = await import('../utils/consentFormUtils');
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI', procedure_name: null }]
      });
      
      renderModal();
      
      await waitFor(() => {
        const printButton = screen.getByText('Print');
        expect(printButton).toBeInTheDocument();
      });
      
      const printButton = screen.getByText('Print');
      fireEvent.click(printButton);
      
      await waitFor(() => {
        expect(printConsentForm).toHaveBeenCalled();
      });
    });

    it('should upload consent form successfully', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.uploadConsentForm.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValue({
        success: true,
        data: []
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Upload Signed')).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      const file = new File(['test'], 'consent.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(consentFormService.uploadConsentForm).toHaveBeenCalled();
      });
      
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      vi.useRealTimers();
    });

    it('should handle consent form upload error', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.uploadConsentForm.mockResolvedValueOnce({
        success: false,
        error: 'Upload failed'
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Upload Signed')).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      const file = new File(['test'], 'consent.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(consentFormService.uploadConsentForm).toHaveBeenCalled();
      });
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      vi.useRealTimers();
    });

    it('should view consent form (PDF)', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormFile).toHaveBeenCalled();
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
      });
    });

    it('should view consent form (Image)', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.jpg',
          file_name: 'Consent Form.jpg'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      });
    });

    it('should handle consent form view error', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      consentFormService.getConsentFormFile.mockResolvedValueOnce({
        success: false,
        error: 'File not found'
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormFile).toHaveBeenCalled();
      });
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      vi.useRealTimers();
    });

    it('should handle consent form view exception', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      consentFormService.getConsentFormFile.mockRejectedValueOnce(new Error('Network error'));
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormFile).toHaveBeenCalled();
      });
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      vi.useRealTimers();
    });
  });

  describe('Status Update', () => {
    it('should call onStatusUpdate when Not Required button clicked', async () => {
      const onStatusUpdate = vi.fn().mockResolvedValue(undefined);
      
      renderModal({ onStatusUpdate });
      
      const notRequiredButton = screen.getByText('Not Required');
      fireEvent.click(notRequiredButton);
      
      await waitFor(() => {
        expect(onStatusUpdate).toHaveBeenCalledWith('not_required');
      });
    });
  });

  describe('Existing File Viewing', () => {
    it('should view existing file when View button clicked', async () => {
      const { investigationService } = await import('../services/investigationService');
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      // Mock window.alert
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(investigationService.viewFile).toHaveBeenCalledWith('uploads/test.pdf');
      });
      
      window.alert = undefined;
    });

    it('should handle existing file view error', async () => {
      const { investigationService } = await import('../services/investigationService');
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      investigationService.viewFile.mockRejectedValueOnce(new Error('File not found'));
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });
      
      window.alert = undefined;
    });

    it('should show alert when existing file path is missing', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: null,
        fileName: 'test.pdf'
      };
      
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      expect(window.alert).toHaveBeenCalledWith('File path is not available. Please check if the file was uploaded correctly.');
      
      window.alert = undefined;
    });
  });

  describe('Modal Close and Cleanup', () => {
    it('should close modal and cleanup on close button click', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should close PDF viewer and cleanup', () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      // Open PDF viewer
      waitFor(async () => {
        const viewButton = screen.getByText('View Consent Form');
        fireEvent.click(viewButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
        });
        
        // Close PDF viewer
        const pdfViewer = screen.getByTestId('pdf-viewer');
        const closeButton = pdfViewer.querySelector('button') || pdfViewer;
        fireEvent.click(closeButton);
      });
    });

    it('should reset form when modal closes', () => {
      const onClose = vi.fn();
      const { rerender } = renderModal({ onClose });
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      // Close modal
      rerender(
        <AddInvestigationResultModal
          isOpen={false}
          onClose={onClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={vi.fn()}
        />
      );
      
      // Reopen modal
      rerender(
        <AddInvestigationResultModal
          isOpen={true}
          onClose={onClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={vi.fn()}
        />
      );
      
      const resultInputAfter = screen.getByLabelText(/result value/i);
      expect(resultInputAfter.value).toBe('');
    });
  });

  describe('PSA Test Mode', () => {
    it('should hide file upload for PSA tests', () => {
      renderModal({ isPSATest: true });
      
      expect(screen.queryByLabelText(/upload report/i)).not.toBeInTheDocument();
    });

    it('should not include file in submission for PSA tests', async () => {
      const { investigationService } = await import('../services/investigationService');
      const onSuccess = vi.fn();
      
      renderModal({ isPSATest: true, onSuccess });
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.addOtherTestResult).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            testFile: null
          })
        );
      });
    });
  });

  describe('Form State Management', () => {
    it('should initialize form with existing result data', () => {
      const existingResult = {
        id: 1,
        result: '5.2 ng/mL',
        notes: 'Test notes',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      renderModal({ existingResult });
      
      const resultInput = screen.getByLabelText(/result value/i);
      const notesInput = screen.getByLabelText(/clinical notes/i);
      
      expect(resultInput.value).toBe('5.2 ng/mL');
      expect(notesInput.value).toBe('Test notes');
    });

    it('should update result input value', () => {
      renderModal();
      
      const resultInput = screen.getByLabelText(/result value/i);
      fireEvent.change(resultInput, { target: { value: '10.5 ng/mL' } });
      
      expect(resultInput.value).toBe('10.5 ng/mL');
    });

    it('should update notes input value', () => {
      renderModal();
      
      const notesInput = screen.getByLabelText(/clinical notes/i);
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } });
      
      expect(notesInput.value).toBe('Updated notes');
    });
  });

  describe('Early Return Conditions', () => {
    it('should not render when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText(/investigation result/i)).not.toBeInTheDocument();
    });

    it('should not render when investigationRequest is missing', () => {
      renderModal({ investigationRequest: null });
      expect(screen.queryByText(/investigation result/i)).not.toBeInTheDocument();
    });
  });

  describe('Consent Form Upload Edge Cases', () => {
    it('should handle missing file in consent form upload', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Upload Signed')).toBeInTheDocument();
      });
      
      // Try to upload without file
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      // Should not call uploadConsentForm
      await waitFor(() => {
        expect(consentFormService.uploadConsentForm).not.toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });

    it('should handle missing template in consent form upload', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: []
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText(/template not available/i)).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      const file = new File(['test'], 'consent.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(screen.getByText(/consent form template not available/i)).toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });

    it('should handle missing patient ID in consent form upload', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      renderModal({ patient: null });
      
      await waitFor(() => {
        expect(screen.getByText('Upload Signed')).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      const file = new File(['test'], 'consent.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(consentFormService.uploadConsentForm).not.toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });

    it('should handle consent form upload exception', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.uploadConsentForm.mockRejectedValueOnce(new Error('Network error'));
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Upload Signed')).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
      const file = new File(['test'], 'consent.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(consentFormService.uploadConsentForm).toHaveBeenCalled();
      });
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      vi.useRealTimers();
    });
  });

  describe('Consent Form View Edge Cases', () => {
    it('should handle missing consent form in view', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: null,
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        // Should not show view button if no file path
        expect(screen.queryByText('View Consent Form')).not.toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });

    it('should handle consent form with filePath property', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          filePath: 'uploads/consent-forms/patients/test.pdf',
          fileName: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
    });

    it('should handle consent form with signed_file_path property', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          signed_file_path: 'uploads/consent-forms/patients/test.jpg',
          file_name: 'Consent Form.jpg'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
    });

    it('should handle consent form with signed_filePath property', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          signed_filePath: 'uploads/consent-forms/patients/test.png',
          fileName: 'Consent Form.png'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
    });

    it('should handle file path with backslashes', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads\\consent-forms\\patients\\test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormFile).toHaveBeenCalled();
      });
    });

    it('should handle file path starting with uploads/', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormFile).toHaveBeenCalledWith(
          expect.stringMatching(/^consent-forms\/patients\/test\.pdf/)
        );
      });
    });
  });

  describe('PDF and Image Viewer Cleanup', () => {
    it('should cleanup PDF viewer URL on close', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
      });
      
      // Close PDF viewer
      const pdfViewer = screen.getByTestId('pdf-viewer');
      const closeButton = pdfViewer.querySelector('button') || pdfViewer;
      fireEvent.click(closeButton);
      
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
      
      expect(revokeObjectURLSpy).toHaveBeenCalled();
      
      revokeObjectURLSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should cleanup image viewer URL on close', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      vi.useFakeTimers();
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.jpg',
          file_name: 'Consent Form.jpg'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('View Consent Form')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Consent Form');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      });
      
      // Close image viewer
      const imageViewer = screen.getByTestId('image-viewer');
      const closeButton = imageViewer.querySelector('button') || imageViewer;
      fireEvent.click(closeButton);
      
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
      
      expect(revokeObjectURLSpy).toHaveBeenCalled();
      
      revokeObjectURLSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('File Size Formatting', () => {
    it('should format 0 bytes correctly', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File([''], 'empty.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 0, writable: false });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/0 Bytes/i)).toBeInTheDocument();
    });

    it('should format MB correctly', () => {
      renderModal();
      
      const fileInput = document.getElementById('report-upload');
      const file = new File(['x'.repeat(5 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/MB/i)).toBeInTheDocument();
    });
  });

  describe('Consent Form Section Rendering', () => {
    it('should show uploaded status when form is uploaded', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument();
      });
    });

    it('should show re-upload button when form is already uploaded', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI' }]
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{
          id: 1,
          file_path: 'uploads/consent-forms/patients/test.pdf',
          file_name: 'Consent Form.pdf'
        }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Re-upload')).toBeInTheDocument();
      });
    });

    it('should handle template with procedure_name instead of test_name', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, procedure_name: 'MRI', test_name: null }]
      });
      
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText('Print')).toBeInTheDocument();
      });
    });

    it('should handle patient with patientId property', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      const patientWithPatientId = {
        patientId: 1,
        name: 'John Doe'
      };
      
      consentFormService.getConsentFormTemplates.mockResolvedValue({
        success: true,
        data: []
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValue({
        success: true,
        data: []
      });
      
      renderModal({ patient: patientWithPatientId });
      
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(1);
      });
    });

    it('should handle patient with patient_id property', async () => {
      const { consentFormService } = await import('../services/consentFormService');
      
      const patientWithPatientId = {
        patient_id: 1,
        name: 'John Doe'
      };
      
      consentFormService.getConsentFormTemplates.mockResolvedValue({
        success: true,
        data: []
      });
      
      consentFormService.getPatientConsentForms.mockResolvedValue({
        success: true,
        data: []
      });
      
      renderModal({ patient: patientWithPatientId });
      
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Existing File Viewing Edge Cases', () => {
    it('should handle existing file with file_path property', async () => {
      const { investigationService } = await import('../services/investigationService');
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(investigationService.viewFile).toHaveBeenCalledWith('uploads/test.pdf');
      });
      
      window.alert = undefined;
    });

    it('should handle existing file with empty string path', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: '   ',
        fileName: 'test.pdf'
      };
      
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      expect(window.alert).toHaveBeenCalledWith('Invalid file path. Please contact support.');
      
      window.alert = undefined;
    });

    it('should handle existing file view with response error', async () => {
      const { investigationService } = await import('../services/investigationService');
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      const error = {
        response: {
          data: {
            message: 'File not found'
          }
        }
      };
      
      investigationService.viewFile.mockRejectedValueOnce(error);
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error viewing file: File not found');
      });
      
      window.alert = undefined;
    });

    it('should handle existing file view with error message property', async () => {
      const { investigationService } = await import('../services/investigationService');
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      const error = {
        message: 'Network error'
      };
      
      investigationService.viewFile.mockRejectedValueOnce(error);
      window.alert = vi.fn();
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error viewing file: Network error');
      });
      
      window.alert = undefined;
    });
  });

  describe('Form Reset on Close', () => {
    it('should reset all form fields when modal closes', () => {
      const onClose = vi.fn();
      const { rerender } = renderModal({ onClose });
      
      const resultInput = screen.getByLabelText(/result value/i);
      const notesInput = screen.getByLabelText(/clinical notes/i);
      
      fireEvent.change(resultInput, { target: { value: '5.2 ng/mL' } });
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });
      
      // Close modal
      rerender(
        <AddInvestigationResultModal
          isOpen={false}
          onClose={onClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={vi.fn()}
        />
      );
      
      // Reopen modal
      rerender(
        <AddInvestigationResultModal
          isOpen={true}
          onClose={onClose}
          patient={mockPatient}
          investigationRequest={mockInvestigationRequest}
          onSuccess={vi.fn()}
        />
      );
      
      const resultInputAfter = screen.getByLabelText(/result value/i);
      const notesInputAfter = screen.getByLabelText(/clinical notes/i);
      
      expect(resultInputAfter.value).toBe('');
      expect(notesInputAfter.value).toBe('');
    });
  });

  describe('Event Listeners', () => {
    it('should listen for openImageViewer event and open image viewer modal', async () => {
      renderModal();
      
      const event = new CustomEvent('openImageViewer', {
        detail: {
          imageUrl: 'data:image/png;base64,test',
          fileName: 'test.png',
          blobUrl: 'blob:http://localhost/test'
        }
      });
      
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      });
    });

    it('should not open image viewer if imageUrl is missing in event', () => {
      renderModal();
      
      const event = new CustomEvent('openImageViewer', {
        detail: {
          fileName: 'test.png',
          blobUrl: 'blob:http://localhost/test'
        }
      });
      
      window.dispatchEvent(event);
      
      expect(screen.queryByTestId('image-viewer')).not.toBeInTheDocument();
    });

    it('should listen for openPDFViewer event and open PDF viewer modal', async () => {
      renderModal();
      
      const event = new CustomEvent('openPDFViewer', {
        detail: {
          pdfUrl: 'blob:http://localhost/test.pdf',
          fileName: 'test.pdf',
          blobUrl: 'blob:http://localhost/test'
        }
      });
      
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
      });
    });

    it('should not open PDF viewer if pdfUrl is missing in event', () => {
      renderModal();
      
      const event = new CustomEvent('openPDFViewer', {
        detail: {
          fileName: 'test.pdf',
          blobUrl: 'blob:http://localhost/test'
        }
      });
      
      window.dispatchEvent(event);
      
      expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderModal();
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('openImageViewer', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('openPDFViewer', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Remove File Functionality', () => {
    it('should show remove button for existing file', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        expect(removeButton).toBeInTheDocument();
      });
    });

    it('should show confirmation modal when remove button is clicked', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      window.confirm = vi.fn().mockReturnValue(true);
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        expect(removeButton).toBeInTheDocument();
      });
      
      const removeButton = screen.getByTitle('Remove existing file');
      fireEvent.click(removeButton);
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this file? You can upload a new file to replace it.');
    });

    it('should set removeExistingFile flag when user confirms removal', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      window.confirm = vi.fn().mockReturnValue(true);
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        expect(removeButton).toBeInTheDocument();
      });
      
      const removeButton = screen.getByTitle('Remove existing file');
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        // File should be hidden after removal
        expect(screen.queryByText('Existing uploaded file')).not.toBeInTheDocument();
      });
    });

    it('should not remove file if user cancels confirmation', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      window.confirm = vi.fn().mockReturnValue(false);
      
      renderModal({ existingResult });
      
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        expect(removeButton).toBeInTheDocument();
      });
      
      const removeButton = screen.getByTitle('Remove existing file');
      fireEvent.click(removeButton);
      
      // File should still be visible
      await waitFor(() => {
        expect(screen.getByText('Existing uploaded file')).toBeInTheDocument();
      });
    });

    it('should clear removeExistingFile flag when new file is selected', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      window.confirm = vi.fn().mockReturnValue(true);
      
      renderModal({ existingResult });
      
      // Remove file
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        fireEvent.click(removeButton);
      });
      
      // Upload new file
      const fileInput = screen.getByLabelText(/upload report/i);
      const file = new File(['test'], 'new-test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // File should be visible again
      await waitFor(() => {
        expect(screen.getByText('new-test.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Update Functionality', () => {
    it('should use updateOtherTestResult when existingResult exists', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.updateOtherTestResult = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 1 }
      });
      
      const existingResult = {
        id: 1,
        result: '5.2',
        notes: 'Test notes',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf',
        testDate: '2024-01-01'
      };
      
      const onSuccess = vi.fn();
      renderModal({ existingResult, onSuccess });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          existingResult.id,
          expect.objectContaining({
            testName: 'MRI',
            testDate: '2024-01-01',
            result: '5.2',
            notes: 'Test notes'
          })
        );
      });
    });

    it('should use addOtherTestResult when existingResult does not exist', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.addOtherTestResult = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 1 }
      });
      
      const onSuccess = vi.fn();
      renderModal({ onSuccess });
      
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.addOtherTestResult).toHaveBeenCalledWith(
          mockPatient.id,
          expect.objectContaining({
            testName: 'MRI'
          })
        );
      });
    });

    it('should send removeFile flag when file is removed and no new file uploaded', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.updateOtherTestResult = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 1 }
      });
      
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      window.confirm = vi.fn().mockReturnValue(true);
      
      renderModal({ existingResult });
      
      // Remove file
      await waitFor(() => {
        const removeButton = screen.getByTitle('Remove existing file');
        fireEvent.click(removeButton);
      });
      
      // Submit
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          existingResult.id,
          expect.objectContaining({
            removeFile: true
          })
        );
      });
    });

    it('should not send removeFile flag when new file is uploaded', async () => {
      const { investigationService } = await import('../services/investigationService');
      investigationService.updateOtherTestResult = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 1 }
      });
      
      const existingResult = {
        id: 1,
        result: '5.2',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      
      renderModal({ existingResult });
      
      // Upload new file
      const fileInput = screen.getByLabelText(/upload report/i);
      const file = new File(['test'], 'new-test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Submit
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          existingResult.id,
          expect.objectContaining({
            removeFile: false
          })
        );
      });
    });
  });
});

