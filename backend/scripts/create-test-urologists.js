import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './secure.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const testUrologists = [
  {
    first_name: 'Dr. Sarah',
    last_name: 'Wilson',
    email: 'sarah.wilson@hospital.com',
    phone: '+1-555-0101',
    role: 'urologist'
  },
  {
    first_name: 'Dr. Michael',
    last_name: 'Chen',
    email: 'michael.chen@hospital.com',
    phone: '+1-555-0102',
    role: 'urologist'
  },
  {
    first_name: 'Dr. Emily',
    last_name: 'Rodriguez',
    email: 'emily.rodriguez@hospital.com',
    phone: '+1-555-0103',
    role: 'urologist'
  }
];

async function createTestUrologists() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test urologists...');
    
    for (const urologist of testUrologists) {
      // Check if urologist already exists
      const existingUrologist = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [urologist.email]
      );
      
      if (existingUrologist.rows.length > 0) {
        console.log(`Urologist ${urologist.email} already exists, updating...`);
        
        // Update existing urologist to be active
        await client.query(
          `UPDATE users SET 
           first_name = $1, last_name = $2, phone = $3, 
           role = $4, is_active = true, is_verified = true
           WHERE email = $5`,
          [
            urologist.first_name,
            urologist.last_name,
            urologist.phone,
            urologist.role,
            urologist.email
          ]
        );
        
        console.log(`✅ Updated urologist: ${urologist.first_name} ${urologist.last_name}`);
        continue;
      }
      
      // Hash a simple password
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Insert new urologist
      const result = await client.query(
        `INSERT INTO users (
          first_name, last_name, email, phone, role, 
          password_hash, is_active, is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, first_name, last_name, email, role`,
        [
          urologist.first_name,
          urologist.last_name,
          urologist.email,
          urologist.phone,
          urologist.role,
          hashedPassword,
          true,  // is_active
          true   // is_verified
        ]
      );
      
      console.log(`✅ Created urologist: ${result.rows[0].first_name} ${result.rows[0].last_name} (${result.rows[0].role})`);
    }
    
    console.log('✅ Test urologists created/updated successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test urologists:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUrologists();
