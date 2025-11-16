import pool from '../config/database.js';

/**
 * Migration script to change appointments.urologist_id foreign key
 * from users(id) to doctors(id)
 * 
 * This ensures that appointments always reference doctors.id instead of users.id
 * for proper appointment scheduling.
 */
const fixAppointmentsUrologistIdFkey = async () => {
  console.log('🔄 Starting migration to fix appointments.urologist_id foreign key...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    // Step 1: Drop the existing foreign key constraint
    console.log('📋 Step 1: Dropping existing foreign key constraint...');
    try {
      await client.query(`
        ALTER TABLE appointments 
        DROP CONSTRAINT IF EXISTS appointments_urologist_id_fkey;
      `);
      console.log('✅ Dropped existing appointments_urologist_id_fkey constraint');
    } catch (err) {
      console.log(`⚠️  Constraint might not exist or already dropped: ${err.message}`);
    }
    
    // Step 2: Make the column nullable temporarily (in case there are invalid references)
    console.log('📋 Step 2: Making urologist_id nullable temporarily...');
    try {
      await client.query(`
        ALTER TABLE appointments 
        ALTER COLUMN urologist_id DROP NOT NULL;
      `);
      console.log('✅ Made urologist_id nullable');
    } catch (err) {
      console.log(`⚠️  Column might already be nullable: ${err.message}`);
    }
    
    // Step 3: Add new foreign key constraint pointing to doctors(id)
    console.log('📋 Step 3: Adding new foreign key constraint to doctors(id)...');
    await client.query(`
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_urologist_id_fkey 
      FOREIGN KEY (urologist_id) 
      REFERENCES doctors(id) 
      ON DELETE SET NULL;
    `);
    console.log('✅ Added new foreign key constraint to doctors(id)');
    
    // Step 4: Verify the constraint
    console.log('📋 Step 4: Verifying constraint...');
    const constraintCheck = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'appointments'
        AND kcu.column_name = 'urologist_id';
    `);
    
    if (constraintCheck.rows.length > 0) {
      const constraint = constraintCheck.rows[0];
      console.log(`✅ Verified: ${constraint.constraint_name} references ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    } else {
      throw new Error('Failed to verify foreign key constraint');
    }
    
    await client.query('COMMIT'); // Commit transaction
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 appointments.urologist_id now references doctors(id) instead of users(id)');
    
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run the migration
fixAppointmentsUrologistIdFkey()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });






