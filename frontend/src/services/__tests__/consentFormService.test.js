import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consentFormService } from '../consentFormService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('consentFormService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConsentFormTemplates', () => {
    it('should fetch consent form templates successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              { id: 1, procedure_name: 'Test Procedure' },
              { id: 2, test_name: 'Test Test' }
            ]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getConsentFormTemplates();

      expect(apiClient.get).toHaveBeenCalledWith('/consent-forms/templates');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty templates array', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getConsentFormTemplates();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle missing templates in response', async () => {
      const mockResponse = {
        data: {
          data: {}
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getConsentFormTemplates();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch templates'
          }
        },
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormTemplates();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch templates');
      expect(result.data).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormTemplates();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });
  });

  describe('createConsentFormTemplate', () => {
    it('should create consent form template successfully with file', async () => {
      const formData = {
        procedure_name: 'Test Procedure',
        test_name: 'Test Test',
        is_auto_generated: true,
        template_file: new File(['content'], 'test.pdf', { type: 'application/pdf' })
      };

      const mockResponse = {
        data: {
          data: {
            template: { id: 1, procedure_name: 'Test Procedure' }
          }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await consentFormService.createConsentFormTemplate(formData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/consent-forms/templates',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, procedure_name: 'Test Procedure' });
    });

    it('should create consent form template without file', async () => {
      const formData = {
        procedure_name: 'Test Procedure',
        is_auto_generated: false
      };

      const mockResponse = {
        data: {
          data: { id: 1, procedure_name: 'Test Procedure' }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await consentFormService.createConsentFormTemplate(formData);

      expect(result.success).toBe(true);
    });

    it('should handle empty form data fields', async () => {
      const formData = {};

      const mockResponse = {
        data: {
          data: { id: 1 }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await consentFormService.createConsentFormTemplate(formData);

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const formData = { procedure_name: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to create template'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.createConsentFormTemplate(formData);

      expect(result.success).toBe(false);
      // The service uses the response message if available, otherwise the default
      expect(result.error).toBe('Failed to create template');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const formData = { procedure_name: 'Test' };
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.createConsentFormTemplate(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create consent form template');
      consoleSpy.mockRestore();
    });
  });

  describe('updateConsentFormTemplate', () => {
    it('should update consent form template successfully', async () => {
      const templateId = 1;
      const formData = {
        procedure_name: 'Updated Procedure',
        is_auto_generated: true,
        template_file: new File(['content'], 'test.pdf', { type: 'application/pdf' })
      };

      const mockResponse = {
        data: {
          data: {
            template: { id: 1, procedure_name: 'Updated Procedure' }
          }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await consentFormService.updateConsentFormTemplate(templateId, formData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/consent-forms/templates/${templateId}`,
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      expect(result.success).toBe(true);
    });

    it('should update without file', async () => {
      const templateId = 1;
      const formData = {
        procedure_name: 'Updated Procedure'
      };

      const mockResponse = {
        data: {
          data: { id: 1 }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await consentFormService.updateConsentFormTemplate(templateId, formData);

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const templateId = 1;
      const formData = { procedure_name: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to update template'
          }
        }
      };

      apiClient.put.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.updateConsentFormTemplate(templateId, formData);

      expect(result.success).toBe(false);
      // The service uses the response message if available
      expect(result.error).toBe('Failed to update template');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const templateId = 1;
      const formData = { procedure_name: 'Test' };
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.put.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.updateConsentFormTemplate(templateId, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update consent form template');
      consoleSpy.mockRestore();
    });
  });

  describe('deleteConsentFormTemplate', () => {
    it('should delete consent form template successfully', async () => {
      const templateId = 1;
      const mockResponse = {
        data: {
          data: { id: 1 }
        }
      };

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await consentFormService.deleteConsentFormTemplate(templateId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/consent-forms/templates/${templateId}`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
    });

    it('should handle errors', async () => {
      const templateId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to delete template'
          }
        }
      };

      apiClient.delete.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.deleteConsentFormTemplate(templateId);

      expect(result.success).toBe(false);
      // The service uses the response message if available
      expect(result.error).toBe('Failed to delete template');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const templateId = 1;
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.delete.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.deleteConsentFormTemplate(templateId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete consent form template');
      consoleSpy.mockRestore();
    });
  });

  describe('getPatientConsentForms', () => {
    it('should fetch patient consent forms successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: {
            consentForms: [
              { id: 1, patient_id: 1 },
              { id: 2, patient_id: 1 }
            ]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getPatientConsentForms(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(`/consent-forms/patients/${patientId}`);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty consent forms array', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: {
            consentForms: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getPatientConsentForms(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle missing consentForms in response', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: {}
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await consentFormService.getPatientConsentForms(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch consent forms'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getPatientConsentForms(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch consent forms');
      expect(result.data).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('uploadConsentForm', () => {
    it('should upload patient consent form successfully', async () => {
      const patientId = 1;
      const templateId = 2;
      const file = new File(['content'], 'consent.pdf', { type: 'application/pdf' });

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: 1, template_id: 2 }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await consentFormService.uploadConsentForm(patientId, templateId, file);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/consent-forms/patients/${patientId}`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, patient_id: 1, template_id: 2 });
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const templateId = 2;
      const file = new File(['content'], 'consent.pdf', { type: 'application/pdf' });
      const mockError = {
        response: {
          data: {
            message: 'Failed to upload consent form'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.uploadConsentForm(patientId, templateId, file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload consent form');
      consoleSpy.mockRestore();
    });
  });

  describe('getConsentFormFile', () => {
    it('should fetch consent form file successfully', async () => {
      const filePath = 'consent-forms/templates/file.pdf';
      const mockBlob = new Blob(['file content'], { type: 'application/pdf' });
      const mockResponse = {
        data: mockBlob
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      const encodedPath = encodeURIComponent(filePath);
      expect(apiClient.get).toHaveBeenCalledWith(`/consent-forms/files/${encodedPath}`, {
        responseType: 'blob'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Fetching consent form file:', {
        originalPath: filePath,
        encodedPath
      });
      expect(result.success).toBe(true);
      expect(result.data).toBe(mockBlob);
      consoleSpy.mockRestore();
    });

    it('should handle errors with response data', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {
        message: 'Not found',
        response: {
          data: { message: 'File not found' },
          status: 404
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching consent form file:', {
        error: 'Not found',
        response: { message: 'File not found' },
        status: 404,
        filePath
      });
      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });

    it('should handle errors with no message', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = new Error('Unknown error');

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      consoleSpy.mockRestore();
    });

    it('should handle errors with empty error object', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {};

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      // When error.message is undefined and error.response?.data?.message is undefined,
      // it falls back to the default message in the service
      expect(result.error).toBe('Unable to load the consent form file. Please try again or contact support if the problem persists.');
      consoleSpy.mockRestore();
    });

    it('should handle errors with response.data.message', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {
        response: {
          data: {
            message: 'Custom error message'
          },
          status: 500
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
      consoleSpy.mockRestore();
    });

    it('should handle errors with response but no data.message', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {
        message: 'Network error',
        response: {
          data: {},
          status: 500
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to load the consent form file. Please try again or contact support if the problem persists.');
      consoleSpy.mockRestore();
    });

    it('should handle errors with null response', async () => {
      const filePath = 'invalid/path.pdf';
      const mockError = {
        message: 'Network error',
        response: null
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await consentFormService.getConsentFormFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });
  });
});

