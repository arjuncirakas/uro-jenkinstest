import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const checkSuperadmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking superadmin user...');
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log('📊 Connected to:');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);
    console.log('');
    
    // Check for superadmin users
    const result = await client.query(
      'SELECT id, email, first_name, last_name, role, is_active, is_verified, created_at FROM users WHERE role = $1 ORDER BY created_at ASC',
      ['superadmin']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No superadmin users found!');
      console.log('');
      console.log('💡 To create a superadmin, run:');
      console.log('   npm run create-superadmin');
    } else {
      console.log(`✅ Found ${result.rows.length} superadmin user(s):`);
      console.log('');
      result.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}`);
        console.log(`      Name: ${user.first_name} ${user.last_name}`);
        console.log(`      Active: ${user.is_active}`);
        console.log(`      Verified: ${user.is_verified}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('');
      });
      
      console.log('⚠️  Note: Passwords are hashed and cannot be retrieved.');
      console.log('   If you forgot the password, you can:');
      console.log('   1. Reset it via database (requires bcrypt hash)');
      console.log('   2. Create a new superadmin user');
      console.log('   3. Use the default password if it was never changed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

checkSuperadmin();

