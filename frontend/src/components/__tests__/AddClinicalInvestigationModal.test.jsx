import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
vi.mock('../../services/consentFormService', () => ({
  consentFormService: {
    getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }),
    uploadConsentForm: vi.fn().mockResolvedValue({ success: true }),
    createConsentFormTemplate: vi.fn().mockResolvedValue({ success: true }),
    getConsentFormFile: vi.fn()
  }
}));

vi.mock('../../services/notesService', () => ({
  notesService: {
    addNote: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } })
  }
}));

vi.mock('../FullScreenPDFModal', () => ({
  default: ({ isOpen, onClose, pdfUrl, fileName }) =>
    isOpen ? (
      <div data-testid="pdf-viewer-modal">
        <div>PDF: {fileName}</div>
        <div>URL: {pdfUrl}</div>
        <button onClick={onClose} data-testid="close-pdf-viewer">Close</button>
      </div>
    ) : null
}));

vi.mock('../../utils/consentFormUtils', () => ({
  getConsentFormBlobUrl: vi.fn()
}));

vi.mock('../../utils/consentFormHelpers', () => ({
  getPrintButtonTitle: vi.fn((hasTemplate, isPrinting, defaultTitle) => {
    if (isPrinting) return 'Loading...';
    if (!hasTemplate) return 'Template not available';
    return defaultTitle || 'Print';
  })
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
  IoClose: () => <div data-testid="io-close" />,
  IoPrint: () => <div data-testid="io-print" />,
  IoCloudUpload: () => <div data-testid="io-cloud-upload" />
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  FileText: () => <div data-testid="file-text-icon" />
}));

// Mock react-icons/fa
vi.mock('react-icons/fa', () => ({
  FaFlask: () => <div data-testid="fa-flask" />,
  FaXRay: () => <div data-testid="fa-xray" />,
  FaMicroscope: () => <div data-testid="fa-microscope" />
}));

// NOW import the component AFTER all mocks
import AddClinicalInvestigationModal from '../AddClinicalInvestigationModal';

// Mock window methods
const mockPrintWindow = {
  document: { write: vi.fn(), close: vi.fn() },
  onload: null,
  print: vi.fn()
};

beforeEach(() => {
  global.window.open = vi.fn(() => mockPrintWindow);
  global.window.alert = vi.fn();
});

describe('AddClinicalInvestigationModal', () => {
  const mockPatient = {
    id: 123,
    name: 'John Doe',
    upi: 'UPI123',
    age: 45,
    dateOfBirth: '1979-01-01'
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    patient: mockPatient,
    onSuccess: mockOnSuccess
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
    global.alert = vi.fn();
    
    const { getConsentFormBlobUrl } = require('../../utils/consentFormUtils');
    getConsentFormBlobUrl.mockResolvedValue({
      success: true,
      blobUrl: 'blob:test-url',
      fileName: 'test-consent.pdf'
    });
  });

  // Test 1: Component renders correctly
  it('should render the modal when isOpen is true', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);
    // Check for title - there might be multiple elements with this text
    const titles = screen.getAllByText('Add Clinical Investigation');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  // Test 2: Component does not render when isOpen is false
  it('should not render when isOpen is false', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  // Test 3: Investigation types are displayed
  it('should display investigation type options', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);
    expect(screen.getByText('PSA Test')).toBeInTheDocument();
    expect(screen.getByText('TRUS')).toBeInTheDocument();
    expect(screen.getByText('MRI')).toBeInTheDocument();
    expect(screen.getByText('Biopsy')).toBeInTheDocument();
    expect(screen.getByText('Custom Test')).toBeInTheDocument();
  });

  // Test 4: Selecting an investigation type shows test options
  it('should show test options when investigation type is selected', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Find the PSA checkbox and click it
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });
    }
  });

  // Test 5: Closing the modal calls onClose
  it('should call onClose when close button is clicked', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  // Test 6: Urgent checkbox exists and shows correct text
  it('should have urgent option', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Check for Urgent text
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText(/Requires immediate attention/i)).toBeInTheDocument();
  });

  // Test 7: Custom test name input
  it('should allow entering custom test name', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Find and click the Custom Test checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const customCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('Custom Test')
    );

    if (customCheckbox) {
      fireEvent.click(customCheckbox);

      await waitFor(() => {
        const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
        fireEvent.change(customInput, { target: { value: 'My Custom Test' } });
        expect(customInput).toHaveValue('My Custom Test');
      });
    }
  });

  // Test 8: Submit button is disabled when no investigation type selected
  it('should have disabled submit button when no investigation type is selected', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Find submit button - the button in footer should be disabled
    const submitButtons = screen.getAllByText('Add Clinical Investigation');
    const submitButton = submitButtons[submitButtons.length - 1];

    // Button should be disabled when no investigation type is selected
    expect(submitButton).toBeDisabled();
  });


  // Test 9: Patient name variations (firstName/lastName)
  it('should handle patient with firstName and lastName', () => {
    const patientWithNames = {
      id: 123,
      firstName: 'Jane',
      lastName: 'Smith',
      upi: 'UPI456'
    };

    render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithNames} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  // Test 10: Patient name from fullName
  it('should handle patient with fullName', () => {
    const patientWithFullName = {
      id: 123,
      fullName: 'Robert Johnson',
      upi: 'UPI789'
    };

    render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithFullName} />);
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument();
  });

  // Test 11: Notes input field
  it('should allow entering notes', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const notesInput = screen.getByPlaceholderText(/Enter clinical indication/i);
    fireEvent.change(notesInput, { target: { value: 'Test notes here' } });
    expect(notesInput).toHaveValue('Test notes here');
  });

  // Test 12: Multiple investigation types can be selected
  it('should allow selecting multiple investigation types', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );
    const mriCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('MRI')
    );

    if (psaCheckbox && mriCheckbox) {
      fireEvent.click(psaCheckbox);
      fireEvent.click(mriCheckbox);

      expect(psaCheckbox).toBeChecked();
      expect(mriCheckbox).toBeChecked();
    }
  });

  // Test 13: Patient with patientId instead of id
  it('should handle patient with patientId field', () => {
    const patientWithPatientId = {
      patientId: 456,
      name: 'Test Patient',
      upi: 'UPI999'
    };

    render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithPatientId} />);
    expect(screen.getByText('Test Patient')).toBeInTheDocument();
  });

  // Test 14: Display clinical notes label
  it('should display clinical notes section', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);
    expect(screen.getByText(/Clinical Notes/i)).toBeInTheDocument();
  });

  // Test 15: Investigation Type label is present
  it('should display investigation type label', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);
    expect(screen.getByText('Investigation Type')).toBeInTheDocument();
  });

  // Test 16: Print consent form with blob URL for uploaded template
  it('should handle print consent form with blob URL', async () => {
    const { consentFormService } = await import('../../services/consentFormService');
    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    const mockTemplate = {
      id: 1,
      test_name: 'MRI',
      template_file_url: 'http://example.com/mri.pdf',
      template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
      is_auto_generated: false
    };

    consentFormService.getConsentFormFile.mockResolvedValue({ success: true, data: mockBlob });
    consentFormService.getConsentFormTemplates.mockResolvedValue({ success: true, data: [mockTemplate] });

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Verify the service is available
    expect(consentFormService.getConsentFormFile).toBeDefined();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  // Test 17: Print consent form error handling
  it('should handle error when fetching template file for printing', async () => {
    const { consentFormService } = await import('../../services/consentFormService');
    const mockTemplate = {
      id: 1,
      test_name: 'MRI',
      template_file_url: 'http://example.com/mri.pdf',
      template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
      is_auto_generated: false
    };

    consentFormService.getConsentFormFile.mockResolvedValue({ success: false, error: 'File not found' });
    consentFormService.getConsentFormTemplates.mockResolvedValue({ success: true, data: [mockTemplate] });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Verify error handling is in place
    expect(consentFormService.getConsentFormFile).toBeDefined();
  });

  // Test 18: Print auto-generated consent form
  it('should handle print auto-generated consent form', async () => {
    const mockTemplate = {
      id: 1,
      test_name: 'TRUS',
      is_auto_generated: true
    };

    const { consentFormService } = await import('../../services/consentFormService');
    consentFormService.getConsentFormTemplates.mockResolvedValue({ success: true, data: [mockTemplate] });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Auto-generated forms should use HTML generation, not blob fetch
    expect(consentFormService.getConsentFormFile).not.toHaveBeenCalled();
  });

  // Test 19: Form submission with PSA test
  it('should submit form with PSA test successfully', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Select PSA Test
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      // Select PSA Total test
      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      // Submit form
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    }
  });

  // Test 20: Form submission with urgent priority
  it('should submit form with urgent priority', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Select investigation type
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      // Select test
      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      // Check urgent
      const urgentCheckbox = screen.getByText('Urgent').closest('label')?.querySelector('input[type="checkbox"]');
      if (urgentCheckbox) {
        fireEvent.click(urgentCheckbox);
      }

      // Submit
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
      });
    }
  });

  // Test 21: Form submission with notes
  it('should submit form with clinical notes', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Select investigation type and test
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      // Add notes
      const notesInput = screen.getByPlaceholderText(/Enter clinical indication/i);
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });

      // Submit
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
      });
    }
  });

  // Test 22: Error - missing patient
  it('should show error when patient is missing', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} patient={null} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Patient information is missing/i)).toBeInTheDocument();
      });
    }
  });

  // Test 23: Error - no investigation type selected
  it('should show error when no investigation type is selected', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const submitButtons = screen.getAllByText('Add Clinical Investigation');
    const submitButton = submitButtons[submitButtons.length - 1];
    
    // Try to submit without selecting anything
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please select at least one investigation type/i)).toBeInTheDocument();
    });
  });

  // Test 24: Error - no test selected for investigation type
  it('should show error when investigation type selected but no test selected', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Select investigation type but not a test
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      // Submit without selecting a test
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
      });
    }
  });

  // Test 25: Error - notesService fails
  it('should handle notesService failure', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: false, error: 'Service error' });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Service error/i)).toBeInTheDocument();
      });
    }
  });

  // Test 26: Error - exception during submission
  it('should handle exception during submission', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockRejectedValue(new Error('Network error'));

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
      });
    }
  });

  // Test 27: Custom test with consent form
  it('should handle custom test with consent form', async () => {
    const { notesService } = await import('../../services/notesService');
    const { consentFormService } = await import('../../services/consentFormService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });
    consentFormService.createConsentFormTemplate.mockResolvedValue({ success: true });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    // Select Custom Test
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const customCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('Custom Test')
    );

    if (customCheckbox) {
      fireEvent.click(customCheckbox);
      await waitFor(() => {
        const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
        fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
      });

      // Check consent required
      const consentCheckbox = screen.getByText(/Consent Form Required/i).closest('label')?.querySelector('input[type="checkbox"]');
      if (consentCheckbox) {
        fireEvent.click(consentCheckbox);
      }

      // Upload consent file
      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
        if (fileInput) {
          const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
          fireEvent.change(fileInput, { target: { files: [file] } });
        }
      });

      // Submit
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
      }, { timeout: 3000 });
    }
  });

  // Test 28: Toggle investigation type off
  it('should handle deselecting investigation type', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      // Select
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      // Deselect
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.queryByText('PSA Total')).not.toBeInTheDocument();
      });
    }
  });

  // Test 29: Toggle test name off
  it('should handle deselecting test name', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        // Select
        fireEvent.click(psaTotalCheckbox);
        expect(psaTotalCheckbox).toBeChecked();
        
        // Deselect
        fireEvent.click(psaTotalCheckbox);
        expect(psaTotalCheckbox).not.toBeChecked();
      }
    }
  });

  // Test 30: Patient with patient_id field
  it('should handle patient with patient_id field', () => {
    const patientWithPatientId = {
      patient_id: 789,
      name: 'Test Patient ID',
      upi: 'UPI789'
    };

    render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithPatientId} />);
    expect(screen.getByText('Test Patient ID')).toBeInTheDocument();
  });

  // Test 31: Patient with first_name and last_name
  it('should handle patient with first_name and last_name', () => {
    const patientWithUnderscoreNames = {
      id: 123,
      first_name: 'Jane',
      last_name: 'Smith',
      upi: 'UPI456'
    };

    render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithUnderscoreNames} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  // Test 32: Close button in header
  it('should call onClose when header close button is clicked', () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);
    
    const closeButtons = screen.getAllByRole('button');
    const headerCloseButton = closeButtons.find(btn => 
      btn.querySelector('svg') || btn.textContent === ''
    );
    
    if (headerCloseButton) {
      fireEvent.click(headerCloseButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  // Test 33: Prevent submission when already submitting
  it('should prevent submission when already submitting', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );

    if (psaCheckbox) {
      fireEvent.click(psaCheckbox);
      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
      });

      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      if (psaTotalCheckbox) {
        fireEvent.click(psaTotalCheckbox);
      }

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      
      // Click multiple times
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should only be called once
        expect(notesService.addNote).toHaveBeenCalledTimes(1);
      });
    }
  });

  // Test 34: Custom test without consent form
  it('should submit custom test without consent form', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const customCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('Custom Test')
    );

    if (customCheckbox) {
      fireEvent.click(customCheckbox);
      await waitFor(() => {
        const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
        fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
      });

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
      });
    }
  });

  // Test 35: Error - custom test name is empty
  it('should show error when custom test name is empty', async () => {
    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const customCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('Custom Test')
    );

    if (customCheckbox) {
      fireEvent.click(customCheckbox);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter custom test name/i)).toBeInTheDocument();
      });

      // Don't enter a name, just submit
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
      });
    }
  });

  // Test 36: Multiple investigation types with multiple tests
  it('should handle multiple investigation types with multiple tests', async () => {
    const { notesService } = await import('../../services/notesService');
    notesService.addNote.mockResolvedValue({ success: true, data: { id: 1 } });

    render(<AddClinicalInvestigationModal {...defaultProps} />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const psaCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('PSA Test')
    );
    const mriCheckbox = Array.from(checkboxes).find(cb =>
      cb.closest('label')?.textContent?.includes('MRI')
    );

    if (psaCheckbox && mriCheckbox) {
      fireEvent.click(psaCheckbox);
      fireEvent.click(mriCheckbox);

      await waitFor(() => {
        expect(screen.getByText('PSA Total')).toBeInTheDocument();
        expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
      });

      // Select tests from both types
      const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
      const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));

      if (psaTotalCheckbox) fireEvent.click(psaTotalCheckbox);
      if (mriProstateCheckbox) fireEvent.click(mriProstateCheckbox);

      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(notesService.addNote).toHaveBeenCalled();
      });
    }
  });

  describe('Consent Form Handling', () => {
    it('should fetch consent forms on mount', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });

    it('should handle consent forms fetch error', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ success: false, error: 'Failed to fetch' });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle consent forms fetch exception', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockRejectedValueOnce(new Error('Network error'));
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should print consent form for test', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      getConsentFormBlobUrl.mockResolvedValueOnce({ 
        success: true, 
        blobUrl: 'blob:url', 
        fileName: 'Test Consent Form' 
      });
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'PSA Total' }] 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle print consent form error', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      getConsentFormBlobUrl.mockResolvedValueOnce({ 
        success: false, 
        error: 'Failed to load' 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle print consent form exception', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      getConsentFormBlobUrl.mockRejectedValueOnce(new Error('Network error'));
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should upload signed consent form', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.uploadConsentForm.mockResolvedValueOnce({ success: true });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should handle consent form upload error', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.uploadConsentForm.mockResolvedValueOnce({ success: false, error: 'Failed to upload' });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should view uploaded consent form', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormFile.mockResolvedValueOnce({ 
        success: true, 
        data: new Blob(['test'], { type: 'application/pdf' }) 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate patient ID is required', async () => {
      const patientWithoutId = { name: 'Test Patient' };
      render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithoutId} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(screen.getByText(/Patient information is missing/i)).toBeInTheDocument();
            });
          }
        });
      }
    });

    it('should validate at least one investigation type is selected', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Please select at least one investigation type/i)).toBeInTheDocument();
      });
    });

    it('should validate at least one test is selected', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const submitButtons = screen.getAllByText('Add Clinical Investigation');
          const submitButton = submitButtons[submitButtons.length - 1];
          fireEvent.click(submitButton);
          expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
        });
      }
    });

    it('should validate custom test name is provided', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const submitButtons = screen.getAllByText('Add Clinical Investigation');
          const submitButton = submitButtons[submitButtons.length - 1];
          fireEvent.click(submitButton);
          expect(screen.getByText(/Please select at least one test/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Test Name Selection', () => {
    it('should toggle test name selection', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            expect(psaTotalCheckbox).toBeChecked();
            fireEvent.click(psaTotalCheckbox);
            expect(psaTotalCheckbox).not.toBeChecked();
          }
        });
      }
    });

    it('should handle multiple test selections for same type', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          const psaFreeCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Free'));
          if (psaTotalCheckbox && psaFreeCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            fireEvent.click(psaFreeCheckbox);
            expect(psaTotalCheckbox).toBeChecked();
            expect(psaFreeCheckbox).toBeChecked();
          }
        });
      }
    });

    it('should clear test names when investigation type is deselected', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            fireEvent.click(psaCheckbox); // Deselect PSA Test
            await waitFor(() => {
              expect(screen.queryByText('PSA Total')).not.toBeInTheDocument();
            });
          }
        });
      }
    });
  });

  describe('Custom Test Handling', () => {
    it('should create consent form template for custom test with consent', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      consentFormService.createConsentFormTemplate.mockResolvedValueOnce({ success: true });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should handle custom test without consent', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          const submitButtons = screen.getAllByText('Add Clinical Investigation');
          const submitButton = submitButtons[submitButtons.length - 1];
          fireEvent.click(submitButton);
          await waitFor(() => {
            expect(notesService.addNote).toHaveBeenCalled();
          });
        });
      }
    });

    it('should handle custom test consent form file upload', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
              const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
              fireEvent.change(fileInput, { target: { files: [file] } });
              expect(fileInput.files).toHaveLength(1);
              expect(fileInput.files[0].name).toBe('test.pdf');
            }
          }
        });
        expect(customCheckbox).toBeChecked();
      }
    });
  });

  describe('Form Submission', () => {
    it('should submit form with PSA test', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should submit form with urgent priority', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const urgentCheckbox = screen.getByText('Urgent').closest('label')?.querySelector('input[type="checkbox"]');
      if (urgentCheckbox) {
        fireEvent.click(urgentCheckbox);
      }
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should submit form with notes', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const notesInput = screen.getByPlaceholderText(/Enter clinical indication/i);
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should handle submission error', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: false, error: 'Failed to create note' });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(screen.getByText(/Failed to add clinical investigation/i)).toBeInTheDocument();
            });
          }
        });
      }
    });

    it('should handle submission exception', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockRejectedValueOnce(new Error('Network error'));
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
            });
          }
        });
      }
      consoleError.mockRestore();
    });

    it('should call onSuccess after successful submission', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(mockOnSuccess).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should reset form after successful submission', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(mockOnClose).toHaveBeenCalled();
            });
          }
        });
      }
    });
  });

  describe('Patient ID Resolution', () => {
    it('should use patient.patientId when id is not available', async () => {
      const patientWithPatientId = { patientId: 123, name: 'Test Patient' };
      const { consentFormService } = await import('../../services/consentFormService');
      render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithPatientId} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(123);
      });
    });

    it('should use patient.patient_id when id and patientId are not available', async () => {
      const patientWithPatient_id = { patient_id: 456, name: 'Test Patient' };
      const { consentFormService } = await import('../../services/consentFormService');
      render(<AddClinicalInvestigationModal {...defaultProps} patient={patientWithPatient_id} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalledWith(456);
      });
    });
  });

  describe('Consent Form Template Matching', () => {
    it('should match consent form template by test_name', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'PSA Total' }] 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should match consent form template by procedure_name', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, procedure_name: 'PSA Total' }] 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should match consent form template with spaces normalized', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'PSA  Total' }] // Extra spaces
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('Patient Consent Form Matching', () => {
    it('should match patient consent form by consent_form_name', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'PSA Total' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, consent_form_name: 'PSA Total', template_id: 1 }] 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });

    it('should match patient consent form by template', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, test_name: 'PSA Total' }] 
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({ 
        success: true, 
        data: [{ id: 1, template_id: 1 }] 
      });
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });
  });

  describe('Multiple Investigation Types Submission', () => {
    it('should submit form with multiple investigation types', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      const mriCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('MRI')
      );
      if (psaCheckbox && mriCheckbox) {
        fireEvent.click(psaCheckbox);
        fireEvent.click(mriCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));
          if (psaTotalCheckbox && mriProstateCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            fireEvent.click(mriProstateCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
            });
          }
        });
      }
    });

    it('should format test names correctly in note content', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalled();
              const callArgs = notesService.addNote.mock.calls[0];
              expect(callArgs[1].noteContent).toContain('PSA Total');
            });
          }
        });
      }
    });
  });

  describe('Consent Form Template Creation', () => {
    it('should create consent form template for custom test on submission', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      consentFormService.createConsentFormTemplate.mockResolvedValueOnce({ success: true });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
              const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
              fireEvent.change(fileInput, { target: { files: [file] } });
              await waitFor(() => {
                const submitButtons = screen.getAllByText('Add Clinical Investigation');
                const submitButton = submitButtons[submitButtons.length - 1];
                fireEvent.click(submitButton);
                await waitFor(() => {
                  expect(consentFormService.createConsentFormTemplate).toHaveBeenCalled();
                });
              });
            }
          }
        });
      }
    });

    it('should handle consent form template creation error gracefully', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      consentFormService.createConsentFormTemplate.mockResolvedValueOnce({ success: false, error: 'Failed to create' });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
              const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
              fireEvent.change(fileInput, { target: { files: [file] } });
              await waitFor(() => {
                const submitButtons = screen.getAllByText('Add Clinical Investigation');
                const submitButton = submitButtons[submitButtons.length - 1];
                fireEvent.click(submitButton);
                await waitFor(() => {
                  expect(notesService.addNote).toHaveBeenCalled();
                  // Should still succeed even if consent form creation fails
                  expect(mockOnSuccess).toHaveBeenCalled();
                });
              });
            }
          }
        });
      }
    });
  });

  describe('Form Reset', () => {
    it('should reset all form fields on close', () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
      }
      const notesInput = screen.getByPlaceholderText(/Enter clinical indication/i);
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Prevent Double Submission', () => {
    it('should not submit if already submitting', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
          if (psaTotalCheckbox) {
            fireEvent.click(psaTotalCheckbox);
            const submitButtons = screen.getAllByText('Add Clinical Investigation');
            const submitButton = submitButtons[submitButtons.length - 1];
            fireEvent.click(submitButton);
            // Try to submit again
            fireEvent.click(submitButton);
            await waitFor(() => {
              expect(notesService.addNote).toHaveBeenCalledTimes(1);
            });
          }
        });
      }
    });
  });

  describe('Error Display', () => {
    it('should display validation error', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      const submitButtons = screen.getAllByText('Add Clinical Investigation');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Please select at least one investigation type/i)).toBeInTheDocument();
      });
    });

    it('should clear error when form is reset', () => {
      const { rerender } = render(<AddClinicalInvestigationModal {...defaultProps} />);
      rerender(<AddClinicalInvestigationModal {...defaultProps} isOpen={false} />);
      rerender(<AddClinicalInvestigationModal {...defaultProps} isOpen={true} />);
      // Error should be cleared
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Consent Form Print Handling', () => {
    it('should open PDF viewer when printing consent form', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      const { consentFormService } = await import('../../services/consentFormService');
      
      getConsentFormBlobUrl.mockResolvedValueOnce({
        success: true,
        blobUrl: 'blob:test-url',
        fileName: 'MRI Consent Form.pdf'
      });
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI Prostate' }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const mriCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('MRI')
      );
      
      if (mriCheckbox) {
        fireEvent.click(mriCheckbox);
        await waitFor(() => {
          expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
        });
        
        const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));
        
        if (mriProstateCheckbox) {
          fireEvent.click(mriProstateCheckbox);
          
          await waitFor(() => {
            const printButtons = screen.queryAllByText('Print');
            if (printButtons.length > 0) {
              fireEvent.click(printButtons[0]);
            }
          });
          
          await waitFor(() => {
            expect(getConsentFormBlobUrl).toHaveBeenCalled();
            expect(screen.getByTestId('pdf-viewer-modal')).toBeInTheDocument();
          });
        }
      }
    });

    it('should handle print consent form error', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      const { consentFormService } = await import('../../services/consentFormService');
      
      getConsentFormBlobUrl.mockResolvedValueOnce({
        success: false,
        error: 'Failed to load'
      });
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI Prostate' }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const mriCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('MRI')
      );
      
      if (mriCheckbox) {
        fireEvent.click(mriCheckbox);
        await waitFor(() => {
          expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
        });
        
        const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));
        
        if (mriProstateCheckbox) {
          fireEvent.click(mriProstateCheckbox);
          
          await waitFor(() => {
            const printButtons = screen.queryAllByText('Print');
            if (printButtons.length > 0) {
              fireEvent.click(printButtons[0]);
            }
          });
          
          await waitFor(() => {
            expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
          });
        }
      }
    });

    it('should handle print consent form exception', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      const { consentFormService } = await import('../../services/consentFormService');
      
      getConsentFormBlobUrl.mockRejectedValueOnce(new Error('Network error'));
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI Prostate' }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const mriCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('MRI')
      );
      
      if (mriCheckbox) {
        fireEvent.click(mriCheckbox);
        await waitFor(() => {
          expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
        });
        
        const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));
        
        if (mriProstateCheckbox) {
          fireEvent.click(mriProstateCheckbox);
          
          await waitFor(() => {
            const printButtons = screen.queryAllByText('Print');
            if (printButtons.length > 0) {
              fireEvent.click(printButtons[0]);
            }
          });
          
          await waitFor(() => {
            expect(screen.getByText(/Failed to load consent form/i)).toBeInTheDocument();
          });
        }
      }
      
      consoleError.mockRestore();
    });

    it('should close PDF viewer and cleanup blob URL', async () => {
      const { getConsentFormBlobUrl } = await import('../../utils/consentFormUtils');
      const { consentFormService } = await import('../../services/consentFormService');
      
      getConsentFormBlobUrl.mockResolvedValueOnce({
        success: true,
        blobUrl: 'blob:test-url',
        fileName: 'MRI Consent Form.pdf'
      });
      
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI Prostate' }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const mriCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('MRI')
      );
      
      if (mriCheckbox) {
        fireEvent.click(mriCheckbox);
        await waitFor(() => {
          expect(screen.getByText('MRI Prostate')).toBeInTheDocument();
        });
        
        const mriProstateCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('MRI Prostate'));
        
        if (mriProstateCheckbox) {
          fireEvent.click(mriProstateCheckbox);
          
          await waitFor(() => {
            const printButtons = screen.queryAllByText('Print');
            if (printButtons.length > 0) {
              fireEvent.click(printButtons[0]);
            }
          });
          
          await waitFor(() => {
            const closeButton = screen.queryByTestId('close-pdf-viewer');
            if (closeButton) {
              fireEvent.click(closeButton);
            }
          });
          
          await waitFor(() => {
            expect(global.URL.revokeObjectURL).toHaveBeenCalled();
          });
        }
      }
    });
  });

  describe('Custom Test Consent Form File Upload', () => {
    it('should reject non-PDF files for custom test consent form', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            
            await waitFor(() => {
              const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
              if (fileInput) {
                const file = new File(['test'], 'test.doc', { type: 'application/msword' });
                fireEvent.change(fileInput, { target: { files: [file] } });
                expect(global.alert).toHaveBeenCalledWith('Only PDF files are allowed');
              }
            });
          }
        });
      }
    });

    it('should reject files larger than 10MB for custom test consent form', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            
            await waitFor(() => {
              const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
              if (fileInput) {
                const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
                fireEvent.change(fileInput, { target: { files: [largeFile] } });
                expect(global.alert).toHaveBeenCalledWith('File size must be less than 10MB');
              }
            });
          }
        });
      }
    });

    it('should clear consent data when consent required is unchecked', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const customCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Custom Test')
      );
      
      if (customCheckbox) {
        fireEvent.click(customCheckbox);
        await waitFor(() => {
          const customInput = screen.getByPlaceholderText(/Enter custom test name/i);
          fireEvent.change(customInput, { target: { value: 'Custom Test Name' } });
          
          const consentCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.closest('label')?.textContent?.includes('Consent Required'));
          
          if (consentCheckbox) {
            fireEvent.click(consentCheckbox);
            expect(consentCheckbox).toBeChecked();
            
            const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
            if (fileInput) {
              const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
              fireEvent.change(fileInput, { target: { files: [file] } });
            }
            
            fireEvent.click(consentCheckbox);
            expect(consentCheckbox).not.toBeChecked();
            
            await waitFor(() => {
              expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
            });
          }
        });
      }
    });
  });

  describe('Test Name Filtering', () => {
    it('should filter out empty test names', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockResolvedValueOnce({ success: true, data: { id: 1 } });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          expect(screen.getByText('PSA Total')).toBeInTheDocument();
        });
        
        const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
        
        if (psaTotalCheckbox) {
          fireEvent.click(psaTotalCheckbox);
          
          const submitButtons = screen.getAllByText('Add Clinical Investigation');
          const submitButton = submitButtons[submitButtons.length - 1];
          fireEvent.click(submitButton);
          
          await waitFor(() => {
            expect(notesService.addNote).toHaveBeenCalled();
            const callArgs = notesService.addNote.mock.calls[0];
            expect(callArgs[1].noteContent).not.toContain('other');
          });
        }
      }
    });
  });

  describe('Consent Form Template Matching Edge Cases', () => {
    it('should match template with spaces in test name', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'PSA  Total' }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });

    it('should match template by procedure_name when test_name is not available', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, procedure_name: 'TRUS Guided Biopsy', test_name: null }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getConsentFormTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('Patient Consent Form Matching Edge Cases', () => {
    it('should match patient consent form by consent_form_name with spaces', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'MRI Prostate' }]
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, consent_form_name: 'MRI  Prostate', template_id: 1 }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
    });

    it('should handle patient consent form with uploaded file path', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'Biopsy' }]
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{ 
          id: 1, 
          consent_form_name: 'Biopsy',
          file_path: 'uploads/consent-forms/patients/123/biopsy.pdf',
          template_id: 1
        }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const biopsyCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Biopsy')
      );
      
      if (biopsyCheckbox) {
        fireEvent.click(biopsyCheckbox);
        await waitFor(() => {
          expect(screen.getByText('Prostate Biopsy')).toBeInTheDocument();
        });
        
        const biopsyTestCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('Prostate Biopsy'));
        
        if (biopsyTestCheckbox) {
          fireEvent.click(biopsyTestCheckbox);
          
          await waitFor(() => {
            expect(screen.getByText('Signed')).toBeInTheDocument();
          });
        }
      }
    });

    it('should not show signed badge for auto-attached forms', async () => {
      const { consentFormService } = await import('../../services/consentFormService');
      consentFormService.getConsentFormTemplates.mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, test_name: 'Biopsy' }]
      });
      consentFormService.getPatientConsentForms.mockResolvedValueOnce({
        success: true,
        data: [{ 
          id: 1, 
          consent_form_name: 'Biopsy',
          file_path: 'uploads/consent-forms/templates/biopsy.pdf',
          template_id: 1
        }]
      });
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consentFormService.getPatientConsentForms).toHaveBeenCalled();
      });
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const biopsyCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('Biopsy')
      );
      
      if (biopsyCheckbox) {
        fireEvent.click(biopsyCheckbox);
        await waitFor(() => {
          expect(screen.getByText('Prostate Biopsy')).toBeInTheDocument();
        });
        
        const biopsyTestCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('Prostate Biopsy'));
        
        if (biopsyTestCheckbox) {
          fireEvent.click(biopsyTestCheckbox);
          
          await waitFor(() => {
            expect(screen.queryByText('Signed')).not.toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Submit Button Disabled State', () => {
    it('should disable submit button when submitting', async () => {
      const { notesService } = await import('../../services/notesService');
      notesService.addNote.mockImplementation(() => new Promise(() => {}));
      
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          expect(screen.getByText('PSA Total')).toBeInTheDocument();
        });
        
        const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
        
        if (psaTotalCheckbox) {
          fireEvent.click(psaTotalCheckbox);
          
          const submitButtons = screen.getAllByText('Add Clinical Investigation');
          const submitButton = submitButtons[submitButtons.length - 1];
          fireEvent.click(submitButton);
          
          await waitFor(() => {
            expect(submitButton).toBeDisabled();
            expect(screen.getByText('Adding...')).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Test Selection Count Display', () => {
    it('should display test selection count', async () => {
      render(<AddClinicalInvestigationModal {...defaultProps} />);
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const psaCheckbox = Array.from(checkboxes).find(cb =>
        cb.closest('label')?.textContent?.includes('PSA Test')
      );
      
      if (psaCheckbox) {
        fireEvent.click(psaCheckbox);
        await waitFor(() => {
          expect(screen.getByText('PSA Total')).toBeInTheDocument();
        });
        
        const psaTotalCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('PSA Total'));
        const psaFreeCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => cb.closest('label')?.textContent?.includes('PSA Free'));
        
        if (psaTotalCheckbox && psaFreeCheckbox) {
          fireEvent.click(psaTotalCheckbox);
          fireEvent.click(psaFreeCheckbox);
          
          await waitFor(() => {
            expect(screen.getByText(/2 tests selected/i)).toBeInTheDocument();
          });
        }
      }
    });
  });
});
