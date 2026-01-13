/**
 * Tests for encryption service
 * 
 * Tests encryption/decryption, hash generation, and edge cases
 */

import {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  createSearchableHash,
  createPartialHash
} from '../services/encryptionService.js';

// Mock environment variable
const originalEnv = process.env.ENCRYPTION_KEY;

describe('Encryption Service', () => {
  beforeEach(() => {
    // Set a test encryption key (64 hex characters = 32 bytes)
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

  describe('encrypt', () => {
    it('should encrypt a string value', () => {
      const plaintext = 'test@example.com';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(64); // IV + auth tag + encrypted data
      expect(/^[0-9a-f]+$/i.test(encrypted)).toBe(true); // Should be hex string
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(encrypt(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(encrypt('')).toBeNull();
    });

    it('should encrypt different values differently', () => {
      const value1 = 'test1@example.com';
      const value2 = 'test2@example.com';
      
      const encrypted1 = encrypt(value1);
      const encrypted2 = encrypt(value2);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt same value differently each time (due to random IV)', () => {
      const value = 'test@example.com';
      
      const encrypted1 = encrypt(value);
      const encrypted2 = encrypt(value);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters', () => {
      const plaintext = 'test+user@example.com';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'test用户@example.com';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encrypt('test')).toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted value correctly', () => {
      const plaintext = 'test@example.com';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(decrypt(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decrypt('')).toBeNull();
    });

    it('should return null for invalid encrypted data', () => {
      expect(decrypt('invalid-encrypted-data')).toBeNull();
    });

    it('should return null for too short encrypted data', () => {
      expect(decrypt('1234567890abcdef')).toBeNull();
    });

    it('should handle already decrypted data (backward compatibility)', () => {
      const plaintext = 'test@example.com';
      const result = decrypt(plaintext);
      
      // Should return as-is if not encrypted
      expect(result).toBe(plaintext);
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      const encrypted = encrypt('test');
      
      // Restore key for decrypt
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St'
      };
      
      const encrypted = encryptFields(data, ['email', 'phone']);
      
      expect(encrypted.name).toBe(data.name); // Not encrypted
      expect(encrypted.address).toBe(data.address); // Not encrypted
      expect(encrypted.email).not.toBe(data.email); // Encrypted
      expect(encrypted.phone).not.toBe(data.phone); // Encrypted
      expect(isEncrypted(encrypted.email)).toBe(true);
      expect(isEncrypted(encrypted.phone)).toBe(true);
    });

    it('should handle null/undefined values', () => {
      const data = {
        email: null,
        phone: undefined,
        name: 'John'
      };
      
      const encrypted = encryptFields(data, ['email', 'phone']);
      
      expect(encrypted.email).toBeNull();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.name).toBe('John');
    });

    it('should handle empty object', () => {
      const encrypted = encryptFields({}, ['email']);
      expect(encrypted).toEqual({});
    });

    it('should handle non-object input', () => {
      expect(encryptFields(null, ['email'])).toBeNull();
      expect(encryptFields(undefined, ['email'])).toBeUndefined();
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields in an object', () => {
      const plaintext = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };
      
      const encrypted = encryptFields(plaintext, ['email', 'phone']);
      const decrypted = decryptFields(encrypted, ['email', 'phone']);
      
      expect(decrypted.email).toBe(plaintext.email);
      expect(decrypted.phone).toBe(plaintext.phone);
      expect(decrypted.name).toBe(plaintext.name);
    });

    it('should handle null/undefined values', () => {
      const data = {
        email: null,
        phone: undefined,
        name: 'John'
      };
      
      const decrypted = decryptFields(data, ['email', 'phone']);
      
      expect(decrypted.email).toBeNull();
      expect(decrypted.phone).toBeUndefined();
      expect(decrypted.name).toBe('John');
    });

    it('should handle already decrypted data (backward compatibility)', () => {
      const data = {
        email: 'john@example.com',
        phone: '1234567890'
      };
      
      const decrypted = decryptFields(data, ['email', 'phone']);
      
      // Should keep original if not encrypted
      expect(decrypted.email).toBe(data.email);
      expect(decrypted.phone).toBe(data.phone);
    });

    it('should handle empty object', () => {
      const decrypted = decryptFields({}, ['email']);
      expect(decrypted).toEqual({});
    });

    it('should handle non-object input', () => {
      expect(decryptFields(null, ['email'])).toBeNull();
      expect(decryptFields(undefined, ['email'])).toBeUndefined();
    });
  });

  describe('createSearchableHash', () => {
    it('should create a hash for a value', () => {
      const value = 'test@example.com';
      const hash = createSearchableHash(value);
      
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA256 hex = 64 chars
      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
    });

    it('should create the same hash for the same value', () => {
      const value = 'test@example.com';
      const hash1 = createSearchableHash(value);
      const hash2 = createSearchableHash(value);
      
      expect(hash1).toBe(hash2);
    });

    it('should normalize values (lowercase, trim)', () => {
      const hash1 = createSearchableHash('Test@Example.com');
      const hash2 = createSearchableHash('test@example.com');
      const hash3 = createSearchableHash('  test@example.com  ');
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should remove common formatting from phone numbers', () => {
      const hash1 = createSearchableHash('555-123-4567');
      const hash2 = createSearchableHash('(555) 123-4567');
      const hash3 = createSearchableHash('5551234567');
      
      // Should be the same after normalization
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should return null for null input', () => {
      expect(createSearchableHash(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(createSearchableHash(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(createSearchableHash('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(createSearchableHash('   ')).toBeNull();
    });
  });

  describe('createPartialHash', () => {
    it('should create a partial hash of specified length', () => {
      const value = '5551234567';
      const hash = createPartialHash(value, 3);
      
      expect(hash).toBe('555');
      expect(hash.length).toBe(3);
    });

    it('should extract only digits for phone numbers', () => {
      const hash1 = createPartialHash('555-123-4567', 3);
      const hash2 = createPartialHash('(555) 123-4567', 3);
      const hash3 = createPartialHash('5551234567', 3);
      
      expect(hash1).toBe('555');
      expect(hash2).toBe('555');
      expect(hash3).toBe('555');
    });

    it('should handle shorter values', () => {
      const hash = createPartialHash('12', 5);
      expect(hash).toBe('12');
    });

    it('should return null for null input', () => {
      expect(createPartialHash(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(createPartialHash(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(createPartialHash('')).toBeNull();
    });

    it('should use default length of 3', () => {
      const hash = createPartialHash('5551234567');
      expect(hash).toBe('555');
    });
  });

  // Helper function to check if value looks encrypted
  const isEncrypted = (value) => {
    if (!value) return false;
    const str = String(value);
    return /^[0-9a-f]{64,}$/i.test(str) && str.length > 64;
  };
});
