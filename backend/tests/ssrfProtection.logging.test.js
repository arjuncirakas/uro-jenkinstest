/**
 * Tests for new logging and fs.existsSync functionality in validateFilePathMiddleware
 * Ensures 100% coverage of lines 279-285, 302-306, 320-324
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as ssrfProtection from '../utils/ssrfProtection.js';
import path from 'path';
import fs from 'fs';

describe('SSRF Protection - Logging and File Existence Checks', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let fsExistsSyncSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fsExistsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
  });

  describe('validateFilePathMiddleware - URL decode error handling', () => {
    it('should handle decodeURIComponent error gracefully', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: { filePath: '%E0%A4%A' }, // Invalid UTF-8 sequence
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock decodeURIComponent to throw
      const originalDecode = global.decodeURIComponent;
      global.decodeURIComponent = jest.fn(() => {
        throw new Error('URI malformed');
      });

      middleware(req, res, next);

      // Should log warning about failed decode (line 284)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SSRF Protection] Failed to decode file path:'),
        expect.anything()
      );

      // Should continue processing with original path
      expect(next).toHaveBeenCalled();

      global.decodeURIComponent = originalDecode;
    });

    it('should successfully decode valid URL-encoded path', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const encodedPath = encodeURIComponent('consent-forms/templates/file.pdf');
      const req = {
        params: { filePath: encodedPath },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Should not log warning
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateFilePathMiddleware - logging statements', () => {
    it('should log validation details when processing file path', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: { filePath: 'consent-forms/templates/file.pdf' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Should log validation details (line 302-306)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SSRF Protection] Validating file path:',
        expect.objectContaining({
          original: expect.anything(),
          decoded: expect.anything(),
          baseDir: expect.anything()
        })
      );

      // Should log validated path with file existence check (line 320-324)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SSRF Protection] Validated file path:',
        expect.objectContaining({
          normalized: expect.anything(),
          exists: expect.any(Boolean)
        })
      );

      expect(fsExistsSyncSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should log file existence as false when file does not exist', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: { filePath: 'consent-forms/templates/nonexistent.pdf' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Should log that file does not exist
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SSRF Protection] Validated file path:',
        expect.objectContaining({
          normalized: expect.anything(),
          exists: false
        })
      );

      expect(fsExistsSyncSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle file path from query parameter', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: {},
        body: {},
        query: { filePath: 'consent-forms/templates/file.pdf' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle file path from body parameter', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: {},
        body: { filePath: 'consent-forms/templates/file.pdf' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should log warning when file path is invalid', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: { filePath: '../../etc/passwd' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Should log warning about invalid path (line 311)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SSRF Protection] Invalid file path:'),
        expect.anything(),
        expect.anything()
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Windows path separators in uploads prefix removal', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = {
        params: { filePath: 'uploads\\consent-forms\\templates\\file.pdf' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should use custom base directory when provided', () => {
      const customBaseDir = path.join(process.cwd(), 'custom-uploads');
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath', customBaseDir);
      const req = {
        params: { filePath: 'consent-forms/templates/file.pdf' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SSRF Protection] Validating file path:',
        expect.objectContaining({
          baseDir: customBaseDir
        })
      );

      expect(next).toHaveBeenCalled();
    });
  });
});

