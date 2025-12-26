/**
 * Tests for consentFormUtils.js
 * Ensures 100% coverage including all branches, error cases, and edge cases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printConsentForm } from '../consentFormUtils';
import { consentFormService } from '../../services/consentFormService';

// Mock consentFormService
vi.mock('../../services/consentFormService', () => ({
  consentFormService: {
    getConsentFormFile: vi.fn()
  }
}));

describe('consentFormUtils', () => {
  let mockWindow;
  let mockPrintWindow;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Mock window.open
    mockPrintWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn()
      },
      print: vi.fn(),
      onload: null,
      closed: false
    };

    mockWindow = {
      open: vi.fn(() => mockPrintWindow),
      URL: {
        createObjectURL: vi.fn(() => 'blob:http://localhost/test'),
        revokeObjectURL: vi.fn()
      }
    };

    global.window = mockWindow;
    global.URL = mockWindow.URL;

    // Mock console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const mockTemplate = {
    id: 1,
    procedure_name: 'BIOPSY',
    test_name: null,
    is_auto_generated: false,
    template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
    template_file_url: 'http://localhost/api/consent-forms/files/template-123.pdf'
  };

  const mockPatient = {
    id: 1,
    name: 'John Doe',
    full_name: 'John Doe',
    dateOfBirth: '1980-01-01',
    date_of_birth: '1980-01-01',
    nhsNumber: '1234567890',
    nhs_number: '1234567890'
  };

  describe('printConsentForm - input validation', () => {
    it('should return early when template is null', async () => {
      const onError = vi.fn();
      await printConsentForm(null, 'BIOPSY', mockPatient, onError);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'printConsentForm: Missing template or patient',
        { template: null, patient: mockPatient }
      );
      expect(mockWindow.open).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should return early when template is undefined', async () => {
      const onError = vi.fn();
      await printConsentForm(undefined, 'BIOPSY', mockPatient, onError);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockWindow.open).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should return early when patient is null', async () => {
      const onError = vi.fn();
      await printConsentForm(mockTemplate, 'BIOPSY', null, onError);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'printConsentForm: Missing template or patient',
        { template: mockTemplate, patient: null }
      );
      expect(mockWindow.open).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should return early when patient is undefined', async () => {
      const onError = vi.fn();
      await printConsentForm(mockTemplate, 'BIOPSY', undefined, onError);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockWindow.open).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('printConsentForm - auto-generated forms', () => {
    it('should print auto-generated form when is_auto_generated is true', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true,
        procedure_name: 'MRI'
      };
      const onError = vi.fn();

      await printConsentForm(autoGenTemplate, 'MRI', mockPatient, onError);

      expect(mockWindow.open).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.document.close).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle popup blocker for auto-generated form', async () => {
      mockWindow.open.mockReturnValue(null);
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const onError = vi.fn();

      await printConsentForm(autoGenTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalledWith(
        'Unable to open print window. Please check your popup blocker settings.'
      );
    });

    it('should handle auto-generated form without onError callback', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', mockPatient);

      expect(mockWindow.open).toHaveBeenCalled();
    });

    it('should use test_name when procedure_name is not available', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true,
        procedure_name: null,
        test_name: 'PSA Test'
      };

      await printConsentForm(autoGenTemplate, 'PSA Test', mockPatient);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('PSA Test');
    });

    it('should use testName parameter when template name is missing', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true,
        procedure_name: null,
        test_name: null
      };

      await printConsentForm(autoGenTemplate, 'Custom Test', mockPatient);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('Custom Test');
    });

    it('should handle patient with dateOfBirth', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithDOB = {
        ...mockPatient,
        dateOfBirth: '1990-05-15'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithDOB);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('15/05/1990');
    });

    it('should handle patient with date_of_birth', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithDOB = {
        ...mockPatient,
        dateOfBirth: null,
        date_of_birth: '1990-05-15'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithDOB);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('15/05/1990');
    });

    it('should handle patient without date of birth', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientNoDOB = {
        ...mockPatient,
        dateOfBirth: null,
        date_of_birth: null
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientNoDOB);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('N/A');
    });

    it('should handle patient with name field', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithName = {
        ...mockPatient,
        name: 'Jane Smith'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithName);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('Jane Smith');
    });

    it('should handle patient with full_name field', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithFullName = {
        ...mockPatient,
        name: null,
        full_name: 'Jane Smith'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithFullName);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('Jane Smith');
    });

    it('should handle patient without name', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientNoName = {
        ...mockPatient,
        name: null,
        full_name: null
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientNoName);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('N/A');
    });

    it('should handle patient with nhsNumber', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithNHS = {
        ...mockPatient,
        nhsNumber: '1234567890'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithNHS);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('1234567890');
    });

    it('should handle patient with nhs_number', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientWithNHS = {
        ...mockPatient,
        nhsNumber: null,
        nhs_number: '9876543210'
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientWithNHS);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('9876543210');
    });

    it('should handle patient without NHS number', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true
      };
      const patientNoNHS = {
        ...mockPatient,
        nhsNumber: null,
        nhs_number: null
      };

      await printConsentForm(autoGenTemplate, 'BIOPSY', patientNoNHS);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('N/A');
    });

    it('should determine type as Procedure when procedure_name exists', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true,
        procedure_name: 'MRI'
      };

      await printConsentForm(autoGenTemplate, 'MRI', mockPatient);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('Procedure');
    });

    it('should determine type as Test when only test_name exists', async () => {
      const autoGenTemplate = {
        ...mockTemplate,
        is_auto_generated: true,
        procedure_name: null,
        test_name: 'PSA Test'
      };

      await printConsentForm(autoGenTemplate, 'PSA Test', mockPatient);

      const writeCall = mockPrintWindow.document.write.mock.calls[0][0];
      expect(writeCall).toContain('Test');
    });
  });

  describe('printConsentForm - uploaded templates', () => {
    it('should print uploaded template successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Printing uploaded template:',
        expect.objectContaining({
          originalPath: 'uploads/consent-forms/templates/template-123.pdf',
          relativePath: 'consent-forms/templates/template-123.pdf'
        })
      );

      expect(consentFormService.getConsentFormFile).toHaveBeenCalledWith(
        'consent-forms/templates/template-123.pdf'
      );
      expect(mockWindow.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockWindow.open).toHaveBeenCalledWith('blob:http://localhost/test', '_blank');
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle Windows path separators', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads\\consent-forms\\templates\\template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      expect(consentFormService.getConsentFormFile).toHaveBeenCalledWith(
        'consent-forms/templates/template-123.pdf'
      );
    });

    it('should handle path without uploads prefix', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      expect(consentFormService.getConsentFormFile).toHaveBeenCalledWith(
        'consent-forms/templates/template-123.pdf'
      );
    });

    it('should handle empty template_file_path', async () => {
      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: ''
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'printConsentForm: No template file path',
        expect.any(Object)
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('No template file available for BIOPSY')
      );
      expect(consentFormService.getConsentFormFile).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only template_file_path', async () => {
      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: '   '
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalled();
      expect(consentFormService.getConsentFormFile).not.toHaveBeenCalled();
    });

    it('should handle missing template_file_path', async () => {
      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: null
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalled();
      expect(consentFormService.getConsentFormFile).not.toHaveBeenCalled();
    });

    it('should handle failed file fetch', async () => {
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: false,
        error: 'File not found'
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch template file:',
        expect.objectContaining({
          error: 'File not found'
        })
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Unable to load the template file for BIOPSY')
      );
    });

    it('should handle file fetch error without error message', async () => {
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: false,
        error: null
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch template file')
      );
    });

    it('should handle popup blocker for uploaded template', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });
      mockWindow.open.mockReturnValue(null);

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test');
      expect(onError).toHaveBeenCalledWith(
        'Unable to open the template file. Please check your popup blocker settings.'
      );
    });

    it('should handle popup blocker without onError callback', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });
      mockWindow.open.mockReturnValue(null);

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should setup blob cleanup on print window load', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      expect(mockPrintWindow.onload).toBeDefined();
      expect(typeof mockPrintWindow.onload).toBe('function');

      // Trigger onload
      mockPrintWindow.onload();

      // Advance timers to trigger print and cleanup
      vi.advanceTimersByTime(500);
      expect(mockPrintWindow.print).toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle print error in onload handler', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });
      mockPrintWindow.print.mockImplementation(() => {
        throw new Error('Print failed');
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      mockPrintWindow.onload();
      vi.advanceTimersByTime(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error triggering print:',
        expect.any(Error)
      );
      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should setup blob cleanup interval for closed window', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      consentFormService.getConsentFormFile.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      // Simulate window closing
      mockPrintWindow.closed = true;
      vi.advanceTimersByTime(1000);

      expect(mockWindow.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle fetch error exception', async () => {
      consentFormService.getConsentFormFile.mockRejectedValue(
        new Error('Network error')
      );

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching template file for printing:',
        expect.any(Error)
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Unable to load the template file for BIOPSY')
      );
    });

    it('should handle fetch error without error message', async () => {
      const errorWithoutMessage = { message: null };
      consentFormService.getConsentFormFile.mockRejectedValue(errorWithoutMessage);

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };
      const onError = vi.fn();

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('The file may have been moved or deleted')
      );
    });

    it('should handle fetch error without onError callback', async () => {
      consentFormService.getConsentFormFile.mockRejectedValue(
        new Error('Network error')
      );

      const uploadedTemplate = {
        ...mockTemplate,
        is_auto_generated: false,
        template_file_path: 'uploads/consent-forms/templates/template-123.pdf'
      };

      await printConsentForm(uploadedTemplate, 'BIOPSY', mockPatient);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('printConsentForm - general error handling', () => {
    it('should handle unexpected error in main try-catch', async () => {
      // Force an error by making template_file_path access throw
      const errorTemplate = {
        get template_file_path() {
          throw new Error('Unexpected error');
        },
        is_auto_generated: false
      };

      const onError = vi.fn();
      await printConsentForm(errorTemplate, 'BIOPSY', mockPatient, onError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error printing consent form:',
        expect.any(Error)
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to print consent form for BIOPSY')
      );
    });

    it('should handle error without error message', async () => {
      const errorTemplate = {
        get template_file_path() {
          throw { message: null };
        },
        is_auto_generated: false
      };

      const onError = vi.fn();
      await printConsentForm(errorTemplate, 'BIOPSY', mockPatient, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Please try again')
      );
    });

    it('should handle error without onError callback', async () => {
      const errorTemplate = {
        get template_file_path() {
          throw new Error('Unexpected error');
        },
        is_auto_generated: false
      };

      await printConsentForm(errorTemplate, 'BIOPSY', mockPatient);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

