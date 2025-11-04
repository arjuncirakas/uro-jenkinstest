import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: './secure.env' });

async function verifyGPPatients() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verifying GP Patient Assignments...\n');
    
    // Get all patients with their GP assignment and creator
    const patientsResult = await client.query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.referred_by_gp_id,
        p.created_by,
        u_creator.email as creator_email,
        u_creator.role as creator_role,
        u_gp.email as gp_email,
        u_gp.first_name as gp_first_name,
        u_gp.last_name as gp_last_name
      FROM patients p
      LEFT JOIN users u_creator ON p.created_by = u_creator.id
      LEFT JOIN users u_gp ON p.referred_by_gp_id = u_gp.id
      WHERE p.status = 'Active'
      ORDER BY p.created_at DESC
    `);
    
    console.log(`📊 Total Active Patients: ${patientsResult.rows.length}\n`);
    
    // Group by GP
    const gpGroups = {};
    const orphanedPatients = [];
    
    patientsResult.rows.forEach(patient => {
      const gpId = patient.referred_by_gp_id;
      if (gpId) {
        if (!gpGroups[gpId]) {
          gpGroups[gpId] = {
            gp: patient.gp_email || `GP ID: ${gpId}`,
            patients: []
          };
        }
        gpGroups[gpId].patients.push({
          name: `${patient.first_name} ${patient.last_name}`,
          createdBy: patient.creator_email,
          creatorRole: patient.creator_role
        });
      } else {
        orphanedPatients.push({
          name: `${patient.first_name} ${patient.last_name}`,
          createdBy: patient.creator_email,
          creatorRole: patient.creator_role
        });
      }
    });
    
    console.log('👨‍⚕️ Patients by GP:\n');
    Object.keys(gpGroups).forEach(gpId => {
      const group = gpGroups[gpId];
      console.log(`${group.gp}:`);
      group.patients.forEach(p => {
        console.log(`  - ${p.name} (created by ${p.createdBy} - ${p.creatorRole})`);
      });
      console.log('');
    });
    
    if (orphanedPatients.length > 0) {
      console.log('⚠️  Patients with NULL referred_by_gp_id:\n');
      orphanedPatients.forEach(p => {
        console.log(`  - ${p.name} (created by ${p.createdBy} - ${p.creatorRole})`);
      });
      console.log('');
    }
    
    // Check for problematic assignments
    console.log('\n🔍 Checking for problematic assignments...\n');
    const problematicResult = await client.query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.referred_by_gp_id,
        u_creator.role as creator_role,
        u_gp.role as gp_role
      FROM patients p
      LEFT JOIN users u_creator ON p.created_by = u_creator.id
      LEFT JOIN users u_gp ON p.referred_by_gp_id = u_gp.id
      WHERE p.referred_by_gp_id IS NOT NULL
      AND p.status = 'Active'
      AND u_creator.role != 'gp'
      AND (u_gp.role IS NULL OR u_gp.role != 'gp')
    `);
    
    if (problematicResult.rows.length > 0) {
      console.log(`⚠️  Found ${problematicResult.rows.length} patients with invalid GP assignments:\n`);
      problematicResult.rows.forEach(p => {
        console.log(`  - ${p.first_name} ${p.last_name} (created by ${p.creator_role}, assigned to ${p.gp_role || 'invalid GP'})`);
      });
      console.log('\n💡 These should be fixed by running: node backend/scripts/fix-gp-patient-assignments.js\n');
    } else {
      console.log('✅ No problematic assignments found!\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

verifyGPPatients();




