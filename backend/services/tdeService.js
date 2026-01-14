/**
 * Transparent Data Encryption (TDE) Service
 * Provides database-level encryption at rest for PostgreSQL
 * 
 * Note: PostgreSQL doesn't have native TDE like SQL Server/Oracle.
 * This implementation uses:
 * 1. pgcrypto extension for column-level encryption
 * 2. Tablespace encryption (if supported by filesystem)
 * 3. WAL encryption configuration
 * 4. Key management and rotation
 */

import pool from '../config/database.js';
import crypto from 'crypto';

// TDE Master Key - should be stored securely (KMS, Vault, etc.)
// In production, this should come from a secure key management service
const TDE_MASTER_KEY = process.env.TDE_MASTER_KEY || null;

// Key rotation interval (in days)
const KEY_ROTATION_INTERVAL = parseInt(process.env.TDE_KEY_ROTATION_INTERVAL || '90', 10);

/**
 * Generate a new TDE master key
 * @returns {string} Hex-encoded 32-byte key
 */
export const generateTDEKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify TDE master key is configured
 * @returns {boolean}
 */
export const isTDEConfigured = () => {
  return TDE_MASTER_KEY !== null && TDE_MASTER_KEY.length === 64;
};

/**
 * Initialize TDE at database level
 * Creates encryption keys table and enables pgcrypto functions
 * @returns {Promise<Object>} Result object with success status
 */
export const initializeTDE = async () => {
  const client = await pool.connect();
  try {
    // Check if pgcrypto extension is available
    const extensionCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      );
    `);

    if (!extensionCheck.rows[0].exists) {
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        console.log('✅ pgcrypto extension enabled for TDE');
      } catch (err) {
        console.error('❌ Failed to enable pgcrypto extension:', err.message);
        return {
          success: false,
          error: `Failed to enable pgcrypto: ${err.message}`
        };
      }
    }

    // Create TDE keys management table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tde_keys (
        id SERIAL PRIMARY KEY,
        key_id VARCHAR(100) UNIQUE NOT NULL,
        key_type VARCHAR(50) NOT NULL CHECK (key_type IN ('master', 'table', 'column')),
        encrypted_key TEXT NOT NULL,
        key_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rotated_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB
      );
    `);

    // Create index for active keys
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tde_keys_active 
      ON tde_keys(is_active, key_type) 
      WHERE is_active = true;
    `);

    // Create TDE configuration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tde_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
      );
    `);

    // Initialize default configuration
    await client.query(`
      INSERT INTO tde_config (config_key, config_value, description)
      VALUES 
        ('tde_enabled', 'true', 'TDE enabled status'),
        ('key_rotation_interval_days', $1, 'Key rotation interval in days'),
        ('encryption_algorithm', 'aes-256-gcm', 'Encryption algorithm used'),
        ('wal_encryption_enabled', 'false', 'WAL encryption status')
      ON CONFLICT (config_key) DO NOTHING;
    `, [KEY_ROTATION_INTERVAL.toString()]);

    // Create TDE audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tde_audit_log (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        key_id VARCHAR(100),
        table_name VARCHAR(255),
        column_name VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        performed_by VARCHAR(255),
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details JSONB
      );
    `);

    // Create index for audit log
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tde_audit_log_performed_at 
      ON tde_audit_log(performed_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tde_audit_log_event_type 
      ON tde_audit_log(event_type);
    `);

    console.log('✅ TDE initialization completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ TDE initialization failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

/**
 * Store encrypted TDE key in database
 * @param {string} keyId - Unique identifier for the key
 * @param {string} keyType - Type of key (master, table, column)
 * @param {string} encryptedKey - Encrypted key data
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 */
export const storeTDEKey = async (keyId, keyType, encryptedKey, metadata = {}) => {
  if (!isTDEConfigured()) {
    throw new Error('TDE master key not configured. Set TDE_MASTER_KEY environment variable.');
  }

  const client = await pool.connect();
  try {
    // Get current max version for this key_id
    const versionResult = await client.query(`
      SELECT COALESCE(MAX(key_version), 0) as max_version
      FROM tde_keys
      WHERE key_id = $1;
    `, [keyId]);

    const newVersion = (versionResult.rows[0].max_version || 0) + 1;

    // Deactivate old versions
    await client.query(`
      UPDATE tde_keys
      SET is_active = false
      WHERE key_id = $1 AND is_active = true;
    `, [keyId]);

    // Insert new key version
    await client.query(`
      INSERT INTO tde_keys (key_id, key_type, encrypted_key, key_version, metadata)
      VALUES ($1, $2, $3, $4, $5);
    `, [keyId, keyType, encryptedKey, newVersion, JSON.stringify(metadata)]);

    // Log the action
    await client.query(`
      INSERT INTO tde_audit_log (event_type, key_id, action, details)
      VALUES ('key_rotation', $1, 'store', $2);
    `, [keyId, JSON.stringify({ key_type: keyType, version: newVersion })]);

    return { success: true, version: newVersion };
  } catch (error) {
    console.error('❌ Failed to store TDE key:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get active TDE key for a given key ID
 * @param {string} keyId - Key identifier
 * @returns {Promise<Object|null>} Key object or null
 */
export const getActiveTDEKey = async (keyId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT key_id, key_type, encrypted_key, key_version, metadata
      FROM tde_keys
      WHERE key_id = $1 AND is_active = true
      ORDER BY key_version DESC
      LIMIT 1;
    `, [keyId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Failed to get TDE key:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Rotate TDE key for a specific table or column
 * @param {string} keyId - Key identifier to rotate
 * @param {string} newEncryptedKey - New encrypted key
 * @returns {Promise<Object>}
 */
export const rotateTDEKey = async (keyId, newEncryptedKey) => {
  const client = await pool.connect();
  try {
    // Get current key info
    const currentKey = await getActiveTDEKey(keyId);
    if (!currentKey) {
      throw new Error(`Key ${keyId} not found`);
    }

    // Store new key version
    const result = await storeTDEKey(keyId, currentKey.key_type, newEncryptedKey, currentKey.metadata);

    // Update rotation timestamp
    await client.query(`
      UPDATE tde_keys
      SET rotated_at = CURRENT_TIMESTAMP
      WHERE key_id = $1 AND key_version = $2;
    `, [keyId, result.version]);

    // Log rotation
    await client.query(`
      INSERT INTO tde_audit_log (event_type, key_id, action, details)
      VALUES ('key_rotation', $1, 'rotate', $2);
    `, [keyId, JSON.stringify({ 
      old_version: currentKey.key_version, 
      new_version: result.version 
    })]);

    console.log(`✅ TDE key ${keyId} rotated successfully (v${currentKey.key_version} -> v${result.version})`);
    return { success: true, oldVersion: currentKey.key_version, newVersion: result.version };
  } catch (error) {
    console.error('❌ Failed to rotate TDE key:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Enable TDE for a specific table
 * @param {string} tableName - Name of the table
 * @param {Array<string>} columns - Array of column names to encrypt
 * @returns {Promise<Object>}
 */
export const enableTableTDE = async (tableName, columns = []) => {
  const client = await pool.connect();
  try {
    if (!isTDEConfigured()) {
      throw new Error('TDE master key not configured');
    }

    // Generate table-specific encryption key
    const tableKey = generateTDEKey();
    const keyId = `table_${tableName}`;

    // Encrypt the table key with master key (in production, use proper KMS)
    // For now, we'll store it encrypted using pgcrypto
    const encryptedTableKey = await client.query(`
      SELECT pgp_sym_encrypt($1, $2) as encrypted_key;
    `, [tableKey, TDE_MASTER_KEY]);

    // Store the encrypted key
    await storeTDEKey(keyId, 'table', encryptedTableKey.rows[0].encrypted_key, {
      table_name: tableName,
      columns: columns
    });

    // Log the action
    await client.query(`
      INSERT INTO tde_audit_log (event_type, key_id, table_name, action, details)
      VALUES ('table_encryption', $1, $2, 'enable', $3);
    `, [keyId, tableName, JSON.stringify({ columns })]);

    console.log(`✅ TDE enabled for table: ${tableName}`);
    return { success: true, keyId, tableName, columns };
  } catch (error) {
    console.error(`❌ Failed to enable TDE for table ${tableName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get TDE status and configuration
 * @returns {Promise<Object>}
 */
export const getTDEStatus = async () => {
  const client = await pool.connect();
  try {
    // Get configuration
    const configResult = await client.query(`
      SELECT config_key, config_value
      FROM tde_config;
    `);

    const config = {};
    configResult.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    // Get key statistics
    const keyStats = await client.query(`
      SELECT 
        key_type,
        COUNT(*) as total_keys,
        COUNT(*) FILTER (WHERE is_active = true) as active_keys,
        MAX(key_version) as max_version
      FROM tde_keys
      GROUP BY key_type;
    `);

    // Get tables with TDE enabled
    const tablesWithTDE = await client.query(`
      SELECT DISTINCT 
        (metadata->>'table_name') as table_name,
        key_id,
        key_version
      FROM tde_keys
      WHERE key_type = 'table' AND is_active = true;
    `);

    // Get recent audit events
    const recentEvents = await client.query(`
      SELECT event_type, action, performed_at
      FROM tde_audit_log
      ORDER BY performed_at DESC
      LIMIT 10;
    `);

    return {
      success: true,
      configured: isTDEConfigured(),
      config,
      keyStatistics: keyStats.rows,
      tablesWithTDE: tablesWithTDE.rows,
      recentEvents: recentEvents.rows
    };
  } catch (error) {
    console.error('❌ Failed to get TDE status:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

/**
 * Encrypt data at database level using pgcrypto
 * @param {string} plaintext - Data to encrypt
 * @param {string} keyId - Key identifier (optional, uses master key if not provided)
 * @returns {Promise<string>} Encrypted data
 */
export const encryptAtDatabaseLevel = async (plaintext, keyId = null) => {
  if (!isTDEConfigured()) {
    throw new Error('TDE master key not configured');
  }

  const client = await pool.connect();
  try {
    let encryptionKey = TDE_MASTER_KEY;

    // If keyId provided, use table-specific key
    if (keyId) {
      const keyData = await getActiveTDEKey(keyId);
      if (keyData) {
        // Decrypt the table key using master key
        const decryptedKeyResult = await client.query(`
          SELECT pgp_sym_decrypt($1::bytea, $2) as decrypted_key;
        `, [keyData.encrypted_key, TDE_MASTER_KEY]);
        encryptionKey = decryptedKeyResult.rows[0].decrypted_key;
      }
    }

    // Encrypt using pgcrypto
    const result = await client.query(`
      SELECT pgp_sym_encrypt($1, $2) as encrypted_data;
    `, [plaintext, encryptionKey]);

    return result.rows[0].encrypted_data;
  } catch (error) {
    console.error('❌ Database-level encryption failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Decrypt data at database level using pgcrypto
 * @param {string} encryptedData - Encrypted data
 * @param {string} keyId - Key identifier (optional, uses master key if not provided)
 * @returns {Promise<string>} Decrypted data
 */
export const decryptAtDatabaseLevel = async (encryptedData, keyId = null) => {
  if (!isTDEConfigured()) {
    throw new Error('TDE master key not configured');
  }

  const client = await pool.connect();
  try {
    let decryptionKey = TDE_MASTER_KEY;

    // If keyId provided, use table-specific key
    if (keyId) {
      const keyData = await getActiveTDEKey(keyId);
      if (keyData) {
        // Decrypt the table key using master key
        const decryptedKeyResult = await client.query(`
          SELECT pgp_sym_decrypt($1::bytea, $2) as decrypted_key;
        `, [keyData.encrypted_key, TDE_MASTER_KEY]);
        decryptionKey = decryptedKeyResult.rows[0].decrypted_key;
      }
    }

    // Decrypt using pgcrypto
    const result = await client.query(`
      SELECT pgp_sym_decrypt($1::bytea, $2) as decrypted_data;
    `, [encryptedData, decryptionKey]);

    return result.rows[0].decrypted_data;
  } catch (error) {
    console.error('❌ Database-level decryption failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if keys need rotation
 * @returns {Promise<Array>} List of keys that need rotation
 */
export const checkKeyRotation = async () => {
  const client = await pool.connect();
  try {
    const keysNeedingRotation = await client.query(`
      SELECT key_id, key_type, key_version, created_at, rotated_at
      FROM tde_keys
      WHERE is_active = true
        AND (
          rotated_at IS NULL 
          OR rotated_at < CURRENT_TIMESTAMP - INTERVAL '${KEY_ROTATION_INTERVAL} days'
        )
      ORDER BY created_at ASC;
    `);

    return keysNeedingRotation.rows;
  } catch (error) {
    console.error('❌ Failed to check key rotation:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verify TDE is working correctly
 * @returns {Promise<Object>}
 */
export const verifyTDE = async () => {
  const client = await pool.connect();
  try {
    if (!isTDEConfigured()) {
      return {
        success: false,
        error: 'TDE master key not configured'
      };
    }

    // Test encryption/decryption
    const testData = 'TDE_VERIFICATION_TEST_' + Date.now();
    
    const encrypted = await encryptAtDatabaseLevel(testData);
    const decrypted = await decryptAtDatabaseLevel(encrypted);

    const encryptionWorks = decrypted === testData;

    // Check pgcrypto extension
    const pgcryptoCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      );
    `);

    // Check TDE tables exist
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('tde_keys', 'tde_config', 'tde_audit_log');
    `);

    return {
      success: encryptionWorks && pgcryptoCheck.rows[0].exists && tablesCheck.rows.length === 3,
      pgcryptoEnabled: pgcryptoCheck.rows[0].exists,
      tablesExist: tablesCheck.rows.length === 3,
      encryptionTest: encryptionWorks,
      masterKeyConfigured: isTDEConfigured()
    };
  } catch (error) {
    console.error('❌ TDE verification failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

export default {
  initializeTDE,
  storeTDEKey,
  getActiveTDEKey,
  rotateTDEKey,
  enableTableTDE,
  getTDEStatus,
  encryptAtDatabaseLevel,
  decryptAtDatabaseLevel,
  checkKeyRotation,
  verifyTDE,
  generateTDEKey,
  isTDEConfigured
};
