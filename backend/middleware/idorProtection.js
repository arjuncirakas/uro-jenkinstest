import pool from '../config/database.js';
import { logFailedAccess } from '../services/auditLogger.js';

/**
 * IDOR (Insecure Direct Object Reference) Protection Middleware
 * Ensures users can only access resources they're authorized to access
 */

/**
 * Check if user can access a patient
 */
export const checkPatientAccess = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
    
    if (!patientId) {
      return next(); // No patient ID in request, skip check
    }
    
    const user = req.user;
    
    if (!user) {
      await logFailedAccess(req, 'Unauthenticated patient access attempt');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Superadmin can access all patients
    if (user.role === 'superadmin') {
      return next();
    }
    
    const client = await pool.connect();
    
    try {
      // Check if patient exists and user has access
      const result = await client.query(
        `SELECT id, assigned_urologist, created_by 
         FROM patients 
         WHERE id = $1`,
        [patientId]
      );
      
      if (result.rows.length === 0) {
        await logFailedAccess(req, `Patient ${patientId} not found`);
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      
      const patient = result.rows[0];
      
      // Check access based on role
      let hasAccess = false;
      
      if (user.role === 'urologist' || user.role === 'doctor') {
        // Urologists can access patients assigned to them
        // First, get the doctor's name from users table
        const userResult = await client.query(
          `SELECT CONCAT(first_name, ' ', last_name) as name 
           FROM users 
           WHERE id = $1`,
          [user.id]
        );
        
        if (userResult.rows.length > 0) {
          const doctorName = userResult.rows[0].name;
          hasAccess = patient.assigned_urologist === doctorName;
        }
        
        // Also check if there's a doctor record linked to this user
        const doctorResult = await client.query(
          `SELECT CONCAT(d.first_name, ' ', d.last_name) as name 
           FROM doctors d
           JOIN users u ON d.email = u.email
           WHERE u.id = $1`,
          [user.id]
        );
        
        if (doctorResult.rows.length > 0) {
          const doctorName = doctorResult.rows[0].name;
          hasAccess = hasAccess || patient.assigned_urologist === doctorName;
        }
      } else if (user.role === 'urology_nurse' || user.role === 'gp') {
        // Nurses and GPs can access all active patients
        hasAccess = true;
      }
      
      // Creator can always access
      if (patient.created_by === user.id) {
        hasAccess = true;
      }
      
      if (!hasAccess) {
        await logFailedAccess(req, `Unauthorized access attempt to patient ${patientId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this patient'
        });
      }
      
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('IDOR protection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check if user can access their own resources
 */
export const checkOwnResourceAccess = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Superadmin can access all resources
      if (user.role === 'superadmin') {
        return next();
      }
      
      const resourceUserId = req.params[resourceUserIdField] || 
                            req.body[resourceUserIdField] || 
                            req.query[resourceUserIdField];
      
      if (resourceUserId && parseInt(resourceUserId) !== user.id) {
        await logFailedAccess(req, `Unauthorized access to resource owned by user ${resourceUserId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};


