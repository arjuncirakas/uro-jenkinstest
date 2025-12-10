import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const updateDepartmentAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Updating department admin user...');
    
    const oldEmail = 'deptadmin@urology.local';
    const newEmail = 'departmenthead@yopmail.com';
    const password = process.env.DEPT_ADMIN_PASSWORD || 'DeptAdmin123!';
    
    // Check if old user exists
    const oldUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [oldEmail]
    );
    
    // Check if new user already exists
    const newUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [newEmail]
    );
    
    if (newUser.rows.length > 0) {
      console.log('✅ Department admin user with email', newEmail, 'already exists');
      console.log('📧 Email:', newEmail);
      console.log('💡 If you need to reset the password, use the superadmin panel');
      return;
    }
    
    if (oldUser.rows.length > 0) {
      // Update existing user
      console.log('🔄 Updating existing department admin user...');
      
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      await client.query(
        `UPDATE users 
         SET email = $1, password_hash = $2, updated_at = NOW()
         WHERE email = $3 AND role = 'department_admin'`,
        [newEmail, passwordHash, oldEmail]
      );
      
      console.log('✅ Department admin user updated successfully!');
      console.log('📧 Old Email:', oldEmail);
      console.log('📧 New Email:', newEmail);
      console.log('🔑 Password:', password);
    } else {
      // Create new user
      console.log('🆕 Creating new department admin user...');
      
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, email_verified_at) 
         VALUES ($1, $2, $3, $4, $5, true, true, NOW()) 
         RETURNING id, email, first_name, last_name, role`,
        [newEmail, passwordHash, 'Department', 'Head', 'department_admin']
      );
      
      const admin = result.rows[0];
      console.log('✅ Department admin user created successfully!');
      console.log('📧 Email:', admin.email);
      console.log('🔑 Password:', password);
    }
    
    console.log('⚠️  Please change the password after first login!');
    console.log('');
    console.log('🌐 Login URL: http://localhost:5173/login');
    console.log('📊 Dashboard URL: http://localhost:5173/department-admin/dashboard');

  } catch (error) {
    console.error('❌ Error updating department admin:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

updateDepartmentAdmin();

