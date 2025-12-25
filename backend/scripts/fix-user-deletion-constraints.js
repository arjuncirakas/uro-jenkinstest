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
 * Configuration for all foreign key constraints that need to be fixed
 * Each entry defines: table, column, and constraint name
 */
const CONSTRAINT_CONFIGS = [
  { table: 'patients', column: 'created_by' },
  { table: 'patient_notes', column: 'author_id' },
  { table: 'investigation_results', column: 'author_id' },
  { table: 'appointments', column: 'urologist_id' },
  { table: 'appointments', column: 'created_by' },
  { table: 'investigation_bookings', column: 'created_by' },
  { table: 'mdt_meetings', column: 'created_by' },
  { table: 'mdt_team_members', column: 'user_id' },
  { table: 'discharge_summaries', column: 'consultant_id' },
  { table: 'discharge_summaries', column: 'created_by' },
  { table: 'discharge_summaries', column: 'updated_by' },
];

/**
 * Validate and escape SQL identifiers to prevent injection
 */
const escapeIdentifier = (identifier) => {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `"${identifier}"`;
};

/**
 * Fix a single foreign key constraint to use SET NULL on delete
 */
const fixConstraint = async (client, table, column) => {
  const constraintName = `${table}_${column}_fkey`;
  const safeTable = escapeIdentifier(table);
  const safeColumn = escapeIdentifier(column);
  const safeConstraint = escapeIdentifier(constraintName);

  console.log(`📋 Fixing ${table}.${column} constraint...`);

  // Make column nullable
  await client.query(`ALTER TABLE ${safeTable} ALTER COLUMN ${safeColumn} DROP NOT NULL;`);

  // Drop existing constraint
  await client.query(`ALTER TABLE ${safeTable} DROP CONSTRAINT IF EXISTS ${safeConstraint};`);

  // Add new constraint with ON DELETE SET NULL
  await client.query(`
    ALTER TABLE ${safeTable} 
    ADD CONSTRAINT ${safeConstraint} 
    FOREIGN KEY (${safeColumn}) 
    REFERENCES "users"("id") 
    ON DELETE SET NULL;
  `);

  console.log(`✅ Fixed ${table}.${column}`);
};

/**
 * This script fixes foreign key constraints for user deletions
 * It modifies constraints to SET NULL when a user is deleted,
 * allowing patient records to persist even after their doctor is removed
 */
const fixUserDeletionConstraints = async () => {
  console.log('🔄 Starting migration to fix user deletion constraints...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fix all constraints using the configuration
    for (const config of CONSTRAINT_CONFIGS) {
      await fixConstraint(client, config.table, config.column);
    }

    await client.query('COMMIT');

    console.log('\n✅ All foreign key constraints fixed successfully!');
    console.log('✅ Users can now be deleted without affecting patient records');

  } catch (error) {
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
