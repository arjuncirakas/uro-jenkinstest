import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createSuperadmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating superadmin user...');
    
    // Check if superadmin already exists
    const existingSuperadmin = await client.query(
      'SELECT id FROM users WHERE role = $1',
      ['superadmin']
    );

    if (existingSuperadmin.rows.length > 0) {
      console.log('⚠️  Superadmin user already exists');
      return;
    }

    // Default superadmin credentials
    const email = process.env.SUPERADMIN_EMAIL || 'admin@urology.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
    const firstName = 'Super';
    const lastName = 'Admin';

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create superadmin user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, email_verified_at) 
       VALUES ($1, $2, $3, $4, $5, true, true, NOW()) 
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName, lastName, 'superadmin']
    );

    const superadmin = result.rows[0];

    console.log('✅ Superadmin user created successfully!');
    console.log('📧 Email:', superadmin.email);
    console.log('🔑 Password:', password);
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

createSuperadmin();

