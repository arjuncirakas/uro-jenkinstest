import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createAdditionalSuperadmin = async () => {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating additional superadmin user...');

        const email = 'superadminuroprep@yopmail.com';
        const password = 'SuperAdmin123!';
        const firstName = 'Super';
        const lastName = 'Admin';

        // Check if this email already exists
        const existingUser = await client.query(
            'SELECT id, email FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            console.log(`⚠️  User with email ${email} already exists`);
            console.log('   User ID:', existingUser.rows[0].id);
            console.log('   Email:', existingUser.rows[0].email);
            return;
        }

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
        console.log('👤 Name:', `${superadmin.first_name} ${superadmin.last_name}`);
        console.log('🎯 Role:', superadmin.role);
        console.log('🆔 User ID:', superadmin.id);
        console.log('');
        console.log('⚠️  Important: With the new OTP verification requirement,');
        console.log('   this user will receive an OTP email when logging in.');

    } catch (error) {
        console.error('❌ Error creating superadmin:', error);
    } finally {
        client.release();
        process.exit(0);
    }
};

createAdditionalSuperadmin();
