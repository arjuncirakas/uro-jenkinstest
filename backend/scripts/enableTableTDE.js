/**
 * Enable TDE for Specific Tables
 * 
 * This script enables Transparent Data Encryption for specific database tables.
 * 
 * Usage:
 *   node scripts/enableTableTDE.js <table_name> [column1,column2,...]
 * 
 * Examples:
 *   node scripts/enableTableTDE.js patients
 *   node scripts/enableTableTDE.js users email,phone
 *   node scripts/enableTableTDE.js audit_logs
 */

import dotenv from 'dotenv';
import { enableTableTDE, getTDEStatus, verifyTDE } from '../services/tdeService.js';
import pool from '../config/database.js';

dotenv.config();

const displayUsage = async () => {
  console.log('🔐 Enable TDE for Database Tables');
  console.log('=' .repeat(60));
  console.log('\nUsage:');
  console.log('  node scripts/enableTableTDE.js <table_name> [column1,column2,...]');
  console.log('\nExamples:');
  console.log('  node scripts/enableTableTDE.js patients');
  console.log('  node scripts/enableTableTDE.js users email,phone');
  console.log('  node scripts/enableTableTDE.js audit_logs');
  console.log('\nAvailable tables:');
  
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    tables.rows.forEach((row, index) => {
      if (index % 4 === 0) console.log('');
      process.stdout.write(`  ${row.table_name.padEnd(25)}`);
    });
    console.log('\n');
  } catch (error) {
    console.error('❌ Failed to list tables:', error.message);
  } finally {
    client.release();
  }
  
  process.exit(1);
};

const verifyTableAndColumns = async (tableName, columns) => {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);

    if (!tableCheck.rows[0].exists) {
      console.error(`\n❌ Table '${tableName}' does not exist`);
      process.exit(1);
    }

    if (columns.length > 0) {
      const columnCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = ANY($2::text[]);
      `, [tableName, columns]);

      const foundColumns = columnCheck.rows.map(r => r.column_name);
      const missingColumns = columns.filter(c => !foundColumns.includes(c));

      if (missingColumns.length > 0) {
        console.error(`\n❌ Columns not found: ${missingColumns.join(', ')}`);
        console.error(`   Available columns: ${foundColumns.join(', ')}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Failed to verify table:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

const enableTDEForTable = async (tableName, columns) => {
  console.log('\n📋 Enabling TDE...');
  const result = await enableTableTDE(tableName, columns);
  
  if (!result.success) {
    console.error('❌ Failed to enable TDE');
    process.exit(1);
  }
  
  console.log('✅ TDE enabled successfully for table:', tableName);
  console.log('   Key ID:', result.keyId);
  
  if (columns.length > 0) {
    console.log('   Encrypted columns:', columns.join(', '));
  } else {
    console.log('   Full table encryption enabled');
  }

  const status = await getTDEStatus();
  if (status.success && status.tablesWithTDE) {
    const tableInfo = status.tablesWithTDE.find(t => t.table_name === tableName);
    if (tableInfo) {
      console.log('\n📊 Table TDE Status:');
      console.log('   - Key Version:', tableInfo.key_version);
      console.log('   - Status: Active');
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await displayUsage();
    return;
  }

  const tableName = args[0];
  const columns = args[1] ? args[1].split(',').map(c => c.trim()) : [];

  console.log('🔐 Enable TDE for Table');
  console.log('=' .repeat(60));
  console.log(`\n📋 Table: ${tableName}`);
  if (columns.length > 0) {
    console.log(`📋 Columns: ${columns.join(', ')}`);
  } else {
    console.log('📋 Columns: All columns (full table encryption)');
  }

  const verification = await verifyTDE();
  if (!verification.success) {
    console.error('\n❌ TDE is not properly configured');
    console.error('   Run: node scripts/setupTDE.js first');
    process.exit(1);
  }

  await verifyTableAndColumns(tableName, columns);

  try {
    await enableTDEForTable(tableName, columns);
  } catch (error) {
    console.error('\n❌ Failed to enable TDE:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
};

main();
