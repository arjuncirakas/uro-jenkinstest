import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const resetTestDoctorPassword = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Resetting test doctor password...\n');
    
    const email = 'testdoctor2@yopmail.com';
    const newPassword = 'Doctor@1234567';
    
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found in database.`);
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Found user:');
    console.log('   ID:', user.id);
    console.log('   Name:', `${user.first_name} ${user.last_name}`);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('');
    
    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );
    
    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', newPassword);
    console.log('');
    console.log('⚠️  You can now use these credentials to login:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    console.error('   Message:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

resetTestDoctorPassword();



