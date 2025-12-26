import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

/**
 * SECURITY: Pre-built static SQL queries for each constraint.
 * These queries are completely hardcoded with no dynamic interpolation.
 * Each key is in format "table.column" and contains the 3 SQL statements needed.
 */
const STATIC_QUERIES = {
  'patients.created_by': {
    dropNotNull: 'ALTER TABLE "patients" ALTER COLUMN "created_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_created_by_fkey";',
    addConstraint: 'ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'patient_notes.author_id': {
    dropNotNull: 'ALTER TABLE "patient_notes" ALTER COLUMN "author_id" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "patient_notes" DROP CONSTRAINT IF EXISTS "patient_notes_author_id_fkey";',
    addConstraint: 'ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'investigation_results.author_id': {
    dropNotNull: 'ALTER TABLE "investigation_results" ALTER COLUMN "author_id" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "investigation_results" DROP CONSTRAINT IF EXISTS "investigation_results_author_id_fkey";',
    addConstraint: 'ALTER TABLE "investigation_results" ADD CONSTRAINT "investigation_results_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'appointments.urologist_id': {
    dropNotNull: 'ALTER TABLE "appointments" ALTER COLUMN "urologist_id" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_urologist_id_fkey";',
    addConstraint: 'ALTER TABLE "appointments" ADD CONSTRAINT "appointments_urologist_id_fkey" FOREIGN KEY ("urologist_id") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'appointments.created_by': {
    dropNotNull: 'ALTER TABLE "appointments" ALTER COLUMN "created_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_created_by_fkey";',
    addConstraint: 'ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'investigation_bookings.created_by': {
    dropNotNull: 'ALTER TABLE "investigation_bookings" ALTER COLUMN "created_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "investigation_bookings" DROP CONSTRAINT IF EXISTS "investigation_bookings_created_by_fkey";',
    addConstraint: 'ALTER TABLE "investigation_bookings" ADD CONSTRAINT "investigation_bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'mdt_meetings.created_by': {
    dropNotNull: 'ALTER TABLE "mdt_meetings" ALTER COLUMN "created_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "mdt_meetings" DROP CONSTRAINT IF EXISTS "mdt_meetings_created_by_fkey";',
    addConstraint: 'ALTER TABLE "mdt_meetings" ADD CONSTRAINT "mdt_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'mdt_team_members.user_id': {
    dropNotNull: 'ALTER TABLE "mdt_team_members" ALTER COLUMN "user_id" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "mdt_team_members" DROP CONSTRAINT IF EXISTS "mdt_team_members_user_id_fkey";',
    addConstraint: 'ALTER TABLE "mdt_team_members" ADD CONSTRAINT "mdt_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'discharge_summaries.consultant_id': {
    dropNotNull: 'ALTER TABLE "discharge_summaries" ALTER COLUMN "consultant_id" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "discharge_summaries" DROP CONSTRAINT IF EXISTS "discharge_summaries_consultant_id_fkey";',
    addConstraint: 'ALTER TABLE "discharge_summaries" ADD CONSTRAINT "discharge_summaries_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'discharge_summaries.created_by': {
    dropNotNull: 'ALTER TABLE "discharge_summaries" ALTER COLUMN "created_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "discharge_summaries" DROP CONSTRAINT IF EXISTS "discharge_summaries_created_by_fkey";',
    addConstraint: 'ALTER TABLE "discharge_summaries" ADD CONSTRAINT "discharge_summaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  },
  'discharge_summaries.updated_by': {
    dropNotNull: 'ALTER TABLE "discharge_summaries" ALTER COLUMN "updated_by" DROP NOT NULL;',
    dropConstraint: 'ALTER TABLE "discharge_summaries" DROP CONSTRAINT IF EXISTS "discharge_summaries_updated_by_fkey";',
    addConstraint: 'ALTER TABLE "discharge_summaries" ADD CONSTRAINT "discharge_summaries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;'
  }
};

/**
 * Configuration for all foreign key constraints that need to be fixed
 * Each entry defines: table, column (constraint name is derived)
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
 * Create a database pool with the given configuration
 * @param {Object} config - Optional pool configuration for testing
 * @returns {Pool} PostgreSQL pool instance
 */
const createPool = (config = null) => {
  if (config) {
    return new Pool(config);
  }
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
};

/**
 * Get static SQL queries for a table.column combination
 * SECURITY: Returns only pre-defined static queries - no dynamic SQL generation
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @returns {Object|null} Object with dropNotNull, dropConstraint, addConstraint queries or null if not found
 */
const getStaticQueries = (table, column) => {
  const key = table + '.' + column;
  return STATIC_QUERIES[key] || null;
};

/**
 * Fix a single foreign key constraint to use SET NULL on delete
 * 
 * SECURITY: This function is safe from SQL injection because:
 * 1. All SQL queries are pre-built static strings in STATIC_QUERIES
 * 2. No string interpolation or concatenation is used for SQL
 * 3. Only hardcoded table.column keys are used to look up queries
 * 4. Invalid table.column combinations throw an error
 * 
 * @param {Object} client - PostgreSQL client instance
 * @param {string} table - Table name (must exist in STATIC_QUERIES)
 * @param {string} column - Column name (must exist in STATIC_QUERIES)
 */
const fixConstraint = async (client, table, column) => {
  const queries = getStaticQueries(table, column);
  
  if (!queries) {
    throw new Error('Invalid table.column combination: ' + table + '.' + column);
  }

  console.log('📋 Fixing ' + table + '.' + column + ' constraint...');

  // Execute pre-built static SQL queries
  await client.query(queries.dropNotNull);
  await client.query(queries.dropConstraint);
  await client.query(queries.addConstraint);

  console.log('✅ Fixed ' + table + '.' + column);
};

/**
 * This script fixes foreign key constraints for user deletions
 * It modifies constraints to SET NULL when a user is deleted,
 * allowing patient records to persist even after their doctor is removed
 * @param {Pool} poolInstance - Optional pool instance for testing
 */
const fixUserDeletionConstraints = async (poolInstance = null) => {
  const pool = poolInstance || createPool();
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
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Run migration as standalone script
 * @param {Pool} poolInstance - Optional pool instance for testing
 */
const runMigration = async (poolInstance = null) => {
  try {
    await fixUserDeletionConstraints(poolInstance);
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// Export functions for testing
export {
  STATIC_QUERIES,
  CONSTRAINT_CONFIGS,
  createPool,
  getStaticQueries,
  fixConstraint,
  fixUserDeletionConstraints,
  runMigration,
};

// Run the migration only when executed directly (not when imported)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  runMigration();
}
