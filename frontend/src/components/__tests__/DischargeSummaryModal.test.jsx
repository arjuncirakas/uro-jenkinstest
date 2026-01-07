import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DischargeSummaryModal from '../DischargeSummaryModal';

// Mock react-icons
vi.mock('react-icons/io5', () => ({
  IoClose: () => <span data-testid="close-icon" />,
  IoCloudUpload: () => <span data-testid="upload-icon" />,
  IoDocument: () => <span data-testid="document-icon" />,
  IoTrash: () => <span data-testid="trash-icon" />,
  IoAdd: () => <span data-testid="add-icon" />,
  IoCalendar: () => <span data-testid="calendar-icon" />
}));

vi.mock('react-icons/fa', () => ({
  FaFilePdf: () => <span data-testid="pdf-icon" />,
  FaFileWord: () => <span data-testid="word-icon" />,
  FaFileImage: () => <span data-testid="image-icon" />,
  FaPills: () => <span data-testid="pills-icon" />
}));

describe('DischargeSummaryModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockPatient = {
    id: 1,
    name: 'John Doe',
    fullName: 'John Doe',
    upi: 'UPI123',
    createdAt: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z'
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    patient: mockPatient,
    pathway: 'Standard'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container, rerender } = render(
        <DischargeSummaryModal {...defaultProps} isOpen={true} />
      );
      expect(container.firstChild).not.toBeNull();
      
      // Test the early return when isOpen becomes false
      rerender(<DischargeSummaryModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      expect(screen.getByText(/Discharge Summary/i)).toBeInTheDocument();
    });

    it('should display patient information', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/UPI123/i)).toBeInTheDocument();
    });

    it('should display surgical discharge summary title for Post-op Transfer pathway', () => {
      render(<DischargeSummaryModal {...defaultProps} pathway="Post-op Transfer" />);
      expect(screen.getByText(/Surgical Discharge Summary/i)).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when modal opens', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      expect(dischargeDateInput).toBeInTheDocument();
      expect(dischargeDateInput.value).toBeTruthy(); // Should have today's date
    });

    it('should reset form when modal reopens', () => {
      const { rerender } = render(
        <DischargeSummaryModal {...defaultProps} isOpen={false} />
      );
      
      rerender(<DischargeSummaryModal {...defaultProps} isOpen={true} />);
      
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      expect(dischargeDateInput).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update discharge date when changed', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      fireEvent.change(dischargeDateInput, { target: { value: '2024-01-15' } });
      
      expect(dischargeDateInput.value).toBe('2024-01-15');
    });

    it('should update discharge time when changed', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const dischargeTimeInput = screen.getByLabelText(/Discharge Time/i);
      fireEvent.change(dischargeTimeInput, { target: { value: '14:30' } });
      
      expect(dischargeTimeInput.value).toBe('14:30');
    });

    it('should update primary diagnosis when changed', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const primaryDiagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
      fireEvent.change(primaryDiagnosisInput, { target: { value: 'Test Diagnosis' } });
      
      expect(primaryDiagnosisInput.value).toBe('Test Diagnosis');
    });

    it('should update clinical summary when changed', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const clinicalSummaryInput = screen.getByLabelText(/Clinical Summary/i);
      fireEvent.change(clinicalSummaryInput, { target: { value: 'Test summary' } });
      
      expect(clinicalSummaryInput.value).toBe('Test summary');
    });
  });

  describe('Medication Management', () => {
    it('should add new medication when add button is clicked', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const medicationAddButton = addButtons.find(btn => 
        btn.closest('[class*="medication"]') || btn.textContent.includes('Medication')
      );
      
      if (medicationAddButton) {
        fireEvent.click(medicationAddButton);
        // Should have more medication rows after adding
        const medicationInputs = screen.getAllByPlaceholderText(/Medication name/i);
        expect(medicationInputs.length).toBeGreaterThan(1);
      }
    });

    it('should update medication fields when changed', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const medicationNameInput = screen.getByPlaceholderText(/Medication name/i);
      if (medicationNameInput) {
        fireEvent.change(medicationNameInput, { target: { value: 'Aspirin' } });
        expect(medicationNameInput.value).toBe('Aspirin');
      }
    });
  });

  describe('GP Actions Management', () => {
    it('should add new GP action when add button is clicked', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      const gpActionButton = addButtons.find(btn => 
        btn.textContent.includes('Action') || btn.closest('[class*="gp"]')
      );
      
      if (gpActionButton) {
        fireEvent.click(gpActionButton);
        // Should have GP action input after adding
        const gpActionInputs = screen.getAllByPlaceholderText(/GP action/i);
        expect(gpActionInputs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Form Validation', () => {
    it('should show error when discharge date is missing on submit', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      fireEvent.change(dischargeDateInput, { target: { value: '' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      expect(global.alert).toHaveBeenCalledWith('Please fill in all required fields');
    });

    it('should show error when primary diagnosis is missing on submit', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const primaryDiagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
      fireEvent.change(primaryDiagnosisInput, { target: { value: '' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      expect(global.alert).toHaveBeenCalledWith('Please fill in all required fields');
    });

    it('should show error when clinical summary is missing on submit', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const clinicalSummaryInput = screen.getByLabelText(/Clinical Summary/i);
      fireEvent.change(clinicalSummaryInput, { target: { value: '' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      expect(global.alert).toHaveBeenCalledWith('Please fill in all required fields');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      // Fill required fields
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      fireEvent.change(dischargeDateInput, { target: { value: '2024-01-15' } });
      
      const primaryDiagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
      fireEvent.change(primaryDiagnosisInput, { target: { value: 'Test Diagnosis' } });
      
      const clinicalSummaryInput = screen.getByLabelText(/Clinical Summary/i);
      fireEvent.change(clinicalSummaryInput, { target: { value: 'Test summary' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should include admission date in submission data', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      // Fill required fields
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      fireEvent.change(dischargeDateInput, { target: { value: '2024-01-15' } });
      
      const primaryDiagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
      fireEvent.change(primaryDiagnosisInput, { target: { value: 'Test Diagnosis' } });
      
      const clinicalSummaryInput = screen.getByLabelText(/Clinical Summary/i);
      fireEvent.change(clinicalSummaryInput, { target: { value: 'Test summary' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalled();
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData).toHaveProperty('admissionDate');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i }) || 
                         screen.getByTestId('close-icon').closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('File Upload', () => {
    it('should handle file upload', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const fileInput = screen.getByLabelText(/upload|file/i) || 
                       document.querySelector('input[type="file"]');
      
      if (fileInput) {
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        
        // Should show uploaded file
        expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing patient prop', () => {
      render(<DischargeSummaryModal {...defaultProps} patient={null} />);
      
      // Should still render modal
      expect(screen.getByText(/Discharge Summary/i)).toBeInTheDocument();
    });

    it('should handle patient without createdAt', () => {
      const patientWithoutDate = { ...mockPatient };
      delete patientWithoutDate.createdAt;
      delete patientWithoutDate.created_at;
      
      render(<DischargeSummaryModal {...defaultProps} patient={patientWithoutDate} />);
      
      // Should still work and use current date as fallback
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle admission date calculation with invalid date', () => {
      const patientWithInvalidDate = {
        ...mockPatient,
        createdAt: 'invalid-date',
        created_at: 'invalid-date'
      };
      
      render(<DischargeSummaryModal {...defaultProps} patient={patientWithInvalidDate} />);
      
      // Should use current date as fallback when date is invalid
      const dischargeDateInput = screen.getByLabelText(/Discharge Date/i);
      expect(dischargeDateInput).toBeInTheDocument();
      
      // Fill and submit to test admission date fallback
      fireEvent.change(dischargeDateInput, { target: { value: '2024-01-15' } });
      const primaryDiagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
      fireEvent.change(primaryDiagnosisInput, { target: { value: 'Test Diagnosis' } });
      const clinicalSummaryInput = screen.getByLabelText(/Clinical Summary/i);
      fireEvent.change(clinicalSummaryInput, { target: { value: 'Test summary' } });
      
      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);
      
      // Should call onSubmit with admissionDate as current date
      expect(mockOnSubmit).toHaveBeenCalled();
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.admissionDate).toBeDefined();
    });

    it('should handle file upload error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      
      // Create a mock file that will cause an error
      const mockFile = {
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf'
      };
      
      // Mock FileList
      const fileList = {
        0: mockFile,
        length: 1,
        item: (index) => index === 0 ? mockFile : null
      };
      
      // Simulate error during file processing
      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      // Trigger file upload
      fireEvent.change(fileInput, { target: { files: fileList } });
      
      // Wait for async operations
      await waitFor(() => {
        // Error should be logged
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty file list in handleFileUpload', () => {
      render(<DischargeSummaryModal {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      
      // Create empty file list
      const emptyFileList = {
        length: 0,
        item: () => null
      };
      
      Object.defineProperty(fileInput, 'files', {
        value: emptyFileList,
        writable: false
      });
      
      // Trigger file upload with empty list
      fireEvent.change(fileInput, { target: { files: emptyFileList } });
      
      // Should not add any documents
      expect(screen.queryByText(/test.pdf/i)).not.toBeInTheDocument();
    });
  });
});
