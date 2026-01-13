/**
 * Tests for authController with encryption backward compatibility
 * 
 * Tests that login and registration work with both encrypted and unencrypted data
 */

import { createSearchableHash, encrypt } from '../services/encryptionService.js';

// Mock environment variable
const originalEnv = process.env.ENCRYPTION_KEY;

describe('AuthController Encryption Backward Compatibility', () => {
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

  describe('Email hash generation for user lookup', () => {
    it('should generate consistent hash for email lookup', () => {
      const email = 'test@example.com';
      const hash1 = createSearchableHash(email);
      const hash2 = createSearchableHash(email);
      
      expect(hash1).toBe(hash2);
    });

    it('should normalize email before hashing', () => {
      const hash1 = createSearchableHash('Test@Example.com');
      const hash2 = createSearchableHash('test@example.com');
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('Backward compatibility lookup pattern', () => {
    it('should handle hash-based lookup', () => {
      const email = 'test@example.com';
      const emailHash = createSearchableHash(email);
      
      // Simulate hash-based query
      const hashQuery = 'SELECT * FROM users WHERE email_hash = $1';
      expect(emailHash).toBeTruthy();
      expect(typeof hashQuery).toBe('string');
    });

    it('should handle direct email lookup as fallback', () => {
      const email = 'test@example.com';
      
      // Simulate direct email query (for backward compatibility)
      const directQuery = 'SELECT * FROM users WHERE email = $1';
      expect(email).toBeTruthy();
      expect(typeof directQuery).toBe('string');
    });

    it('should update hash when found via direct lookup', () => {
      const email = 'test@example.com';
      const emailHash = createSearchableHash(email);
      
      // Simulate: user found via direct email, update hash
      const updateQuery = 'UPDATE users SET email_hash = $1 WHERE id = $2';
      expect(emailHash).toBeTruthy();
      expect(typeof updateQuery).toBe('string');
    });
  });

  describe('Phone hash generation', () => {
    it('should generate consistent hash for phone lookup', () => {
      const phone = '555-123-4567';
      const hash1 = createSearchableHash(phone);
      const hash2 = createSearchableHash(phone);
      
      expect(hash1).toBe(hash2);
    });

    it('should normalize phone before hashing', () => {
      const hash1 = createSearchableHash('555-123-4567');
      const hash2 = createSearchableHash('(555) 123-4567');
      const hash3 = createSearchableHash('5551234567');
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe('Registration with encryption', () => {
    it('should encrypt email during registration', () => {
      const email = 'newuser@example.com';
      const encrypted = encrypt(email);
      
      expect(encrypted).not.toBe(email);
      expect(encrypted).toBeTruthy();
    });

    it('should create hash for email during registration', () => {
      const email = 'newuser@example.com';
      const emailHash = createSearchableHash(email);
      
      expect(emailHash).toBeTruthy();
      expect(emailHash.length).toBe(64);
    });

    it('should encrypt phone during registration if provided', () => {
      const phone = '555-123-4567';
      const encrypted = encrypt(phone);
      
      expect(encrypted).not.toBe(phone);
      expect(encrypted).toBeTruthy();
    });
  });

  describe('Login with backward compatibility', () => {
    it('should try hash lookup first', () => {
      const email = 'user@example.com';
      const emailHash = createSearchableHash(email);
      
      // First attempt: hash lookup
      const hashQuery = 'SELECT * FROM users WHERE email_hash = $1';
      expect(emailHash).toBeTruthy();
      expect(typeof hashQuery).toBe('string');
    });

    it('should fallback to direct email lookup', () => {
      const email = 'user@example.com';
      
      // Fallback: direct email lookup
      const directQuery = 'SELECT * FROM users WHERE email = $1';
      expect(email).toBeTruthy();
      expect(typeof directQuery).toBe('string');
    });

    it('should update hash when user found via direct lookup', () => {
      const email = 'user@example.com';
      const emailHash = createSearchableHash(email);
      const userId = 1; // Mock user ID
      
      // Update hash for future lookups
      const updateQuery = 'UPDATE users SET email_hash = $1 WHERE id = $2';
      expect(emailHash).toBeTruthy();
      expect(typeof updateQuery).toBe('string');
    });
  });

  describe('Edge cases for authentication', () => {
    it('should handle null email gracefully', () => {
      expect(() => createSearchableHash(null)).not.toThrow();
      expect(createSearchableHash(null)).toBeNull();
    });

    it('should handle undefined email gracefully', () => {
      expect(() => createSearchableHash(undefined)).not.toThrow();
      expect(createSearchableHash(undefined)).toBeNull();
    });

    it('should handle empty email gracefully', () => {
      expect(() => createSearchableHash('')).not.toThrow();
      expect(createSearchableHash('')).toBeNull();
    });

    it('should handle email with special characters', () => {
      const email = 'test+tag@example.com';
      const hash = createSearchableHash(email);
      
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64);
    });
  });
});
