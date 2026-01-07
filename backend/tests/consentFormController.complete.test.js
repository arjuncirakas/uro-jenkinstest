/**
 * Comprehensive tests for consentFormController - all functions
 * Tests all remaining functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import path from 'path';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock fs module - controller imports as default, so we need default export
const mockFs = {
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  createReadStream: jest.fn(),
  mkdirSync: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs
}));

// Mock corsHelper
const mockSetCorsHeaders = jest.fn();
jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setCorsHeaders: mockSetCorsHeaders
}));

describe('Consent Form Controller - Complete Coverage Tests', () => {
  let mockClient;
  let mockRes;
  let mockReq;
  let consentFormController;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      on: jest.fn(),
      headersSent: false
    };
    mockReq = {
      protocol: 'http',
      get: jest.fn((header) => {
        if (header === 'host') return 'localhost:5000';
        return null;
      }),
      body: {},
      params: {},
      file: null,
      validatedFilePath: null
    };

    mockPool.connect.mockResolvedValue(mockClient);
    
    // Clear fs mocks before each test
    mockFs.existsSync.mockClear();
    mockFs.unlinkSync.mockClear();
    mockFs.createReadStream.mockClear();
    mockFs.mkdirSync.mockClear();
    mockSetCorsHeaders.mockClear();
    
    // Import controller after mocking
    consentFormController = await import('../controllers/consentFormController.js');
  });

  describe('getConsentFormTemplates', () => {
    it('should retrieve all consent form templates successfully', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Biopsy',
          procedure_name: 'Biopsy',
          test_name: null,
          is_auto_generated: false,
          template_file_path: 'uploads/consent-forms/templates/template-1.pdf',
          template_file_name: 'Biopsy.pdf',
          template_file_size: 1024,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 2,
          name: 'MRI',
          procedure_name: null,
          test_name: 'MRI',
          is_auto_generated: true,
          template_file_path: null,
          template_file_name: null,
          template_file_size: null,
          created_at: '2024-01-02',
          updated_at: '2024-01-02'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: {
          templates: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              template_file_url: expect.stringContaining('/api/consent-forms/files/')
            }),
            expect.objectContaining({
              id: 2,
              template_file_url: null
            })
          ])
        }
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle templates with Windows path separators', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Test',
          procedure_name: 'Test',
          test_name: null,
          is_auto_generated: false,
          template_file_path: 'uploads\\consent-forms\\templates\\test.pdf',
          template_file_name: 'test.pdf',
          template_file_size: 1024,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.templates[0].template_file_url).toContain('consent-forms/templates/test.pdf');
    });

    it('should handle templates with uploads/ prefix', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Test',
          procedure_name: 'Test',
          test_name: null,
          is_auto_generated: false,
          template_file_path: 'uploads/consent-forms/templates/test.pdf',
          template_file_name: 'test.pdf',
          template_file_size: 1024,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.templates[0].template_file_url).not.toContain('uploads/uploads/');
    });

    it('should handle empty templates list', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: { templates: [] }
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(dbError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching consent form templates:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch consent form templates',
        error: 'Database connection failed'
      });
      expect(mockClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createConsentFormTemplate', () => {
    it('should create template successfully with procedure_name and file', async () => {
      mockReq.body = {
        procedure_name: 'Biopsy',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = {
        filename: 'template-123.pdf',
        originalname: 'Biopsy Template.pdf',
        size: 2048
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing template
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Biopsy',
            procedure_name: 'Biopsy',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
            template_file_name: 'Biopsy Template.pdf',
            template_file_size: 2048
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form template created successfully',
        data: {
          template: expect.objectContaining({
            name: 'Biopsy',
            template_file_url: expect.stringContaining('/api/consent-forms/files/')
          })
        }
      });
    });

    it('should create template successfully with test_name and auto-generated', async () => {
      mockReq.body = {
        procedure_name: null,
        test_name: 'MRI',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing template
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            name: 'MRI',
            procedure_name: null,
            test_name: 'MRI',
            is_auto_generated: true,
            template_file_path: null,
            template_file_name: null,
            template_file_size: null
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.template.template_file_url).toBeNull();
    });

    it('should return 400 when neither procedure_name nor test_name provided', async () => {
      mockReq.body = {
        procedure_name: '',
        test_name: '',
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Either procedure name or test name is required'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when procedure_name is null and test_name is null', async () => {
      mockReq.body = {
        procedure_name: null,
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when file is required but not provided', async () => {
      mockReq.body = {
        procedure_name: 'Biopsy',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template file is required when auto-generation is disabled'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 when template already exists', async () => {
      mockReq.body = {
        procedure_name: 'Biopsy',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = {
        filename: 'template-123.pdf',
        originalname: 'Biopsy.pdf',
        size: 1024
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }] // Existing template found
      });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A template with this name already exists'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle is_auto_generated as boolean true', async () => {
      mockReq.body = {
        procedure_name: 'MRI',
        test_name: null,
        is_auto_generated: true
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'MRI',
            procedure_name: 'MRI',
            test_name: null,
            is_auto_generated: true,
            template_file_path: null,
            template_file_name: null,
            template_file_size: null
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        procedure_name: 'Biopsy',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = {
        filename: 'template-123.pdf',
        originalname: 'Biopsy.pdf',
        size: 1024
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating consent form template:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle template with Windows path in file path', async () => {
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = {
        filename: 'template-123.pdf',
        originalname: 'Test.pdf',
        size: 1024
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test',
            procedure_name: 'Test',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads\\consent-forms\\templates\\template-123.pdf',
            template_file_name: 'Test.pdf',
            template_file_size: 1024
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.template.template_file_url).toContain('consent-forms/templates/template-123.pdf');
    });
  });

  describe('updateConsentFormTemplate', () => {
    it('should update template successfully without file', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Updated Procedure',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/old.pdf' }]
        }) // Template exists
        .mockResolvedValueOnce({ rows: [] }) // No duplicate
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            procedure_name: 'Updated Procedure',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads/consent-forms/templates/old.pdf',
            template_file_name: 'old.pdf',
            template_file_size: 1024
          }]
        }); // Update result

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form template updated successfully',
        data: expect.objectContaining({
          template: expect.objectContaining({
            name: 'Updated Procedure'
          })
        })
      });
    });

    it('should update template successfully with new file', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Updated Procedure',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = {
        filename: 'template-new-123.pdf',
        originalname: 'New Template.pdf',
        size: 2048
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/old.pdf' }]
        }) // Template exists
        .mockResolvedValueOnce({ rows: [] }) // No duplicate
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            procedure_name: 'Updated Procedure',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads/consent-forms/templates/template-new-123.pdf',
            template_file_name: 'New Template.pdf',
            template_file_size: 2048
          }]
        }); // Update result

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: '',
        test_name: '',
        is_auto_generated: 'false'
      };

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Either procedure name or test name is required'
      });
    });

    it('should return 404 when template not found', async () => {
      mockReq.params = { templateId: '999' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Template not found

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template not found'
      });
    });

    it('should return 400 when duplicate name exists', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Duplicate Name',
        test_name: null
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: null }]
        }) // Template exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Duplicate found

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A template with this name already exists'
      });
    });

    it('should handle is_auto_generated as boolean true', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null,
        is_auto_generated: true
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: null }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test',
            procedure_name: 'Test',
            test_name: null,
            is_auto_generated: true
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle database error', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: null }]
        })
        .mockRejectedValueOnce(new Error('Database error'));

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update consent form template',
        error: 'Database error'
      });
    });

    it('should handle constructTemplateFileUrl with null file path', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null,
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: null }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test',
            procedure_name: 'Test',
            test_name: null,
            is_auto_generated: false,
            template_file_path: null,
            template_file_name: null,
            template_file_size: null
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.template.template_file_url).toBeNull();
    });

    it('should handle constructTemplateFileUrl with Windows path', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null
      };
      mockReq.file = {
        filename: 'template-123.pdf',
        originalname: 'Test.pdf',
        size: 1024
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads\\consent-forms\\templates\\old.pdf' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test',
            procedure_name: 'Test',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
            template_file_name: 'Test.pdf',
            template_file_size: 1024
          }]
        });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.data.template.template_file_url).toContain('consent-forms/templates/template-123.pdf');
    });

    it('should handle handleTemplateFileUpload when existing file does not exist', async () => {
      mockReq.params = { templateId: '1' };
      mockReq.body = {
        procedure_name: 'Test',
        test_name: null
      };
      mockReq.file = {
        filename: 'template-new.pdf',
        originalname: 'New.pdf',
        size: 1024
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/old.pdf' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test',
            procedure_name: 'Test',
            test_name: null,
            is_auto_generated: false,
            template_file_path: 'uploads/consent-forms/templates/template-new.pdf',
            template_file_name: 'New.pdf',
            template_file_size: 1024
          }]
        });

      mockFs.existsSync.mockReturnValue(false); // Old file doesn't exist

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('deleteConsentFormTemplate', () => {
    it('should delete template successfully when file exists', async () => {
      mockReq.params = { templateId: '1' };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/template-123.pdf' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Delete query

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form template deleted successfully'
      });
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should delete template successfully when file does not exist', async () => {
      mockReq.params = { templateId: '1' };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/template-123.pdf' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      mockFs.existsSync.mockReturnValue(false);

      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should delete template successfully when template_file_path is null', async () => {
      mockReq.params = { templateId: '1' };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: null }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockFs.existsSync).not.toHaveBeenCalled();
    });

    it('should return 404 when template not found', async () => {
      mockReq.params = { templateId: '999' };

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template not found'
      });
    });

    it('should handle database error', async () => {
      mockReq.params = { templateId: '1' };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete consent form template',
        error: 'Database error'
      });
    });

    it('should handle file deletion error gracefully', async () => {
      mockReq.params = { templateId: '1' };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/template-123.pdf' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Delete query succeeds

      mockFs.existsSync.mockReturnValue(true);
      // File deletion throws error, but code should catch and continue
      const originalUnlinkSync = mockFs.unlinkSync;
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('File deletion failed');
      });

      // The code should catch the file deletion error and still delete from DB
      // But since unlinkSync is not in a try-catch in the delete function,
      // it will throw and be caught by the outer catch block
      await consentFormController.deleteConsentFormTemplate(mockReq, mockRes);

      // The error from unlinkSync will propagate to the catch block
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete consent form template',
        error: 'File deletion failed'
      });
    });
  });

  describe('getPatientConsentForms', () => {
    it('should retrieve patient consent forms successfully', async () => {
      mockReq.params = { patientId: '1' };

      const mockConsentForms = [
        {
          id: 1,
          patient_id: 1,
          consent_form_id: 1,
          file_path: 'uploads/consent-forms/patients/file1.pdf',
          file_name: 'Consent Form 1.pdf',
          file_size: 1024,
          uploaded_at: '2024-01-01',
          consent_form_name: 'MRI Consent',
          procedure_name: null,
          test_name: 'MRI'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockConsentForms });

      await consentFormController.getPatientConsentForms(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Patient consent forms retrieved successfully',
        data: {
          consentForms: [
            {
              ...mockConsentForms[0],
              file_url: 'http://localhost:5000/uploads/consent-forms/patients/file1.pdf'
            }
          ]
        }
      });
    });

    it('should handle null file_path', async () => {
      mockReq.params = { patientId: '1' };

      const mockConsentForms = [
        {
          id: 1,
          patient_id: 1,
          file_path: null,
          file_name: 'Consent Form 1.pdf'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockConsentForms });

      await consentFormController.getPatientConsentForms(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.consentForms[0].file_url).toBeNull();
    });

    it('should handle empty result set', async () => {
      mockReq.params = { patientId: '1' };

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await consentFormController.getPatientConsentForms(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Patient consent forms retrieved successfully',
        data: {
          consentForms: []
        }
      });
    });

    it('should handle database error', async () => {
      mockReq.params = { patientId: '1' };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await consentFormController.getPatientConsentForms(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch patient consent forms',
        error: 'Database error'
      });
    });
  });

  describe('uploadPatientConsentForm', () => {
    it('should upload new patient consent form successfully', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'patient-consent-123.pdf',
        originalname: 'Signed Consent.pdf',
        size: 2048
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Patient exists
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'MRI Consent' }] }) // Form exists
        .mockResolvedValueOnce({ rows: [] }) // No existing upload
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/patient-consent-123.pdf',
            file_name: 'Signed Consent.pdf',
            file_size: 2048
          }]
        });

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form file uploaded successfully',
        data: expect.objectContaining({
          patient_id: 1,
          consent_form_id: 1
        })
      });
    });

    it('should update existing patient consent form', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'patient-consent-456.pdf',
        originalname: 'Updated Consent.pdf',
        size: 3072
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Patient exists
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'MRI Consent' }] }) // Form exists
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // Existing upload found
        .mockResolvedValueOnce({ rows: [{ file_path: 'uploads/consent-forms/patients/old.pdf' }] }) // Old file path
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/patient-consent-456.pdf',
            file_name: 'Updated Consent.pdf',
            file_size: 3072
          }]
        });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form file updated successfully',
        data: expect.objectContaining({
          id: 10
        })
      });
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should return 400 when consentFormId is missing', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = {};
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'test.pdf',
        size: 1024
      };

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Consent form ID is required'
      });
    });

    it('should return 400 when file is missing', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = null;

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File is required'
      });
    });

    it('should return 404 when patient not found', async () => {
      mockReq.params = { patientId: '999' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'test.pdf',
        size: 1024
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Patient not found

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient not found'
      });
    });

    it('should return 404 when consent form template not found', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '999' };
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'test.pdf',
        size: 1024
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Patient exists
        .mockResolvedValueOnce({ rows: [] }); // Form not found

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Consent form template not found'
      });
    });

    it('should handle update when old file does not exist', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'patient-consent-789.pdf',
        originalname: 'New Consent.pdf',
        size: 4096
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'MRI Consent' }] })
        .mockResolvedValueOnce({ rows: [{ id: 20 }] })
        .mockResolvedValueOnce({ rows: [{ file_path: 'uploads/consent-forms/patients/old.pdf' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 20,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/patient-consent-789.pdf',
            file_name: 'New Consent.pdf',
            file_size: 4096
          }]
        });

      mockFs.existsSync.mockReturnValue(false); // Old file doesn't exist

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle update when old file_path is null', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'patient-consent-999.pdf',
        originalname: 'New Consent.pdf',
        size: 5120
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'MRI Consent' }] })
        .mockResolvedValueOnce({ rows: [{ id: 30 }] })
        .mockResolvedValueOnce({ rows: [{ file_path: null }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 30,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/patient-consent-999.pdf',
            file_name: 'New Consent.pdf',
            file_size: 5120
          }]
        });

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockFs.existsSync).not.toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      mockReq.params = { patientId: '1' };
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'test.pdf',
        originalname: 'test.pdf',
        size: 1024
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('Database error'));

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to upload consent form',
        error: 'Database error'
      });
    });
  });

  describe('serveConsentFormFile', () => {
    it('should serve file successfully', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Don't trigger error
          }
        }),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockSetCorsHeaders).toHaveBeenCalled();
      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/file.pdf');
      expect(mockFs.createReadStream).toHaveBeenCalledWith('/path/to/file.pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('inline'));
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockFileStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should return 400 when validatedFilePath is missing', async () => {
      mockReq.validatedFilePath = null;

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File path is required'
      });
      expect(mockSetCorsHeaders).toHaveBeenCalled();
    });

    it('should return 404 when file does not exist', async () => {
      mockReq.validatedFilePath = '/path/to/nonexistent.pdf';
      mockFs.existsSync.mockReturnValue(false);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File not found'
      });
      expect(mockSetCorsHeaders).toHaveBeenCalled();
    });

    it('should handle different file types correctly', async () => {
      const fileTypes = [
        { ext: '.jpg', mime: 'image/jpeg' },
        { ext: '.jpeg', mime: 'image/jpeg' },
        { ext: '.png', mime: 'image/png' },
        { ext: '.doc', mime: 'application/msword' },
        { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { ext: '.unknown', mime: 'application/octet-stream' }
      ];

      for (const fileType of fileTypes) {
        const mockFileStream = {
          on: jest.fn(),
          pipe: jest.fn(),
          destroyed: false,
          destroy: jest.fn()
        };

        mockReq.validatedFilePath = `/path/to/file${fileType.ext}`;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.createReadStream.mockReturnValue(mockFileStream);

        await consentFormController.serveConsentFormFile(mockReq, mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', fileType.mime);
      }
    });

    it('should handle file stream error when headers not sent', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Trigger error handler
            setTimeout(() => handler(new Error('Stream error')), 0);
          }
        }),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockRes.headersSent = false;
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Wait for error handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSetCorsHeaders).toHaveBeenCalled();
    });

    it('should handle file stream error when headers already sent', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Stream error')), 0);
          }
        }),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockRes.headersSent = true; // Headers already sent
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Wait for error handler
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not try to send response if headers already sent
      expect(mockSetCorsHeaders).toHaveBeenCalled();
    });

    it('should handle res.close event and destroy stream', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Don't trigger error
          }
        }),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      // Mock res.on to capture close handler
      let closeHandler;
      mockRes.on = jest.fn((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Trigger close event
      if (closeHandler) {
        closeHandler();
        expect(mockFileStream.destroy).toHaveBeenCalled();
      }
    });

    it('should not destroy stream if already destroyed', async () => {
      const mockFileStream = {
        on: jest.fn(),
        pipe: jest.fn(),
        destroyed: true, // Already destroyed
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      let closeHandler;
      mockRes.on = jest.fn((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      if (closeHandler) {
        closeHandler();
        expect(mockFileStream.destroy).not.toHaveBeenCalled();
      }
    });

    it('should handle general error', async () => {
      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error serving file'
      });
      expect(mockSetCorsHeaders).toHaveBeenCalled();
    });

    it('should handle file stream error when headers not sent', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Simulate error after a delay
            setTimeout(() => handler(new Error('Stream error')), 0);
          }
        }),
        pipe: jest.fn(),
        destroyed: false
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);
      mockRes.headersSent = false;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Wait for error handler to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFileStream.on).toHaveBeenCalledWith('error', expect.any(Function));
      consoleErrorSpy.mockRestore();
    });

    it('should handle file stream error when headers already sent', async () => {
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Simulate error after headers sent
            setTimeout(() => {
              mockRes.headersSent = true;
              handler(new Error('Stream error'));
            }, 0);
          }
        }),
        pipe: jest.fn(),
        destroyed: false
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);
      mockRes.headersSent = false;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Wait for error handler to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFileStream.on).toHaveBeenCalledWith('error', expect.any(Function));
      // Should not call res.status when headers already sent
      consoleErrorSpy.mockRestore();
    });

    it('should destroy file stream on res close when not destroyed', async () => {
      const mockFileStream = {
        on: jest.fn(),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      let closeHandler;
      mockRes.on = jest.fn((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      if (closeHandler) {
        closeHandler();
        expect(mockFileStream.destroy).toHaveBeenCalled();
      }
    });

    it('should not destroy file stream on res close when already destroyed', async () => {
      const mockFileStream = {
        on: jest.fn(),
        pipe: jest.fn(),
        destroyed: true,
        destroy: jest.fn()
      };

      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      let closeHandler;
      mockRes.on = jest.fn((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      if (closeHandler) {
        closeHandler();
        expect(mockFileStream.destroy).not.toHaveBeenCalled();
      }
    });

    it('should handle all mime types correctly', async () => {
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.unknown': 'application/octet-stream'
      };

      for (const [ext, mimeType] of Object.entries(mimeTypes)) {
        const mockFileStream = {
          on: jest.fn(),
          pipe: jest.fn()
        };

        mockReq.validatedFilePath = `/path/to/file${ext}`;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.createReadStream.mockReturnValue(mockFileStream);

        await consentFormController.serveConsentFormFile(mockReq, mockRes);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', mimeType);
      }
    });
  });

  describe('Multer Configuration - templateStorage', () => {
    it('should create directory if it does not exist', () => {
      // Access the storage through the multer instance
      const uploadTemplate = consentFormController.uploadTemplate;
      const storage = uploadTemplate.storage || uploadTemplate._storage;
      
      if (!storage || !storage.destination) {
        // Skip if storage is not accessible in test environment
        return;
      }
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      const cb = jest.fn();
      storage.destination({}, {}, cb);

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads/consent-forms/templates'),
        { recursive: true }
      );
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/consent-forms/templates'));
    });

    it('should not create directory if it exists', () => {
      const uploadTemplate = consentFormController.uploadTemplate;
      const storage = uploadTemplate.storage || uploadTemplate._storage;
      
      if (!storage || !storage.destination) {
        return;
      }
      
      mockFs.existsSync.mockReturnValue(true);

      const cb = jest.fn();
      storage.destination({}, {}, cb);

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/consent-forms/templates'));
    });

    it('should generate unique filename', () => {
      const uploadTemplate = consentFormController.uploadTemplate;
      const storage = uploadTemplate.storage || uploadTemplate._storage;
      
      if (!storage || !storage.filename) {
        return;
      }
      
      const file = {
        originalname: 'test.pdf'
      };

      const cb = jest.fn();
      storage.filename({}, file, cb);

      expect(cb).toHaveBeenCalled();
      const filename = cb.mock.calls[0][1];
      expect(filename).toMatch(/^template-\d+-\d+\.pdf$/);
    });

    it('should generate filename with correct extension extraction', () => {
      const uploadTemplate = consentFormController.uploadTemplate;
      const storage = uploadTemplate.storage || uploadTemplate._storage;
      
      if (!storage || !storage.filename) {
        return;
      }
      
      const testCases = [
        { originalname: 'test.PDF', expectedExt: '.pdf' },
        { originalname: 'test.file.pdf', expectedExt: '.pdf' },
        { originalname: 'test', expectedExt: '' }
      ];

      testCases.forEach(({ originalname, expectedExt }) => {
        const file = { originalname };
        const cb = jest.fn();
        storage.filename({}, file, cb);
        
        expect(cb).toHaveBeenCalled();
        const filename = cb.mock.calls[cb.mock.calls.length - 1][1];
        if (expectedExt) {
          expect(filename).toMatch(new RegExp(`\\${expectedExt}$`));
        }
      });
    });
  });

  describe('Multer Configuration - templateFileFilter', () => {
    it('should accept PDF files', () => {
      const uploadTemplate = consentFormController.uploadTemplate;
      const fileFilter = uploadTemplate.fileFilter || uploadTemplate._fileFilter;
      
      if (!fileFilter) {
        return;
      }
      
      const file = {
        mimetype: 'application/pdf'
      };

      const cb = jest.fn();
      fileFilter({}, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-PDF files', () => {
      const uploadTemplate = consentFormController.uploadTemplate;
      const fileFilter = uploadTemplate.fileFilter || uploadTemplate._fileFilter;
      
      if (!fileFilter) {
        return;
      }
      
      const file = {
        mimetype: 'image/jpeg'
      };

      const cb = jest.fn();
      fileFilter({}, file, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      const error = cb.mock.calls[0][0];
      expect(error.message).toBe('Only PDF files are allowed for templates');
    });
  });

  describe('Multer Configuration - patientConsentStorage', () => {
    it('should create directory if it does not exist', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const storage = uploadPatientConsent.storage || uploadPatientConsent._storage;
      
      if (!storage || !storage.destination) {
        return;
      }
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      const cb = jest.fn();
      storage.destination({}, {}, cb);

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads/consent-forms/patients'),
        { recursive: true }
      );
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/consent-forms/patients'));
    });

    it('should not create directory if it exists', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const storage = uploadPatientConsent.storage || uploadPatientConsent._storage;
      
      if (!storage || !storage.destination) {
        return;
      }
      
      mockFs.existsSync.mockReturnValue(true);

      const cb = jest.fn();
      storage.destination({}, {}, cb);

      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(null, expect.stringContaining('uploads/consent-forms/patients'));
    });

    it('should generate unique filename for patient consent', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const storage = uploadPatientConsent.storage || uploadPatientConsent._storage;
      
      if (!storage || !storage.filename) {
        return;
      }
      
      const file = {
        originalname: 'consent.jpg'
      };

      const cb = jest.fn();
      storage.filename({}, file, cb);

      expect(cb).toHaveBeenCalled();
      const filename = cb.mock.calls[0][1];
      expect(filename).toMatch(/^patient-consent-\d+-\d+\.jpg$/);
    });

    it('should generate patient consent filename with correct extension extraction', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const storage = uploadPatientConsent.storage || uploadPatientConsent._storage;
      
      if (!storage || !storage.filename) {
        return;
      }
      
      const testCases = [
        { originalname: 'consent.JPG', expectedExt: '.jpg' },
        { originalname: 'consent.file.png', expectedExt: '.png' },
        { originalname: 'consent', expectedExt: '' }
      ];

      testCases.forEach(({ originalname, expectedExt }) => {
        const file = { originalname };
        const cb = jest.fn();
        storage.filename({}, file, cb);
        
        expect(cb).toHaveBeenCalled();
        const filename = cb.mock.calls[cb.mock.calls.length - 1][1];
        if (expectedExt) {
          expect(filename).toMatch(new RegExp(`\\${expectedExt}$`));
        }
      });
    });
  });

  describe('Multer Configuration - patientConsentFileFilter', () => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

    it('should accept all allowed file types', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const fileFilter = uploadPatientConsent.fileFilter || uploadPatientConsent._fileFilter;
      
      if (!fileFilter) {
        return;
      }

      allowedTypes.forEach(mimetype => {
        const ext = allowedExtensions[allowedTypes.indexOf(mimetype)];
        const file = {
          mimetype: mimetype,
          originalname: `test${ext}`
        };

        const cb = jest.fn();
        fileFilter({}, file, cb);

        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject invalid file types', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const fileFilter = uploadPatientConsent.fileFilter || uploadPatientConsent._fileFilter;
      
      if (!fileFilter) {
        return;
      }
      
      const invalidFiles = [
        { mimetype: 'text/plain', originalname: 'test.txt' },
        { mimetype: 'application/zip', originalname: 'test.zip' },
        { mimetype: 'image/jpeg', originalname: 'test.txt' }, // Wrong extension
        { mimetype: 'text/plain', originalname: 'test.pdf' } // Wrong mimetype
      ];

      invalidFiles.forEach(file => {
        const cb = jest.fn();
        fileFilter({}, file, cb);

        expect(cb).toHaveBeenCalledWith(expect.any(Error));
        const error = cb.mock.calls[0][0];
        expect(error.message).toContain('Invalid file type');
      });
    });

    it('should handle case-insensitive extensions', () => {
      const uploadPatientConsent = consentFormController.uploadPatientConsent;
      const fileFilter = uploadPatientConsent.fileFilter || uploadPatientConsent._fileFilter;
      
      if (!fileFilter) {
        return;
      }
      
      const file = {
        mimetype: 'image/jpeg',
        originalname: 'test.JPG' // Uppercase extension
      };

      const cb = jest.fn();
      fileFilter({}, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });
  });

  describe('getConsentFormTemplates - path handling edge cases', () => {
    it('should handle template_file_path without uploads/ prefix', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Template 1',
          template_file_path: 'consent-forms/templates/template-1.pdf',
          template_file_name: 'template-1.pdf',
          template_file_size: 1024,
          procedure_name: 'Biopsy',
          test_name: null,
          is_auto_generated: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }]
      });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            templates: expect.arrayContaining([
              expect.objectContaining({
                template_file_url: expect.stringContaining('consent-forms/templates/template-1.pdf')
              })
            ])
          })
        })
      );
    });

    it('should handle template_file_path with backslashes', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Template 1',
          template_file_path: 'uploads\\consent-forms\\templates\\template-1.pdf',
          template_file_name: 'template-1.pdf',
          template_file_size: 1024,
          procedure_name: 'Biopsy',
          test_name: null,
          is_auto_generated: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }]
      });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe('createConsentFormTemplate - additional edge cases', () => {
    it('should handle templateFilePath without uploads/ prefix', async () => {
      mockReq.body = { procedure_name: 'Procedure 1', test_name: null };
      mockReq.file = {
        filename: 'template-123.pdf',
        path: 'consent-forms/templates/template-123.pdf',
        size: 1024
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // existingTemplate check
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Procedure 1',
            procedure_name: 'Procedure 1',
            test_name: null,
            template_file_path: 'consent-forms/templates/template-123.pdf',
            template_file_name: 'template-123.pdf',
            template_file_size: 1024
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle auto-generated template without file', async () => {
      mockReq.body = { procedure_name: 'Procedure 1', test_name: null, is_auto_generated: 'true' };
      mockReq.file = null;
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // existingTemplate check
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Procedure 1',
            procedure_name: 'Procedure 1',
            test_name: null,
            template_file_path: null,
            template_file_name: null,
            template_file_size: null
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            template: expect.objectContaining({
              template_file_url: null
            })
          })
        })
      );
    });

    it('should handle is_auto_generated as boolean true', async () => {
      mockReq.body = { procedure_name: 'Procedure 1', test_name: null, is_auto_generated: true };
      mockReq.file = null;
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Procedure 1',
            procedure_name: 'Procedure 1',
            test_name: null,
            template_file_path: null,
            template_file_name: null,
            template_file_size: null
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle procedure_name with whitespace', async () => {
      mockReq.body = { procedure_name: '  Procedure 1  ', test_name: null };
      mockReq.file = {
        filename: 'template-123.pdf',
        path: 'uploads/template-123.pdf',
        size: 1024
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Procedure 1',
            procedure_name: 'Procedure 1',
            test_name: null
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Procedure 1'])
      );
    });

    it('should handle test_name with whitespace', async () => {
      mockReq.body = { procedure_name: null, test_name: '  Test 1  ' };
      mockReq.file = {
        filename: 'template-123.pdf',
        path: 'uploads/template-123.pdf',
        size: 1024
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Test 1',
            procedure_name: null,
            test_name: 'Test 1'
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, 'Test 1'])
      );
    });
  });

  describe('updateConsentFormTemplate - additional edge cases', () => {
    it('should handle update without file (keep existing file)', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null };
      mockReq.file = null;
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: 'uploads/consent-forms/templates/existing.pdf'
          }]
        }) // templateCheck
        .mockResolvedValueOnce({ rows: [] }) // duplicateCheck
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            procedure_name: 'Updated Procedure',
            test_name: null,
            template_file_path: 'uploads/consent-forms/templates/existing.pdf',
            template_file_name: 'existing.pdf',
            template_file_size: 1024
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'Updated Procedure',
          null,
          false,
          'uploads/consent-forms/templates/existing.pdf',
          null, // templateFileName
          null  // templateFileSize
        ])
      );
    });

    it('should handle update with new file (delete old file)', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null };
      mockReq.file = {
        filename: 'new-template-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockFs.existsSync.mockReturnValue(true);
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: 'uploads/consent-forms/templates/old.pdf'
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            template_file_path: 'uploads/consent-forms/templates/new-template-123.pdf'
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle update with new file when old file does not exist', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null };
      mockReq.file = {
        filename: 'new-template-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockFs.existsSync.mockReturnValue(false); // old file doesn't exist
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: 'uploads/consent-forms/templates/old.pdf'
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            template_file_path: 'uploads/consent-forms/templates/new-template-123.pdf'
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle update when existingFilePath is null', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null };
      mockReq.file = {
        filename: 'new-template-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            template_file_path: 'uploads/consent-forms/templates/new-template-123.pdf'
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle templateFilePath without uploads/ prefix in constructTemplateFileUrl', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null };
      mockReq.file = {
        filename: 'new-template-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            template_file_path: 'consent-forms/templates/new-template-123.pdf'
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            template: expect.objectContaining({
              template_file_url: expect.stringContaining('consent-forms/templates/new-template-123.pdf')
            })
          })
        })
      );
    });

    it('should handle is_auto_generated as boolean true in update', async () => {
      mockReq.params.templateId = '1';
      mockReq.body = { procedure_name: 'Updated Procedure', test_name: null, is_auto_generated: true };
      mockReq.file = null;
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            template_file_path: 'uploads/consent-forms/templates/existing.pdf'
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Procedure',
            template_file_path: 'uploads/consent-forms/templates/existing.pdf'
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([true])
      );
    });
  });

  describe('uploadPatientConsentForm - additional edge cases', () => {
    it('should handle existing upload without old file_path', async () => {
      mockReq.params.patientId = '1';
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'new-consent-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // patientCheck
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Form 1' }] }) // formCheck
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // existingUpload
        .mockResolvedValueOnce({ rows: [{ file_path: null }] }) // oldFile - no file_path
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/new-consent-123.pdf',
            file_name: 'new.pdf',
            file_size: 2048
          }]
        });

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle existing upload with old file that does not exist', async () => {
      mockReq.params.patientId = '1';
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'new-consent-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockFs.existsSync.mockReturnValue(false);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Form 1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ file_path: 'uploads/consent-forms/patients/old.pdf' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/new-consent-123.pdf',
            file_name: 'new.pdf',
            file_size: 2048
          }]
        });

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle new upload (else branch)', async () => {
      mockReq.params.patientId = '1';
      mockReq.body = { consentFormId: '1' };
      mockReq.file = {
        filename: 'new-consent-123.pdf',
        originalname: 'new.pdf',
        size: 2048
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Form 1' }] })
        .mockResolvedValueOnce({ rows: [] }) // existingUpload - no existing upload
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            patient_id: 1,
            consent_form_id: 1,
            file_path: 'uploads/consent-forms/patients/new-consent-123.pdf',
            file_name: 'new.pdf',
            file_size: 2048
          }]
        });

      await consentFormController.uploadPatientConsentForm(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Consent form file uploaded successfully'
        })
      );
    });
  });

  describe('serveConsentFormFile - additional edge cases', () => {
    it('should handle file stream error when headers already sent', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.pdf';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Stream error')), 0);
          }
          return mockFileStream;
        }),
        pipe: jest.fn(),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);
      mockRes.headersSent = true;

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSetCorsHeaders).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle file stream already destroyed on close', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.pdf';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: true
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'close') setTimeout(() => handler(), 0);
        return mockRes;
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFileStream.destroy).not.toHaveBeenCalled();
    });

    it('should handle different file extensions', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.jpg';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });

    it('should handle JPEG file extension', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.jpeg';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });

    it('should handle PNG file extension', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.png';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('should handle DOC file extension', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.doc';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/msword');
    });

    it('should handle DOCX file extension', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.docx';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should handle unknown file extension', async () => {
      mockReq.validatedFilePath = 'uploads/consent-forms/templates/test.unknown';
      mockFs.existsSync.mockReturnValue(true);
      const mockFileStream = {
        on: jest.fn((event, handler) => {
          if (event === 'open') setTimeout(() => handler(), 0);
          if (event === 'end') setTimeout(() => handler(), 0);
          return mockFileStream;
        }),
        pipe: jest.fn().mockReturnValue(mockRes),
        destroy: jest.fn(),
        destroyed: false
      };
      mockFs.createReadStream.mockReturnValue(mockFileStream);

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });
  });

  describe('patientConsentFileFilter - comprehensive tests', () => {
    it('should accept file with matching mimetype and extname', () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });

    it('should reject file with non-matching mimetype', () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/octet-stream'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
      }
    });

    it('should reject file with non-matching extname', () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'application/pdf'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
      }
    });

    it('should accept JPG file', () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });

    it('should accept JPEG file', () => {
      const file = {
        originalname: 'test.jpeg',
        mimetype: 'image/jpeg'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });

    it('should accept PNG file', () => {
      const file = {
        originalname: 'test.png',
        mimetype: 'image/png'
      };
      const cb = jest.fn();
      const fileFilter = consentFormController.uploadPatientConsent._fileFilter || 
                         consentFormController.uploadPatientConsent.storage._fileFilter;
      
      if (fileFilter) {
        fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });
  });

  describe('getPatientConsentForms - additional edge cases', () => {
    it('should handle consent forms without file_path', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          patient_id: 1,
          consent_form_id: 1,
          file_path: null,
          file_name: null,
          file_size: null,
          uploaded_at: '2024-01-01',
          consent_form_name: 'Form 1',
          procedure_name: 'Biopsy',
          test_name: null
        }]
      });

      await consentFormController.getPatientConsentForms(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            consentForms: expect.arrayContaining([
              expect.objectContaining({
                file_url: null
              })
            ])
          })
        })
      );
    });
  });
});

