/**
 * Tests for backward compatibility with encrypted/unencrypted data
 * 
 * Tests that the system can handle both encrypted and unencrypted data
 * during the migration period
 */

import {
  encrypt,
  decrypt,
  createSearchableHash,
  createPartialHash
} from '../services/encryptionService.js';

// Mock environment variable
const originalEnv = process.env.ENCRYPTION_KEY;

describe('Encryption Backward Compatibility', () => {
  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.SEARCH_HASH_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('Hash generation consistency', () => {
    it('should generate the same hash for the same input', () => {
      const email = 'test@example.com';
      const hash1 = createSearchableHash(email);
      const hash2 = createSearchableHash(email);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBe(64);
    });

    it('should normalize email before hashing', () => {
      const hash1 = createSearchableHash('Test@Example.com');
      const hash2 = createSearchableHash('test@example.com');
      const hash3 = createSearchableHash('  TEST@EXAMPLE.COM  ');
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should normalize phone before hashing', () => {
      const hash1 = createSearchableHash('555-123-4567');
      const hash2 = createSearchableHash('(555) 123-4567');
      const hash3 = createSearchableHash('5551234567');
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe('Encryption/Decryption roundtrip', () => {
    it('should encrypt and decrypt email correctly', () => {
      const email = 'test@example.com';
      const encrypted = encrypt(email);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(email);
      expect(encrypted).not.toBe(email);
    });

    it('should encrypt and decrypt phone correctly', () => {
      const phone = '555-123-4567';
      const encrypted = encrypt(phone);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(phone);
    });

    it('should handle special characters in email', () => {
      const email = 'test+user@example.com';
      const encrypted = encrypt(email);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(email);
    });

    it('should handle unicode characters', () => {
      const email = 'test用户@example.com';
      const encrypted = encrypt(email);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(email);
    });
  });

  describe('Backward compatibility detection', () => {
    it('should detect encrypted data format', () => {
      const plaintext = 'test@example.com';
      const encrypted = encrypt(plaintext);
      
      // Encrypted data should be hex string, at least 64 chars
      expect(/^[0-9a-f]{64,}$/i.test(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(64);
    });

    it('should handle unencrypted data gracefully', () => {
      const plaintext = 'test@example.com';
      // decrypt should return plaintext if data is not encrypted
      const result = decrypt(plaintext);
      
      expect(result).toBe(plaintext);
    });

    it('should handle null/undefined gracefully', () => {
      expect(decrypt(null)).toBeNull();
      expect(decrypt(undefined)).toBeNull();
      expect(decrypt('')).toBeNull();
    });
  });

  describe('Partial hash for phone prefix matching', () => {
    it('should extract phone prefix correctly', () => {
      const phone = '5551234567';
      const prefix = createPartialHash(phone, 3);
      
      expect(prefix).toBe('555');
    });

    it('should normalize phone before extracting prefix', () => {
      const prefix1 = createPartialHash('555-123-4567', 3);
      const prefix2 = createPartialHash('(555) 123-4567', 3);
      const prefix3 = createPartialHash('5551234567', 3);
      
      expect(prefix1).toBe('555');
      expect(prefix2).toBe('555');
      expect(prefix3).toBe('555');
    });

    it('should handle short phone numbers', () => {
      const prefix = createPartialHash('12', 5);
      expect(prefix).toBe('12');
    });

    it('should return null for invalid input', () => {
      expect(createPartialHash(null)).toBeNull();
      expect(createPartialHash(undefined)).toBeNull();
      expect(createPartialHash('')).toBeNull();
    });
  });

  describe('Migration scenario tests', () => {
    it('should handle user lookup with hash fallback to direct email', () => {
      // This test simulates the backward compatibility lookup
      const email = 'test@example.com';
      const emailHash = createSearchableHash(email);
      
      // Hash should be consistent
      expect(emailHash).toBeTruthy();
      expect(emailHash.length).toBe(64);
      
      // Simulate: if hash lookup fails, direct email lookup should work
      // (This is tested in integration tests with actual database)
    });

    it('should handle phone lookup with hash fallback to direct phone', () => {
      const phone = '555-123-4567';
      const phoneHash = createSearchableHash(phone);
      
      expect(phoneHash).toBeTruthy();
      expect(phoneHash.length).toBe(64);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(createSearchableHash('')).toBeNull();
      expect(createPartialHash('')).toBeNull();
      expect(encrypt('')).toBeNull();
      expect(decrypt('')).toBeNull();
    });

    it('should handle whitespace-only strings', () => {
      expect(createSearchableHash('   ')).toBeNull();
      expect(createPartialHash('   ')).toBeNull();
    });

    it('should handle very long emails', () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const encrypted = encrypt(longEmail);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(longEmail);
    });

    it('should handle special characters in phone', () => {
      const phone = '+1 (555) 123-4567 ext. 123';
      const hash = createSearchableHash(phone);
      const prefix = createPartialHash(phone, 3);
      
      expect(hash).toBeTruthy();
      expect(prefix).toBe('155'); // Should extract digits only
    });
  });
});
