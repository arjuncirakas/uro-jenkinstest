/**
 * TDE Key Rotation Script
 * 
 * This script rotates TDE encryption keys that are due for rotation.
 * 
 * Usage:
 *   node scripts/rotateTDEKeys.js [--force] [--key-id=<key_id>]
 * 
 * Options:
 *   --force: Force rotation even if not due
 *   --key-id=<key_id>: Rotate specific key only
 */

import dotenv from 'dotenv';
import { checkKeyRotation, rotateTDEKey, getActiveTDEKey, generateTDEKey } from '../services/tdeService.js';
import pool from '../config/database.js';

dotenv.config();

const getKeysToRotate = async (client, specificKeyId, force) => {
  if (specificKeyId) {
    const key = await getActiveTDEKey(specificKeyId);
    if (!key) {
      console.error(`\n❌ Key '${specificKeyId}' not found`);
      process.exit(1);
    }
    console.log(`\n📋 Rotating specific key: ${specificKeyId}`);
    return [key];
  }

  console.log('\n📋 Checking keys for rotation...');
  let keysToRotate = await checkKeyRotation();
  
  if (keysToRotate.length === 0) {
    console.log('✅ No keys need rotation at this time');
    if (!force) {
      console.log('   Use --force to rotate all keys anyway');
      process.exit(0);
    }
    console.log('   --force flag set, rotating all active keys...');
    const allKeys = await client.query(`
      SELECT key_id, key_type, key_version
      FROM tde_keys
      WHERE is_active = true;
    `);
    keysToRotate = allKeys.rows;
  } else {
    console.log(`\n📊 Found ${keysToRotate.length} key(s) needing rotation:`);
    keysToRotate.forEach(key => {
      const daysSinceRotation = key.rotated_at 
        ? Math.floor((new Date() - new Date(key.rotated_at)) / (1000 * 60 * 60 * 24))
        : 'never';
      console.log(`   - ${key.key_id} (${key.key_type}, v${key.key_version}, last rotated: ${daysSinceRotation} days ago)`);
    });
  }

  return keysToRotate;
};

const rotateKey = async (client, key) => {
  console.log(`📋 Rotating key: ${key.key_id}...`);
  
  const newKey = generateTDEKey();
  const encryptedKeyResult = await client.query(`
    SELECT pgp_sym_encrypt($1, $2) as encrypted_key;
  `, [newKey, process.env.TDE_MASTER_KEY]);

  const result = await rotateTDEKey(key.key_id, encryptedKeyResult.rows[0].encrypted_key);
  
  if (result.success) {
    console.log(`   ✅ Rotated successfully (v${result.oldVersion} -> v${result.newVersion})`);
    return true;
  }
  
  console.log(`   ❌ Rotation failed`);
  return false;
};

const displayRotationSummary = (successCount, failCount, total) => {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Rotation Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📋 Total: ${total}`);

  if (failCount > 0) {
    console.log('\n⚠️  Some keys failed to rotate. Check logs for details.');
    process.exit(1);
  }
  
  console.log('\n✅ All keys rotated successfully!');
};

const main = async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const keyIdArg = args.find(arg => arg.startsWith('--key-id='));
  const specificKeyId = keyIdArg ? keyIdArg.split('=')[1] : null;

  console.log('🔄 TDE Key Rotation Script');
  console.log('=' .repeat(60));

  if (!process.env.TDE_MASTER_KEY) {
    console.error('\n❌ ERROR: TDE_MASTER_KEY not set in environment variables!');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const keysToRotate = await getKeysToRotate(client, specificKeyId, force);

    if (keysToRotate.length === 0) {
      console.log('\n✅ No keys to rotate');
      process.exit(0);
    }

    console.log(`\n🔄 Rotating ${keysToRotate.length} key(s)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const key of keysToRotate) {
      try {
        const success = await rotateKey(client, key);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`   ❌ Failed to rotate ${key.key_id}:`, error.message);
        failCount++;
      }
    }

    displayRotationSummary(successCount, failCount, keysToRotate.length);

  } catch (error) {
    console.error('\n❌ Key rotation failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
};

main();
