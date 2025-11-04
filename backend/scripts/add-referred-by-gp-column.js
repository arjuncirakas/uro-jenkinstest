import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

const addReferredByGpColumn = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding referred_by_gp_id column to patients table...');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'referred_by_gp_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('⚠️  referred_by_gp_id column already exists');
      return;
    }

    // Add referred_by_gp_id column
    await client.query(`
      ALTER TABLE patients
      ADD COLUMN referred_by_gp_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('✅ referred_by_gp_id column added successfully!');

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_referred_by_gp 
      ON patients(referred_by_gp_id)
    `);

    console.log('✅ Index created successfully!');

    // Update existing patients to set referred_by_gp_id to the first GP user (if any GP exists)
    const gpUserResult = await client.query(`
      SELECT id FROM users WHERE role = 'gp' LIMIT 1
    `);

    if (gpUserResult.rows.length > 0) {
      const gpId = gpUserResult.rows[0].id;
      const updateResult = await client.query(`
        UPDATE patients 
        SET referred_by_gp_id = $1 
        WHERE referred_by_gp_id IS NULL
      `, [gpId]);

      console.log(`✅ Updated ${updateResult.rowCount} existing patients with default GP!`);
    } else {
      console.log('⚠️  No GP users found. Existing patients will have NULL referred_by_gp_id');
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error adding referred_by_gp_id column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

addReferredByGpColumn();




