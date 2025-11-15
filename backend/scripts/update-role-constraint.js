import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const updateRoleConstraint = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating role constraint to include "doctor"...');
    
    // Drop existing constraint
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    console.log('✅ Dropped old constraint');
    
    // Add new constraint with 'doctor' role
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('superadmin', 'urologist', 'gp', 'urology_nurse', 'doctor'));
    `);
    console.log('✅ Added new constraint with "doctor" role');
    
    // Verify the constraint
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'users_role_check';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Constraint verified:', result.rows[0].definition);
    } else {
      console.log('⚠️  Warning: Could not verify constraint');
    }
    
    console.log('✅ Role constraint updated successfully!');
    console.log('   Allowed roles: superadmin, urologist, gp, urology_nurse, doctor');
    
  } catch (error) {
    console.error('❌ Error updating role constraint:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the update
updateRoleConstraint()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });












