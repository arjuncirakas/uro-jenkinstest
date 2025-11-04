import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: './secure.env' });

async function checkSpecificPatients() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking specific patients...\n');
    
    // Check the two patients mentioned: "Demo Nurse" and "Demo Person"
    const patientsResult = await client.query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.referred_by_gp_id,
        p.created_by,
        p.created_at,
        u_creator.email as creator_email,
        u_creator.role as creator_role,
        u_creator.first_name as creator_first_name,
        u_creator.last_name as creator_last_name
      FROM patients p
      LEFT JOIN users u_creator ON p.created_by = u_creator.id
      WHERE (p.first_name ILIKE '%Demo%' OR p.last_name ILIKE '%Demo%' 
             OR p.first_name ILIKE '%Nurse%' OR p.last_name ILIKE '%Nurse%'
             OR p.first_name ILIKE '%Person%' OR p.last_name ILIKE '%Person%')
      AND p.status = 'Active'
      ORDER BY p.created_at DESC
    `);
    
    console.log(`Found ${patientsResult.rows.length} patients:\n`);
    
    patientsResult.rows.forEach(patient => {
      console.log(`Patient: ${patient.first_name} ${patient.last_name}`);
      console.log(`  ID: ${patient.id}`);
      console.log(`  referred_by_gp_id: ${patient.referred_by_gp_id}`);
      console.log(`  created_by (user_id): ${patient.created_by}`);
      console.log(`  Creator: ${patient.creator_email || 'NULL'} (${patient.creator_role || 'N/A'})`);
      console.log(`  Creator Name: ${patient.creator_first_name || 'N/A'} ${patient.creator_last_name || 'N/A'}`);
      console.log(`  Created At: ${patient.created_at}`);
      console.log('');
    });
    
    // Check GP user ID 12
    console.log('\n👨‍⚕️ GP User (ID: 12) Details:\n');
    const gpResult = await client.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users
      WHERE id = 12
    `);
    
    if (gpResult.rows.length > 0) {
      const gp = gpResult.rows[0];
      console.log(`ID: ${gp.id}`);
      console.log(`Email: ${gp.email}`);
      console.log(`Name: ${gp.first_name} ${gp.last_name}`);
      console.log(`Role: ${gp.role}`);
      console.log(`Created At: ${gp.created_at}`);
    }
    
    // Get all users to see who might have created these patients
    console.log('\n\n👥 All Users in System:\n');
    const allUsersResult = await client.query(`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users
      ORDER BY role, id
    `);
    
    allUsersResult.rows.forEach(user => {
      console.log(`ID: ${user.id} | ${user.role.toUpperCase()} | ${user.first_name} ${user.last_name} | ${user.email} | Active: ${user.is_active}`);
    });
    
    // Check if these patients should be cleared
    console.log('\n\n💡 RECOMMENDATION:\n');
    
    patientsResult.rows.forEach(patient => {
      if (patient.created_by === null) {
        console.log(`⚠️  Patient "${patient.first_name} ${patient.last_name}" has NULL created_by`);
        console.log(`   This patient's referred_by_gp_id should be cleared unless manually assigned.`);
      } else if (patient.creator_role && patient.creator_role !== 'gp') {
        console.log(`⚠️  Patient "${patient.first_name} ${patient.last_name}" was created by a ${patient.creator_role}`);
        console.log(`   This patient should only show in GP dashboard if the ${patient.creator_role} explicitly selected this GP.`);
      } else if (patient.created_by && patient.created_by !== patient.referred_by_gp_id) {
        console.log(`⚠️  Patient "${patient.first_name} ${patient.last_name}" was created by user ID ${patient.created_by} but assigned to GP ID ${patient.referred_by_gp_id}`);
        console.log(`   This might be intentional if a nurse selected this GP, or it might be an error.`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkSpecificPatients();




