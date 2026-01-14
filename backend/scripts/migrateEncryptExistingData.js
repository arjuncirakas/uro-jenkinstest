/**
 * Migration script to encrypt existing unencrypted patient and user data
 * 
 * IMPORTANT: 
 * - Backup your database before running this script
 * - Run in dry-run mode first to preview changes
 * - This script is idempotent - safe to run multiple times
 * 
 * Usage:
 *   node backend/scripts/migrateEncryptExistingData.js [--dry-run] [--backup-check]
 */

import pool from '../config/database.js';
import { encrypt, createSearchableHash, createPartialHash } from '../services/encryptionService.js';
import { PATIENT_ENCRYPTED_FIELDS, USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_BACKUP_CHECK = process.argv.includes('--skip-backup-check');

// Helper to detect if data is already encrypted
// Encrypted data is hex string, typically longer than original and starts with hex chars
const isEncrypted = (value) => {
  if (!value || value === null || value === undefined || value === '') {
    return false;
  }
  
  const str = String(value);
  // Encrypted data is hex string, at least 64 chars (IV + auth tag)
  // Check if it looks like hex and is long enough
  return /^[0-9a-f]{64,}$/i.test(str) && str.length > 64;
};

// Helper function to add field encryption update
const addFieldEncryption = (updates, values, field, value, paramCount) => {
  if (!value || isEncrypted(value)) {
    return paramCount;
  }
  const newParamCount = paramCount + 1;
  updates.push(`${field} = $${newParamCount}`);
  values.push(encrypt(String(value)));
  return newParamCount;
};

// Helper function to add hash updates for patient
const addPatientHashes = (updates, values, record, paramCount) => {
  let currentParamCount = paramCount;
  if (record.phone && !isEncrypted(record.phone)) {
    currentParamCount++;
    updates.push(`phone_hash = $${currentParamCount}`);
    values.push(createSearchableHash(record.phone));
    
    currentParamCount++;
    updates.push(`phone_prefix = $${currentParamCount}`);
    values.push(createPartialHash(record.phone, 10));
  }
  
  if (record.email && !isEncrypted(record.email)) {
    currentParamCount++;
    updates.push(`email_hash = $${currentParamCount}`);
    values.push(createSearchableHash(record.email));
  }
  return currentParamCount;
};

// Helper function to add hash updates for user
const addUserHashes = (updates, values, record, paramCount) => {
  let currentParamCount = paramCount;
  if (record.email && !isEncrypted(record.email)) {
    currentParamCount++;
    updates.push(`email_hash = $${currentParamCount}`);
    values.push(createSearchableHash(record.email));
  }
  
  if (record.phone && !isEncrypted(record.phone)) {
    currentParamCount++;
    updates.push(`phone_hash = $${currentParamCount}`);
    values.push(createSearchableHash(record.phone));
  }
  return currentParamCount;
};

// Helper function to build encryption updates for a record
const buildEncryptionUpdates = (record, encryptedFields, isPatient = false) => {
  const updates = [];
  const values = [];
  let paramCount = 0;
  
  // Check each encrypted field
  for (const field of encryptedFields) {
    paramCount = addFieldEncryption(updates, values, field, record[field], paramCount);
  }
  
  // Update phone/email hashes
  if (isPatient) {
    paramCount = addPatientHashes(updates, values, record, paramCount);
  } else {
    paramCount = addUserHashes(updates, values, record, paramCount);
  }
  
  return { updates, values, paramCount };
};

// Migrate patients
const migratePatients = async (client) => {
  console.log('\n📋 Migrating patients...');
  
  // Get all patients
  const result = await client.query(`
    SELECT id, phone, email, address, medical_history, current_medications, 
           allergies, emergency_contact_name, emergency_contact_phone
    FROM patients
  `);
  
  console.log(`Found ${result.rows.length} patients to check`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const patient of result.rows) {
    try {
      const { updates, values, paramCount } = buildEncryptionUpdates(patient, PATIENT_ENCRYPTED_FIELDS, true);
      
      if (updates.length > 0) {
        values.push(patient.id);
        const finalParamCount = paramCount + 1;
        
        if (!DRY_RUN) {
          await client.query(
            `UPDATE patients SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${finalParamCount}`,
            values
          );
        }
        
        updated++;
        console.log(`✅ Patient ${patient.id}: Encrypted ${updates.length} field(s)`);
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error migrating patient ${patient.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Patients migration summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already encrypted): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  
  return { updated, skipped, errors };
};

// Migrate users
const migrateUsers = async (client) => {
  console.log('\n👥 Migrating users...');
  
  // Get all users
  const result = await client.query(`
    SELECT id, email, phone
    FROM users
  `);
  
  console.log(`Found ${result.rows.length} users to check`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const user of result.rows) {
    try {
      const { updates, values, paramCount } = buildEncryptionUpdates(user, USER_ENCRYPTED_FIELDS, false);
      
      if (updates.length > 0) {
        values.push(user.id);
        const finalParamCount = paramCount + 1;
        
        if (!DRY_RUN) {
          await client.query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${finalParamCount}`,
            values
          );
        }
        
        updated++;
        console.log(`✅ User ${user.id}: Encrypted ${updates.length} field(s)`);
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error migrating user ${user.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Users migration summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already encrypted): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  
  return { updated, skipped, errors };
};

// Main migration function
const runMigration = async () => {
  console.log('🔐 Column-Level Encryption Migration Script');
  console.log('==========================================\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  if (!SKIP_BACKUP_CHECK) {
    console.log('⚠️  IMPORTANT: Ensure you have a database backup before proceeding!');
    console.log('   Run with --skip-backup-check to skip this warning\n');
  }
  
  // Check encryption key
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY not set in environment variables!');
    console.error('   Set ENCRYPTION_KEY in .env file before running migration.');
    process.exit(1);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('✅ Database connection established\n');
    
    // Migrate patients
    const patientStats = await migratePatients(client);
    
    // Migrate users
    const userStats = await migrateUsers(client);
    
    if (!DRY_RUN) {
      await client.query('COMMIT');
      console.log('\n✅ Migration completed successfully!');
    } else {
      await client.query('ROLLBACK');
      console.log('\n✅ Dry run completed - no changes made');
    }
    
    // Summary
    console.log('\n📊 Overall Summary:');
    console.log(`   Patients updated: ${patientStats.updated}`);
    console.log(`   Users updated: ${userStats.updated}`);
    console.log(`   Total errors: ${patientStats.errors + userStats.errors}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

