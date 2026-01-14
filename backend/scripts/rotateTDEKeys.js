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
    let keysToRotate = [];

    if (specificKeyId) {
      // Rotate specific key
      const key = await getActiveTDEKey(specificKeyId);
      if (!key) {
        console.error(`\n❌ Key '${specificKeyId}' not found`);
        process.exit(1);
      }
      keysToRotate = [key];
      console.log(`\n📋 Rotating specific key: ${specificKeyId}`);
    } else {
      // Check which keys need rotation
      console.log('\n📋 Checking keys for rotation...');
      keysToRotate = await checkKeyRotation();
      
      if (keysToRotate.length === 0) {
        console.log('✅ No keys need rotation at this time');
        if (!force) {
          console.log('   Use --force to rotate all keys anyway');
          process.exit(0);
        } else {
          console.log('   --force flag set, rotating all active keys...');
          const allKeys = await client.query(`
            SELECT key_id, key_type, key_version
            FROM tde_keys
            WHERE is_active = true;
          `);
          keysToRotate = allKeys.rows;
        }
      } else {
        console.log(`\n📊 Found ${keysToRotate.length} key(s) needing rotation:`);
        keysToRotate.forEach(key => {
          const daysSinceRotation = key.rotated_at 
            ? Math.floor((new Date() - new Date(key.rotated_at)) / (1000 * 60 * 60 * 24))
            : 'never';
          console.log(`   - ${key.key_id} (${key.key_type}, v${key.key_version}, last rotated: ${daysSinceRotation} days ago)`);
        });
      }
    }

    if (keysToRotate.length === 0) {
      console.log('\n✅ No keys to rotate');
      process.exit(0);
    }

    console.log(`\n🔄 Rotating ${keysToRotate.length} key(s)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const key of keysToRotate) {
      try {
        console.log(`📋 Rotating key: ${key.key_id}...`);
        
        // Generate new key
        const newKey = generateTDEKey();
        
        // Encrypt new key with master key
        const encryptedKeyResult = await client.query(`
          SELECT pgp_sym_encrypt($1, $2) as encrypted_key;
        `, [newKey, process.env.TDE_MASTER_KEY]);

        // Rotate the key
        const result = await rotateTDEKey(key.key_id, encryptedKeyResult.rows[0].encrypted_key);
        
        if (result.success) {
          console.log(`   ✅ Rotated successfully (v${result.oldVersion} -> v${result.newVersion})`);
          successCount++;
        } else {
          console.log(`   ❌ Rotation failed`);
          failCount++;
        }
      } catch (error) {
        console.error(`   ❌ Failed to rotate ${key.key_id}:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📊 Rotation Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📋 Total: ${keysToRotate.length}`);

    if (failCount > 0) {
      console.log('\n⚠️  Some keys failed to rotate. Check logs for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All keys rotated successfully!');
    }

  } catch (error) {
    console.error('\n❌ Key rotation failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
};

main();
