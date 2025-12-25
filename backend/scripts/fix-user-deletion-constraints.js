import pg from 'pg';
import format from 'pg-format';
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
 * Validate SQL identifiers to prevent injection
 */
const validateIdentifier = (identifier) => {
  if (!/^\w+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
};

/**
 * Fix a single foreign key constraint to use SET NULL on delete
 * Security: Uses pg-format to safely escape SQL identifiers
 */
const fixConstraint = async (client, table, column) => {
  // Validate identifiers before using them
  const safeTable = validateIdentifier(table);
  const safeColumn = validateIdentifier(column);
  const constraintName = `${table}_${column}_fkey`;
  const safeConstraint = validateIdentifier(constraintName);

  console.log(`📋 Fixing ${table}.${column} constraint...`);

  // Make column nullable - using pg-format with %I for identifier escaping
  await client.query(
    format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', safeTable, safeColumn)
  );

  // Drop existing constraint - using pg-format with %I for identifier escaping
  await client.query(
    format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', safeTable, safeConstraint)
  );

  // Add new constraint with ON DELETE SET NULL - using pg-format with %I for identifier escaping
  await client.query(
    format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE SET NULL',
      safeTable,
      safeConstraint,
      safeColumn,
      'users',
      'id'
    )
  );

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
