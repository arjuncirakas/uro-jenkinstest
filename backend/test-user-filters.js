/**
 * Test script to verify user filtering works correctly
 * Run with: node backend/test-user-filters.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testUserFilters() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing User Filters\n');
    console.log('='.repeat(60));
    
    // Test 1: All users (no filter)
    console.log('\n📋 Test 1: Get all users (no status filter)');
    let query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin'
      ORDER BY created_at DESC
      LIMIT 5
    `;
    let result = await client.query(query);
    console.log(`Found ${result.rows.length} users`);
    result.rows.forEach(user => {
      const status = user.is_verified ? (user.is_active ? 'active' : 'inactive') : 'pending';
      console.log(`  - ${user.first_name} ${user.last_name}: ${status} (verified: ${user.is_verified}, active: ${user.is_active})`);
    });
    
    // Test 2: Active users only
    console.log('\n📋 Test 2: Get ACTIVE users only');
    query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = true AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} ACTIVE users`);
    result.rows.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name}: verified=${user.is_verified}, active=${user.is_active}`);
    });
    
    // Test 3: Pending users only
    console.log('\n📋 Test 3: Get PENDING users only');
    query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = false
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} PENDING users`);
    result.rows.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name}: verified=${user.is_verified}, active=${user.is_active}`);
    });
    
    // Test 4: Inactive users only
    console.log('\n📋 Test 4: Get INACTIVE users only');
    query = `
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users 
      WHERE role != 'superadmin' AND is_verified = true AND is_active = false
      ORDER BY created_at DESC
      LIMIT 10
    `;
    result = await client.query(query);
    console.log(`Found ${result.rows.length} INACTIVE users`);
    result.rows.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name}: verified=${user.is_verified}, active=${user.is_active}`);
    });
    
    // Test 5: Count by status
    console.log('\n📋 Test 5: Count users by status');
    const countQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_verified = false) as pending_count,
        COUNT(*) FILTER (WHERE is_verified = true AND is_active = true) as active_count,
        COUNT(*) FILTER (WHERE is_verified = true AND is_active = false) as inactive_count,
        COUNT(*) as total_count
      FROM users 
      WHERE role != 'superadmin'
    `;
    const countResult = await client.query(countQuery);
    const counts = countResult.rows[0];
    console.log(`  Pending: ${counts.pending_count}`);
    console.log(`  Active: ${counts.active_count}`);
    console.log(`  Inactive: ${counts.inactive_count}`);
    console.log(`  Total: ${counts.total_count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testUserFilters();
























