import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

const fixGPPatientAssignments = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing GP patient assignments...');
    
    // First, let's see what we have
    const patientsResult = await client.query(`
      SELECT id, upi, first_name, last_name, referred_by_gp_id, created_by
      FROM patients
      ORDER BY id
    `);

    console.log(`\n📊 Total patients: ${patientsResult.rows.length}`);
    
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name, role
      FROM users
      WHERE role IN ('gp', 'urology_nurse', 'urologist')
      ORDER BY role, id
    `);

    console.log(`\n👥 Users in system:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.role.toUpperCase()}: ${user.first_name} ${user.last_name} (${user.email}) [ID: ${user.id}]`);
    });

    // For now, let's clear all referred_by_gp_id to NULL for patients created by non-GP users
    // This way, only patients explicitly created by GPs will show in their dashboard
    console.log(`\n🔄 Clearing referred_by_gp_id for patients created by non-GP users...`);
    
    const clearResult = await client.query(`
      UPDATE patients p
      SET referred_by_gp_id = NULL
      WHERE p.created_by IN (
        SELECT id FROM users WHERE role != 'gp'
      )
      RETURNING id, upi, first_name, last_name
    `);

    console.log(`✅ Cleared ${clearResult.rowCount} patient assignments`);
    if (clearResult.rowCount > 0) {
      console.log(`\n📋 Patients updated:`);
      clearResult.rows.forEach(p => {
        console.log(`  - ${p.first_name} ${p.last_name} (${p.upi})`);
      });
    }

    // Set referred_by_gp_id to the creator's ID for patients created by GPs
    console.log(`\n🔄 Setting referred_by_gp_id for patients created by GPs...`);
    
    const setResult = await client.query(`
      UPDATE patients p
      SET referred_by_gp_id = p.created_by
      WHERE p.created_by IN (
        SELECT id FROM users WHERE role = 'gp'
      )
      AND (p.referred_by_gp_id IS NULL OR p.referred_by_gp_id != p.created_by)
      RETURNING id, upi, first_name, last_name, created_by, referred_by_gp_id
    `);

    console.log(`✅ Updated ${setResult.rowCount} patient assignments for GP-created patients`);
    if (setResult.rowCount > 0) {
      console.log(`\n📋 Patients assigned to their GP creators:`);
      setResult.rows.forEach(p => {
        console.log(`  - ${p.first_name} ${p.last_name} (${p.upi}) → GP ID: ${p.referred_by_gp_id}`);
      });
    }

    console.log('\n🎉 Patient assignment fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`  - Patients created by GPs: Will show in their dashboard`);
    console.log(`  - Patients created by Nurses/Urologists: Will NOT show in GP dashboards (referred_by_gp_id = NULL)`);

  } catch (error) {
    console.error('❌ Error fixing GP patient assignments:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

fixGPPatientAssignments();




