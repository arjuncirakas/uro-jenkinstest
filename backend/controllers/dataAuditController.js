import {
  getDataInventory,
  getAccessLogs,
  getProcessingActivities,
  getRetentionInfo,
  getThirdPartySharing,
  getComplianceMetrics
} from '../services/dataAuditService.js';
import { logAuditEvent, verifyAuditLogIntegrity, verifyImmutabilityStatus } from '../services/auditLogger.js';

/**
 * Get data inventory
 */
export const getDataInventoryController = async (req, res) => {
  try {
    // Log access to data audit
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.inventory_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const inventory = await getDataInventory();
    
    res.json({
      success: true,
      message: 'Data inventory retrieved successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error in getDataInventoryController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.inventory_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve data inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get access logs with filters
 */
export const getAccessLogsController = async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      actionType: req.query.actionType || null,
      resourceType: req.query.resourceType || null,
      status: req.query.status || null,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 1000) filters.limit = 50;
    
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.access_logs_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: { filters }
    });
    
    const result = await getAccessLogs(filters);
    
    res.json({
      success: true,
      message: 'Access logs retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getAccessLogsController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.access_logs_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve access logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get processing activities
 */
export const getProcessingActivitiesController = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      actionType: req.query.actionType || null,
      resourceType: req.query.resourceType || null
    };
    
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.processing_activities_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const result = await getProcessingActivities(filters);
    
    res.json({
      success: true,
      message: 'Processing activities retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getProcessingActivitiesController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.processing_activities_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve processing activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get retention information
 */
export const getRetentionInfoController = async (req, res) => {
  try {
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.retention_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const result = await getRetentionInfo();
    
    res.json({
      success: true,
      message: 'Retention information retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getRetentionInfoController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.retention_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get third-party sharing events
 */
export const getThirdPartySharingController = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      userId: req.query.userId ? parseInt(req.query.userId) : null
    };
    
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.third_party_sharing_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const result = await getThirdPartySharing(filters);
    
    res.json({
      success: true,
      message: 'Third-party sharing data retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getThirdPartySharingController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.third_party_sharing_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve third-party sharing data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get compliance metrics
 */
export const getComplianceMetricsController = async (req, res) => {
  try {
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.compliance_metrics_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const metrics = await getComplianceMetrics();
    
    res.json({
      success: true,
      message: 'Compliance metrics retrieved successfully',
      data: metrics
    });
  } catch (error) {
    console.error('Error in getComplianceMetricsController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.compliance_metrics_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get chart data for visualization
 */
export const getChartDataController = async (req, res) => {
  try {
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.chart_data_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: {}
    });
    
    const { getChartData } = await import('../services/dataAuditService.js');
    const chartData = await getChartData();
    
    res.json({
      success: true,
      message: 'Chart data retrieved successfully',
      data: chartData
    });
  } catch (error) {
    console.error('Error in getChartDataController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.chart_data_view',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chart data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export audit report
 */
export const exportAuditReportController = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const section = req.query.section || 'all';
    
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: csv, pdf'
      });
    }
    
    // Log export event
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.report_export',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: { format, section }
    });
    
    // For now, return CSV format (PDF would require additional library)
    if (format === 'csv') {
      // Get data based on section
      let csvData = '';
      let filename = 'data-audit-report';
      
      if (section === 'inventory' || section === 'all') {
        const inventory = await getDataInventory();
        csvData += 'Data Inventory\n';
        csvData += 'Table Name,Size,Record Count,Category\n';
        inventory.inventory.forEach(table => {
          csvData += `${table.tableName},${table.size},${table.recordCount},${table.category}\n`;
        });
        csvData += '\n';
      }
      
      if (section === 'access-logs' || section === 'all') {
        const logs = await getAccessLogs({ limit: 1000 });
        csvData += 'Access Logs\n';
        csvData += 'Timestamp,User Email,User Role,Action,Resource Type,Resource ID,Status\n';
        logs.logs.forEach(log => {
          csvData += `${log.timestamp},${log.user_email || ''},${log.user_role || ''},${log.action},${log.resource_type || ''},${log.resource_id || ''},${log.status}\n`;
        });
        csvData += '\n';
      }
      
      if (section === 'processing-activities' || section === 'all') {
        const activities = await getProcessingActivities();
        csvData += 'Processing Activities\n';
        csvData += 'Action,Resource Type,Count,First Occurrence,Last Occurrence,Unique Users\n';
        activities.activities.forEach(activity => {
          csvData += `${activity.action},${activity.resourceType || ''},${activity.count},${activity.firstOccurrence},${activity.lastOccurrence},${activity.uniqueUsers}\n`;
        });
        csvData += '\n';
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      // PDF export would require additional library like pdfkit
      res.status(501).json({
        success: false,
        message: 'PDF export not yet implemented'
      });
    }
  } catch (error) {
    console.error('Error in exportAuditReportController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.report_export',
      resourceType: 'data_audit',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to export audit report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify audit log integrity (hash chain verification)
 * Detects tampering or modification of audit logs
 */
export const verifyAuditLogIntegrityController = async (req, res) => {
  try {
    // Log access to integrity verification
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.integrity_verification',
      resourceType: 'audit_logs',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const verificationResult = await verifyAuditLogIntegrity();
    
    res.json({
      success: true,
      message: verificationResult.message,
      data: verificationResult
    });
  } catch (error) {
    console.error('Error in verifyAuditLogIntegrityController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.integrity_verification',
      resourceType: 'audit_logs',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify audit log integrity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify database-level immutability status
 * Checks if DELETE and UPDATE triggers are active
 */
export const verifyImmutabilityStatusController = async (req, res) => {
  try {
    // Log access to immutability status check
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.immutability_status',
      resourceType: 'audit_logs',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success'
    });
    
    const statusResult = await verifyImmutabilityStatus();
    
    res.json({
      success: true,
      message: statusResult.message,
      data: statusResult
    });
  } catch (error) {
    console.error('Error in verifyImmutabilityStatusController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_audit.immutability_status',
      resourceType: 'audit_logs',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify immutability status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

