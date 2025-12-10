import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const testLoginQuery = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing login query...');
    
    const email = 'departmenthead@yopmail.com';
    const password = 'DeptAdmin123!';
    
    // Test the exact query used in login controller
    const result = await client.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = $1',
      [email]
    );
    
    console.log('\n📊 Query result:');
    if (result.rows.length === 0) {
      console.log('❌ User not found with email:', email);
      console.log('   This matches the error you are seeing!');
    } else {
      const user = result.rows[0];
      console.log('✅ User found!');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Is Active:', user.is_active);
      console.log('   Is Verified:', user.is_verified);
      
      // Test password
      console.log('\n🔐 Testing password...');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (isPasswordValid) {
        console.log('✅ Password is correct!');
      } else {
        console.log('❌ Password does not match!');
      }
    }
    
    // Also check what database we're connected to
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log('\n📊 Database connection info:');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    process.exit(0);
  }
};

testLoginQuery();

