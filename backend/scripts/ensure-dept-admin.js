import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const ensureDepartmentAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ensuring department admin user exists...');
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
    console.log('📊 Connected to:');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);
    console.log('   Server:', dbInfo.rows[0].inet_server_addr || 'localhost');
    console.log('   Port:', dbInfo.rows[0].inet_server_port || '5432');
    console.log('');
    
    const email = 'departmenthead@yopmail.com';
    const password = process.env.DEPT_ADMIN_PASSWORD || 'DeptAdmin123!';
    const firstName = 'Department';
    const lastName = 'Head';
    
    // Check if user exists
    const existingUser = await client.query(
      'SELECT id, email, role, is_active, is_verified FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`✅ User found: ${email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Verified: ${user.is_verified}`);
      
      // Update if needed
      let updated = false;
      
      if (user.role !== 'department_admin') {
        console.log('🔄 Updating role to department_admin...');
        await client.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['department_admin', user.id]
        );
        updated = true;
      }
      
      if (!user.is_active || !user.is_verified) {
        console.log('🔄 Activating and verifying user...');
        await client.query(
          'UPDATE users SET is_active = true, is_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1',
          [user.id]
        );
        updated = true;
      }
      
      // Always update password to ensure it's correct
      console.log('🔄 Updating password...');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, user.id]
      );
      updated = true;
      
      if (updated) {
        console.log('✅ User updated successfully!');
      } else {
        console.log('✅ User is already correctly configured!');
      }
    } else {
      console.log(`❌ User not found: ${email}`);
      console.log('🆕 Creating new user...');
      
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, email_verified_at) 
         VALUES ($1, $2, $3, $4, $5, true, true, NOW()) 
         RETURNING id, email, first_name, last_name, role`,
        [email, passwordHash, firstName, lastName, 'department_admin']
      );
      
      const admin = result.rows[0];
      console.log('✅ User created successfully!');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
    }
    
    console.log('');
    console.log('📧 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Message:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    client.release();
    process.exit(0);
  }
};

ensureDepartmentAdmin();

