import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

/**
 * Implement Database-Level Audit Log Immutability
 * 
 * This script creates:
 * 1. Database trigger to prevent DELETE operations on audit_logs
 * 2. Database trigger to prevent UPDATE operations on audit_logs (except for specific system fields)
 * 3. Read-only role for audit log access
 * 4. Function to verify immutability
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'uroprep',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

/**
 * Create database trigger function to prevent DELETE operations
 */
const createPreventDeleteFunction = async (client) => {
  console.log('📝 Creating function to prevent DELETE on audit_logs...');
  
  await client.query(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted. Deletion attempted on log ID: %', OLD.id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  console.log('✅ Function prevent_audit_log_delete() created');
};

/**
 * Create database trigger function to prevent UPDATE operations
 * Allows updates only to specific system fields if needed (e.g., archival flags)
 */
const createPreventUpdateFunction = async (client) => {
  console.log('📝 Creating function to prevent UPDATE on audit_logs...');
  
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
  
  console.log('✅ Function prevent_audit_log_update() created');
};

/**
 * Create triggers on audit_logs table
 */
const createTriggers = async (client) => {
  console.log('📝 Creating triggers on audit_logs table...');
  
  // Drop existing triggers if they exist
  await client.query(`
    DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;
  `);
  
  await client.query(`
    DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;
  `);
  
  // Create DELETE prevention trigger
  await client.query(`
    CREATE TRIGGER audit_logs_prevent_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_delete();
  `);
  
  console.log('✅ DELETE prevention trigger created');
  
  // Create UPDATE prevention trigger
  await client.query(`
    CREATE TRIGGER audit_logs_prevent_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_update();
  `);
  
  console.log('✅ UPDATE prevention trigger created');
};

/**
 * Create read-only role for audit log access
 */
const createReadOnlyRole = async (client) => {
  console.log('📝 Creating read-only role for audit logs...');
  
  const roleName = 'audit_logs_reader';
  
  try {
    // Check if role exists
    const roleExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_roles WHERE rolname = $1
      );
    `, [roleName]);
    
    if (!roleExists.rows[0].exists) {
      // Create read-only role
      await client.query(`
        CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${process.env.AUDIT_LOGS_READER_PASSWORD || 'change_this_password_in_production'}';
      `);
      
      console.log(`✅ Role ${roleName} created`);
    } else {
      console.log(`✅ Role ${roleName} already exists`);
    }
    
    // Grant SELECT permission on audit_logs table
    await client.query(`
      GRANT SELECT ON audit_logs TO ${roleName};
    `);
    
    // Grant SELECT permission on sequence (if needed for queries)
    await client.query(`
      GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO ${roleName};
    `);
    
    console.log(`✅ Read permissions granted to ${roleName}`);
    
  } catch (error) {
    console.error(`⚠️  Error creating read-only role: ${error.message}`);
    console.log('   Note: Role creation may require superuser privileges');
    console.log('   You can create the role manually with:');
    console.log(`   CREATE ROLE ${roleName} WITH LOGIN PASSWORD 'your_password';`);
    console.log(`   GRANT SELECT ON audit_logs TO ${roleName};`);
  }
};

/**
 * Create function to verify immutability (check if triggers exist)
 */
const createVerificationFunction = async (client) => {
  console.log('📝 Creating verification function...');
  
  await client.query(`
    CREATE OR REPLACE FUNCTION verify_audit_log_immutability()
    RETURNS TABLE (
      trigger_name TEXT,
      event_manipulation TEXT,
      action_timing TEXT,
      action_statement TEXT,
      status TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        t.trigger_name::TEXT,
        e.event_manipulation::TEXT,
        t.action_timing::TEXT,
        t.action_statement::TEXT,
        CASE 
          WHEN t.trigger_name IS NOT NULL THEN 'ACTIVE'
          ELSE 'MISSING'
        END::TEXT as status
      FROM information_schema.triggers t
      JOIN information_schema.triggered_event_manipulation e 
        ON t.trigger_name = e.trigger_name
      WHERE t.event_object_table = 'audit_logs'
        AND t.trigger_schema = 'public'
        AND e.event_object_table = 'audit_logs'
        AND e.event_object_schema = 'public'
      ORDER BY t.trigger_name;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  console.log('✅ Verification function created');
};

/**
 * Test immutability by attempting DELETE and UPDATE
 */
const testImmutability = async (client) => {
  console.log('\n🧪 Testing immutability protection...');
  
  try {
    // Get a test log entry (if any exist)
    const testLog = await client.query(`
      SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1
    `);
    
    if (testLog.rows.length === 0) {
      console.log('⚠️  No audit logs found to test. Immutability triggers are installed.');
      return;
    }
    
    const testId = testLog.rows[0].id;
    
    // Test DELETE prevention
    try {
      await client.query(`DELETE FROM audit_logs WHERE id = $1`, [testId]);
      console.error('❌ FAILED: DELETE was allowed (should have been prevented)');
    } catch (deleteError) {
      if (deleteError.message.includes('immutable')) {
        console.log('✅ DELETE prevention working correctly');
      } else {
        console.error('❌ Unexpected error:', deleteError.message);
      }
    }
    
    // Test UPDATE prevention
    try {
      await client.query(`
        UPDATE audit_logs 
        SET action = 'test_update' 
        WHERE id = $1
      `, [testId]);
      console.error('❌ FAILED: UPDATE was allowed (should have been prevented)');
    } catch (updateError) {
      if (updateError.message.includes('immutable')) {
        console.log('✅ UPDATE prevention working correctly');
      } else {
        console.error('❌ Unexpected error:', updateError.message);
      }
    }
    
  } catch (error) {
    console.error('⚠️  Error during immutability test:', error.message);
  }
};

/**
 * Check and migrate previous_hash if needed (before triggers are created)
 */
const migratePreviousHashIfNeeded = async (client) => {
  // Check if previous_hash column exists
  const columnExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs' 
      AND column_name = 'previous_hash'
    );
  `);
  
  if (!columnExists.rows[0].exists) {
    console.log('🔄 Adding previous_hash column to audit_logs table...');
    await client.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN previous_hash VARCHAR(64);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs(previous_hash);
    `);
    
    // Migrate existing logs: calculate hashes for all existing entries
    console.log('🔄 Calculating hashes for existing audit logs...');
    const existingLogs = await client.query(`
      SELECT * FROM audit_logs 
      ORDER BY id ASC
    `);
    
    if (existingLogs.rows.length > 0) {
      // Hash calculation function
      const calculateLogHash = (logEntry, previousHash = '') => {
        const logString = JSON.stringify({
          id: logEntry.id,
          timestamp: logEntry.timestamp,
          userId: logEntry.user_id,
          userEmail: logEntry.user_email,
          userRole: logEntry.user_role,
          action: logEntry.action,
          resourceType: logEntry.resource_type,
          resourceId: logEntry.resource_id,
          ipAddress: logEntry.ip_address,
          userAgent: logEntry.user_agent,
          requestMethod: logEntry.request_method,
          requestPath: logEntry.request_path,
          status: logEntry.status,
          errorCode: logEntry.error_code,
          errorMessage: logEntry.error_message,
          metadata: logEntry.metadata,
          previousHash: previousHash
        });
        
        return crypto.createHash('sha256').update(logString).digest('hex');
      };
      
      let previousEntryHash = '';
      for (const log of existingLogs.rows) {
        
        // Set previous_hash to the hash of the previous entry
        await client.query(`
          UPDATE audit_logs 
          SET previous_hash = $1 
          WHERE id = $2
        `, [previousEntryHash, log.id]);
        
        // Calculate hash of current entry for next iteration
        previousEntryHash = calculateLogHash(log, previousEntryHash);
      }
      
      console.log(`✅ Migrated ${existingLogs.rows.length} existing audit log entries with hash chain`);
    } else {
      console.log('ℹ️  No existing audit logs to migrate');
    }
  } else {
    console.log('✅ previous_hash column already exists');
  }
};

/**
 * Main execution function
 */
const implementAuditLogImmutability = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔒 Implementing Database-Level Audit Log Immutability\n');
    console.log('=' .repeat(60));
    
    await client.query('BEGIN');
    
    // Step 0: Migrate previous_hash if needed (MUST be done before triggers)
    await migratePreviousHashIfNeeded(client);
    
    // Step 1: Create prevention functions
    await createPreventDeleteFunction(client);
    await createPreventUpdateFunction(client);
    
    // Step 2: Create triggers
    await createTriggers(client);
    
    // Step 3: Create read-only role (optional, may require superuser)
    await createReadOnlyRole(client);
    
    // Step 4: Create verification function
    await createVerificationFunction(client);
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database-level immutability implementation completed!\n');
    
    // Test immutability
    await testImmutability(client);
    
    // Verify triggers
    console.log('\n📋 Verifying triggers...');
    const verification = await client.query(`
      SELECT * FROM verify_audit_log_immutability()
    `);
    
    if (verification.rows.length > 0) {
      console.log('\nActive Triggers:');
      verification.rows.forEach(row => {
        console.log(`  - ${row.trigger_name} (${row.event_manipulation}) - ${row.status}`);
      });
    } else {
      console.log('⚠️  No triggers found (this should not happen)');
    }
    
    console.log('\n✅ Audit log immutability is now enforced at the database level');
    console.log('   - DELETE operations are blocked');
    console.log('   - UPDATE operations are blocked');
    console.log('   - Only INSERT operations are allowed');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error implementing audit log immutability:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  implementAuditLogImmutability()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default implementAuditLogImmutability;
