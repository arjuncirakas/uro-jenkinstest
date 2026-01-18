import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Fix audit log immutability trigger to allow user deletion
 * This script updates the prevent_audit_log_update() function to allow
 * setting user_id to NULL when a user is deleted, while maintaining
 * immutability for all other fields.
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'uroprep',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const fixAuditLogTrigger = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating audit log immutability trigger to allow user deletion...\n');
    
    await client.query('BEGIN');
    
    // Update the trigger function to allow setting user_id to NULL
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_update()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Allow setting user_id to NULL when a user is deleted (foreign key ON DELETE SET NULL)
        -- This preserves audit trail integrity while allowing user deletion
        -- All other fields remain immutable
        IF (
          OLD.id IS DISTINCT FROM NEW.id OR
          OLD.timestamp IS DISTINCT FROM NEW.timestamp OR
          (OLD.user_id IS DISTINCT FROM NEW.user_id AND NEW.user_id IS NOT NULL) OR
          OLD.user_email IS DISTINCT FROM NEW.user_email OR
          OLD.user_role IS DISTINCT FROM NEW.user_role OR
          OLD.action IS DISTINCT FROM NEW.action OR
          OLD.resource_type IS DISTINCT FROM NEW.resource_type OR
          OLD.resource_id IS DISTINCT FROM NEW.resource_id OR
          OLD.ip_address IS DISTINCT FROM NEW.ip_address OR
          OLD.user_agent IS DISTINCT FROM NEW.user_agent OR
          OLD.request_method IS DISTINCT FROM NEW.request_method OR
          OLD.request_path IS DISTINCT FROM NEW.request_path OR
          OLD.status IS DISTINCT FROM NEW.status OR
          OLD.error_code IS DISTINCT FROM NEW.error_code OR
          OLD.error_message IS DISTINCT FROM NEW.error_message OR
          OLD.metadata IS DISTINCT FROM NEW.metadata OR
          OLD.previous_hash IS DISTINCT FROM NEW.previous_hash OR
          OLD.created_at IS DISTINCT FROM NEW.created_at
        ) THEN
          RAISE EXCEPTION 'Audit logs are immutable and cannot be modified. Update attempted on log ID: %', OLD.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Audit log trigger updated successfully!');
    console.log('✅ User deletion will now work while maintaining audit log immutability');
    console.log('   - user_id can be set to NULL when a user is deleted');
    console.log('   - All other fields remain immutable');
    console.log('   - Audit trail integrity is preserved (user_email and user_role remain)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Failed to update audit log trigger:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
  fixAuditLogTrigger()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default fixAuditLogTrigger;
