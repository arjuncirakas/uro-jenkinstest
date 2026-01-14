import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditPatientModal from '../EditPatientModal';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';
import * as inputValidation from '../../utils/inputValidation';

// Mock dependencies
vi.mock('../../services/patientService', () => ({
  patientService: {
    updatePatient: vi.fn(),
    getPatientById: vi.fn()
  }
}));

vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getAvailableUrologists: vi.fn()
  }
}));

vi.mock('../../utils/inputValidation', () => ({
  validateNameInput: vi.fn((value) => /^[a-zA-Z\s'.-]*$/.test(value)),
  validatePhoneInput: vi.fn((value) => /^[\d\s\-\(\)\+]*$/.test(value)),
  validateNumericInput: vi.fn((value) => /^[\d.]*$/.test(value)),
  sanitizeInput: vi.fn((value) => value)
}));

describe('EditPatientModal', () => {
  const mockOnClose = vi.fn();
  const mockOnPatientUpdated = vi.fn();
  const mockOnError = vi.fn();

  const mockPatient = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    phone: '1234567890',
    email: 'john@example.com',
    address: '123 Main St',
    postcode: '4000',
    city: 'Brisbane',
    state: 'QLD',
    referralDate: '2024-01-01',
    initialPSA: '4.5',
    initialPSADate: '2024-01-01',
    medicalHistory: 'Hypertension',
    currentMedications: 'Aspirin',
    allergies: 'None',
    socialHistory: 'Non-smoker',
    familyHistory: 'No family history',
    assignedUrologist: 'Dr. Smith',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '0987654321',
    emergencyContactRelationship: 'Spouse',
    priority: 'Normal',
    notes: 'Test notes',
    dreDone: true,
    dreFindings: ['Normal', 'Enlarged'],
    priorBiopsy: 'yes',
    priorBiopsyDate: '2020-01-01',
    gleasonScore: '3+4',
    comorbidities: ['CVD'],
    triageSymptoms: JSON.stringify([
      { name: 'LUTS', checked: true, ipssScore: 'Moderate', duration: '6', durationUnit: 'months' }
    ])
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    patient: mockPatient,
    onPatientUpdated: mockOnPatientUpdated,
    onError: mockOnError
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.getAvailableUrologists.mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'Dr. Smith' }]
    });
    patientService.updatePatient.mockResolvedValue({
      success: true,
      data: { ...mockPatient, firstName: 'Updated' }
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<EditPatientModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Edit Patient Details')).not.toBeInTheDocument();
    });

    it('should not render when patient is null', () => {
      render(<EditPatientModal {...defaultProps} patient={null} />);
      expect(screen.queryByText('Edit Patient Details')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and patient is provided', () => {
      render(<EditPatientModal {...defaultProps} />);
      expect(screen.getByText('Edit Patient Details')).toBeInTheDocument();
    });

    it('should populate form with patient data', () => {
      render(<EditPatientModal {...defaultProps} />);
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });

    it('should handle snake_case field names', () => {
      const patientSnakeCase = {
        ...mockPatient,
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01'
      };
      render(<EditPatientModal {...defaultProps} patient={patientSnakeCase} />);
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update firstName when input changes', () => {
      render(<EditPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      expect(firstNameInput.value).toBe('Jane');
    });

    it('should update phone number', () => {
      render(<EditPatientModal {...defaultProps} />);
      const phoneInput = screen.getByDisplayValue('1234567890');
      fireEvent.change(phoneInput, { target: { value: '0987654321' } });
      expect(phoneInput.value).toBe('0987654321');
    });

    it('should update email', () => {
      render(<EditPatientModal {...defaultProps} />);
      const emailInput = screen.getByDisplayValue('john@example.com');
      fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
      expect(emailInput.value).toBe('jane@example.com');
    });

    it('should update dateOfBirth', () => {
      render(<EditPatientModal {...defaultProps} />);
      const dobInput = screen.getByDisplayValue('1990-01-01');
      fireEvent.change(dobInput, { target: { value: '1991-01-01' } });
      expect(dobInput.value).toBe('1991-01-01');
    });

    it('should update textarea fields', () => {
      render(<EditPatientModal {...defaultProps} />);
      const medicalHistoryTextarea = screen.getByDisplayValue('Hypertension');
      fireEvent.change(medicalHistoryTextarea, { target: { value: 'Updated history' } });
      expect(medicalHistoryTextarea.value).toBe('Updated history');
    });

    it('should clear errors when user starts typing', () => {
      render(<EditPatientModal {...defaultProps} />);
      const firstNameInput = screen.getByDisplayValue('John');
      
      // Trigger error
      const form = firstNameInput.closest('form');
      fireEvent.submit(form);
      
      // Type to clear error
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      // Error should be cleared (no error displayed)
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });
  });

  describe('Triage Symptoms Parsing', () => {
    it('should parse triage symptoms from JSON string', () => {
      render(<EditPatientModal {...defaultProps} />);
      // Symptoms should be parsed and displayed
      expect(screen.getByText('LUTS')).toBeInTheDocument();
    });

    it('should handle triage symptoms as array', () => {
      const patientWithArray = {
        ...mockPatient,
        triageSymptoms: [{ name: 'Hematuria', checked: true }]
      };
      render(<EditPatientModal {...defaultProps} patient={patientWithArray} />);
      expect(screen.getByText('Hematuria')).toBeInTheDocument();
    });

    it('should handle missing triage symptoms', () => {
      const patientNoSymptoms = {
        ...mockPatient,
        triageSymptoms: null
      };
      render(<EditPatientModal {...defaultProps} patient={patientNoSymptoms} />);
      // Should not crash
      expect(screen.getByText('Edit Patient Details')).toBeInTheDocument();
    });

    it('should handle invalid JSON in triage symptoms', () => {
      const patientInvalidJson = {
        ...mockPatient,
        triageSymptoms: 'invalid-json'
      };
      render(<EditPatientModal {...defaultProps} patient={patientInvalidJson} />);
      // Should handle gracefully
      expect(screen.getByText('Edit Patient Details')).toBeInTheDocument();
    });

    it('should normalize triage symptom field names', () => {
      const patientWithSnakeCase = {
        ...mockPatient,
        triageSymptoms: JSON.stringify([
          { name: 'LUTS', ipss_score: 'Moderate', duration_unit: 'months' }
        ])
      };
      render(<EditPatientModal {...defaultProps} patient={patientWithSnakeCase} />);
      // Should handle both camelCase and snake_case
      expect(screen.getByText('LUTS')).toBeInTheDocument();
    });
  });

  describe('Comorbidities Parsing', () => {
    it('should parse comorbidities from JSON string', () => {
      render(<EditPatientModal {...defaultProps} />);
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      expect(cvdCheckbox.checked).toBe(true);
    });

    it('should handle comorbidities as array', () => {
      const patientWithArray = {
        ...mockPatient,
        comorbidities: ['CVD', 'Diabetes']
      };
      render(<EditPatientModal {...defaultProps} patient={patientWithArray} />);
      const cvdCheckbox = screen.getByLabelText(/^cvd$/i);
      const diabetesCheckbox = screen.getByLabelText(/diabetes/i);
      expect(cvdCheckbox.checked).toBe(true);
      expect(diabetesCheckbox.checked).toBe(true);
    });

    it('should handle invalid JSON in comorbidities', () => {
      const patientInvalidJson = {
        ...mockPatient,
        comorbidities: 'invalid-json'
      };
      render(<EditPatientModal {...defaultProps} patient={patientInvalidJson} />);
      // Should handle gracefully
      expect(screen.getByText('Edit Patient Details')).toBeInTheDocument();
    });
  });

  describe('DRE Findings Parsing', () => {
    it('should parse DRE findings from comma-separated string', () => {
      const patientWithString = {
        ...mockPatient,
        dreFindings: 'Normal, Enlarged'
      };
      render(<EditPatientModal {...defaultProps} patient={patientWithString} />);
      const normalCheckbox = screen.getByLabelText(/normal/i);
      const enlargedCheckbox = screen.getByLabelText(/enlarged/i);
      expect(normalCheckbox.checked).toBe(true);
      expect(enlargedCheckbox.checked).toBe(true);
    });

    it('should handle DRE findings as array', () => {
      render(<EditPatientModal {...defaultProps} />);
      const normalCheckbox = screen.getByLabelText(/normal/i);
      const enlargedCheckbox = screen.getByLabelText(/enlarged/i);
      expect(normalCheckbox.checked).toBe(true);
      expect(enlargedCheckbox.checked).toBe(true);
    });

    it('should handle empty DRE findings', () => {
      const patientNoFindings = {
        ...mockPatient,
        dreFindings: ''
      };
      render(<EditPatientModal {...defaultProps} patient={patientNoFindings} />);
      const normalCheckbox = screen.getByLabelText(/normal/i);
      expect(normalCheckbox.checked).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with updated data', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.updatePatient).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            firstName: 'Jane'
          })
        );
      });
    });

    it('should call onPatientUpdated on successful update', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnPatientUpdated).toHaveBeenCalled();
      });
    });

    it('should close modal on successful update', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle API validation errors', async () => {
      patientService.updatePatient.mockResolvedValue({
        success: false,
        details: [
          { field: 'email', message: 'Email already exists' }
        ]
      });
      
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('should handle API general errors', async () => {
      patientService.updatePatient.mockResolvedValue({
        success: false,
        error: 'Update failed'
      });
      
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      patientService.updatePatient.mockRejectedValue(new Error('Network error'));
      
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('should include triage symptoms in submission', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.updatePatient).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            triageSymptoms: expect.stringContaining('LUTS')
          })
        );
      });
    });

    it('should include priorBiopsyDate only when priorBiopsy is yes', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(patientService.updatePatient).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            priorBiopsy: 'yes',
            priorBiopsyDate: '2020-01-01'
          })
        );
      });
    });
  });

  describe('Validation', () => {
    it('should validate IPSS score is required for LUTS', () => {
      render(<EditPatientModal {...defaultProps} />);
      
      // Uncheck and recheck LUTS without IPSS
      const lutsCheckbox = screen.getByLabelText(/^luts$/i);
      fireEvent.click(lutsCheckbox);
      fireEvent.click(lutsCheckbox);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      // Should show validation error
      expect(screen.getByText(/ipss score is required for luts/i)).toBeInTheDocument();
    });

    it('should validate IPSS score is required for Nocturia', () => {
      const patientWithNocturia = {
        ...mockPatient,
        triageSymptoms: JSON.stringify([
          { name: 'Nocturia', checked: true, ipssScore: '', duration: '6' }
        ])
      };
      render(<EditPatientModal {...defaultProps} patient={patientWithNocturia} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText(/ipss score is required for nocturia/i)).toBeInTheDocument();
    });
  });

  describe('Urologist Selection', () => {
    it('should fetch urologists on modal open', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(bookingService.getAvailableUrologists).toHaveBeenCalled();
      });
    });

    it('should display urologists in dropdown', async () => {
      render(<EditPatientModal {...defaultProps} />);
      
      await waitFor(() => {
        const urologistSelect = screen.getByLabelText(/assigned urologist/i);
        expect(urologistSelect).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onPatientUpdated callback', async () => {
      render(<EditPatientModal {...defaultProps} onPatientUpdated={null} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle null onError callback', async () => {
      patientService.updatePatient.mockResolvedValue({
        success: false,
        error: 'Error occurred'
      });
      
      render(<EditPatientModal {...defaultProps} onError={null} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
      });
    });

    it('should handle patient with minimal data', () => {
      const minimalPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      render(<EditPatientModal {...defaultProps} patient={minimalPatient} />);
      expect(screen.getByText('Edit Patient Details')).toBeInTheDocument();
    });
  });
});
