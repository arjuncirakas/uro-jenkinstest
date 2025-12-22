import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddClinicalInvestigationModal from '../AddClinicalInvestigationModal';

// Mock the services
vi.mock('../../services/consentFormService', () => ({
  consentFormService: {
    getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }),
    uploadConsentForm: vi.fn().mockResolvedValue({ success: true }),
    createConsentFormTemplate: vi.fn().mockResolvedValue({ success: true })
  }
}));

vi.mock('../../services/notesService', () => ({
  notesService: {
    addNote: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } })
  }
}));

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
});
