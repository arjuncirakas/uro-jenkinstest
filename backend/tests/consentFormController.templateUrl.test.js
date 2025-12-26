/**
 * Tests for consentFormController template_file_url construction
 * Tests all modified functions to ensure proper API endpoint URL generation
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

describe('Consent Form Controller - Template URL Construction', () => {
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
      json: jest.fn()
    };
    mockReq = {
      protocol: 'http',
      get: jest.fn((header) => {
        if (header === 'host') return 'localhost:5000';
        return null;
      }),
      body: {},
      params: {},
      file: null
    };

    mockPool.connect.mockResolvedValue(mockClient);
    
    // Clear fs mocks before each test
    mockFs.existsSync.mockClear();
    mockFs.unlinkSync.mockClear();
    
    // Import controller after mocking
    consentFormController = await import('../controllers/consentFormController.js');
  });

  describe('getConsentFormTemplates - template_file_url construction', () => {
    it('should construct URL with API endpoint when template_file_path exists with uploads/ prefix', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'MRI Template',
          test_name: 'MRI',
          template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: {
          templates: [
            {
              ...mockTemplates[0],
              template_file_url: 'http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate-123.pdf'
            }
          ]
        }
      });
    });

    it('should construct URL with API endpoint when template_file_path exists without uploads/ prefix', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'TRUS Template',
          test_name: 'TRUS',
          template_file_path: 'consent-forms/templates/template-456.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: {
          templates: [
            {
              ...mockTemplates[0],
              template_file_url: 'http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate-456.pdf'
            }
          ]
        }
      });
    });

    it('should handle Windows path separators correctly', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Biopsy Template',
          test_name: 'Biopsy',
          template_file_path: 'uploads\\consent-forms\\templates\\template-789.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: {
          templates: [
            {
              ...mockTemplates[0],
              template_file_url: 'http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate-789.pdf'
            }
          ]
        }
      });
    });

    it('should set template_file_url to null when template_file_path is null', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Auto Template',
          test_name: 'Auto',
          template_file_path: null,
          is_auto_generated: true
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Consent form templates retrieved successfully',
        data: {
          templates: [
            {
              ...mockTemplates[0],
              template_file_url: null
            }
          ]
        }
      });
    });

    it('should URL encode the path correctly', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Special Template',
          test_name: 'Special',
          template_file_path: 'uploads/consent-forms/templates/template with spaces.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.templates[0].template_file_url).toContain('template%20with%20spaces.pdf');
    });

    it('should handle database error', async () => {
      const dbError = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(dbError);

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch consent form templates',
        error: 'Database connection failed'
      });
    });

    it('should handle multiple templates with mixed paths', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Template 1',
          test_name: 'Test1',
          template_file_path: 'uploads/consent-forms/templates/template1.pdf',
          is_auto_generated: false
        },
        {
          id: 2,
          name: 'Template 2',
          test_name: 'Test2',
          template_file_path: null,
          is_auto_generated: true
        },
        {
          id: 3,
          name: 'Template 3',
          test_name: 'Test3',
          template_file_path: 'consent-forms/templates/template3.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.templates[0].template_file_url).toBe('http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate1.pdf');
      expect(callArgs.data.templates[1].template_file_url).toBeNull();
      expect(callArgs.data.templates[2].template_file_url).toBe('http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate3.pdf');
    });
  });

  describe('createConsentFormTemplate - template_file_url construction', () => {
    it('should construct URL with API endpoint when file is uploaded', async () => {
      const mockFile = {
        filename: 'template-123.pdf',
        originalname: 'MRI Template.pdf',
        size: 1024
      };

      mockReq.body = {
        test_name: 'MRI',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      // Mock existing template check (no duplicates)
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing template
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'MRI',
            test_name: 'MRI',
            template_file_path: 'uploads/consent-forms/templates/template-123.pdf',
            is_auto_generated: false
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toBe('http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate-123.pdf');
    });

    it('should set template_file_url to null when no file is uploaded (auto-generated)', async () => {
      mockReq.body = {
        test_name: 'Auto Test',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      // Mock existing template check
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Auto Test',
            test_name: 'Auto Test',
            template_file_path: null,
            is_auto_generated: true
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toBeNull();
    });

    it('should handle Windows path separators in file path', async () => {
      const mockFile = {
        filename: 'template-456.pdf',
        originalname: 'Test Template.pdf',
        size: 2048
      };

      mockReq.body = {
        procedure_name: 'Procedure',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      // Mock path.join to return Windows-style path
      const originalPathJoin = path.join;
      path.join = jest.fn(() => 'uploads\\consent-forms\\templates\\template-456.pdf');

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Procedure',
            procedure_name: 'Procedure',
            template_file_path: 'uploads\\consent-forms\\templates\\template-456.pdf',
            is_auto_generated: false
          }]
        });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toContain('consent-forms%2Ftemplates%2Ftemplate-456.pdf');
      expect(callArgs.data.template.template_file_url).not.toContain('\\');

      // Restore original
      path.join = originalPathJoin;
    });

    it('should handle validation error - missing name', async () => {
      mockReq.body = {
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Either procedure name or test name is required'
      });
    });

    it('should handle validation error - file required for non-auto-generated', async () => {
      mockReq.body = {
        test_name: 'MRI',
        is_auto_generated: 'false'
      };
      mockReq.file = null;

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template file is required when auto-generation is disabled'
      });
    });

    it('should handle duplicate template name', async () => {
      const mockFile = {
        filename: 'template-123.pdf',
        originalname: 'MRI Template.pdf',
        size: 1024
      };

      mockReq.body = {
        test_name: 'MRI',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      // Mock existing template found
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A template with this name already exists'
      });
    });

    it('should handle database error during creation', async () => {
      const mockFile = {
        filename: 'template-123.pdf',
        originalname: 'MRI Template.pdf',
        size: 1024
      };

      mockReq.body = {
        test_name: 'MRI',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Database error'));

      await consentFormController.createConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create consent form template',
        error: 'Database error'
      });
    });
  });

  describe('updateConsentFormTemplate - template_file_url construction', () => {
    it('should handle validation error - missing name', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Either procedure name or test name is required'
      });
    });

    it('should construct URL with API endpoint when updating with new file', async () => {
      const mockFile = {
        filename: 'template-new.pdf',
        originalname: 'New Template.pdf',
        size: 2048
      };

      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Updated MRI',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      // Setup fs mocks
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, template_file_path: 'uploads/consent-forms/templates/old.pdf' }] }) // Existing template found
        .mockResolvedValueOnce({ rows: [] }) // No duplicate
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated MRI',
            test_name: 'Updated MRI',
            template_file_path: 'uploads/consent-forms/templates/template-new.pdf',
            is_auto_generated: false
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toBe('http://localhost:5000/api/consent-forms/files/consent-forms%2Ftemplates%2Ftemplate-new.pdf');
    });

    it('should set template_file_url to null when template_file_path is null after update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Updated Test',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, template_file_path: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated Test',
            test_name: 'Updated Test',
            template_file_path: null,
            is_auto_generated: true
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toBeNull();
    });

    it('should handle template not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { test_name: 'Test' };

      // Mock the query to return empty rows (template not found)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template not found'
      });
    });

    it('should handle duplicate name during update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Duplicate Name',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Duplicate found

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A template with this name already exists'
      });
    });

    it('should handle Windows path separators in update', async () => {
      const mockFile = {
        filename: 'template-updated.pdf',
        originalname: 'Updated Template.pdf',
        size: 3072
      };

      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Updated',
        is_auto_generated: 'false'
      };
      mockReq.file = mockFile;

      // Setup fs mocks
      mockFs.existsSync.mockReturnValue(false);
      mockFs.unlinkSync.mockImplementation(() => {});

      // Mock path.join to return Windows-style path
      const originalPathJoin = path.join;
      path.join = jest.fn(() => 'uploads\\consent-forms\\templates\\template-updated.pdf');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, template_file_path: 'old.pdf' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated',
            test_name: 'Updated',
            template_file_path: 'uploads\\consent-forms\\templates\\template-updated.pdf',
            is_auto_generated: false
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.template.template_file_url).toContain('consent-forms%2Ftemplates%2Ftemplate-updated.pdf');
      expect(callArgs.data.template.template_file_url).not.toContain('\\');

      // Restore
      path.join = originalPathJoin;
    });

    it('should handle database error during update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Updated',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Update failed'));

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update consent form template',
        error: 'Update failed'
      });
    });

    it('should handle empty template_file_path string', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        test_name: 'Updated',
        is_auto_generated: 'true'
      };
      mockReq.file = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, template_file_path: '' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Updated',
            test_name: 'Updated',
            template_file_path: '',
            is_auto_generated: true
          }]
        });

      await consentFormController.updateConsentFormTemplate(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      // Empty string is falsy, so template_file_path check fails and URL should be null
      expect(callArgs.data.template.template_file_url).toBeNull();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null template_file_path in getConsentFormTemplates', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Test',
          test_name: 'Test',
          template_file_path: null,
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.templates[0].template_file_url).toBeNull();
    });

    it('should handle empty string template_file_path', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Test',
          test_name: 'Test',
          template_file_path: '',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      // Empty string is falsy, so template_file_path check fails and URL should be null
      expect(callArgs.data.templates[0].template_file_url).toBeNull();
    });

    it('should handle https protocol', async () => {
      mockReq.protocol = 'https';
      mockReq.get = jest.fn((header) => {
        if (header === 'host') return 'uroprep.ahimsa.global';
        return null;
      });

      const mockTemplates = [
        {
          id: 1,
          name: 'Test',
          test_name: 'Test',
          template_file_path: 'uploads/consent-forms/templates/test.pdf',
          is_auto_generated: false
        }
      ];

      mockClient.query.mockResolvedValue({ rows: mockTemplates });

      await consentFormController.getConsentFormTemplates(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.data.templates[0].template_file_url).toContain('https://');
      expect(callArgs.data.templates[0].template_file_url).toContain('uroprep.ahimsa.global');
    });
  });
});

