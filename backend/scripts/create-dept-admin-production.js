import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createDepartmentAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating/Updating department admin user for production...');
    
    const email = 'departmenthead@yopmail.com';
    const password = process.env.DEPT_ADMIN_PASSWORD || 'DeptAdmin123!';
    const firstName = 'Department';
    const lastName = 'Head';
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`⚠️  User with email ${email} already exists`);
      console.log(`   Current role: ${user.role}`);
      
      if (user.role !== 'department_admin') {
        console.log('🔄 Updating role to department_admin...');
        await client.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['department_admin', user.id]
        );
        console.log('✅ Role updated successfully');
      }
      
      // Update password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await client.query(
        'UPDATE users SET password_hash = $1, is_active = true, is_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $2',
        [passwordHash, user.id]
      );
      
      console.log('✅ Department admin user updated successfully!');
      console.log('📧 Email:', email);
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
        [email, passwordHash, firstName, lastName, 'department_admin']
      );
      
      const admin = result.rows[0];
      console.log('✅ Department admin user created successfully!');
      console.log('📧 Email:', admin.email);
      console.log('🔑 Password:', password);
    }
    
    console.log('');
    console.log('⚠️  Please change the password after first login!');
    console.log('🌐 Login URL: https://uroprep.ahimsa.global/login');
    console.log('📊 Dashboard URL: https://uroprep.ahimsa.global/department-admin/dashboard');

  } catch (error) {
    console.error('❌ Error creating department admin:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    process.exit(0);
  }
};

createDepartmentAdmin();

