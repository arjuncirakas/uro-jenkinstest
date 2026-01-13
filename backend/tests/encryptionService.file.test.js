import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';

// Mock the database pool
jest.mock('../config/database.js', () => ({
  default: {
    connect: jest.fn()
  }
}));

// Set up environment variable for encryption key
const originalEnv = process.env.ENCRYPTION_KEY;
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

describe('File Encryption Service', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    // Clear module cache to reload with new env
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

  describe('encryptFile', () => {
    it('should encrypt a valid Buffer successfully', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.from('test file content');
      const encrypted = encryptFile(testBuffer);
      
      expect(encrypted).toBeDefined();
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(testBuffer.length);
      expect(encrypted).not.toEqual(testBuffer);
    });

    it('should return null for null input', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const result = encryptFile(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const result = encryptFile(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty Buffer', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const result = encryptFile(Buffer.alloc(0));
      expect(result).toBeNull();
    });

    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      delete process.env.ENCRYPTION_KEY;
      jest.resetModules();
      
      const { encryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.from('test content');
      
      expect(() => encryptFile(testBuffer)).toThrow('ENCRYPTION_KEY is not set');
    });

    it('should encrypt binary data (PDF-like content)', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      // Simulate PDF content
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n');
      const encrypted = encryptFile(pdfContent);
      
      expect(encrypted).toBeDefined();
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(pdfContent.length);
    });

    it('should encrypt image data (JPEG-like content)', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      // Simulate JPEG content
      const jpegContent = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01');
      const encrypted = encryptFile(jpegContent);
      
      expect(encrypted).toBeDefined();
      expect(Buffer.isBuffer(encrypted)).toBe(true);
    });

    it('should encrypt large files (up to 10MB)', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      // Create 1MB buffer
      const largeBuffer = Buffer.alloc(1024 * 1024, 'A');
      const encrypted = encryptFile(largeBuffer);
      
      expect(encrypted).toBeDefined();
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(largeBuffer.length);
    });

    it('should produce different encrypted output for same input (due to IV)', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.from('same content');
      const encrypted1 = encryptFile(testBuffer);
      const encrypted2 = encryptFile(testBuffer);
      
      // Should be different due to random IV
      expect(encrypted1).not.toEqual(encrypted2);
    });
  });

  describe('decryptFile', () => {
    it('should decrypt encrypted Buffer correctly (round-trip)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const originalBuffer = Buffer.from('test file content for round-trip');
      const encrypted = encryptFile(originalBuffer);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toBeDefined();
      expect(Buffer.isBuffer(decrypted)).toBe(true);
      expect(decrypted).toEqual(originalBuffer);
    });

    it('should return null for null input', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const result = decryptFile(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const result = decryptFile(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty Buffer', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const result = decryptFile(Buffer.alloc(0));
      expect(result).toBeNull();
    });

    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      delete process.env.ENCRYPTION_KEY;
      jest.resetModules();
      
      const { decryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.alloc(100);
      
      expect(() => decryptFile(testBuffer)).toThrow('ENCRYPTION_KEY is not set');
    });

    it('should throw error for corrupted/invalid encrypted data', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const corruptedBuffer = Buffer.from('corrupted data');
      
      expect(() => decryptFile(corruptedBuffer)).toThrow();
    });

    it('should throw error for buffer too short', async () => {
      const { decryptFile } = await import('../services/encryptionService.js');
      const shortBuffer = Buffer.alloc(20); // Less than 32 bytes minimum
      
      expect(() => decryptFile(shortBuffer)).toThrow('too short');
    });

    it('should throw error for wrong encryption key', async () => {
      const { encryptFile } = await import('../services/encryptionService.js');
      const testBuffer = Buffer.from('test content');
      const encrypted = encryptFile(testBuffer);
      
      // Change encryption key
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      
      const { decryptFile } = await import('../services/encryptionService.js');
      expect(() => decryptFile(encrypted)).toThrow();
    });

    it('should decrypt binary data correctly (PDF)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n');
      const encrypted = encryptFile(pdfContent);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toEqual(pdfContent);
    });

    it('should decrypt image data correctly (JPEG)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const jpegContent = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01');
      const encrypted = encryptFile(jpegContent);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toEqual(jpegContent);
    });

    it('should decrypt large files correctly (1MB)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const largeBuffer = Buffer.alloc(1024 * 1024, 'A');
      const encrypted = encryptFile(largeBuffer);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toEqual(largeBuffer);
    });

    it('should preserve data integrity after round-trip encryption', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const testData = Buffer.from('Complex data with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');
      const encrypted = encryptFile(testData);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted.toString()).toBe(testData.toString());
    });
  });

  describe('Edge Cases', () => {
    it('should handle single byte buffer', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const singleByte = Buffer.from([0x42]);
      const encrypted = encryptFile(singleByte);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted).toEqual(singleByte);
    });

    it('should handle unicode content in buffer', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const unicodeContent = Buffer.from('测试文件内容 🚀 émoji');
      const encrypted = encryptFile(unicodeContent);
      const decrypted = decryptFile(encrypted);
      
      expect(decrypted.toString()).toBe(unicodeContent.toString());
    });

    it('should handle very small encrypted buffer (minimum size)', async () => {
      const { encryptFile, decryptFile } = await import('../services/encryptionService.js');
      const tinyBuffer = Buffer.from('x');
      const encrypted = encryptFile(tinyBuffer);
      
      // Should be at least 32 bytes (IV + authTag) + encrypted data
      expect(encrypted.length).toBeGreaterThanOrEqual(32);
      
      const decrypted = decryptFile(encrypted);
      expect(decrypted).toEqual(tinyBuffer);
    });
  });
});
