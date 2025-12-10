import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createDepartmentAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating department admin user...');
    
    // Check if department admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE role = $1',
      ['department_admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Department admin user already exists');
      console.log('💡 You can create additional department admin users via the superadmin panel');
      return;
    }

    // Default department admin credentials
    const email = process.env.DEPT_ADMIN_EMAIL || 'departmenthead@yopmail.com';
    const password = process.env.DEPT_ADMIN_PASSWORD || 'DeptAdmin123!';
    const firstName = 'Department';
    const lastName = 'Admin';

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create department admin user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, email_verified_at) 
       VALUES ($1, $2, $3, $4, $5, true, true, NOW()) 
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName, lastName, 'department_admin']
    );

    const admin = result.rows[0];

    console.log('✅ Department admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', password);
    console.log('⚠️  Please change the password after first login!');
    console.log('');
    console.log('🌐 Login URL: http://localhost:5173/login');
    console.log('📊 Dashboard URL: http://localhost:5173/department-admin/dashboard');

  } catch (error) {
    console.error('❌ Error creating department admin:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

createDepartmentAdmin();

