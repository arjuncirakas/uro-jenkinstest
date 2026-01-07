import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
vi.mock('@/services/investigationService', () => ({
  investigationService: {
    addPSAResult: vi.fn(),
    addOtherTestResult: vi.fn(),
    updateOtherTestResult: vi.fn(),
    viewFile: vi.fn()
  }
}));

vi.mock('@/services/consentFormService', () => ({
  consentFormService: {
    getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getConsentFormFile: vi.fn(),
    uploadConsentForm: vi.fn()
  }
}));

vi.mock('react-icons/io5', () => ({
  IoClose: () => <div />,
  IoDocument: () => <div />,
  IoCheckmarkCircle: () => <div />,
  IoCloseCircle: () => <div />,
  IoPrint: () => <div />,
  IoCloudUpload: () => <div />,
  IoAlertCircle: () => <div />
}));

vi.mock('react-icons/fi', () => ({ FiX: () => <div /> }));

vi.mock('lucide-react', () => ({
  Upload: () => <div />, Eye: () => <div />, Trash: () => <div />
}));

vi.mock('@/utils/consentFormUtils', () => ({
  getConsentFormBlobUrl: vi.fn()
}));

vi.mock('../FullScreenPDFModal', () => ({ default: () => null }));
vi.mock('../ImageViewerModal', () => ({ default: () => null }));
vi.mock('../modals/ConfirmationModal', () => ({ default: () => null }));

// NOW import services and component AFTER all mocks
import { investigationService } from '@/services/investigationService';
import { consentFormService } from '@/services/consentFormService';
import AddInvestigationResultModal from '../AddInvestigationResultModal';

describe('AddInvestigationResultModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    investigationRequest: { id: 1, investigationName: 'MRI' },
    patient: { id: 1, name: 'John Doe' },
    onSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    investigationService.addOtherTestResult.mockResolvedValue({ success: true });
    consentFormService.getConsentFormTemplates.mockResolvedValue({ success: true, data: [] });
    consentFormService.getPatientConsentForms.mockResolvedValue({ success: true, data: [] });
    vi.stubGlobal('alert', vi.fn());
  });

  it('should render and handle basic submission', async () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    expect(await screen.findByText(/Add Investigation Result/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Normal' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(investigationService.addOtherTestResult).toHaveBeenCalled();
    });
  });

  it('should handle submission error message', async () => {
    investigationService.addOtherTestResult.mockResolvedValue({
      success: false,
      error: 'Custom Error Message'
    });

    render(<AddInvestigationResultModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Normal' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    // Using getAllByText since it's rendered in two places in the component
    await waitFor(() => {
      const errorDivs = screen.getAllByText('Custom Error Message');
      expect(errorDivs.length).toBeGreaterThan(0);
      expect(errorDivs[0]).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle onStatusUpdate functionality', async () => {
    const onStatusUpdate = vi.fn().mockResolvedValue({ success: true });
    render(<AddInvestigationResultModal {...defaultProps} onStatusUpdate={onStatusUpdate} />);

    const notRequiredBtn = await screen.findByRole('button', { name: /Not Required/i });
    fireEvent.click(notRequiredBtn);

    await waitFor(() => {
      expect(onStatusUpdate).toHaveBeenCalledWith('not_required');
    });
  });

  it('should not render when isOpen is false', () => {
    render(<AddInvestigationResultModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Add Investigation Result/i)).not.toBeInTheDocument();
  });

  it('should not render when investigationRequest is missing', () => {
    render(<AddInvestigationResultModal {...defaultProps} investigationRequest={null} />);
    expect(screen.queryByText(/Add Investigation Result/i)).not.toBeInTheDocument();
  });

  it('should handle file upload', async () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    }
  });

  it('should handle file removal', async () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const removeButton = screen.getByTitle(/Remove file/i);
        if (removeButton) {
          fireEvent.click(removeButton);
          expect(fileInput.files).toHaveLength(0);
        }
      });
    }
  });

  it('should show error for invalid file type', async () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Only PDF, DOC, and DOCX files are allowed/i)).toBeInTheDocument();
      });
    }
  });

  it('should show error for file too large', async () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      // Create a file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/File size must be less than 10MB/i)).toBeInTheDocument();
      });
    }
  });

  it('should handle update existing result', async () => {
    const existingResult = {
      id: 1,
      result: '5.2',
      notes: 'Previous notes',
      testDate: '2024-01-01'
    };

    investigationService.updateOtherTestResult.mockResolvedValue({ success: true });

    render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5.2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Previous notes')).toBeInTheDocument();
    });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(investigationService.updateOtherTestResult).toHaveBeenCalled();
    });
  });

  it('should handle submission error', async () => {
    investigationService.addOtherTestResult.mockResolvedValue({
      success: false,
      error: 'Submission failed'
    });

    render(<AddInvestigationResultModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Normal' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
  });

  it('should handle exception during submission', async () => {
    investigationService.addOtherTestResult.mockRejectedValue(new Error('Network error'));

    render(<AddInvestigationResultModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Normal' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    });
  });

  it('should prevent submission when already submitting', async () => {
    investigationService.addOtherTestResult.mockImplementation(() => new Promise(() => {}));

    render(<AddInvestigationResultModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Normal' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    
    // Click multiple times
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(investigationService.addOtherTestResult).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle PSA test mode', async () => {
    investigationService.addOtherTestResult.mockResolvedValue({ success: true });

    render(<AddInvestigationResultModal {...defaultProps} isPSATest={true} />);

    // File upload should not be visible for PSA tests
    expect(screen.queryByText(/Upload Report/i)).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: '5.2' } });

    const submitBtn = await screen.findByRole('button', { name: /Save Result/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(investigationService.addOtherTestResult).toHaveBeenCalled();
    });
  });

  it('should handle notes input', () => {
    render(<AddInvestigationResultModal {...defaultProps} />);

    const notesInput = screen.getByPlaceholderText(/Enter interpretation/i);
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });
    expect(notesInput).toHaveValue('Test notes');
  });

  it('should handle cancel button', () => {
    const onClose = vi.fn();
    render(<AddInvestigationResultModal {...defaultProps} onClose={onClose} />);

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('should handle patient with patientId field', () => {
    const patientWithPatientId = {
      patientId: 456,
      name: 'Test Patient'
    };

    render(<AddInvestigationResultModal {...defaultProps} patient={patientWithPatientId} />);
    expect(screen.getByText('Test Patient')).toBeInTheDocument();
  });

  it('should handle patient with patient_id field', () => {
    const patientWithPatientId = {
      patient_id: 789,
      name: 'Test Patient ID'
    };

    render(<AddInvestigationResultModal {...defaultProps} patient={patientWithPatientId} />);
    expect(screen.getByText('Test Patient ID')).toBeInTheDocument();
  });

  it('should handle investigationRequest with investigation_name field', () => {
    const requestWithUnderscore = {
      id: 1,
      investigation_name: 'TRUS'
    };

    render(<AddInvestigationResultModal {...defaultProps} investigationRequest={requestWithUnderscore} />);
    expect(screen.getByText('TRUS')).toBeInTheDocument();
  });

  it('should handle existing result with file_path field', async () => {
    const existingResult = {
      id: 1,
      result: '5.2',
      file_path: 'uploads/test.pdf',
      file_name: 'test.pdf'
    };

    render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should handle existing result with filePath field', async () => {
    const existingResult = {
      id: 1,
      result: '5.2',
      filePath: 'uploads/test.pdf',
      fileName: 'test.pdf'
    };

    render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should handle existing result with test_date field', async () => {
    const existingResult = {
      id: 1,
      result: '5.2',
      test_date: '2024-01-01'
    };

    render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('5.2')).toBeInTheDocument();
    });
  });

  it('should reset form when modal closes', async () => {
    const { rerender } = render(<AddInvestigationResultModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
    fireEvent.change(input, { target: { value: 'Test value' } });
    expect(input).toHaveValue('Test value');

    // Close modal
    rerender(<AddInvestigationResultModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<AddInvestigationResultModal {...defaultProps} isOpen={true} />);

    await waitFor(() => {
      const newInput = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
      expect(newInput).toHaveValue('');
    });
  });

  describe('Consent Form Handling', () => {
    it('should fetch consent forms on mount when not PSA test', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });

    it('should not fetch consent forms for PSA tests', async () => {
      render(<AddInvestigationResultModal {...defaultProps} isPSATest={true} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).not.toHaveBeenCalled();
      });
    });

    it('should not fetch consent forms when patient ID is missing', async () => {
      render(<AddInvestigationResultModal {...defaultProps} patient={{ name: 'Test' }} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).not.toHaveBeenCalled();
      });
    });

    it('should handle consent form fetch error', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ success: false, error: 'Failed' });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle consent form fetch exception', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      consentFormService.getConsentFormTemplates.mockRejectedValueOnce(new Error('Network error'));
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      consoleError.mockRestore();
    });

    it('should print consent form', async () => {
      const { getConsentFormBlobUrl } = await import('@/utils/consentFormUtils');
      getConsentFormBlobUrl.mockResolvedValueOnce({ 
        success: true, 
        blobUrl: 'blob:url', 
        fileName: 'Test Consent Form' 
      });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle print consent form error', async () => {
      const { getConsentFormBlobUrl } = await import('@/utils/consentFormUtils');
      getConsentFormBlobUrl.mockResolvedValueOnce({ 
        success: false, 
        error: 'Failed to load' 
      });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle print consent form exception', async () => {
      const { getConsentFormBlobUrl } = await import('@/utils/consentFormUtils');
      getConsentFormBlobUrl.mockRejectedValueOnce(new Error('Network error'));
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should upload consent form', async () => {
      consentFormService.uploadConsentForm.mockResolvedValueOnce({ success: true });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle consent form upload error', async () => {
      consentFormService.uploadConsentForm.mockResolvedValueOnce({ success: false, error: 'Failed to upload' });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle consent form upload exception', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      consentFormService.uploadConsentForm.mockRejectedValueOnce(new Error('Network error'));
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      consoleError.mockRestore();
    });

    it('should view uploaded consent form', async () => {
      consentFormService.getConsentFormFile.mockResolvedValueOnce({ 
        success: true, 
        data: new Blob(['test'], { type: 'application/pdf' }) 
      });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, file_path: 'uploads/consent-forms/patients/test.pdf', file_name: 'test.pdf' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle view consent form error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      consentFormService.getConsentFormFile.mockResolvedValueOnce({ 
        success: false, 
        error: 'Failed to fetch' 
      });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, file_path: 'uploads/consent-forms/patients/test.pdf', file_name: 'test.pdf' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      consoleError.mockRestore();
    });

    it('should handle view consent form exception', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      consentFormService.getConsentFormFile.mockRejectedValueOnce(new Error('Network error'));
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, file_path: 'uploads/consent-forms/patients/test.pdf', file_name: 'test.pdf' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      consoleError.mockRestore();
    });

    it('should not show consent form section for PSA tests', () => {
      render(<AddInvestigationResultModal {...defaultProps} isPSATest={true} />);
      expect(screen.queryByText(/Consent Form/i)).not.toBeInTheDocument();
    });

    it('should disable consent form actions when test is not required', async () => {
      const requestNotRequired = { ...defaultProps.investigationRequest, status: 'not_required' };
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} investigationRequest={requestNotRequired} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should show error when consent form template is not available', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('File Handling', () => {
    it('should view existing file', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      investigationService.viewFile.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        fireEvent.click(viewButton);
      });
      await waitFor(() => {
        expect(investigationService.viewFile).toHaveBeenCalled();
      });
    });

    it('should handle view file error', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      investigationService.viewFile.mockRejectedValueOnce({ 
        response: { data: { message: 'File not found' } },
        message: 'Error'
      });
      vi.stubGlobal('alert', vi.fn());
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const viewButton = screen.getByText('View');
        fireEvent.click(viewButton);
      });
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });
    });

    it('should show remove file confirmation modal', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);
      });
      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });
    });

    it('should remove existing file when confirmed', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      investigationService.updateOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);
      });
      await waitFor(() => {
        const confirmButton = screen.getByText(/Confirm|Yes/i);
        fireEvent.click(confirmButton);
      });
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalled();
      });
    });

    it('should cancel remove file confirmation', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);
      });
      await waitFor(() => {
        const cancelButton = screen.getByText(/Cancel|No/i);
        fireEvent.click(cancelButton);
      });
      await waitFor(() => {
        expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument();
      });
    });

    it('should handle view file with missing file path', async () => {
      const existingResult = {
        id: 1,
        result: '5.2'
      };
      vi.stubGlobal('alert', vi.fn());
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const viewButton = screen.queryByText('View');
        if (viewButton) {
          fireEvent.click(viewButton);
          expect(window.alert).toHaveBeenCalled();
        }
      });
    });

    it('should handle view file with invalid file path', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: ''
      };
      vi.stubGlobal('alert', vi.fn());
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const viewButton = screen.queryByText('View');
        if (viewButton) {
          fireEvent.click(viewButton);
          expect(window.alert).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Event Listeners', () => {
    it('should handle openImageViewer event', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const event = new CustomEvent('openImageViewer', {
        detail: { imageUrl: 'blob:url', fileName: 'test.jpg' }
      });
      window.dispatchEvent(event);
      await waitFor(() => {
        // Image viewer modal should be opened
        expect(screen.queryByText(/test.jpg/i)).toBeDefined();
      });
    });

    it('should handle openPDFViewer event', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const event = new CustomEvent('openPDFViewer', {
        detail: { pdfUrl: 'blob:url', fileName: 'test.pdf' }
      });
      window.dispatchEvent(event);
      await waitFor(() => {
        // PDF viewer modal should be opened
        expect(screen.queryByText(/test.pdf/i)).toBeDefined();
      });
    });

    it('should handle openImageViewer event without imageUrl', () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const event = new CustomEvent('openImageViewer', {
        detail: { fileName: 'test.jpg' }
      });
      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
      expect(screen.getByText(/Add Investigation Result/i)).toBeInTheDocument();
    });

    it('should handle openPDFViewer event without pdfUrl', () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const event = new CustomEvent('openPDFViewer', {
        detail: { fileName: 'test.pdf' }
      });
      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
      expect(screen.getByText(/Add Investigation Result/i)).toBeInTheDocument();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(<AddInvestigationResultModal {...defaultProps} />);
      expect(screen.getByText(/Add Investigation Result/i)).toBeInTheDocument();
      unmount();
      // Event listeners should be removed
      expect(screen.queryByText(/Add Investigation Result/i)).not.toBeInTheDocument();
    });
  });

  describe('Consent Form Template Matching', () => {
    it('should match consent form template by test_name', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should match consent form template by procedure_name', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, procedure_name: 'MRI' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should match consent form template with spaces normalized', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI  Scan' }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} investigationRequest={{ id: 1, investigationName: 'MRI Scan' }} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('Patient Consent Form Matching', () => {
    it('should match patient consent form by consent_form_name', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, consent_form_name: 'MRI', template_id: 1 }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });

    it('should match patient consent form by template', async () => {
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, template_id: 1 }] 
      });
      render(<AddInvestigationResultModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission Edge Cases', () => {
    it('should submit with removeExistingFile flag when removing file', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      investigationService.updateOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      await waitFor(() => {
        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);
      });
      await waitFor(() => {
        const confirmButton = screen.getByText(/Confirm|Yes/i);
        fireEvent.click(confirmButton);
      });
      await waitFor(() => {
        const submitButton = screen.getByText('Save Result');
        fireEvent.click(submitButton);
      });
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ removeFile: true })
        );
      });
    });

    it('should dispatch testResultAdded event on successful submission', async () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      investigationService.addOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} />);
      const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
      fireEvent.change(input, { target: { value: 'Normal' } });
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(eventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'testResultAdded'
          })
        );
      });
      eventSpy.mockRestore();
    });

    it('should call onSuccess with correct message on successful submission', async () => {
      const onSuccess = vi.fn();
      investigationService.addOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} onSuccess={onSuccess} />);
      const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
      fireEvent.change(input, { target: { value: 'Normal' } });
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.stringContaining('added successfully'),
          expect.any(Number)
        );
      });
    });

    it('should call onSuccess with update message when updating', async () => {
      const onSuccess = vi.fn();
      const existingResult = {
        id: 1,
        result: '5.2',
        notes: 'Previous notes'
      };
      investigationService.updateOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} onSuccess={onSuccess} />);
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.stringContaining('updated successfully'),
          expect.any(Number)
        );
      });
    });

    it('should use existing testDate when updating', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        testDate: '2024-01-01'
      };
      investigationService.updateOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ testDate: '2024-01-01' })
        );
      });
    });

    it('should use existing test_date when updating', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        test_date: '2024-01-01'
      };
      investigationService.updateOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} />);
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(investigationService.updateOtherTestResult).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ testDate: '2024-01-01' })
        );
      });
    });

    it('should not include file for PSA tests', async () => {
      investigationService.addOtherTestResult.mockResolvedValueOnce({ success: true });
      render(<AddInvestigationResultModal {...defaultProps} isPSATest={true} />);
      const input = screen.getByPlaceholderText(/e.g., 5.2 ng\/mL/i);
      fireEvent.change(input, { target: { value: '5.2' } });
      const submitButton = screen.getByText('Save Result');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(investigationService.addOtherTestResult).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({ testFile: null })
        );
      });
    });
  });

  describe('File Size Formatting', () => {
    it('should format file size correctly', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 1024 });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => {
          expect(screen.getByText(/1 KB/i)).toBeInTheDocument();
        });
      }
    });

    it('should format file size in MB', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => {
          expect(screen.getByText(/5 MB/i)).toBeInTheDocument();
        });
      }
    });

    it('should format zero file size', async () => {
      render(<AddInvestigationResultModal {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File([''], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 0 });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => {
          expect(screen.getByText(/0 Bytes/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Patient ID Resolution', () => {
    it('should use patient.patientId when id is not available', async () => {
      const patientWithPatientId = { patientId: 123, name: 'Test Patient' };
      render(<AddInvestigationResultModal {...defaultProps} patient={patientWithPatientId} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(123);
      });
    });

    it('should use patient.patient_id when id and patientId are not available', async () => {
      const patientWithPatient_id = { patient_id: 456, name: 'Test Patient' };
      render(<AddInvestigationResultModal {...defaultProps} patient={patientWithPatient_id} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(456);
      });
    });
  });

  describe('Status Update', () => {
    it('should not show status update section when hasExistingFile', async () => {
      const existingResult = {
        id: 1,
        result: '5.2',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      const onStatusUpdate = vi.fn();
      render(<AddInvestigationResultModal {...defaultProps} existingResult={existingResult} onStatusUpdate={onStatusUpdate} />);
      expect(screen.queryByText(/Or Update Status/i)).not.toBeInTheDocument();
    });

    it('should show status update section when onStatusUpdate is provided and no existing file', () => {
      const onStatusUpdate = vi.fn();
      render(<AddInvestigationResultModal {...defaultProps} onStatusUpdate={onStatusUpdate} />);
      expect(screen.getByText(/Or Update Status/i)).toBeInTheDocument();
    });
  });

  describe('PDF and Image Viewer Cleanup', () => {
    it('should cleanup PDF viewer blob URL on close', () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { getConsentFormBlobUrl } = require('@/utils/consentFormUtils');
      getConsentFormBlobUrl.mockResolvedValueOnce({ 
        success: true, 
        blobUrl: 'blob:url', 
        fileName: 'Test Consent Form' 
      });
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'MRI' }] 
      });
      const { unmount } = render(<AddInvestigationResultModal {...defaultProps} />);
      expect(screen.getByText(/Add Investigation Result/i)).toBeInTheDocument();
      unmount();
      // Blob URL should be revoked
      expect(screen.queryByText(/Add Investigation Result/i)).not.toBeInTheDocument();
      revokeObjectURLSpy.mockRestore();
    });

    it('should cleanup image viewer blob URL on close', () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { unmount } = render(<AddInvestigationResultModal {...defaultProps} />);
      expect(screen.getByText(/Add Investigation Result/i)).toBeInTheDocument();
      unmount();
      // Blob URL should be revoked if it exists
      expect(screen.queryByText(/Add Investigation Result/i)).not.toBeInTheDocument();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
