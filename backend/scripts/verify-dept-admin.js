import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const verifyDepartmentAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying department admin user...');
    
    const email = 'departmenthead@yopmail.com';
    
    // Check exact match
    const exactMatch = await client.query(
      'SELECT id, email, role, is_active, is_verified, password_hash IS NOT NULL as has_password FROM users WHERE email = $1',
      [email]
    );
    
    console.log('\n📊 Exact email match:');
    if (exactMatch.rows.length > 0) {
      const user = exactMatch.rows[0];
      console.log('✅ User found!');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Is Active:', user.is_active);
      console.log('   Is Verified:', user.is_verified);
      console.log('   Has Password:', user.has_password);
    } else {
      console.log('❌ User NOT found with exact email:', email);
    }
    
    // Check case-insensitive
    const caseInsensitive = await client.query(
      "SELECT id, email, role, is_active, is_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    
    console.log('\n📊 Case-insensitive match:');
    if (caseInsensitive.rows.length > 0) {
      console.log('✅ Found', caseInsensitive.rows.length, 'user(s) with similar email:');
      caseInsensitive.rows.forEach(user => {
        console.log('   -', user.email, '(role:', user.role + ')');
      });
    } else {
      console.log('❌ No users found with similar email');
    }
    
    // Check all department_admin users
    const allDeptAdmins = await client.query(
      "SELECT id, email, role, is_active, is_verified FROM users WHERE role = 'department_admin'"
    );
    
    console.log('\n📊 All department_admin users:');
    if (allDeptAdmins.rows.length > 0) {
      allDeptAdmins.rows.forEach(user => {
        console.log('   -', user.email, '(active:', user.is_active + ', verified:', user.is_verified + ')');
      });
    } else {
      console.log('❌ No department_admin users found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

verifyDepartmentAdmin();

