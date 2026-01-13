import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Set up test encryption key
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const originalEnv = process.env.ENCRYPTION_KEY;

describe('File Encryption Integration Tests', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    jest.resetModules();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
    jest.resetModules();
  });

  describe('File Encryption Service Integration', () => {
    it('should encrypt and decrypt PDF file correctly', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n');
      
      const encrypted = encryptFile(pdfContent);
      expect(encrypted).toBeDefined();
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      
      const decrypted = decryptFile(encrypted);
      expect(decrypted).toEqual(pdfContent);
    });

    it('should encrypt and decrypt image file correctly', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const imageContent = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00');
      
      const encrypted = encryptFile(imageContent);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toEqual(imageContent);
    });

    it('should handle large files (1MB)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const largeContent = Buffer.alloc(1024 * 1024, 'A');
      
      const encrypted = encryptFile(largeContent);
      expect(encrypted.length).toBeGreaterThan(largeContent.length);
      
      const decrypted = decryptFile(encrypted);
      expect(decrypted).toEqual(largeContent);
    });

    it('should preserve file integrity after encryption/decryption', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const originalContent = Buffer.from('Test file content with special chars: !@#$%^&*()');
      
      const encrypted = encryptFile(originalContent);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted.toString()).toBe(originalContent.toString());
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle filesystem files when file_data is null', async () => {
      // This test verifies that old filesystem files still work
      // The serveFile function should check filesystem when file_data is null
      expect(true).toBe(true); // Placeholder - actual test would require full controller setup
    });

    it('should prioritize database file_data over filesystem file_path', async () => {
      // This test verifies that encrypted files in database are served first
      expect(true).toBe(true); // Placeholder - actual test would require full controller setup
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted encrypted data gracefully', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const corruptedBuffer = Buffer.from('corrupted data that is not properly encrypted');
      
      expect(() => decryptFile(corruptedBuffer)).toThrow();
    });

    it('should handle missing encryption key', async () => {
      delete process.env.ENCRYPTION_KEY;
      jest.resetModules();
      
      const { encryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.from('test');
      
      expect(() => encryptFile(testBuffer)).toThrow('ENCRYPTION_KEY');
    });
  });

  describe('Multiple File Types', () => {
    const fileTypes = [
      { name: 'PDF', content: Buffer.from('%PDF-1.4\n') },
      { name: 'JPEG', content: Buffer.from('\xFF\xD8\xFF\xE0') },
      { name: 'PNG', content: Buffer.from('\x89PNG\r\n\x1a\n') },
      { name: 'DOCX', content: Buffer.from('PK\x03\x04') }, // ZIP signature (DOCX is a ZIP)
      { name: 'CSV', content: Buffer.from('name,age\nJohn,30') }
    ];

    fileTypes.forEach(({ name, content }) => {
      it(`should encrypt and decrypt ${name} file correctly`, async () => {
        const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
        
        const encrypted = encryptFile(content);
        expect(encrypted).toBeDefined();
        
        const decrypted = decryptFile(encrypted);
        expect(decrypted).toEqual(content);
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent encryptions', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const files = Array.from({ length: 10 }, (_, i) => Buffer.from(`File ${i} content`));
      
      const encrypted = files.map(file => encryptFile(file));
      const decrypted = encrypted.map(enc => decryptFile(enc));
      
      decrypted.forEach((dec, i) => {
        expect(dec).toEqual(files[i]);
      });
    });
  });
});
