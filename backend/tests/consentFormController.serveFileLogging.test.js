/**
 * Tests for new logging code in serveConsentFormFile
 * Ensures 100% coverage of lines 647-652, 656-663
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';

// Mock database
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn()
};

jest.unstable_mockModule('fs', () => mockFs);

// Mock corsHelper
const mockSetCorsHeaders = jest.fn();
jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setCorsHeaders: mockSetCorsHeaders
}));

describe('Consent Form Controller - serveConsentFormFile Logging', () => {
  let mockClient;
  let mockRes;
  let mockReq;
  let consentFormController;
  let consoleLogSpy;
  let consoleErrorSpy;

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
      params: { filePath: 'consent-forms/templates/file.pdf' },
      file: null,
      validatedFilePath: null
    };

    mockPool.connect.mockResolvedValue(mockClient);
    
    // Clear mocks
    mockFs.existsSync.mockClear();
    mockFs.createReadStream.mockClear();
    mockSetCorsHeaders.mockClear();
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Import controller after mocking
    consentFormController = await import('../controllers/consentFormController.js');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('serveConsentFormFile - logging when file exists', () => {
    it('should log file check details when file exists', async () => {
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

      // Should log file check details (line 648-652)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[serveConsentFormFile] Checking file:',
        expect.objectContaining({
          validatedPath: '/path/to/file.pdf',
          exists: true,
          originalParam: 'consent-forms/templates/file.pdf'
        })
      );

      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/file.pdf');
      expect(mockRes.status).not.toHaveBeenCalledWith(404);
    });

    it('should log file check with different file paths', async () => {
      const mockFileStream = {
        on: jest.fn(),
        pipe: jest.fn(),
        destroyed: false,
        destroy: jest.fn()
      };

      const testPaths = [
        '/uploads/consent-forms/templates/template1.pdf',
        'D:\\Work Files\\latesturology\\uploads\\consent-forms\\templates\\template2.pdf',
        path.join(process.cwd(), 'uploads', 'consent-forms', 'templates', 'template3.pdf')
      ];

      for (const testPath of testPaths) {
        mockReq.validatedFilePath = testPath;
        mockReq.params.filePath = 'consent-forms/templates/template.pdf';
        mockFs.existsSync.mockReturnValue(true);
        mockFs.createReadStream.mockReturnValue(mockFileStream);

        await consentFormController.serveConsentFormFile(mockReq, mockRes);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[serveConsentFormFile] Checking file:',
          expect.objectContaining({
            validatedPath: testPath,
            exists: true
          })
        );
      }
    });
  });

  describe('serveConsentFormFile - error logging when file not found', () => {
    it('should log detailed error when file does not exist', async () => {
      mockReq.validatedFilePath = '/path/to/nonexistent.pdf';
      mockFs.existsSync.mockReturnValue(false);
      // Mock existsSync for directory checks
      mockFs.existsSync.mockImplementation((checkPath) => {
        if (checkPath === '/path/to/nonexistent.pdf') return false;
        if (checkPath.includes('uploads')) return true;
        return false;
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      // Should log error details (line 656-663)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[serveConsentFormFile] File not found:',
        expect.objectContaining({
          checkedPath: '/path/to/nonexistent.pdf',
          originalParam: 'consent-forms/templates/file.pdf',
          cwd: expect.any(String),
          baseDir: expect.stringContaining('uploads'),
          uploadsExists: expect.any(Boolean),
          templatesDirExists: expect.any(Boolean)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File not found. Please verify the file exists on the server.',
        debug: {
          checkedPath: '/path/to/nonexistent.pdf',
          originalParam: 'consent-forms/templates/file.pdf'
        }
      });
    });

    it('should log error when uploads directory does not exist', async () => {
      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(false);
      // Mock existsSync to return false for uploads directory
      mockFs.existsSync.mockImplementation((checkPath) => {
        if (checkPath.includes('uploads')) return false;
        return false;
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[serveConsentFormFile] File not found:',
        expect.objectContaining({
          uploadsExists: false,
          templatesDirExists: false
        })
      );
    });

    it('should log error when templates directory does not exist but uploads does', async () => {
      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockFs.existsSync.mockReturnValue(false);
      // Mock existsSync to return true for uploads but false for templates
      mockFs.existsSync.mockImplementation((checkPath) => {
        if (checkPath === '/path/to/file.pdf') return false;
        if (checkPath.includes('uploads') && !checkPath.includes('templates')) return true;
        if (checkPath.includes('templates')) return false;
        return false;
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[serveConsentFormFile] File not found:',
        expect.objectContaining({
          uploadsExists: true,
          templatesDirExists: false
        })
      );
    });

    it('should handle missing originalParam in error log', async () => {
      mockReq.validatedFilePath = '/path/to/file.pdf';
      mockReq.params.filePath = undefined;
      mockFs.existsSync.mockReturnValue(false);
      mockFs.existsSync.mockImplementation((checkPath) => {
        if (checkPath === '/path/to/file.pdf') return false;
        return true;
      });

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[serveConsentFormFile] File not found:',
        expect.objectContaining({
          originalParam: undefined
        })
      );
    });
  });

  describe('serveConsentFormFile - edge cases', () => {
    it('should handle empty string validatedFilePath', async () => {
      mockReq.validatedFilePath = '';

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle null validatedFilePath', async () => {
      mockReq.validatedFilePath = null;

      await consentFormController.serveConsentFormFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});

