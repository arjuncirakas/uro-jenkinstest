import pool from '../config/database.js';

/**
 * Comprehensive Audit Logging Service
 * HIPAA-compliant audit logging for security events
 */

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
      
      console.log('✅ Audit logs table created successfully');
    } else {
      console.log('✅ Audit logs table already exists');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize audit logs table:', error);
    return false;
  }
};

/**
 * Log an audit event
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
    
    await client.query(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        ip_address, user_agent, request_method, request_path, status,
        error_code, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      metadata ? JSON.stringify(metadata) : null
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




