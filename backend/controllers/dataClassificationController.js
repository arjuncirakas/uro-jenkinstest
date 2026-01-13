import { 
  getAllClassifications, 
  setTableClassification,
  initializeDefaultClassifications 
} from '../services/dataClassificationService.js';
import { logAuditEvent } from '../services/auditLogger.js';

/**
 * Get all table classifications
 */
export const getClassificationsController = async (req, res) => {
  try {
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.view',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: {}
    });
    
    const classifications = await getAllClassifications();
    
    res.json({
      success: true,
      message: 'Classifications retrieved successfully',
      data: classifications
    });
  } catch (error) {
    console.error('Error in getClassificationsController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.view',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve classifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Set or update classification for a table
 */
export const setClassificationController = async (req, res) => {
  try {
    const { tableName, level, description } = req.body;
    
    if (!tableName || !level) {
      return res.status(400).json({
        success: false,
        message: 'tableName and level are required'
      });
    }
    
    if (level < 1 || level > 5) {
      return res.status(400).json({
        success: false,
        message: 'Classification level must be between 1 and 5'
      });
    }
    
    await setTableClassification(tableName, level, description);
    
    // Log audit event
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.update',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: { tableName, level, description }
    });
    
    res.json({
      success: true,
      message: `Classification updated for ${tableName}`
    });
  } catch (error) {
    console.error('Error in setClassificationController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.update',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set classification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Initialize default classifications for all tables
 */
export const initializeClassificationsController = async (req, res) => {
  try {
    // Log access
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.initialize',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'success',
      metadata: {}
    });
    
    const result = await initializeDefaultClassifications();
    
    res.json({
      success: true,
      message: result.message,
      data: result.classifications
    });
  } catch (error) {
    console.error('Error in initializeClassificationsController:', error);
    
    await logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'data_classification.initialize',
      resourceType: 'data_classification',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: 'error',
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to initialize classifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


