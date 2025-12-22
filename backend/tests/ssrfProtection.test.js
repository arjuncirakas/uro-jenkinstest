import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as ssrfProtection from '../utils/ssrfProtection.js';
import path from 'path';

describe('SSRF Protection Utilities', () => {
  describe('validateFilePath', () => {
    it('should reject non-string file path', () => {
      const result = ssrfProtection.validateFilePath(null, '/base');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty string');
    });

    it('should reject path with null bytes', () => {
      const result = ssrfProtection.validateFilePath('file\0.txt', '/base');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('null bytes');
    });

    it('should reject path traversal attempts', () => {
      const baseDir = path.join(process.cwd(), 'uploads');
      const result = ssrfProtection.validateFilePath('../../etc/passwd', baseDir);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal');
    });

    it('should accept valid file path within base directory', () => {
      const baseDir = path.join(process.cwd(), 'uploads');
      const result = ssrfProtection.validateFilePath('investigations/file.pdf', baseDir);

      expect(result.valid).toBe(true);
      expect(result.normalizedPath).toBeTruthy();
    });

    it('should handle URL-encoded paths', () => {
      const baseDir = path.join(process.cwd(), 'uploads');
      const encodedPath = encodeURIComponent('investigations/file.pdf');
      const result = ssrfProtection.validateFilePath(encodedPath, baseDir);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateUrl', () => {
    it('should reject non-string URL', () => {
      const result = ssrfProtection.validateUrl(null);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty string');
    });

    it('should reject invalid URL format', () => {
      const result = ssrfProtection.validateUrl('not-a-url');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should reject non-http/https protocols', () => {
      const result = ssrfProtection.validateUrl('ftp://example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Protocol not allowed');
    });

    it('should reject blocked hostnames', () => {
      const result = ssrfProtection.validateUrl('http://localhost');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked hostname');
    });

    it('should reject private IP addresses', () => {
      const result = ssrfProtection.validateUrl('http://192.168.1.1');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Private IP address');
    });

    it('should accept valid public URL', () => {
      const result = ssrfProtection.validateUrl('https://example.com');

      expect(result.valid).toBe(true);
      expect(result.parsedUrl).toBeTruthy();
    });

    it('should validate against allowed hosts list', () => {
      const result = ssrfProtection.validateUrl('https://example.com', ['allowed.com']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in allowed list');
    });

    it('should accept URL from allowed hosts list', () => {
      const result = ssrfProtection.validateUrl('https://allowed.com', ['allowed.com']);

      expect(result.valid).toBe(true);
    });
  });

  describe('isPrivateIP', () => {
    it('should return false for non-string input', () => {
      expect(ssrfProtection.isPrivateIP(null)).toBe(false);
    });

    it('should return true for private IP addresses', () => {
      expect(ssrfProtection.isPrivateIP('192.168.1.1')).toBe(true);
      expect(ssrfProtection.isPrivateIP('10.0.0.1')).toBe(true);
      expect(ssrfProtection.isPrivateIP('172.16.0.1')).toBe(true);
      expect(ssrfProtection.isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should return false for public IP addresses', () => {
      expect(ssrfProtection.isPrivateIP('8.8.8.8')).toBe(false);
      expect(ssrfProtection.isPrivateIP('1.1.1.1')).toBe(false);
    });
  });

  describe('sanitizeFilePath', () => {
    it('should return empty string for non-string input', () => {
      expect(ssrfProtection.sanitizeFilePath(null)).toBe('');
    });

    it('should remove null bytes', () => {
      const result = ssrfProtection.sanitizeFilePath('file\0name.txt');

      expect(result).not.toContain('\0');
    });

    it('should remove control characters', () => {
      const result = ssrfProtection.sanitizeFilePath('file\x01name.txt');

      expect(result).not.toContain('\x01');
    });

    it('should normalize path separators', () => {
      const result = ssrfProtection.sanitizeFilePath('path\\to\\file.txt');

      expect(result).toBeTruthy();
    });
  });

  describe('validateFilePathMiddleware', () => {
    it('should return 400 when file path is missing', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const req = { params: {}, body: {}, query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'File path is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should remove uploads/ prefix from file path', () => {
      const middleware = ssrfProtection.validateFilePathMiddleware('filePath');
      const baseDir = path.join(process.cwd(), 'uploads');
      const req = {
        params: { filePath: 'uploads/investigations/file.pdf' },
        body: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // The validateFilePath will be called with the normalized path
      // We need to ensure it returns valid for a path within uploads
      middleware(req, res, next);

      // Should have removed uploads/ prefix
      expect(req.params.filePath).toBe('investigations/file.pdf');
      // Next should be called if validation passes
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for invalid file path', () => {
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

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

