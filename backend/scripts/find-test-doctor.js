import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const findTestDoctor = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Searching for test doctors in the database...\n');
    
    // Get database connection info
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log('📊 Database connection info:');
    console.log('   Database:', dbInfo.rows[0].current_database);
    console.log('   User:', dbInfo.rows[0].current_user);
    console.log('');
    
    // Find all doctors (urologist role)
    const result = await client.query(
      `SELECT id, email, first_name, last_name, role, phone, is_active, is_verified, 
              email_verified_at, created_at 
       FROM users 
       WHERE role IN ('urologist', 'doctor') 
       ORDER BY created_at DESC`
    );
    
    console.log(`📋 Found ${result.rows.length} doctor(s) in the database:\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No doctors found in the database.');
      console.log('\n💡 You may need to run:');
      console.log('   cd backend && node scripts/add-sample-doctors.js');
    } else {
      // Test credentials from e2e fixtures
      const testCredentials = [
        { email: 'testdoctor2@yopmail.com', password: 'Doctor@1234567' },
        { email: 'sarah.wilson@hospital.com', password: 'password123' },
        { email: 'michael.chen@hospital.com', password: 'password123' },
        { email: 'emily.rodriguez@hospital.com', password: 'password123' },
      ];
      
      result.rows.forEach((doctor, index) => {
        console.log(`\n👨‍⚕️ Doctor #${index + 1}:`);
        console.log('   ID:', doctor.id);
        console.log('   Name:', `${doctor.first_name} ${doctor.last_name}`);
        console.log('   Email:', doctor.email);
        console.log('   Phone:', doctor.phone || 'N/A');
        console.log('   Role:', doctor.role);
        console.log('   Is Active:', doctor.is_active);
        console.log('   Is Verified:', doctor.is_verified);
        console.log('   Created:', doctor.created_at);
        
        // Check if this matches any known test credentials
        const matchingCreds = testCredentials.find(creds => creds.email === doctor.email);
        if (matchingCreds) {
          console.log('   ✅ Matches known test credentials!');
          console.log('   🔑 Test Password:', matchingCreds.password);
        }
      });
      
      // Try to verify passwords for known test accounts
      console.log('\n\n🔐 Verifying passwords for known test accounts...\n');
      
      for (const creds of testCredentials) {
        const userResult = await client.query(
          'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = $1',
          [creds.email]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          console.log(`📧 Testing: ${creds.email}`);
          const isPasswordValid = await bcrypt.compare(creds.password, user.password_hash);
          
          if (isPasswordValid) {
            console.log('   ✅ Password is CORRECT!');
            console.log('   👤 Name:', `${user.first_name} ${user.last_name}`);
            console.log('   🔑 Password:', creds.password);
            console.log('   📊 Status:', user.is_active ? 'Active' : 'Inactive', '/', user.is_verified ? 'Verified' : 'Not Verified');
          } else {
            console.log('   ❌ Password does NOT match');
            console.log('   ⚠️  This account exists but password is different');
          }
        } else {
          console.log(`📧 ${creds.email}: ❌ Not found in database`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

findTestDoctor();



