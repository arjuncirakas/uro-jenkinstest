import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Comprehensive Audit Logging Service
 * HIPAA-compliant audit logging for security events
 * Includes hash chain immutability controls (application-level)
 */

/**
 * Calculate hash for a log entry
 * @param {Object} logEntry - Log entry data
 * @param {string} previousHash - Hash of previous log entry
 * @returns {string} SHA-256 hash
 */
const calculateLogHash = (logEntry, previousHash = '') => {
  // Create a deterministic string representation of the log entry
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

// Initialize audit_logs table
export const initializeAuditLogsTable = async () => {
  try {
    const client = await pool.connect();
    
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE audit_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          user_email VARCHAR(255),
          user_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100),
          resource_id INTEGER,
          ip_address VARCHAR(45),
          user_agent TEXT,
          request_method VARCHAR(10),
          request_path VARCHAR(500),
          status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'error')),
          error_code VARCHAR(50),
          error_message TEXT,
          metadata JSONB,
          previous_hash VARCHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes for performance
      await client.query(`
        CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_status ON audit_logs(status);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address);
      `);
      
      await client.query(`
        CREATE INDEX idx_audit_logs_previous_hash ON audit_logs(previous_hash);
      `);
      
      console.log('✅ Audit logs table created successfully with hash chain support');
    } else {
      console.log('✅ Audit logs table already exists');
      
      // Add previous_hash column if it doesn't exist (migration)
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
      }
    }
    
    // Initialize database-level immutability (triggers)
    // Note: This must be done AFTER any migrations that update existing logs
    // The migration above (updating previous_hash) must complete before triggers are created
    await initializeAuditLogImmutability(client);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize audit logs table:', error);
    return false;
  }
};

/**
 * Initialize database-level immutability for audit logs
 * Creates triggers to prevent DELETE and UPDATE operations
 * IMPORTANT: This should only be called AFTER any migrations that update existing logs
 */
const initializeAuditLogImmutability = async (client) => {
  try {
    // Check if triggers already exist
    const triggersExist = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.triggers 
      WHERE event_object_table = 'audit_logs' 
        AND event_object_schema = 'public'
        AND trigger_name IN ('audit_logs_prevent_delete', 'audit_logs_prevent_update')
    `);
    
    const triggersCount = parseInt(triggersExist.rows[0].count);
    
    if (triggersCount === 2) {
      console.log('✅ Audit log immutability triggers already exist, updating functions...');
    } else {
      console.log('🔒 Setting up database-level audit log immutability...');
    }
    
    // Create DELETE prevention function
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted. Deletion attempted on log ID: %', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create UPDATE prevention function
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
    
    // Drop existing triggers if they exist (for re-creation)
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
    
    // Create UPDATE prevention trigger
    await client.query(`
      CREATE TRIGGER audit_logs_prevent_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_update();
    `);
    
    console.log('✅ Database-level immutability triggers created successfully');
    console.log('   - DELETE operations are now blocked');
    console.log('   - UPDATE operations are now blocked');
    console.log('   - Only INSERT operations are allowed');
    
  } catch (error) {
    console.error('⚠️  Failed to create immutability triggers:', error.message);
    console.log('   Note: Triggers require appropriate database permissions');
    console.log('   You can run the migration script manually: node backend/scripts/implementAuditLogImmutability.js');
    // Don't throw - allow application to continue even if triggers can't be created
  }
};

/**
 * Log an audit event with hash chain immutability
 * @param {Object} logData - Audit log data
 */
export const logAuditEvent = async (logData) => {
  try {
    const client = await pool.connect();
    
    const {
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      requestMethod,
      requestPath,
      status,
      errorCode,
      errorMessage,
      metadata
    } = logData;
    
    // Get the last log entry to calculate its hash (which becomes previous_hash for new entry)
    const lastLogResult = await client.query(`
      SELECT id, previous_hash, timestamp, user_id, user_email, user_role, 
             action, resource_type, resource_id, ip_address, user_agent,
             request_method, request_path, status, error_code, error_message, metadata
      FROM audit_logs 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    let previousEntryHash = '';
    if (lastLogResult.rows.length > 0) {
      // Calculate hash of the last entry (this becomes previous_hash for the new entry)
      const lastLog = lastLogResult.rows[0];
      previousEntryHash = calculateLogHash(lastLog, lastLog.previous_hash || '');
    }
    
    // Insert new log entry with previous_hash = hash of the previous entry
    await client.query(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        ip_address, user_agent, request_method, request_path, status,
        error_code, error_message, metadata, previous_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, timestamp
    `, [
      userId || null,
      userEmail || null,
      userRole || null,
      action,
      resourceType || null,
      resourceId || null,
      ipAddress || null,
      userAgent || null,
      requestMethod || null,
      requestPath || null,
      status,
      errorCode || null,
      errorMessage || null,
      metadata ? JSON.stringify(metadata) : null,
      previousEntryHash
    ]);
    
    client.release();
  } catch (error) {
    // Don't throw - audit logging should never break the application
    console.error('❌ Failed to log audit event:', error);
  }
};

/**
 * Log authentication events
 */
export const logAuthEvent = async (req, action, status, errorMessage = null) => {
  const user = req.user || {};
  
  await logAuditEvent({
    userId: user.id || null,
    userEmail: user.email || req.body?.email || null,
    userRole: user.role || null,
    action: `auth.${action}`,
    resourceType: 'authentication',
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestMethod: req.method,
    requestPath: req.path,
    status: status,
    errorMessage: errorMessage,
    metadata: {
      endpoint: req.originalUrl,
      body: action === 'login' ? { email: req.body?.email } : {} // Don't log passwords
    }
  });
};

/**
 * Log PHI access events
 */
export const logPHIAccess = async (req, resourceType, resourceId, action) => {
  const user = req.user || {};
  
  await logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: `phi.${action}`,
    resourceType: resourceType,
    resourceId: resourceId,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestMethod: req.method,
    requestPath: req.path,
    status: 'success',
    metadata: {
      endpoint: req.originalUrl
    }
  });
};

/**
 * Log privilege changes
 */
export const logPrivilegeChange = async (req, targetUserId, changes) => {
  const user = req.user || {};
  
  await logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'privilege.change',
    resourceType: 'user',
    resourceId: targetUserId,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestMethod: req.method,
    requestPath: req.path,
    status: 'success',
    metadata: {
      changes: changes,
      endpoint: req.originalUrl
    }
  });
};

/**
 * Log failed access attempts
 */
export const logFailedAccess = async (req, reason) => {
  await logAuditEvent({
    userId: null,
    userEmail: req.body?.email || null,
    userRole: null,
    action: 'access.denied',
    resourceType: null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestMethod: req.method,
    requestPath: req.path,
    status: 'failure',
    errorMessage: reason,
    metadata: {
      endpoint: req.originalUrl,
      reason: reason
    }
  });
};

/**
 * Log data export events
 */
export const logDataExport = async (req, exportType, recordCount) => {
  const user = req.user || {};
  
  await logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'data.export',
    resourceType: exportType,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    requestMethod: req.method,
    requestPath: req.path,
    status: 'success',
    metadata: {
      exportType: exportType,
      recordCount: recordCount,
      endpoint: req.originalUrl
    }
  });
};

/**
 * Verify database-level immutability status
 * Checks if DELETE and UPDATE triggers are active
 * @returns {Object} Immutability status
 */
export const verifyImmutabilityStatus = async () => {
  try {
    const client = await pool.connect();
    
    const triggersResult = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'audit_logs'
        AND event_object_schema = 'public'
        AND trigger_name IN ('audit_logs_prevent_delete', 'audit_logs_prevent_update')
      ORDER BY trigger_name;
    `);
    
    const triggers = triggersResult.rows;
    const deleteTrigger = triggers.find(t => t.trigger_name === 'audit_logs_prevent_delete');
    const updateTrigger = triggers.find(t => t.trigger_name === 'audit_logs_prevent_update');
    
    client.release();
    
    return {
      deleteProtection: deleteTrigger ? 'ACTIVE' : 'MISSING',
      updateProtection: updateTrigger ? 'ACTIVE' : 'MISSING',
      triggers: triggers,
      isFullyProtected: deleteTrigger && updateTrigger,
      message: deleteTrigger && updateTrigger 
        ? 'Database-level immutability is fully active'
        : 'Database-level immutability is not fully active - some triggers are missing'
    };
  } catch (error) {
    console.error('❌ Failed to verify immutability status:', error);
    return {
      deleteProtection: 'UNKNOWN',
      updateProtection: 'UNKNOWN',
      triggers: [],
      isFullyProtected: false,
      error: error.message,
      message: 'Failed to verify immutability status'
    };
  }
};

/**
 * Verify audit log integrity using hash chain
 * Detects any tampering or modification of audit logs
 * @returns {Object} Verification result with status and details
 */
export const verifyAuditLogIntegrity = async () => {
  try {
    const client = await pool.connect();
    
    // Get all logs in order
    const logsResult = await client.query(`
      SELECT id, timestamp, user_id, user_email, user_role, 
             action, resource_type, resource_id, ip_address, user_agent,
             request_method, request_path, status, error_code, error_message, 
             metadata, previous_hash
      FROM audit_logs 
      ORDER BY id ASC
    `);
    
    const logs = logsResult.rows;
    
    if (logs.length === 0) {
      client.release();
      return {
        isValid: true,
        totalLogs: 0,
        verifiedLogs: 0,
        tamperedLogs: [],
        message: 'No audit logs found'
      };
    }
    
    const tamperedLogs = [];
    
    for (const [i, log] of logs.entries()) {
      // Check if previous_hash matches the hash of the previous entry
      if (i > 0) {
        // Calculate hash of previous entry
        const previousLog = logs[i - 1];
        const expectedPreviousHash = calculateLogHash(previousLog, previousLog.previous_hash || '');
        
        // Current entry's previous_hash should equal hash of previous entry
        if (log.previous_hash !== expectedPreviousHash) {
          tamperedLogs.push({
            logId: log.id,
            timestamp: log.timestamp,
            action: log.action,
            expectedPreviousHash: expectedPreviousHash,
            storedPreviousHash: log.previous_hash,
            issue: log.previous_hash === null ? 'Missing hash (pre-migration log)' : 'Hash chain broken - possible tampering'
          });
        }
      } else if (log.previous_hash !== '' && log.previous_hash !== null) {
        // First entry should have empty previous_hash
        tamperedLogs.push({
          logId: log.id,
          timestamp: log.timestamp,
          action: log.action,
          expectedPreviousHash: '',
          storedPreviousHash: log.previous_hash,
          issue: 'First entry should have empty previous_hash'
        });
      }
    }
    
    client.release();
    
    return {
      isValid: tamperedLogs.length === 0,
      totalLogs: logs.length,
      verifiedLogs: logs.length - tamperedLogs.length,
      tamperedLogs: tamperedLogs,
      message: tamperedLogs.length === 0 
        ? `All ${logs.length} audit logs verified - no tampering detected`
        : `⚠️ ${tamperedLogs.length} log(s) with integrity issues detected`
    };
  } catch (error) {
    console.error('❌ Failed to verify audit log integrity:', error);
    return {
      isValid: false,
      totalLogs: 0,
      verifiedLogs: 0,
      tamperedLogs: [],
      error: error.message,
      message: 'Failed to verify audit log integrity'
    };
  }
};






