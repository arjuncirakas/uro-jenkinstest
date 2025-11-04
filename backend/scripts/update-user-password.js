import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function updateUserPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Updating user password...');
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('test123', saltRounds);
    
    // Update user password
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [passwordHash, 'uronurse@yopmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for:', result.rows[0].email);
      console.log('   New password: test123');
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    client.release();
  }
}

// Run the script
updateUserPassword().then(() => {
  console.log('🎉 Password update completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

