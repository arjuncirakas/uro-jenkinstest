import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Creating test user...');
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['uronurse@yopmail.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists');
      return;
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('test123', saltRounds);
    
    // Create test user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true) 
       RETURNING id, email, first_name, last_name, role`,
      ['uronurse@yopmail.com', passwordHash, 'Test', 'Nurse', '1234567890', 'Test Hospital', 'urology_nurse']
    );
    
    const user = result.rows[0];
    console.log('✅ Test user created successfully:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: test123`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    client.release();
  }
}

// Run the script
createTestUser().then(() => {
  console.log('🎉 Test user creation completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});

