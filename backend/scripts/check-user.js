import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function checkUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking user status...');
    
    const result = await client.query(
      'SELECT id, email, first_name, last_name, role, is_active, is_verified, created_at FROM users WHERE email = $1',
      ['uronurse@yopmail.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('👤 User details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Verified: ${user.is_verified}`);
    console.log(`   Created: ${user.created_at}`);
    
    if (!user.is_active) {
      console.log('⚠️ User is not active');
    }
    if (!user.is_verified) {
      console.log('⚠️ User is not verified');
    }
    
  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    client.release();
  }
}

// Run the script
checkUser().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

