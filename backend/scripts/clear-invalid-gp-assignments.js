import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: './secure.env' });

async function clearInvalidGPAssignments() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Clearing invalid GP assignments...\n');
    
    // Strategy: Clear referred_by_gp_id for patients where:
    // 1. created_by is NULL (orphaned patients)
    // 2. created_by is not a GP (nurse/urologist created but shouldn't auto-assign)
    
    // First, show what will be affected
    const checkResult = await client.query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.referred_by_gp_id,
        p.created_by,
        u.role as creator_role
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.referred_by_gp_id IS NOT NULL
      AND (p.created_by IS NULL OR u.role IS NULL OR u.role != 'gp')
      AND p.status = 'Active'
    `);
    
    console.log(`📊 Found ${checkResult.rows.length} patients with invalid GP assignments:\n`);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ No invalid assignments found. All good!');
      return;
    }
    
    checkResult.rows.forEach(patient => {
      console.log(`  - ${patient.first_name} ${patient.last_name}`);
      console.log(`    referred_by_gp_id: ${patient.referred_by_gp_id}`);
      console.log(`    created_by: ${patient.created_by || 'NULL'}`);
      console.log(`    creator_role: ${patient.creator_role || 'NULL'}`);
      console.log('');
    });
    
    // Now clear them
    console.log('🔄 Clearing referred_by_gp_id for these patients...\n');
    
    const updateResult = await client.query(`
      UPDATE patients p
      SET referred_by_gp_id = NULL
      FROM (
        SELECT p2.id
        FROM patients p2
        LEFT JOIN users u ON p2.created_by = u.id
        WHERE p2.referred_by_gp_id IS NOT NULL
        AND (p2.created_by IS NULL OR u.role IS NULL OR u.role != 'gp')
        AND p2.status = 'Active'
      ) AS invalid_patients
      WHERE p.id = invalid_patients.id
      RETURNING p.id, p.first_name, p.last_name
    `);
    
    console.log(`✅ Cleared ${updateResult.rowCount} patient GP assignments:\n`);
    
    updateResult.rows.forEach(patient => {
      console.log(`  - ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
    });
    
    console.log('\n🎉 Invalid GP assignments cleared successfully!');
    console.log('\n📝 These patients will no longer appear in GP dashboards.');
    console.log('   They can be re-assigned when a nurse/urologist adds them with a selected GP.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

clearInvalidGPAssignments();
