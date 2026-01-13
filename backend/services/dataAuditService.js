import pool from '../config/database.js';
import { getTableClassification } from './dataClassificationService.js';

/**
 * Data Audit Service
 * Provides data aggregation and analysis functions for GDPR/HIPAA compliance auditing
 */

/**
 * Get data inventory - aggregate information about all database tables
 */
export const getDataInventory = async () => {
  const client = await pool.connect();
  
  try {
    // Get all tables with their sizes and record counts
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    // Get record counts for each table
    const inventory = await Promise.all(
      tablesResult.rows.map(async (table) => {
        try {
          const countResult = await client.query(
            `SELECT COUNT(*) as count FROM ${table.tablename}`
          );
          
          // Get classification (non-blocking - returns default if fails)
          let classification = null;
          try {
            classification = await getTableClassification(table.tablename);
          } catch (err) {
            // Silently fail to maintain backward compatibility
            console.warn(`Could not get classification for ${table.tablename}:`, err.message);
          }
          
          return {
            tableName: table.tablename,
            size: table.size,
            sizeBytes: parseInt(table.size_bytes),
            recordCount: parseInt(countResult.rows[0].count),
            category: categorizeTable(table.tablename), // Keep existing category
            classificationLevel: classification?.classification_level || null, // Add new field
            classificationLabel: classification?.classification_label || null
          };
        } catch (error) {
          // Some tables might not be accessible or might have issues
          // Get classification even for error cases
          let classification = null;
          try {
            classification = await getTableClassification(table.tablename);
          } catch (err) {
            // Silently fail
          }
          
          return {
            tableName: table.tablename,
            size: table.size,
            sizeBytes: parseInt(table.size_bytes),
            recordCount: 0,
            category: categorizeTable(table.tablename),
            classificationLevel: classification?.classification_level || null,
            classificationLabel: classification?.classification_label || null,
            error: error.message
          };
        }
      })
    );
    
    // Calculate totals
    const totals = {
      totalTables: inventory.length,
      totalRecords: inventory.reduce((sum, table) => sum + (table.recordCount || 0), 0),
      totalSizeBytes: inventory.reduce((sum, table) => sum + (table.sizeBytes || 0), 0),
      totalSize: formatBytes(inventory.reduce((sum, table) => sum + (table.sizeBytes || 0), 0))
    };
    
    // Group by category
    const byCategory = inventory.reduce((acc, table) => {
      const category = table.category;
      if (!acc[category]) {
        acc[category] = {
          tables: [],
          recordCount: 0,
          sizeBytes: 0
        };
      }
      acc[category].tables.push(table);
      acc[category].recordCount += table.recordCount || 0;
      acc[category].sizeBytes += table.sizeBytes || 0;
      return acc;
    }, {});
    
    // Format category sizes
    Object.keys(byCategory).forEach(category => {
      byCategory[category].size = formatBytes(byCategory[category].sizeBytes);
    });
    
    return {
      inventory,
      totals,
      byCategory
    };
  } catch (error) {
    console.error('Error getting data inventory:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Categorize table by name for data classification
 */
const categorizeTable = (tableName) => {
  const lowerName = tableName.toLowerCase();
  
  // Medical/PHI data
  if (lowerName.includes('patient') || lowerName.includes('medical') || 
      lowerName.includes('diagnosis') || lowerName.includes('treatment') ||
      lowerName.includes('psa') || lowerName.includes('investigation') ||
      lowerName.includes('appointment') || lowerName.includes('note')) {
    return 'Medical/PHI';
  }
  
  // Demographic data
  if (lowerName.includes('user') || lowerName.includes('doctor') || 
      lowerName.includes('nurse') || lowerName.includes('gp')) {
    return 'Demographic';
  }
  
  // Operational data
  if (lowerName.includes('booking') || lowerName.includes('mdt') ||
      lowerName.includes('consent') || lowerName.includes('department')) {
    return 'Operational';
  }
  
  // System/Audit data
  if (lowerName.includes('audit') || lowerName.includes('log') ||
      lowerName.includes('token') || lowerName.includes('otp') ||
      lowerName.includes('password')) {
    return 'System Usage';
  }
  
  return 'Other';
};

/**
 * Format bytes to human-readable size
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get access logs with filters
 */
export const getAccessLogs = async (filters = {}) => {
  const client = await pool.connect();
  
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Apply filters
    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }
    
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters.actionType) {
      query += ` AND action LIKE $${paramIndex}`;
      params.push(`%${filters.actionType}%`);
      paramIndex++;
    }
    
    if (filters.resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(filters.resourceType);
      paramIndex++;
    }
    
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Add ordering and pagination
    query += ' ORDER BY timestamp DESC';
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    return {
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting access logs:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get processing activities aggregated by action type
 */
export const getProcessingActivities = async (filters = {}) => {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        action,
        resource_type,
        COUNT(*) as count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters.actionType) {
      query += ` AND action LIKE $${paramIndex}`;
      params.push(`%${filters.actionType}%`);
      paramIndex++;
    }
    
    if (filters.resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(filters.resourceType);
      paramIndex++;
    }
    
    query += ' GROUP BY action, resource_type ORDER BY count DESC';
    
    const result = await client.query(query, params);
    
    return {
      activities: result.rows.map(row => ({
        action: row.action,
        resourceType: row.resource_type,
        count: parseInt(row.count),
        firstOccurrence: row.first_occurrence,
        lastOccurrence: row.last_occurrence,
        uniqueUsers: parseInt(row.unique_users)
      }))
    };
  } catch (error) {
    console.error('Error getting processing activities:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get retention information
 */
export const getRetentionInfo = async () => {
  const client = await pool.connect();
  
  try {
    // Get oldest and newest records from key tables
    const retentionQueries = [
      {
        table: 'patients',
        name: 'Patient Records',
        retentionYears: 10
      },
      {
        table: 'users',
        name: 'User Accounts',
        retentionYears: 7
      },
      {
        table: 'audit_logs',
        name: 'Audit Logs',
        retentionYears: 3
      },
      {
        table: 'appointments',
        name: 'Appointments',
        retentionYears: 10
      },
      {
        table: 'investigation_results',
        name: 'Investigation Results',
        retentionYears: 10
      }
    ];
    
    const retentionData = await Promise.all(
      retentionQueries.map(async (config) => {
        try {
          // Check if table exists and has created_at column
          const tableCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name IN ('created_at', 'timestamp')
            LIMIT 1
          `, [config.table]);
          
          if (tableCheck.rows.length === 0) {
            return {
              table: config.table,
              name: config.name,
              retentionYears: config.retentionYears,
              error: 'Table or created_at column not found'
            };
          }
          
          const dateColumn = tableCheck.rows[0].column_name;
          
          // Get oldest and newest records
          const oldestQuery = await client.query(`
            SELECT ${dateColumn} as oldest_date, COUNT(*) as total_count
            FROM ${config.table}
            ORDER BY ${dateColumn} ASC
            LIMIT 1
          `);
          
          const newestQuery = await client.query(`
            SELECT ${dateColumn} as newest_date
            FROM ${config.table}
            ORDER BY ${dateColumn} DESC
            LIMIT 1
          `);
          
          const oldestDate = oldestQuery.rows[0]?.oldest_date;
          const newestDate = newestQuery.rows[0]?.newest_date;
          const totalCount = oldestQuery.rows[0]?.total_count || 0;
          
          // Calculate age
          let ageInYears = null;
          if (oldestDate) {
            const ageInMs = new Date() - new Date(oldestDate);
            ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365);
          }
          
          // Check if approaching retention limit
          const yearsUntilDeletion = oldestDate 
            ? config.retentionYears - ageInYears 
            : null;
          const approachingDeletion = yearsUntilDeletion !== null && yearsUntilDeletion <= 1;
          
          return {
            table: config.table,
            name: config.name,
            retentionYears: config.retentionYears,
            oldestRecord: oldestDate,
            newestRecord: newestDate,
            totalRecords: parseInt(totalCount),
            ageInYears: ageInYears ? Math.round(ageInYears * 100) / 100 : null,
            yearsUntilDeletion: yearsUntilDeletion ? Math.round(yearsUntilDeletion * 100) / 100 : null,
            approachingDeletion
          };
        } catch (error) {
          return {
            table: config.table,
            name: config.name,
            retentionYears: config.retentionYears,
            error: error.message
          };
        }
      })
    );
    
    return {
      retentionData,
      summary: {
        totalTables: retentionData.length,
        tablesApproachingDeletion: retentionData.filter(r => r.approachingDeletion).length
      }
    };
  } catch (error) {
    console.error('Error getting retention info:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get third-party sharing events
 */
export const getThirdPartySharing = async (filters = {}) => {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        id,
        timestamp,
        user_id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_id,
        ip_address,
        metadata
      FROM audit_logs
      WHERE action LIKE '%export%' OR action LIKE '%share%' OR action LIKE '%transfer%'
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 1000';
    
    const result = await client.query(query, params);
    
    return {
      sharingEvents: result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
      }))
    };
  } catch (error) {
    console.error('Error getting third-party sharing:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate compliance metrics
 */
export const getComplianceMetrics = async () => {
  const client = await pool.connect();
  
  try {
    // Get total verified users
    const verifiedUsersQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_verified = true
    `);
    
    const totalVerified = parseInt(verifiedUsersQuery.rows[0]?.count || 0);
    
    // Get failed and successful login attempts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const failedLoginsQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action LIKE 'auth.%' 
        AND status = 'failure'
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const failedLogins = parseInt(failedLoginsQuery.rows[0]?.count || 0);
    
    const successfulLoginsQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action LIKE 'auth.%' 
        AND status = 'success'
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const successfulLogins = parseInt(successfulLoginsQuery.rows[0]?.count || 0);
    
    // Get PHI access events (last 30 days)
    const phiAccessQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE (action LIKE 'phi.%' OR resource_type = 'patient')
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const phiAccessCount = parseInt(phiAccessQuery.rows[0]?.count || 0);
    
    // Get unique users accessing PHI (last 30 days)
    const uniqueUsersQuery = await client.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM audit_logs
      WHERE (action LIKE 'phi.%' OR resource_type = 'patient')
        AND timestamp >= $1
        AND user_id IS NOT NULL
    `, [thirtyDaysAgo]);
    
    const uniqueUsersAccessingPHI = parseInt(uniqueUsersQuery.rows[0]?.count || 0);
    
    // Get data export events (last 30 days)
    const exportQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action LIKE '%export%'
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const exportCount = parseInt(exportQuery.rows[0]?.count || 0);
    
    // Get account lockout events (last 30 days)
    const lockoutQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action LIKE '%lockout%' OR action LIKE '%account_locked%'
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const accountLockouts = parseInt(lockoutQuery.rows[0]?.count || 0);
    
    // Get suspicious activities (failed access attempts to PHI)
    const suspiciousQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE (action LIKE 'phi.%' OR resource_type = 'patient')
        AND status = 'failure'
        AND timestamp >= $1
    `, [thirtyDaysAgo]);
    
    const suspiciousActivities = parseInt(suspiciousQuery.rows[0]?.count || 0);
    
    return {
      successfulLoginAttempts30Days: successfulLogins,
      failedLoginAttempts30Days: failedLogins,
      phiAccessEvents30Days: phiAccessCount,
      uniqueUsersAccessingPHI30Days: uniqueUsersAccessingPHI,
      dataExports30Days: exportCount,
      accountLockouts30Days: accountLockouts,
      suspiciousActivities30Days: suspiciousActivities,
      totalVerifiedUsers: totalVerified,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting compliance metrics:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get time-series data for charts (last 30 days)
 */
export const getChartData = async () => {
  const client = await pool.connect();
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get daily breakdown of successful and failed logins
    const loginTrendsQuery = await client.query(`
      SELECT 
        DATE_TRUNC('day', timestamp)::date as date,
        COUNT(*) FILTER (WHERE status = 'success') as successful_logins,
        COUNT(*) FILTER (WHERE status = 'failure') as failed_logins
      FROM audit_logs
      WHERE action LIKE 'auth.%'
        AND timestamp >= $1
      GROUP BY DATE_TRUNC('day', timestamp)::date
      ORDER BY DATE_TRUNC('day', timestamp)::date ASC
    `, [thirtyDaysAgo]);
    
    // Get daily breakdown of PHI access
    const phiAccessTrendsQuery = await client.query(`
      SELECT 
        DATE_TRUNC('day', timestamp)::date as date,
        COUNT(*) as phi_access_count
      FROM audit_logs
      WHERE (action LIKE 'phi.%' OR resource_type = 'patient')
        AND status = 'success'
        AND timestamp >= $1
      GROUP BY DATE_TRUNC('day', timestamp)::date
      ORDER BY DATE_TRUNC('day', timestamp)::date ASC
    `, [thirtyDaysAgo]);
    
    // Get daily breakdown of data exports
    const exportTrendsQuery = await client.query(`
      SELECT 
        DATE_TRUNC('day', timestamp)::date as date,
        COUNT(*) as export_count
      FROM audit_logs
      WHERE action LIKE '%export%'
        AND timestamp >= $1
      GROUP BY DATE_TRUNC('day', timestamp)::date
      ORDER BY DATE_TRUNC('day', timestamp)::date ASC
    `, [thirtyDaysAgo]);
    
    // Combine all data by date
    const dateMap = new Map();
    
    // Initialize all dates in the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        successfulLogins: 0,
        failedLogins: 0,
        phiAccess: 0,
        dataExports: 0
      });
    }
    
    // Add login trends
    loginTrendsQuery.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        dateMap.get(dateStr).successfulLogins = parseInt(row.successful_logins || 0);
        dateMap.get(dateStr).failedLogins = parseInt(row.failed_logins || 0);
      }
    });
    
    // Add PHI access trends
    phiAccessTrendsQuery.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        dateMap.get(dateStr).phiAccess = parseInt(row.phi_access_count || 0);
      }
    });
    
    // Add export trends
    exportTrendsQuery.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        dateMap.get(dateStr).dataExports = parseInt(row.export_count || 0);
      }
    });
    
    // Convert to array and format dates
    const chartData = Array.from(dateMap.values()).map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      successfulLogins: item.successfulLogins,
      failedLogins: item.failedLogins,
      phiAccess: item.phiAccess,
      dataExports: item.dataExports
    }));
    
    return {
      loginTrends: chartData,
      phiAccessTrends: chartData,
      exportTrends: chartData
    };
  } catch (error) {
    console.error('Error getting chart data:', error);
    throw error;
  } finally {
    client.release();
  }
};

