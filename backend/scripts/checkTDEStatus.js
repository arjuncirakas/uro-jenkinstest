/**
 * Check TDE Status Script
 * 
 * This script displays the current status of TDE configuration.
 * 
 * Usage:
 *   node scripts/checkTDEStatus.js
 */

import dotenv from 'dotenv';
import { getTDEStatus, verifyTDE, isTDEConfigured } from '../services/tdeService.js';

dotenv.config();

const displayMasterKeyStatus = () => {
  console.log('\n📋 Master Key Configuration:');
  if (isTDEConfigured()) {
    const key = process.env.TDE_MASTER_KEY;
    console.log('   ✅ TDE Master Key: Configured');
    console.log('   📏 Key Length:', key.length, 'characters');
    console.log('   🔑 Key Preview:', key.substring(0, 8) + '...' + key.substring(56));
  } else {
    console.log('   ❌ TDE Master Key: NOT CONFIGURED');
    console.log('   ⚠️  Set TDE_MASTER_KEY in .env file');
  }
};

const displayVerificationResults = (verification) => {
  console.log('\n📋 TDE Verification:');
  
  if (verification.success) {
    console.log('   ✅ TDE is properly configured and working');
    console.log('   ✅ pgcrypto extension: Enabled');
    console.log('   ✅ TDE tables: Created');
    console.log('   ✅ Encryption test: Passed');
    return;
  }
  
  console.log('   ❌ TDE verification failed');
  if (verification.error) {
    console.log('   ⚠️  Error:', verification.error);
  }
  if (!verification.pgcryptoEnabled) {
    console.log('   ❌ pgcrypto extension: Not enabled');
  }
  if (!verification.tablesExist) {
    console.log('   ❌ TDE tables: Missing');
  }
  if (!verification.encryptionTest) {
    console.log('   ❌ Encryption test: Failed');
  }
};

const displayStatusDetails = (status) => {
  console.log('\n📋 TDE Status Details:');
  
  if (!status.success) {
    console.log('   ❌ Failed to get TDE status:', status.error);
    return;
  }
  
  console.log('\n📊 Configuration:');
  Object.entries(status.config || {}).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}`);
  });

  if (status.keyStatistics && status.keyStatistics.length > 0) {
    console.log('\n📊 Key Statistics:');
    status.keyStatistics.forEach(stat => {
      console.log(`   - ${stat.key_type}:`);
      console.log(`     * Total keys: ${stat.total_keys}`);
      console.log(`     * Active keys: ${stat.active_keys}`);
      console.log(`     * Latest version: v${stat.max_version}`);
    });
  } else {
    console.log('\n📊 Key Statistics: No keys configured yet');
  }

  if (status.tablesWithTDE && status.tablesWithTDE.length > 0) {
    console.log('\n📊 Tables with TDE Enabled:');
    status.tablesWithTDE.forEach(table => {
      console.log(`   - ${table.table_name}`);
      console.log(`     * Key ID: ${table.key_id}`);
      console.log(`     * Key Version: v${table.key_version}`);
    });
  } else {
    console.log('\n📊 Tables with TDE: None');
    console.log('   💡 Enable TDE for tables using: node scripts/enableTableTDE.js <table_name>');
  }

  if (status.recentEvents && status.recentEvents.length > 0) {
    console.log('\n📊 Recent TDE Events:');
    status.recentEvents.slice(0, 5).forEach(event => {
      const date = new Date(event.performed_at).toLocaleString();
      console.log(`   - ${date}: ${event.event_type} / ${event.action}`);
    });
  }
};

const main = async () => {
  console.log('🔐 TDE Status Check');
  console.log('=' .repeat(60));

  displayMasterKeyStatus();
  
  const verification = await verifyTDE();
  displayVerificationResults(verification);
  
  const status = await getTDEStatus();
  displayStatusDetails(status);

  console.log('\n' + '=' .repeat(60));
};

main();
