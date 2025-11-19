import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * This script fixes foreign key constraints for user deletions
 * It modifies constraints to SET NULL when a user is deleted,
 * allowing patient records to persist even after their doctor is removed
 */
const fixUserDeletionConstraints = async () => {
  console.log('🔄 Starting migration to fix user deletion constraints...\n');

  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    // 1. Fix patients.created_by
    console.log('📋 Fixing patients.created_by constraint...');
    
    // First, make sure the column is nullable
    await client.query(`
      ALTER TABLE patients 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    // Drop existing constraint if it exists
    await client.query(`
      ALTER TABLE patients 
      DROP CONSTRAINT IF EXISTS patients_created_by_fkey;
    `);
    
    // Add new constraint with ON DELETE SET NULL
    await client.query(`
      ALTER TABLE patients 
      ADD CONSTRAINT patients_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed patients.created_by');

    // 2. Fix patient_notes.author_id
    console.log('📋 Fixing patient_notes.author_id constraint...');
    
    await client.query(`
      ALTER TABLE patient_notes 
      ALTER COLUMN author_id DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE patient_notes 
      DROP CONSTRAINT IF EXISTS patient_notes_author_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE patient_notes 
      ADD CONSTRAINT patient_notes_author_id_fkey 
      FOREIGN KEY (author_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed patient_notes.author_id');

    // 3. Fix investigation_results.author_id
    console.log('📋 Fixing investigation_results.author_id constraint...');
    
    await client.query(`
      ALTER TABLE investigation_results 
      ALTER COLUMN author_id DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE investigation_results 
      DROP CONSTRAINT IF EXISTS investigation_results_author_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE investigation_results 
      ADD CONSTRAINT investigation_results_author_id_fkey 
      FOREIGN KEY (author_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed investigation_results.author_id');

    // 4. Fix appointments.urologist_id
    console.log('📋 Fixing appointments.urologist_id constraint...');
    
    await client.query(`
      ALTER TABLE appointments 
      ALTER COLUMN urologist_id DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_urologist_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_urologist_id_fkey 
      FOREIGN KEY (urologist_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed appointments.urologist_id');

    // 5. Fix appointments.created_by
    console.log('📋 Fixing appointments.created_by constraint...');
    
    await client.query(`
      ALTER TABLE appointments 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;
    `);
    
    await client.query(`
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed appointments.created_by');

    // 6. Fix investigation_bookings.created_by
    console.log('📋 Fixing investigation_bookings.created_by constraint...');
    
    await client.query(`
      ALTER TABLE investigation_bookings 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE investigation_bookings 
      DROP CONSTRAINT IF EXISTS investigation_bookings_created_by_fkey;
    `);
    
    await client.query(`
      ALTER TABLE investigation_bookings 
      ADD CONSTRAINT investigation_bookings_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed investigation_bookings.created_by');

    // 7. Fix mdt_meetings.created_by
    console.log('📋 Fixing mdt_meetings.created_by constraint...');
    
    await client.query(`
      ALTER TABLE mdt_meetings 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE mdt_meetings 
      DROP CONSTRAINT IF EXISTS mdt_meetings_created_by_fkey;
    `);
    
    await client.query(`
      ALTER TABLE mdt_meetings 
      ADD CONSTRAINT mdt_meetings_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed mdt_meetings.created_by');

    // 8. Fix mdt_team_members.user_id
    console.log('📋 Fixing mdt_team_members.user_id constraint...');
    
    await client.query(`
      ALTER TABLE mdt_team_members 
      ALTER COLUMN user_id DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE mdt_team_members 
      DROP CONSTRAINT IF EXISTS mdt_team_members_user_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE mdt_team_members 
      ADD CONSTRAINT mdt_team_members_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed mdt_team_members.user_id');

    // 9. Fix discharge_summaries.consultant_id
    console.log('📋 Fixing discharge_summaries.consultant_id constraint...');
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ALTER COLUMN consultant_id DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      DROP CONSTRAINT IF EXISTS discharge_summaries_consultant_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ADD CONSTRAINT discharge_summaries_consultant_id_fkey 
      FOREIGN KEY (consultant_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed discharge_summaries.consultant_id');

    // 10. Fix discharge_summaries.created_by
    console.log('📋 Fixing discharge_summaries.created_by constraint...');
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      DROP CONSTRAINT IF EXISTS discharge_summaries_created_by_fkey;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ADD CONSTRAINT discharge_summaries_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed discharge_summaries.created_by');

    // 11. Fix discharge_summaries.updated_by
    console.log('📋 Fixing discharge_summaries.updated_by constraint...');
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ALTER COLUMN updated_by DROP NOT NULL;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      DROP CONSTRAINT IF EXISTS discharge_summaries_updated_by_fkey;
    `);
    
    await client.query(`
      ALTER TABLE discharge_summaries 
      ADD CONSTRAINT discharge_summaries_updated_by_fkey 
      FOREIGN KEY (updated_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Fixed discharge_summaries.updated_by');

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ All foreign key constraints fixed successfully!');
    console.log('✅ Users can now be deleted without affecting patient records');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the migration
fixUserDeletionConstraints()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });





























