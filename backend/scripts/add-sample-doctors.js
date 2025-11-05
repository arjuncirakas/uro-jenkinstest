import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const sampleDoctors = [
  {
    first_name: 'Sarah',
    last_name: 'Wilson',
    email: 'sarah.wilson@hospital.com',
    phone: '+1-555-0101',
    role: 'urologist',
    specialization: 'Urologist',
    password: 'password123'
  },
  {
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'michael.chen@hospital.com',
    phone: '+1-555-0102',
    role: 'urologist',
    specialization: 'Urologist',
    password: 'password123'
  },
  {
    first_name: 'Emily',
    last_name: 'Rodriguez',
    email: 'emily.rodriguez@hospital.com',
    phone: '+1-555-0103',
    role: 'urologist',
    specialization: 'Urologist',
    password: 'password123'
  },
  {
    first_name: 'David',
    last_name: 'Kim',
    email: 'david.kim@hospital.com',
    phone: '+1-555-0104',
    role: 'radiologist',
    specialization: 'Radiologist',
    password: 'password123'
  },
  {
    first_name: 'Lisa',
    last_name: 'Thompson',
    email: 'lisa.thompson@hospital.com',
    phone: '+1-555-0105',
    role: 'pathologist',
    specialization: 'Pathologist',
    password: 'password123'
  },
  {
    first_name: 'James',
    last_name: 'Brown',
    email: 'james.brown@hospital.com',
    phone: '+1-555-0106',
    role: 'urologist',
    specialization: 'Urologist',
    password: 'password123'
  }
];

async function addSampleDoctors() {
  const client = await pool.connect();
  
  try {
    console.log('Adding sample doctors...');
    
    for (const doctor of sampleDoctors) {
      // Check if doctor already exists
      const existingDoctor = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [doctor.email]
      );
      
      if (existingDoctor.rows.length > 0) {
        console.log(`Doctor ${doctor.email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(doctor.password, 10);
      
      // Insert doctor
      const result = await client.query(
        `INSERT INTO users (
          first_name, last_name, email, phone, role, specialization, 
          password_hash, is_active, is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, first_name, last_name, email, role`,
        [
          doctor.first_name,
          doctor.last_name,
          doctor.email,
          doctor.phone,
          doctor.role,
          doctor.specialization,
          hashedPassword,
          true,  // is_active
          true   // is_verified
        ]
      );
      
      console.log(`✅ Added doctor: ${result.rows[0].first_name} ${result.rows[0].last_name} (${result.rows[0].role})`);
    }
    
    console.log('✅ Sample doctors added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding sample doctors:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addSampleDoctors();
