/**
 * Interactive TDE Setup Script
 * 
 * This script guides you through setting up TDE on your server step-by-step.
 * 
 * Usage:
 *   node scripts/setupTDEInteractive.js
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeTDE, verifyTDE, getTDEStatus } from '../services/tdeService.js';
import pool from '../config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Helper to read .env file
const readEnvFile = () => {
  if (!existsSync(envPath)) {
    return {};
  }
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return env;
};

// Helper to write .env file
const writeEnvFile = (env) => {
  const lines = [];
  Object.entries(env).forEach(([key, value]) => {
    lines.push(`${key}=${value}`);
  });
  writeFileSync(envPath, lines.join('\n') + '\n');
};

// Helper to check database connection
const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
};

// Helper to check pgcrypto extension
const checkPgcrypto = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      );
    `);
    client.release();
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
};

const main = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 TDE (Transparent Data Encryption) Server Setup');
  console.log('='.repeat(70));
  console.log('\nThis script will help you set up TDE on your server step-by-step.\n');

  // Step 1: Check database connection
  console.log('📋 Step 1: Checking database connection...');
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error('❌ Cannot connect to database!');
    console.error('   Please check:');
    console.error('   - PostgreSQL is running');
    console.error('   - Database credentials in .env file are correct');
    console.error('   - Database exists');
    process.exit(1);
  }
  console.log('✅ Database connection successful\n');

  // Step 2: Check/Set TDE Master Key
  console.log('📋 Step 2: TDE Master Key Configuration');
  const env = readEnvFile();
  let masterKey = process.env.TDE_MASTER_KEY || env.TDE_MASTER_KEY;

  if (!masterKey) {
    console.log('⚠️  TDE_MASTER_KEY not found in .env file');
    console.log('\n📝 Generating a new TDE master key...');
    masterKey = crypto.randomBytes(32).toString('hex');
    console.log('✅ Generated new master key');
    console.log('\n🔑 Your TDE Master Key:');
    console.log('   ' + masterKey);
    console.log('\n⚠️  IMPORTANT: Save this key securely!');
    console.log('   - Store in a password manager');
    console.log('   - Store in a secure key management system (KMS/Vault)');
    console.log('   - Keep a secure backup');
    console.log('\n💾 Adding to .env file...');
    
    env.TDE_MASTER_KEY = masterKey;
    if (!env.TDE_KEY_ROTATION_INTERVAL) {
      env.TDE_KEY_ROTATION_INTERVAL = '90';
    }
    writeEnvFile(env);
    console.log('✅ Added TDE_MASTER_KEY to .env file');
    
    // Reload environment
    process.env.TDE_MASTER_KEY = masterKey;
  } else {
    console.log('✅ TDE_MASTER_KEY found in environment');
    if (masterKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(masterKey)) {
      console.error('❌ TDE_MASTER_KEY is invalid!');
      console.error('   Must be 64 hex characters (32 bytes)');
      console.error('   Current length:', masterKey.length);
      process.exit(1);
    }
    console.log('   Key length:', masterKey.length, 'characters');
    console.log('   Key preview:', masterKey.substring(0, 8) + '...' + masterKey.substring(56));
  }
  console.log('');

  // Step 3: Check pgcrypto extension
  console.log('📋 Step 3: Checking pgcrypto extension...');
  const pgcryptoExists = await checkPgcrypto();
  if (!pgcryptoExists) {
    console.log('⚠️  pgcrypto extension not found');
    console.log('📝 Attempting to enable pgcrypto extension...');
    
    try {
      const client = await pool.connect();
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
      client.release();
      console.log('✅ pgcrypto extension enabled successfully');
    } catch (error) {
      console.error('❌ Failed to enable pgcrypto extension!');
      console.error('   Error:', error.message);
      console.error('\n💡 Solutions:');
      console.error('   1. Ensure PostgreSQL user has CREATE EXTENSION privilege');
      console.error('   2. Run as superuser: psql -U postgres -d your_database -c "CREATE EXTENSION pgcrypto;"');
      console.error('   3. Check PostgreSQL version (pgcrypto requires PostgreSQL 9.1+)');
      process.exit(1);
    }
  } else {
    console.log('✅ pgcrypto extension is already enabled');
  }
  console.log('');

  // Step 4: Initialize TDE
  console.log('📋 Step 4: Initializing TDE...');
  try {
    const initResult = await initializeTDE();
    if (!initResult.success) {
      console.error('❌ TDE initialization failed:', initResult.error);
      process.exit(1);
    }
    console.log('✅ TDE initialized successfully');
    console.log('   - Created tde_keys table');
    console.log('   - Created tde_config table');
    console.log('   - Created tde_audit_log table');
  } catch (error) {
    console.error('❌ TDE initialization failed:', error.message);
    process.exit(1);
  }
  console.log('');

  // Step 5: Verify TDE
  console.log('📋 Step 5: Verifying TDE setup...');
  const verification = await verifyTDE();
  if (!verification.success) {
    console.error('❌ TDE verification failed!');
    if (!verification.pgcryptoEnabled) {
      console.error('   - pgcrypto extension: Not enabled');
    }
    if (!verification.tablesExist) {
      console.error('   - TDE tables: Missing');
    }
    if (!verification.encryptionTest) {
      console.error('   - Encryption test: Failed');
    }
    process.exit(1);
  }
  console.log('✅ TDE verification passed');
  console.log('   - pgcrypto extension: Enabled');
  console.log('   - TDE tables: Created');
  console.log('   - Encryption test: Passed');
  console.log('');

  // Step 6: Show status
  console.log('📋 Step 6: TDE Status Summary');
  const status = await getTDEStatus();
  if (status.success) {
    console.log('\n📊 Configuration:');
    console.log('   - TDE Enabled:', status.config.tde_enabled || 'true');
    console.log('   - Key Rotation Interval:', status.config.key_rotation_interval_days || '90', 'days');
    console.log('   - Encryption Algorithm:', status.config.encryption_algorithm || 'aes-256-gcm');
    
    if (status.tablesWithTDE && status.tablesWithTDE.length > 0) {
      console.log('\n📊 Tables with TDE Enabled:');
      status.tablesWithTDE.forEach(table => {
        console.log(`   - ${table.table_name} (key: ${table.key_id}, v${table.key_version})`);
      });
    } else {
      console.log('\n📊 No tables have TDE enabled yet');
    }
  }
  console.log('');

  // Final summary
  console.log('='.repeat(70));
  console.log('✅ TDE Setup Completed Successfully!');
  console.log('='.repeat(70));
  console.log('\n📝 Next Steps:');
  console.log('   1. Enable TDE for sensitive tables:');
  console.log('      npm run tde:enable-table patients');
  console.log('      npm run tde:enable-table users email,phone');
  console.log('\n   2. Check TDE status anytime:');
  console.log('      npm run tde:status');
  console.log('\n   3. Set up automated key rotation (recommended every 90 days):');
  console.log('      npm run tde:rotate-keys');
  console.log('\n   4. Store TDE_MASTER_KEY securely:');
  console.log('      - Use a Key Management Service (KMS)');
  console.log('      - Use HashiCorp Vault');
  console.log('      - Use AWS Secrets Manager / Azure Key Vault');
  console.log('\n🔒 TDE is now active and protecting your database!');
  console.log('');
};

main().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});
