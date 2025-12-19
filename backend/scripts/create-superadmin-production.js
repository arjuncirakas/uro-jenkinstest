import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createSuperadminProduction = async () => {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating superadmin user for production...');
        console.log(`📊 Connecting to database: ${process.env.DB_NAME || 'urology_db'}`);
        console.log(`🖥️  Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log('');

        const email = 'superadminuroprep@yopmail.com';
        const password = 'SuperAdmin123!';
        const firstName = 'Super';
        const lastName = 'Admin';

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT id, email, role FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            console.log(`⚠️  User with email ${email} already exists`);
            console.log(`   User ID: ${user.id}`);
            console.log(`   Current role: ${user.role}`);

            if (user.role !== 'superadmin') {
                console.log('🔄 Updating role to superadmin...');
                await client.query(
                    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
                    ['superadmin', user.id]
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

            console.log('✅ Superadmin user updated successfully!');
            console.log('📧 Email:', email);
            console.log('🔑 Password:', password);
        } else {
            // Create new user
            console.log('🆕 Creating new superadmin user...');

            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const result = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, email_verified_at) 
         VALUES ($1, $2, $3, $4, $5, true, true, NOW()) 
         RETURNING id, email, first_name, last_name, role`,
                [email, passwordHash, firstName, lastName, 'superadmin']
            );

            const admin = result.rows[0];
            console.log('✅ Superadmin user created successfully!');
            console.log('📧 Email:', admin.email);
            console.log('🔑 Password:', password);
            console.log('👤 Name:', `${admin.first_name} ${admin.last_name}`);
            console.log('🎯 Role:', admin.role);
            console.log('🆔 User ID:', admin.id);
        }

        console.log('');
        console.log('⚠️  Important: With the new OTP verification requirement,');
        console.log('   this user will receive an OTP email when logging in.');
        console.log('');
        console.log('🌐 Login URL: https://uroprep.ahimsa.global/login');
        console.log('📊 Dashboard URL: https://uroprep.ahimsa.global/superadmin/users');

    } catch (error) {
        console.error('❌ Error creating superadmin:', error);
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        client.release();
        process.exit(0);
    }
};

createSuperadminProduction();
