/**
 * Test script to verify status filtering SQL queries
 * Run with: node backend/test-status-filter.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testStatusFilter() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Status Filter SQL Queries\n');
    console.log('='.repeat(60));
    
    // Test 1: Active users
    console.log('\n📋 Test 1: ACTIVE users (is_verified = true AND is_active = true)');
    let query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = true AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    let result = await client.query(query);
    console.log(`Found ${result.rows.length} ACTIVE users:`);
    result.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.first_name} ${user.last_name} - verified: ${user.is_verified}, active: ${user.is_active}`);
    });
    
    // Test 2: Pending users
    console.log('\n📋 Test 2: PENDING users (is_verified = false)');
    query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = false
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} PENDING users:`);
    result.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.first_name} ${user.last_name} - verified: ${user.is_verified}, active: ${user.is_active}`);
    });
    
    // Test 3: Inactive users
    console.log('\n📋 Test 3: INACTIVE users (is_verified = true AND is_active = false)');
    query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = true AND is_active = false
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} INACTIVE users:`);
    result.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.first_name} ${user.last_name} - verified: ${user.is_verified}, active: ${user.is_active}`);
    });
    
    // Test 4: Combined filter - Active + Role
    console.log('\n📋 Test 4: ACTIVE UROLOGIST users');
    query = `
      SELECT id, email, first_name, last_name, role, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND role = 'urologist' AND is_verified = true AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} ACTIVE UROLOGIST users:`);
    result.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.first_name} ${user.last_name} (${user.role}) - verified: ${user.is_verified}, active: ${user.is_active}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All SQL tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testStatusFilter();






















