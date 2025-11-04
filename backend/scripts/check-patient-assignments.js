import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: './secure.env' });

async function checkPatientAssignments() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking Patient Assignments...\n');
    
    // Get all patients with their referred_by_gp_id and creator info
    const patientsResult = await client.query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.referred_by_gp_id,
        p.created_by,
        u_creator.email as created_by_email,
        u_creator.role as created_by_role,
        u_gp.email as gp_email,
        u_gp.first_name as gp_first_name,
        u_gp.last_name as gp_last_name
      FROM patients p
      LEFT JOIN users u_creator ON p.created_by = u_creator.id
      LEFT JOIN users u_gp ON p.referred_by_gp_id = u_gp.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `);
    
    console.log(`Found ${patientsResult.rows.length} patients:\n`);
    
    patientsResult.rows.forEach((patient, index) => {
      console.log(`Patient ${index + 1}:`);
      console.log(`  Name: ${patient.first_name} ${patient.last_name}`);
      console.log(`  Created By: ${patient.created_by_email} (${patient.created_by_role})`);
      console.log(`  Referred By GP ID: ${patient.referred_by_gp_id || 'NULL'}`);
      if (patient.gp_email) {
        console.log(`  Referred By GP: ${patient.gp_first_name} ${patient.gp_last_name} (${patient.gp_email})`);
      } else {
        console.log(`  Referred By GP: NULL`);
      }
      console.log('');
    });
    
    // Get all GPs
    console.log('\n👨‍⚕️ All GPs in system:\n');
    const gpsResult = await client.query(`
      SELECT id, email, first_name, last_name, role, is_active
      FROM users
      WHERE role = 'gp'
      ORDER BY created_at
    `);
    
    gpsResult.rows.forEach((gp, index) => {
      console.log(`GP ${index + 1}:`);
      console.log(`  ID: ${gp.id}`);
      console.log(`  Name: ${gp.first_name} ${gp.last_name}`);
      console.log(`  Email: ${gp.email}`);
      console.log(`  Active: ${gp.is_active}`);
      console.log('');
    });
    
    // Count patients per GP
    console.log('\n📊 Patient Count by GP:\n');
    const countResult = await client.query(`
      SELECT 
        u.id as gp_id,
        u.email as gp_email,
        u.first_name as gp_first_name,
        u.last_name as gp_last_name,
        COUNT(p.id) as patient_count
      FROM users u
      LEFT JOIN patients p ON p.referred_by_gp_id = u.id
      WHERE u.role = 'gp'
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY patient_count DESC
    `);
    
    countResult.rows.forEach((row) => {
      console.log(`${row.gp_first_name} ${row.gp_last_name} (${row.gp_email}): ${row.patient_count} patients`);
    });
    
    // Check for patients with NULL referred_by_gp_id
    const nullResult = await client.query(`
      SELECT COUNT(*) as count
      FROM patients
      WHERE referred_by_gp_id IS NULL
    `);
    
    console.log(`\n⚠️  Patients with NULL referred_by_gp_id: ${nullResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkPatientAssignments();




