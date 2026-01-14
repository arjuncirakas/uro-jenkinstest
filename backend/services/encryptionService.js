import crypto from 'crypto';
import pool from '../config/database.js';

// Encryption key - should come from environment variable or KMS
// For now, using env variable. Later, integrate with KMS
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;

if (!ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment variables!');
  console.warn('⚠️  Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

// Separate key for searchable hashes (can be same as encryption key)
const SEARCH_HASH_KEY = process.env.SEARCH_HASH_KEY || ENCRYPTION_KEY || 'default-search-key-change-in-production';

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data as hex string
 * Format: iv (32 hex chars) + authTag (32 hex chars) + encrypted data
 */
export const encrypt = (plaintext) => {
  if (!plaintext || plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured. Cannot encrypt data.');
  }

  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv (32 hex chars) + authTag (32 hex chars) + encrypted data
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
};

/**
 * Decrypt data encrypted with encrypt()
 */
export const decrypt = (encryptedData) => {
  if (!encryptedData || encryptedData === null || encryptedData === undefined || encryptedData === '') {
    return null;
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured. Cannot decrypt data.');
  }

  try {
    // Check if data is already decrypted (not encrypted format)
    // Encrypted data should be at least 64 hex chars (32 for IV + 32 for auth tag)
    if (encryptedData.length < 64 || !/^[0-9a-f]{64,}$/i.test(encryptedData)) {
      // Data is not encrypted, return as-is (for backward compatibility)
      return encryptedData;
    }

    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    // Extract IV (first 32 hex chars = 16 bytes)
    const iv = Buffer.from(encryptedData.substring(0, 32), 'hex');
    
    // Extract auth tag (next 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encryptedData.substring(32, 64), 'hex');
    
    // Extract encrypted data (rest)
    const encrypted = encryptedData.substring(64);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return null on decryption error (data might be unencrypted legacy data)
    return null;
  }
};

/**
 * Create a searchable hash for phone/email
 * This allows searching without decrypting all records
 * Uses HMAC-SHA256 for deterministic hashing
 */
export const createSearchableHash = (value) => {
  if (!value || value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // Normalize: lowercase, trim, remove common formatting
    const normalized = String(value)
      .toLowerCase()
      .trim()
      .replace(/[\s\-().]/g, ''); // Remove spaces, dashes, parentheses, dots
    
    if (normalized.length === 0) {
      return null;
    }

    // Use HMAC with a separate key for searchable hashes
    const hashKey = Buffer.from(SEARCH_HASH_KEY, 'hex').length === 32 
      ? Buffer.from(SEARCH_HASH_KEY, 'hex')
      : Buffer.from(SEARCH_HASH_KEY, 'utf8');
    
    return crypto.createHmac('sha256', hashKey)
      .update(normalized)
      .digest('hex');
  } catch (error) {
    console.error('Hash creation error:', error);
    return null;
  }
};

/**
 * Create partial hash for LIKE searches (first N characters)
 * Allows prefix matching: "555" matches "555-1234"
 * For phone numbers, extracts digits only
 */
export const createPartialHash = (value, length = 3) => {
  if (!value || value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // Extract only digits for phone numbers, or use first N chars for other fields
    const normalized = String(value)
      .toLowerCase()
      .trim()
      .replace(/[^0-9a-z]/g, ''); // Remove non-alphanumeric
    
    if (normalized.length === 0) {
      return null;
    }

    return normalized.substring(0, length);
  } catch (error) {
    console.error('Partial hash creation error:', error);
    return null;
  }
};

/**
 * Encrypt multiple fields in an object
 */
export const encryptFields = (data, fieldsToEncrypt) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const encrypted = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] !== undefined && encrypted[field] !== null && encrypted[field] !== '') {
      try {
        encrypted[field] = encrypt(encrypted[field]);
      } catch (error) {
        console.error(`Error encrypting field ${field}:`, error);
        // Keep original value on encryption error
      }
    }
  }
  
  return encrypted;
};

/**
 * Decrypt multiple fields in an object
 */
export const decryptFields = (data, fieldsToDecrypt) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const decrypted = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] !== undefined && decrypted[field] !== null && decrypted[field] !== '') {
      try {
        const decryptedValue = decrypt(decrypted[field]);
        // Only update if decryption succeeded (returns non-null)
        if (decryptedValue !== null) {
          decrypted[field] = decryptedValue;
        }
        // If decryption returns null, keep original (might be unencrypted legacy data)
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        // Keep original value on decryption error
      }
    }
  }
  
  return decrypted;
};

/**
 * Encrypt data using PostgreSQL pgcrypto (for database-level encryption)
 * Use this for columns that need to be encrypted in the database
 */
export const encryptWithPG = async (plaintext) => {
  if (!plaintext || plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured. Cannot encrypt data.');
  }

  const client = await pool.connect();
  try {
    // Use pgcrypto's pgp_sym_encrypt with a key from environment
    const result = await client.query(
      `SELECT pgp_sym_encrypt($1, $2) as encrypted`,
      [String(plaintext), ENCRYPTION_KEY]
    );
    return result.rows[0].encrypted;
  } catch (error) {
    console.error('PG Encryption error:', error);
    throw new Error(`Failed to encrypt data with pgcrypto: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Decrypt data encrypted with encryptWithPG()
 */
export const decryptWithPG = async (encryptedData) => {
  if (!encryptedData || encryptedData === null || encryptedData === undefined || encryptedData === '') {
    return null;
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured. Cannot decrypt data.');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT pgp_sym_decrypt($1, $2) as decrypted`,
      [encryptedData, ENCRYPTION_KEY]
    );
    return result.rows[0].decrypted;
  } catch (error) {
    console.error('PG Decryption error:', error);
    // Return null on error (data might be unencrypted legacy data)
    return null;
  } finally {
    client.release();
  }
};

/**
 * Encrypt binary data (files) using AES-256-GCM
 * Returns encrypted data as Buffer
 * Format: iv (16 bytes) + authTag (16 bytes) + encrypted data
 */
export const encryptFile = (fileBuffer) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return null;
  }

  if (fileBuffer.length === 0) {
    return null;
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set. Cannot encrypt file.');
  }

  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    const iv = crypto.randomBytes(16); // 16 bytes for AES-256-GCM
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Return: iv (16 bytes) + authTag (16 bytes) + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error(`Failed to encrypt file: ${error.message}`);
  }
};

/**
 * Decrypt binary data (files) encrypted with encryptFile()
 * Returns decrypted Buffer
 */
export const decryptFile = (encryptedBuffer) => {
  if (!encryptedBuffer || !Buffer.isBuffer(encryptedBuffer)) {
    return null;
  }

  if (encryptedBuffer.length === 0) {
    return null;
  }

  // Minimum size: 16 bytes (IV) + 16 bytes (authTag) = 32 bytes
  if (encryptedBuffer.length < 32) {
    throw new Error('Invalid encrypted file data: too short');
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set. Cannot decrypt file.');
  }

  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    // Extract IV (first 16 bytes)
    const iv = encryptedBuffer.subarray(0, 16);
    
    // Extract auth tag (next 16 bytes)
    const authTag = encryptedBuffer.subarray(16, 32);
    
    // Extract encrypted data (rest)
    const encrypted = encryptedBuffer.subarray(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error(`Failed to decrypt file: ${error.message}`);
  }
};

