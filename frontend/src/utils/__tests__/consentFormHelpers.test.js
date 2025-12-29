/**
 * Tests for consentFormHelpers utility functions
 * Ensures 100% coverage including all edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeTestName,
  getConsentFormTemplate,
  getPatientConsentForm,
  getPrintButtonTitle,
  computeConsentFormData
} from '../consentFormHelpers';

describe('consentFormHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  describe('normalizeTestName', () => {
    it('should return empty string for null input', () => {
      expect(normalizeTestName(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(normalizeTestName(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(normalizeTestName('')).toBe('');
    });

    it('should uppercase and trim test name', () => {
      expect(normalizeTestName('  mri  ')).toBe('MRI');
    });

    it('should remove CUSTOM: prefix', () => {
      expect(normalizeTestName('CUSTOM: Test')).toBe('TEST');
    });

    it('should remove CUSTOM: prefix with spaces', () => {
      expect(normalizeTestName('CUSTOM:  Test  ')).toBe('TEST');
    });

    it('should handle test name without CUSTOM: prefix', () => {
      expect(normalizeTestName('MRI')).toBe('MRI');
    });
  });

  describe('getConsentFormTemplate', () => {
    const mockTemplates = [
      {
        id: 1,
        test_name: 'MRI',
        procedure_name: 'Magnetic Resonance Imaging'
      },
      {
        id: 2,
        test_name: 'TRUS',
        procedure_name: 'Transrectal Ultrasound'
      },
      {
        id: 3,
        test_name: 'BIOPSY',
        procedure_name: null
      }
    ];

    it('should return null for empty test name', () => {
      expect(getConsentFormTemplate('', mockTemplates)).toBeNull();
    });

    it('should return null for null test name', () => {
      expect(getConsentFormTemplate(null, mockTemplates)).toBeNull();
    });

    it('should find template by exact test name match', () => {
      const result = getConsentFormTemplate('MRI', mockTemplates);
      expect(result).toEqual(mockTemplates[0]);
    });

    it('should find template by exact procedure name match', () => {
      const result = getConsentFormTemplate('Magnetic Resonance Imaging', mockTemplates);
      expect(result).toEqual(mockTemplates[0]);
    });

    it('should NOT find template by partial test name match (exact match only)', () => {
      const result = getConsentFormTemplate('MRI Scan', mockTemplates);
      expect(result).toBeNull();
    });

    it('should NOT find template when test name includes template name (exact match only)', () => {
      const result = getConsentFormTemplate('TRUS Biopsy', mockTemplates);
      expect(result).toBeNull();
    });

    it('should NOT match MULTI-PARAMETRIC MRI to general MRI template', () => {
      const templates = [
        { id: 1, test_name: 'MRI', procedure_name: 'Magnetic Resonance Imaging' },
        { id: 2, test_name: 'MULTI-PARAMETRIC MRI', procedure_name: 'Multi-parametric Magnetic Resonance Imaging' }
      ];
      const result = getConsentFormTemplate('MULTI-PARAMETRIC MRI', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should return null for MULTI-PARAMETRIC MRI when only general MRI template exists', () => {
      const templates = [
        { id: 1, test_name: 'MRI', procedure_name: 'Magnetic Resonance Imaging' }
      ];
      const result = getConsentFormTemplate('MULTI-PARAMETRIC MRI', templates);
      expect(result).toBeNull();
    });

    it('should NOT match TRUS GUIDED BIOPSY to general TRUS template', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' },
        { id: 2, test_name: 'TRUS GUIDED BIOPSY', procedure_name: 'TRUS Guided Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('TRUS GUIDED BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should return null for TRUS GUIDED BIOPSY when only general TRUS template exists', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' }
      ];
      const result = getConsentFormTemplate('TRUS GUIDED BIOPSY', templates);
      expect(result).toBeNull();
    });

    it('should NOT match TRUS VOLUME ASSESSMENT to general TRUS template', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' },
        { id: 2, test_name: 'TRUS VOLUME ASSESSMENT', procedure_name: 'TRUS Volume Assessment' }
      ];
      const result = getConsentFormTemplate('TRUS VOLUME ASSESSMENT', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should return null for TRUS VOLUME ASSESSMENT when only general TRUS template exists', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' }
      ];
      const result = getConsentFormTemplate('TRUS VOLUME ASSESSMENT', templates);
      expect(result).toBeNull();
    });

    it('should NOT match PROSTATE BIOPSY to general BIOPSY template', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'PROSTATE BIOPSY', procedure_name: 'Prostate Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('PROSTATE BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should return null for PROSTATE BIOPSY when only general BIOPSY template exists', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('PROSTATE BIOPSY', templates);
      expect(result).toBeNull();
    });

    it('should NOT match TRANSPERINEAL BIOPSY to general BIOPSY template', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'TRANSPERINEAL BIOPSY', procedure_name: 'Transperineal Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('TRANSPERINEAL BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should return null for TRANSPERINEAL BIOPSY when only general BIOPSY template exists', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('TRANSPERINEAL BIOPSY', templates);
      expect(result).toBeNull();
    });

    it('should NOT match TRANSRECTAL BIOPSY to general BIOPSY template', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'TRANSRECTAL BIOPSY', procedure_name: 'Transrectal Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('TRANSRECTAL BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should NOT match FUSION BIOPSY to general BIOPSY template', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'FUSION BIOPSY', procedure_name: 'Fusion Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('FUSION BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should NOT match TEMPLATE BIOPSY to general BIOPSY template', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'TEMPLATE BIOPSY', procedure_name: 'Template Biopsy Procedure' }
      ];
      const result = getConsentFormTemplate('TEMPLATE BIOPSY', templates);
      expect(result).toEqual(templates[1]);
      expect(result.id).toBe(2);
    });

    it('should handle templates with null procedure_name', () => {
      const result = getConsentFormTemplate('BIOPSY', mockTemplates);
      expect(result).toEqual(mockTemplates[2]);
    });

    it('should handle normalized names with spaces', () => {
      const result = getConsentFormTemplate('  mri  ', mockTemplates);
      expect(result).toEqual(mockTemplates[0]);
    });

    it('should handle CUSTOM: prefix in test name', () => {
      const result = getConsentFormTemplate('CUSTOM: MRI', mockTemplates);
      expect(result).toEqual(mockTemplates[0]);
    });

    it('should return null when no template matches', () => {
      const result = getConsentFormTemplate('UNKNOWN TEST', mockTemplates);
      expect(result).toBeNull();
    });

    it('should log debug info for custom tests when enabled', () => {
      getConsentFormTemplate('CUSTOM: CustomTest', mockTemplates, true);
      expect(console.log).toHaveBeenCalled();
    });

    it('should not log debug info when disabled', () => {
      getConsentFormTemplate('CUSTOM: CustomTest', mockTemplates, false);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle empty templates array', () => {
      const result = getConsentFormTemplate('MRI', []);
      expect(result).toBeNull();
    });
  });

  describe('getPatientConsentForm', () => {
    const mockTemplates = [
      { id: 1, test_name: 'MRI', procedure_name: 'Magnetic Resonance Imaging' }
    ];

    const mockPatientForms = [
      {
        id: 1,
        consent_form_name: 'MRI',
        template_id: 1,
        file_path: 'uploads/test.pdf'
      },
      {
        id: 2,
        consent_form_name: 'TRUS',
        template_id: 2,
        file_path: 'uploads/test2.pdf'
      }
    ];

    it('should return null for empty test name', () => {
      expect(getPatientConsentForm('', mockPatientForms, mockTemplates)).toBeNull();
    });

    it('should find form by exact consent_form_name match', () => {
      const result = getPatientConsentForm('MRI', mockPatientForms, mockTemplates);
      expect(result).toEqual(mockPatientForms[0]);
    });

    it('should NOT find form by partial consent_form_name match (exact match only)', () => {
      const result = getPatientConsentForm('MRI Scan', mockPatientForms, mockTemplates);
      expect(result).toBeNull();
    });

    it('should find form by template match', () => {
      const result = getPatientConsentForm('MRI', mockPatientForms, mockTemplates);
      expect(result).toEqual(mockPatientForms[0]);
    });

    it('should return null when no form matches', () => {
      const result = getPatientConsentForm('UNKNOWN', mockPatientForms, mockTemplates);
      expect(result).toBeNull();
    });

    it('should handle empty patient forms array', () => {
      const result = getPatientConsentForm('MRI', [], mockTemplates);
      expect(result).toBeNull();
    });
  });

  describe('getPrintButtonTitle', () => {
    it('should return template not available message when no template', () => {
      const result = getPrintButtonTitle(false, false);
      expect(result).toBe('Consent form template not available. Please create one in the superadmin panel.');
    });

    it('should return loading message when printing', () => {
      const result = getPrintButtonTitle(true, true);
      expect(result).toBe('Loading consent form...');
    });

    it('should return default button text when template available and not printing', () => {
      const result = getPrintButtonTitle(true, false);
      expect(result).toBe('Print consent form');
    });

    it('should return custom button text when provided', () => {
      const result = getPrintButtonTitle(true, false, 'Custom Text');
      expect(result).toBe('Custom Text');
    });
  });

  describe('computeConsentFormData', () => {
    const mockTemplates = [
      { id: 1, test_name: 'MRI', procedure_name: 'Magnetic Resonance Imaging' }
    ];

    const mockPatientForms = [
      {
        id: 1,
        consent_form_name: 'MRI',
        template_id: 1,
        file_path: 'uploads/consent-forms/patients/test.pdf'
      }
    ];

    const mockGetTemplate = vi.fn();
    const mockGetPatientForm = vi.fn();

    beforeEach(() => {
      mockGetTemplate.mockClear();
      mockGetPatientForm.mockClear();
    });

    it('should return isPSATest true for PSA test', () => {
      mockGetTemplate.mockReturnValue(null);
      const result = computeConsentFormData('PSA', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.isPSATest).toBe(true);
    });

    it('should return isPSATest true for PSA TOTAL', () => {
      const result = computeConsentFormData('PSA TOTAL', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.isPSATest).toBe(true);
    });

    it('should return isPSATest true for PSA FREE', () => {
      const result = computeConsentFormData('PSA FREE', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.isPSATest).toBe(true);
    });

    it('should return isPSATest false for non-PSA test', () => {
      mockGetTemplate.mockReturnValue(mockTemplates[0]);
      mockGetPatientForm.mockReturnValue(null);
      const result = computeConsentFormData('MRI', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.isPSATest).toBe(false);
    });

    it('should compute consent form data correctly', () => {
      mockGetTemplate.mockReturnValue(mockTemplates[0]);
      mockGetPatientForm.mockReturnValue(mockPatientForms[0]);
      const result = computeConsentFormData('MRI', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.consentTemplate).toEqual(mockTemplates[0]);
      expect(result.patientConsentForm).toEqual(mockPatientForms[0]);
      expect(result.hasUploadedForm).toBe(true);
    });

    it('should detect uploaded form correctly', () => {
      mockGetTemplate.mockReturnValue(null);
      mockGetPatientForm.mockReturnValue(mockPatientForms[0]);
      const result = computeConsentFormData('MRI', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.hasUploadedForm).toBe(true);
    });

    it('should not detect uploaded form for template paths', () => {
      const templateForm = {
        ...mockPatientForms[0],
        file_path: 'uploads/consent-forms/templates/test.pdf'
      };
      mockGetTemplate.mockReturnValue(null);
      mockGetPatientForm.mockReturnValue(templateForm);
      const result = computeConsentFormData('MRI', mockGetTemplate, mockGetPatientForm, mockTemplates);
      expect(result.hasUploadedForm).toBe(false);
    });

    it('should NOT use general TRUS template for TRUS GUIDED BIOPSY', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' },
        { id: 2, test_name: 'TRUS GUIDED BIOPSY', procedure_name: 'TRUS Guided Biopsy Procedure' }
      ];
      mockGetTemplate.mockReturnValue(null);
      mockGetPatientForm.mockReturnValue(null);
      const result = computeConsentFormData('TRUS GUIDED BIOPSY', mockGetTemplate, mockGetPatientForm, templates);
      expect(result.templateToUse).toBeNull();
    });

    it('should use exact TRUS GUIDED BIOPSY template when available', () => {
      const templates = [
        { id: 1, test_name: 'TRUS', procedure_name: 'Transrectal Ultrasound' },
        { id: 2, test_name: 'TRUS GUIDED BIOPSY', procedure_name: 'TRUS Guided Biopsy Procedure' }
      ];
      mockGetTemplate.mockReturnValue(templates[1]);
      mockGetPatientForm.mockReturnValue(null);
      const result = computeConsentFormData('TRUS GUIDED BIOPSY', mockGetTemplate, mockGetPatientForm, templates);
      expect(result.templateToUse).toEqual(templates[1]);
    });

    it('should NOT use general BIOPSY template for PROSTATE BIOPSY', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'PROSTATE BIOPSY', procedure_name: 'Prostate Biopsy Procedure' }
      ];
      mockGetTemplate.mockReturnValue(null);
      mockGetPatientForm.mockReturnValue(null);
      const result = computeConsentFormData('PROSTATE BIOPSY', mockGetTemplate, mockGetPatientForm, templates);
      expect(result.templateToUse).toBeNull();
    });

    it('should use exact PROSTATE BIOPSY template when available', () => {
      const templates = [
        { id: 1, test_name: 'BIOPSY', procedure_name: 'Biopsy Procedure' },
        { id: 2, test_name: 'PROSTATE BIOPSY', procedure_name: 'Prostate Biopsy Procedure' }
      ];
      mockGetTemplate.mockReturnValue(templates[1]);
      mockGetPatientForm.mockReturnValue(null);
      const result = computeConsentFormData('PROSTATE BIOPSY', mockGetTemplate, mockGetPatientForm, templates);
      expect(result.templateToUse).toEqual(templates[1]);
    });
  });
});

