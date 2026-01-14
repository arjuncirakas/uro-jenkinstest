import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AddPatientModal from '../AddPatientModal';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';
import authService from '../../services/authService';
import * as inputValidation from '../../utils/inputValidation';

// Mock dependencies
vi.mock('../../services/patientService', () => ({
  patientService: {
    addPatient: vi.fn()
  }
}));

vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getAvailableUrologists: vi.fn(),
    getAvailableGPs: vi.fn()
  }
}));

vi.mock('../../services/authService', () => ({
  default: {
    getCurrentUser: vi.fn()
  }
}));

vi.mock('../../utils/inputValidation', () => ({
  validateNameInput: vi.fn((value) => /^[a-zA-Z\s'.-]*$/.test(value)),
  validatePhoneInput: vi.fn((value) => /^[\d\s\-\(\)\+]*$/.test(value)),
  validateNumericInput: vi.fn((value) => /^[\d.]*$/.test(value)),
  validatePatientForm: vi.fn(() => ({})),
  sanitizeInput: vi.fn((value) => value)
}));

vi.mock('../ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onCancel, title, message }) => (
    isOpen ? (
      <div data-testid="confirm-modal">
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={() => onConfirm(true)}>Save</button>
        <button onClick={() => onConfirm(false)}>Don't Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

vi.mock('../modals/AddGPModal', () => ({
  default: ({ isOpen, onClose, onSuccess }) => (
    isOpen ? (
      <div data-testid="add-gp-modal">
        <button onClick={() => onSuccess({ userId: 1 })}>Add GP</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

describe('AddPatientModal', () => {
  const mockOnClose = vi.fn();
  const mockOnPatientAdded = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onPatientAdded: mockOnPatientAdded,
    onError: mockOnError,
    isUrologist: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService.getCurrentUser.mockReturnValue({ id: 1, role: 'nurse' });
    bookingService.getAvailableUrologists.mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'Dr. Smith' }]
    });
    bookingService.getAvailableGPs.mockResolvedValue({
      success: true,
      data: { gps: [{ id: 1, firstName: 'John', lastName: 'Doe' }] }
    });
    patientService.addPatient.mockResolvedValue({
      success: true,
      data: { id: 1, firstName: 'Test', lastName: 'Patient' }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AddPatientModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Add New Patient')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<AddPatientModal {...defaultProps} />);
      expect(screen.getByText('Add New Patient')).toBeInTheDocument();
    });

    it('should render all form sections', () => {
      render(<AddPatientModal {...defaultProps} />);
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('GP Information')).toBeInTheDocument();
      expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
      expect(screen.getByText('Medical Information')).toBeInTheDocument();
      expect(screen.getByText('PSA Information')).toBeInTheDocument();
      expect(screen.getByText('Exam & Prior Tests')).toBeInTheDocument();
    });

    it('should render all required input fields', () => {
      render(<AddPatientModal {...defaultProps} />);
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update firstName when input changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByLabelText(/first name/i);
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      expect(firstNameInput.value).toBe('John');
    });

    it('should validate name input and reject invalid characters', () => {
      inputValidation.validateNameInput.mockReturnValue(false);
      render(<AddPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByLabelText(/first name/i);
      fireEvent.change(firstNameInput, { target: { value: 'John123' } });
      // Should not update if validation fails
      expect(firstNameInput.value).toBe('');
    });

    it('should update phone number when input changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '1234567890' } });
      expect(phoneInput.value).toBe('1234567890');
    });

    it('should validate phone input and reject invalid characters', () => {
      inputValidation.validatePhoneInput.mockReturnValue(false);
      render(<AddPatientModal {...defaultProps} />);
      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: 'abc123' } });
      expect(phoneInput.value).toBe('');
    });

    it('should update email when input changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update dateOfBirth and calculate age', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dobInput = screen.getByLabelText(/date of birth/i);
      const ageInput = screen.getByLabelText(/^age/i);
      
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 30);
      const dateString = pastDate.toISOString().split('T')[0];
      
      fireEvent.change(dobInput, { target: { value: dateString } });
      
      expect(dobInput.value).toBe(dateString);
      expect(ageInput.value).toBe('30');
    });

    it('should clear age when dateOfBirth is cleared', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dobInput = screen.getByLabelText(/date of birth/i);
      const ageInput = screen.getByLabelText(/^age/i);
      
      fireEvent.change(dobInput, { target: { value: '2000-01-01' } });
      fireEvent.change(dobInput, { target: { value: '' } });
      
      expect(ageInput.value).toBe('');
    });

    it('should update age without calculating dateOfBirth', () => {
      render(<AddPatientModal {...defaultProps} />);
      const ageInput = screen.getByLabelText(/^age/i);
      
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      expect(ageInput.value).toBe('25');
    });

    it('should validate age input (only integers)', () => {
      render(<AddPatientModal {...defaultProps} />);
      const ageInput = screen.getByLabelText(/^age/i);
      
      fireEvent.change(ageInput, { target: { value: '25.5' } });
      // Should reject decimal
      expect(ageInput.value).toBe('');
    });

    it('should update postcode (digits only)', () => {
      render(<AddPatientModal {...defaultProps} />);
      const postcodeInput = screen.getByLabelText(/postcode/i);
      
      fireEvent.change(postcodeInput, { target: { value: '4000' } });
      expect(postcodeInput.value).toBe('4000');
      
      fireEvent.change(postcodeInput, { target: { value: 'abc' } });
      // Should reject non-digits
      expect(postcodeInput.value).toBe('4000');
    });

    it('should update state dropdown', () => {
      render(<AddPatientModal {...defaultProps} />);
      const stateSelect = screen.getByLabelText(/state/i);
      
      fireEvent.change(stateSelect, { target: { value: 'NSW' } });
      expect(stateSelect.value).toBe('NSW');
    });

    it('should update initialPSA (numeric with decimal)', () => {
      render(<AddPatientModal {...defaultProps} />);
      const psaInput = screen.getByLabelText(/initial psa level/i);
      
      fireEvent.change(psaInput, { target: { value: '4.5' } });
      expect(psaInput.value).toBe('4.5');
    });

    it('should validate PSA input and reject non-numeric', () => {
      inputValidation.validateNumericInput.mockReturnValue(false);
      render(<AddPatientModal {...defaultProps} />);
      const psaInput = screen.getByLabelText(/initial psa level/i);
      
      fireEvent.change(psaInput, { target: { value: 'abc' } });
      expect(psaInput.value).toBe('');
    });

    it('should clear priorBiopsyDate when priorBiopsy is set to no', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      // Set priorBiopsy to yes and add date
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      const biopsyDateInput = screen.getByLabelText(/biopsy date/i);
      fireEvent.change(biopsyDateInput, { target: { value: '2020-01-01' } });
      
      // Set to no
      const noRadio = screen.getByLabelText(/^no$/i);
      fireEvent.click(noRadio);
      
      expect(biopsyDateInput.value).toBe('');
    });

    it('should update textarea fields', () => {
      render(<AddPatientModal {...defaultProps} />);
      const medicalHistoryTextarea = screen.getByLabelText(/medical history/i);
      
      fireEvent.change(medicalHistoryTextarea, { target: { value: 'Hypertension' } });
      expect(medicalHistoryTextarea.value).toBe('Hypertension');
    });

    it('should sanitize input values', () => {
      inputValidation.sanitizeInput.mockReturnValue('sanitized');
      render(<AddPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByLabelText(/first name/i);
      
      fireEvent.change(firstNameInput, { target: { value: '<script>alert("xss")</script>' } });
      
      expect(inputValidation.sanitizeInput).toHaveBeenCalled();
    });

    it('should clear errors when user starts typing', () => {
      render(<AddPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByLabelText(/first name/i);
      
      // Trigger error first
      inputValidation.validatePatientForm.mockReturnValue({ firstName: 'Required' });
      const form = firstNameInput.closest('form');
      fireEvent.submit(form);
      
      // Then type to clear error
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      
      // Error should be cleared
      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });
  });

  describe('DRE Findings', () => {
    it('should toggle DRE done checkbox', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      
      expect(dreCheckbox.checked).toBe(false);
      fireEvent.click(dreCheckbox);
      expect(dreCheckbox.checked).toBe(true);
    });

    it('should show DRE findings when DRE is done', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      fireEvent.click(dreCheckbox);
      
      expect(screen.getByText(/dre findings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/normal/i)).toBeInTheDocument();
    });

    it('should hide DRE findings when DRE is not done', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      
      expect(screen.queryByText(/dre findings/i)).not.toBeInTheDocument();
      
      fireEvent.click(dreCheckbox);
      expect(screen.getByText(/dre findings/i)).toBeInTheDocument();
      
      fireEvent.click(dreCheckbox);
      expect(screen.queryByText(/dre findings/i)).not.toBeInTheDocument();
    });

    it('should clear DRE findings when DRE is unchecked', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      
      fireEvent.click(dreCheckbox);
      const normalCheckbox = screen.getByLabelText(/normal/i);
      fireEvent.click(normalCheckbox);
      
      expect(normalCheckbox.checked).toBe(true);
      
      fireEvent.click(dreCheckbox);
      fireEvent.click(dreCheckbox);
      
      // Findings should be cleared
      const normalCheckboxAfter = screen.getByLabelText(/normal/i);
      expect(normalCheckboxAfter.checked).toBe(false);
    });

    it('should allow multiple DRE findings', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      fireEvent.click(dreCheckbox);
      
      const normalCheckbox = screen.getByLabelText(/normal/i);
      const enlargedCheckbox = screen.getByLabelText(/enlarged/i);
      
      fireEvent.click(normalCheckbox);
      fireEvent.click(enlargedCheckbox);
      
      expect(normalCheckbox.checked).toBe(true);
      expect(enlargedCheckbox.checked).toBe(true);
    });

    it('should uncheck DRE finding when clicked again', () => {
      render(<AddPatientModal {...defaultProps} />);
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      fireEvent.click(dreCheckbox);
      
      const normalCheckbox = screen.getByLabelText(/normal/i);
      fireEvent.click(normalCheckbox);
      expect(normalCheckbox.checked).toBe(true);
      
      fireEvent.click(normalCheckbox);
      expect(normalCheckbox.checked).toBe(false);
    });
  });

  describe('Prior Biopsy', () => {
    it('should show biopsy date and gleason score when priorBiopsy is yes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      expect(screen.getByLabelText(/biopsy date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gleason score/i)).toBeInTheDocument();
    });

    it('should hide biopsy fields when priorBiopsy is no', () => {
      render(<AddPatientModal {...defaultProps} />);
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      expect(screen.getByLabelText(/biopsy date/i)).toBeInTheDocument();
      
      const noRadio = screen.getByLabelText(/^no$/i);
      fireEvent.click(noRadio);
      
      expect(screen.queryByLabelText(/biopsy date/i)).not.toBeInTheDocument();
    });

    it('should update priorBiopsyDate', () => {
      render(<AddPatientModal {...defaultProps} />);
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      const dateInput = screen.getByLabelText(/biopsy date/i);
      fireEvent.change(dateInput, { target: { value: '2020-01-01' } });
      
      expect(dateInput.value).toBe('2020-01-01');
    });

    it('should update gleasonScore', () => {
      render(<AddPatientModal {...defaultProps} />);
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      const gleasonInput = screen.getByLabelText(/gleason score/i);
      fireEvent.change(gleasonInput, { target: { value: '3+4' } });
      
      expect(gleasonInput.value).toBe('3+4');
    });
  });

  describe('Comorbidities', () => {
    it('should toggle comorbidity checkbox', () => {
      render(<AddPatientModal {...defaultProps} />);
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      
      expect(cvdCheckbox.checked).toBe(false);
      fireEvent.click(cvdCheckbox);
      expect(cvdCheckbox.checked).toBe(true);
    });

    it('should allow multiple comorbidities', () => {
      render(<AddPatientModal {...defaultProps} />);
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      const diabetesCheckbox = screen.getByLabelText(/diabetes/i);
      
      fireEvent.click(cvdCheckbox);
      fireEvent.click(diabetesCheckbox);
      
      expect(cvdCheckbox.checked).toBe(true);
      expect(diabetesCheckbox.checked).toBe(true);
    });

    it('should uncheck comorbidity when clicked again', () => {
      render(<AddPatientModal {...defaultProps} />);
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      
      fireEvent.click(cvdCheckbox);
      expect(cvdCheckbox.checked).toBe(true);
      
      fireEvent.click(cvdCheckbox);
      expect(cvdCheckbox.checked).toBe(false);
    });
  });

  describe('Triage Symptoms', () => {
    it('should render predefined symptoms', () => {
      render(<AddPatientModal {...defaultProps} />);
      expect(screen.getByText('LUTS')).toBeInTheDocument();
      expect(screen.getByText('Hematuria')).toBeInTheDocument();
      expect(screen.getByText('Nocturia')).toBeInTheDocument();
    });

    it('should toggle symptom checkbox', () => {
      render(<AddPatientModal {...defaultProps} />);
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      
      expect(lutsCheckbox.checked).toBe(false);
      fireEvent.click(lutsCheckbox);
      expect(lutsCheckbox.checked).toBe(true);
    });

    it('should show IPSS score field for LUTS when checked', () => {
      render(<AddPatientModal {...defaultProps} />);
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      fireEvent.click(lutsCheckbox);
      
      expect(screen.getByLabelText(/ipss score/i)).toBeInTheDocument();
    });

    it('should show IPSS score field for Nocturia when checked', () => {
      render(<AddPatientModal {...defaultProps} />);
      const nocturiaCheckbox = screen.getByLabelText(/nocturia/i);
      fireEvent.click(nocturiaCheckbox);
      
      expect(screen.getByLabelText(/ipss score/i)).toBeInTheDocument();
    });

    it('should show duration field when symptom is checked', () => {
      render(<AddPatientModal {...defaultProps} />);
      const hematuriaCheckbox = screen.getByLabelText(/hematuria/i);
      fireEvent.click(hematuriaCheckbox);
      
      expect(screen.getByLabelText(/duration of symptoms/i)).toBeInTheDocument();
    });

    it('should update symptom duration', () => {
      render(<AddPatientModal {...defaultProps} />);
      const hematuriaCheckbox = screen.getByLabelText(/hematuria/i);
      fireEvent.click(hematuriaCheckbox);
      
      const durationInput = screen.getByLabelText(/duration of symptoms/i);
      fireEvent.change(durationInput, { target: { value: '6' } });
      
      expect(durationInput.value).toBe('6');
    });

    it('should update symptom duration unit', () => {
      render(<AddPatientModal {...defaultProps} />);
      const hematuriaCheckbox = screen.getByLabelText(/hematuria/i);
      fireEvent.click(hematuriaCheckbox);
      
      const unitSelect = screen.getByLabelText(/unit/i);
      fireEvent.change(unitSelect, { target: { value: 'years' } });
      
      expect(unitSelect.value).toBe('years');
    });

    it('should show frequency field for Nocturia', () => {
      render(<AddPatientModal {...defaultProps} />);
      const nocturiaCheckbox = screen.getByLabelText(/nocturia/i);
      fireEvent.click(nocturiaCheckbox);
      
      expect(screen.getByLabelText(/frequency.*times per night/i)).toBeInTheDocument();
    });

    it('should update frequency for Nocturia', () => {
      render(<AddPatientModal {...defaultProps} />);
      const nocturiaCheckbox = screen.getByLabelText(/nocturia/i);
      fireEvent.click(nocturiaCheckbox);
      
      const frequencyInput = screen.getByLabelText(/frequency.*times per night/i);
      fireEvent.change(frequencyInput, { target: { value: '3' } });
      
      expect(frequencyInput.value).toBe('3');
    });

    it('should update symptom notes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const hematuriaCheckbox = screen.getByLabelText(/hematuria/i);
      fireEvent.click(hematuriaCheckbox);
      
      const notesTextarea = screen.getByLabelText(/notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Patient reports pain' } });
      
      expect(notesTextarea.value).toBe('Patient reports pain');
    });

    it('should open custom symptom modal', () => {
      render(<AddPatientModal {...defaultProps} />);
      const addCustomButton = screen.getByText(/add custom symptom/i);
      fireEvent.click(addCustomButton);
      
      expect(screen.getByTestId('custom-symptom-modal')).toBeInTheDocument();
    });

    it('should add custom symptom', () => {
      render(<AddPatientModal {...defaultProps} />);
      const addCustomButton = screen.getByText(/add custom symptom/i);
      fireEvent.click(addCustomButton);
      
      const nameInput = screen.getByLabelText(/symptom name/i);
      fireEvent.change(nameInput, { target: { value: 'Back Pain' } });
      
      const durationInput = screen.getByLabelText(/duration of symptoms/i);
      fireEvent.change(durationInput, { target: { value: '3' } });
      
      const addButton = screen.getByText(/add symptom/i);
      fireEvent.click(addButton);
      
      expect(screen.getByText('Back Pain')).toBeInTheDocument();
    });

    it('should require IPSS score for custom LUTS symptom', () => {
      render(<AddPatientModal {...defaultProps} />);
      const addCustomButton = screen.getByText(/add custom symptom/i);
      fireEvent.click(addCustomButton);
      
      const nameInput = screen.getByLabelText(/symptom name/i);
      fireEvent.change(nameInput, { target: { value: 'LUTS' } });
      
      const addButton = screen.getByText(/add symptom/i);
      fireEvent.click(addButton);
      
      // Should show IPSS score field
      expect(screen.getByLabelText(/ipss score/i)).toBeInTheDocument();
    });

    it('should remove custom symptom', () => {
      render(<AddPatientModal {...defaultProps} />);
      const addCustomButton = screen.getByText(/add custom symptom/i);
      fireEvent.click(addCustomButton);
      
      const nameInput = screen.getByLabelText(/symptom name/i);
      fireEvent.change(nameInput, { target: { value: 'Back Pain' } });
      
      const durationInput = screen.getByLabelText(/duration of symptoms/i);
      fireEvent.change(durationInput, { target: { value: '3' } });
      
      const addButton = screen.getByText(/add symptom/i);
      fireEvent.click(addButton);
      
      const removeButton = screen.getByLabelText(/remove.*back pain/i);
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('Back Pain')).not.toBeInTheDocument();
    });

    it('should clear IPSS error when score is selected', () => {
      render(<AddPatientModal {...defaultProps} />);
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      fireEvent.click(lutsCheckbox);
      
      // Trigger validation error
      inputValidation.validatePatientForm.mockReturnValue({
        symptoms: { '0_ipss': 'IPSS score is required' }
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      // Select IPSS score
      const ipssSelect = screen.getByLabelText(/ipss score/i);
      fireEvent.change(ipssSelect, { target: { value: 'Mild' } });
      
      // Error should be cleared
      expect(screen.queryByText('IPSS score is required')).not.toBeInTheDocument();
    });
  });

  describe('GP Selection', () => {
    it('should fetch GPs on modal open', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(bookingService.getAvailableGPs).toHaveBeenCalled();
      });
    });

    it('should display GPs in dropdown', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        expect(gpSelect).toBeInTheDocument();
      });
    });

    it('should select GP from dropdown', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
        expect(gpSelect.value).toBe('1');
      });
    });

    it('should open Add GP modal', () => {
      render(<AddPatientModal {...defaultProps} />);
      const addGPButton = screen.getByText(/add gp/i);
      fireEvent.click(addGPButton);
      
      expect(screen.getByTestId('add-gp-modal')).toBeInTheDocument();
    });

    it('should auto-select GP when user is GP role', async () => {
      authService.getCurrentUser.mockReturnValue({ id: 1, role: 'gp' });
      bookingService.getAvailableGPs.mockResolvedValue({
        success: true,
        data: { gps: [{ id: 1, firstName: 'John', lastName: 'Doe' }] }
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        expect(gpSelect.value).toBe('1');
      });
    });

    it('should refresh GP list after adding new GP', async () => {
      render(<AddPatientModal {...defaultProps} />);
      const addGPButton = screen.getByText(/add gp/i);
      fireEvent.click(addGPButton);
      
      const addButton = screen.getByText(/add gp/i);
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(bookingService.getAvailableGPs).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle GP fetch error', async () => {
      bookingService.getAvailableGPs.mockResolvedValue({
        success: false,
        error: 'Failed to fetch'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(bookingService.getAvailableGPs).toHaveBeenCalled();
      });
    });
  });

  describe('Urologist Selection', () => {
    it('should fetch urologists on modal open', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
      });
    });

    it('should display urologists in dropdown', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const urologistSelect = screen.getByLabelText(/assigned urologist/i);
        expect(urologistSelect).toBeInTheDocument();
      });
    });

    it('should select urologist from dropdown', async () => {
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const urologistSelect = screen.getByLabelText(/assigned urologist/i);
        fireEvent.change(urologistSelect, { target: { value: 'Dr. Smith' } });
        expect(urologistSelect.value).toBe('Dr. Smith');
      });
    });

    it('should handle urologist fetch error', async () => {
      bookingService.getAvailableUrologists.mockResolvedValue({
        success: false,
        error: 'Failed to fetch'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      inputValidation.validatePatientForm.mockReturnValue({
        firstName: 'First name is required',
        lastName: 'Last name is required',
        phone: 'Phone is required'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is required')).toBeInTheDocument();
    });

    it('should validate dateOfBirth or age is required', () => {
      inputValidation.validatePatientForm.mockReturnValue({
        dateOfBirth: 'Date of birth or Age is required',
        age: 'Date of birth or Age is required'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/date of birth or age is required/i)).toBeInTheDocument();
    });

    it('should validate dateOfBirth is not in future', () => {
      inputValidation.validatePatientForm.mockReturnValue({
        dateOfBirth: 'Date of birth cannot be in the future'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const dobInput = screen.getByLabelText(/date of birth/i);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      fireEvent.change(dobInput, { target: { value: futureDate.toISOString().split('T')[0] } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
    });

    it('should validate age is between 0 and 120', () => {
      inputValidation.validatePatientForm.mockReturnValue({
        age: 'Please enter a valid age (0-120)'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const ageInput = screen.getByLabelText(/^age/i);
      fireEvent.change(ageInput, { target: { value: '150' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/valid age.*0-120/i)).toBeInTheDocument();
    });

    it('should validate IPSS score is required for LUTS', () => {
      render(<AddPatientModal {...defaultProps} />);
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      fireEvent.click(lutsCheckbox);
      
      inputValidation.validatePatientForm.mockReturnValue({
        symptoms: { '0_ipss': 'IPSS score is required for LUTS' }
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/ipss score is required for luts/i)).toBeInTheDocument();
    });

    it('should validate IPSS score is required for Nocturia', () => {
      render(<AddPatientModal {...defaultProps} />);
      const nocturiaCheckbox = screen.getByLabelText(/nocturia/i);
      fireEvent.click(nocturiaCheckbox);
      
      inputValidation.validatePatientForm.mockReturnValue({
        symptoms: { '2_ipss': 'IPSS score is required for Nocturia' }
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/ipss score is required for nocturia/i)).toBeInTheDocument();
    });

    it('should validate GP is selected', () => {
      inputValidation.validatePatientForm.mockReturnValue({
        referringGP: 'Please select a GP'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/please select a gp/i)).toBeInTheDocument();
    });

    it('should scroll to first error on validation failure', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;
      
      inputValidation.validatePatientForm.mockReturnValue({
        firstName: 'Required'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      vi.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalled();
      });
    });

    it('should call onPatientAdded on successful submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnPatientAdded).toHaveBeenCalled();
      });
    });

    it('should close modal on successful submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should reset form on successful submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i).value).toBe('');
      });
    });

    it('should handle API validation errors', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockResolvedValue({
        success: false,
        details: [
          { field: 'email', message: 'Email already exists' }
        ]
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          title: 'Validation Failed',
          message: 'Please correct the following errors and try again',
          errors: [{ field: 'email', message: 'Email already exists' }]
        });
      });
    });

    it('should handle API general errors', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('should handle date_of_birth constraint error', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockResolvedValue({
        success: false,
        error: 'column "date_of_birth" of relation "patients" violates not-null constraint'
      });
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form without dateOfBirth
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Date of birth is required')
          })
        );
      });
    });

    it('should calculate dateOfBirth from age when only age provided', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/^age/i), { target: { value: '30' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            age: 30,
            dateOfBirth: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
          })
        );
      });
    });

    it('should include triage symptoms in submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const hematuriaCheckbox = screen.getByLabelText(/hematuria/i);
      fireEvent.click(hematuriaCheckbox);
      
      const durationInput = screen.getByLabelText(/duration of symptoms/i);
      fireEvent.change(durationInput, { target: { value: '6' } });
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            triageSymptoms: expect.stringContaining('Hematuria')
          })
        );
      });
    });

    it('should include IPSS score for LUTS in submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      fireEvent.click(lutsCheckbox);
      
      const ipssSelect = screen.getByLabelText(/ipss score/i);
      fireEvent.change(ipssSelect, { target: { value: 'Moderate' } });
      
      const durationInput = screen.getByLabelText(/duration of symptoms/i);
      fireEvent.change(durationInput, { target: { value: '3' } });
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            triageSymptoms: expect.stringContaining('Moderate')
          })
        );
      });
    });

    it('should include priorBiopsyDate only when priorBiopsy is yes', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const yesRadio = screen.getByLabelText(/yes/i);
      fireEvent.click(yesRadio);
      
      const biopsyDateInput = screen.getByLabelText(/biopsy date/i);
      fireEvent.change(biopsyDateInput, { target: { value: '2020-01-01' } });
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            priorBiopsy: 'yes',
            priorBiopsyDate: '2020-01-01'
          })
        );
      });
    });

    it('should not include priorBiopsyDate when priorBiopsy is no', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        const callArgs = patientService.addPatient.mock.calls[0][0];
        expect(callArgs).not.toHaveProperty('priorBiopsyDate');
      });
    });

    it('should include DRE findings as comma-separated string', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const dreCheckbox = screen.getByLabelText(/dre.*done/i);
      fireEvent.click(dreCheckbox);
      
      const normalCheckbox = screen.getByLabelText(/normal/i);
      const enlargedCheckbox = screen.getByLabelText(/enlarged/i);
      fireEvent.click(normalCheckbox);
      fireEvent.click(enlargedCheckbox);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            dreFindings: expect.stringContaining('Normal')
          })
        );
      });
    });

    it('should include comorbidities array', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      fireEvent.click(cvdCheckbox);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            comorbidities: ['CVD']
          })
        );
      });
    });

    it('should handle network errors', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockRejectedValue(new Error('Network error'));
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Network Error',
            message: expect.stringContaining('Unable to connect')
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100)));
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const submitButton = screen.getByText(/add patient/i);
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/adding patient/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cancel and Unsaved Changes', () => {
    it('should close modal when cancel clicked with no unsaved changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show confirmation modal when cancel clicked with unsaved changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    });

    it('should save and close when Save clicked in confirmation modal', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalled();
      });
    });

    it('should close without saving when Don\'t Save clicked', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      
      const dontSaveButton = screen.getByText(/don't save/i);
      fireEvent.click(dontSaveButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close confirmation modal when Cancel clicked', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      
      const modalCancelButton = screen.getByText(/cancel/i);
      fireEvent.click(modalCancelButton);
      
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });

    it('should handle Escape key with unsaved changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
      
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    });

    it('should close immediately on Escape when no unsaved changes', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should detect unsaved changes correctly', () => {
      render(<AddPatientModal {...defaultProps} />);
      
      // No changes
      const cancelButton1 = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton1);
      expect(mockOnClose).toHaveBeenCalled();
      
      mockOnClose.mockClear();
      
      // With changes
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      const cancelButton2 = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton2);
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    });
  });

  describe('Date Conversion', () => {
    it('should convert date to ISO format', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const dobInput = screen.getByLabelText(/date of birth/i);
      fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.addPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            dateOfBirth: '1990-01-01'
          })
        );
      });
    });

    it('should return null for empty date strings', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        const callArgs = patientService.addPatient.mock.calls[0][0];
        expect(callArgs.referralDate).toBeNull();
      });
    });

    it('should handle invalid date strings', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      const referralDateInput = screen.getByLabelText(/referral date/i);
      fireEvent.change(referralDateInput, { target: { value: 'invalid-date' } });
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        const callArgs = patientService.addPatient.mock.calls[0][0];
        expect(callArgs.referralDate).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onPatientAdded callback', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} onPatientAdded={null} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle null onError callback', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      patientService.addPatient.mockResolvedValue({
        success: false,
        error: 'Error occurred'
      });
      
      render(<AddPatientModal {...defaultProps} onError={null} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
      });
    });

    it('should handle empty triage symptoms', async () => {
      inputValidation.validatePatientForm.mockReturnValue({});
      
      render(<AddPatientModal {...defaultProps} />);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
      fireEvent.change(screen.getByLabelText(/initial psa level/i), { target: { value: '4.5' } });
      fireEvent.change(screen.getByLabelText(/psa test date/i), { target: { value: '2024-01-01' } });
      
      await waitFor(() => {
        const gpSelect = screen.getByLabelText(/select gp/i);
        fireEvent.change(gpSelect, { target: { value: '1' } });
      });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        const callArgs = patientService.addPatient.mock.calls[0][0];
        expect(callArgs.triageSymptoms).toBeNull();
      });
    });

    it('should handle isUrologist prop', () => {
      render(<AddPatientModal {...defaultProps} isUrologist={true} />);
      expect(screen.getByText('Add New Patient')).toBeInTheDocument();
    });
  });
});
