/**
 * TDE (Transparent Data Encryption) Setup Script
 * 
 * This script initializes TDE at the database level for PostgreSQL.
 * 
 * Usage:
 *   node scripts/setupTDE.js
 * 
 * Prerequisites:
 *   1. TDE_MASTER_KEY must be set in .env file
 *   2. PostgreSQL must have pgcrypto extension available
 *   3. Database user must have CREATE EXTENSION privileges
 * 
 * Environment Variables:
 *   - TDE_MASTER_KEY: 64-character hex string (32 bytes) for master encryption key
 *   - TDE_KEY_ROTATION_INTERVAL: Days between key rotations (default: 90)
 */

import dotenv from 'dotenv';
import { initializeTDE, verifyTDE, getTDEStatus } from '../services/tdeService.js';

dotenv.config();

const validateMasterKey = () => {
  if (!process.env.TDE_MASTER_KEY) {
    console.error('\n❌ ERROR: TDE_MASTER_KEY not set in environment variables!');
    console.error('\n📝 To generate a TDE master key, run:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('\n💡 Add the generated key to your .env file:');
    console.error('   TDE_MASTER_KEY=<generated_key>');
    console.error('\n⚠️  IMPORTANT: Store this key securely (KMS, Vault, etc.)');
    process.exit(1);
  }

  const masterKey = process.env.TDE_MASTER_KEY;
  if (masterKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(masterKey)) {
    console.error('\n❌ ERROR: TDE_MASTER_KEY must be 64 hex characters (32 bytes)');
    console.error('   Current length:', masterKey.length);
    console.error('\n📝 Generate a new key:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  console.log('\n✅ TDE master key is configured');
  console.log('   Key length:', masterKey.length, 'characters');
  console.log('   Key preview:', masterKey.substring(0, 8) + '...' + masterKey.substring(56));
  return masterKey;
};

const performTDEInitialization = async () => {
  console.log('\n📋 Step 1: Initializing TDE...');
  const initResult = await initializeTDE();
  
  if (!initResult.success) {
    console.error('❌ TDE initialization failed:', initResult.error);
    process.exit(1);
  }

  console.log('✅ TDE initialized successfully');
};

const verifyTDESetup = async () => {
  console.log('\n📋 Step 2: Verifying TDE setup...');
  const verification = await verifyTDE();
  
  if (!verification.success) {
    console.error('❌ TDE verification failed');
    if (verification.error) {
      console.error('   Error:', verification.error);
    }
    if (!verification.pgcryptoEnabled) {
      console.error('   - pgcrypto extension not enabled');
    }
    if (!verification.tablesExist) {
      console.error('   - TDE tables not created');
    }
    if (!verification.encryptionTest) {
      console.error('   - Encryption/decryption test failed');
    }
    process.exit(1);
  }

  console.log('✅ TDE verification passed');
  console.log('   - pgcrypto extension: Enabled');
  console.log('   - TDE tables: Created');
  console.log('   - Encryption test: Passed');
};

const displayStatus = async () => {
  console.log('\n📋 Step 3: TDE Status...');
  const status = await getTDEStatus();
  
  if (!status.success) {
    return;
  }
  
  console.log('\n📊 TDE Configuration:');
  console.log('   - TDE Enabled:', status.config.tde_enabled || 'true');
  console.log('   - Key Rotation Interval:', status.config.key_rotation_interval_days || '90', 'days');
  console.log('   - Encryption Algorithm:', status.config.encryption_algorithm || 'aes-256-gcm');
  
  if (status.keyStatistics && status.keyStatistics.length > 0) {
    console.log('\n📊 Key Statistics:');
    status.keyStatistics.forEach(stat => {
      console.log(`   - ${stat.key_type}: ${stat.active_keys} active keys (v${stat.max_version})`);
    });
  }

  if (status.tablesWithTDE && status.tablesWithTDE.length > 0) {
    console.log('\n📊 Tables with TDE Enabled:');
    status.tablesWithTDE.forEach(table => {
      console.log(`   - ${table.table_name} (key: ${table.key_id}, v${table.key_version})`);
    });
  } else {
    console.log('\n📊 No tables have TDE enabled yet');
    console.log('   Use enableTableTDE() to enable encryption for specific tables');
  }
};

const main = async () => {
  console.log('🔐 TDE (Transparent Data Encryption) Setup Script');
  console.log('=' .repeat(60));

  validateMasterKey();

  try {
    await performTDEInitialization();
    await verifyTDESetup();
    await displayStatus();

    console.log('\n✅ TDE setup completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Enable TDE for specific tables using enableTableTDE()');
    console.log('   2. Set up automated key rotation (recommended every 90 days)');
    console.log('   3. Monitor TDE status regularly using getTDEStatus()');
    console.log('   4. Store TDE_MASTER_KEY securely (KMS, Vault, etc.)');
    console.log('\n🔒 TDE is now active at the database level');

  } catch (error) {
    console.error('\n❌ TDE setup failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
};

// Run the script
main();
