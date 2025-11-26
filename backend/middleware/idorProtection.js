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
        // PRIORITY 1: Check appointments FIRST - if doctor has ANY appointment with patient, grant access
        // This is the most important check per user requirement
        
        // Get user's name first (needed for multiple checks)
        const userResult = await client.query(
          `SELECT CONCAT(first_name, ' ', last_name) as name, email
           FROM users 
           WHERE id = $1`,
          [user.id]
        );
        
        let doctorNameFromUser = null;
        if (userResult.rows.length > 0) {
          doctorNameFromUser = userResult.rows[0].name?.trim();
        }
        
        // Get doctor record linked to this user by email
        const doctorResult = await client.query(
          `SELECT d.id, CONCAT(d.first_name, ' ', d.last_name) as name, d.email
           FROM doctors d
           JOIN users u ON d.email = u.email
           WHERE u.id = $1 AND d.is_active = true`,
          [user.id]
        );
        
        let doctorId = null;
        let doctorName = null;
        
        if (doctorResult.rows.length > 0) {
          doctorId = doctorResult.rows[0].id;
          doctorName = doctorResult.rows[0].name?.trim();
        }
        
        // Check appointments by doctor ID (most reliable)
        if (doctorId) {
          const appointmentCheckById = await client.query(
            `SELECT COUNT(*) as count 
             FROM appointments 
             WHERE patient_id = $1 
             AND urologist_id = $2 
             AND status != 'cancelled'`,
            [patientId, doctorId]
          );
          
          if (parseInt(appointmentCheckById.rows[0].count) > 0) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor ID ${doctorId}`);
          }
        }
        
        // If no access yet, check appointments by doctor name (fallback)
        if (!hasAccess) {
          // Use doctor name from doctor record, or fallback to user's name
          const nameToCheck = doctorName || doctorNameFromUser;
          if (nameToCheck) {
            const normalizedName = nameToCheck.trim().replace(/^Dr\.\s*/i, '');
            const appointmentCheckByName = await client.query(
              `SELECT COUNT(*) as count 
               FROM appointments 
               WHERE patient_id = $1 
               AND status != 'cancelled'
               AND (
                 urologist_name = $2 
                 OR urologist_name = $3
                 OR TRIM(REGEXP_REPLACE(urologist_name, '^Dr\\.\\s*', '', 'i')) = $3
                 OR TRIM(REGEXP_REPLACE(urologist_name, '^Dr\\.\\s*', '', 'i')) = TRIM(REGEXP_REPLACE($2, '^Dr\\.\\s*', '', 'i'))
               )`,
              [patientId, nameToCheck, normalizedName]
            );
            
            if (parseInt(appointmentCheckByName.rows[0].count) > 0) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor "${nameToCheck}"`);
            }
          }
        }
        
        // Additional comprehensive appointment check - catch all cases
        // This checks ALL appointments for the patient and matches them to ANY doctor record for this user
        if (!hasAccess) {
          const comprehensiveAppointmentCheck = await client.query(
            `SELECT COUNT(*) as count 
             FROM appointments a
             INNER JOIN doctors d ON a.urologist_id = d.id
             INNER JOIN users u ON d.email = u.email
             WHERE a.patient_id = $1 
             AND a.status != 'cancelled'
             AND u.id = $2
             AND d.is_active = true`,
            [patientId, user.id]
          );
          
          if (parseInt(comprehensiveAppointmentCheck.rows[0].count) > 0) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor linked to user ${user.id} (comprehensive check)`);
          }
        }
        
        // PRIORITY 2: Check if patient is assigned to this doctor
        if (!hasAccess) {
          // Check assignment with exact match
          if (doctorNameFromUser && patient.assigned_urologist && patient.assigned_urologist.trim() === doctorNameFromUser) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}"`);
          }
          
          // Check assignment with doctor name from doctor record
          if (!hasAccess && doctorName && patient.assigned_urologist) {
            const assignedNormalized = patient.assigned_urologist.trim().replace(/^Dr\.\s*/i, '');
            const doctorNameNormalized = doctorName.replace(/^Dr\.\s*/i, '');
            if (assignedNormalized.toLowerCase() === doctorNameNormalized.toLowerCase()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorName}"`);
            }
          }
          
          // Final check: assignment with user's name (normalized comparison)
          if (!hasAccess && doctorNameFromUser && patient.assigned_urologist) {
            const assignedNormalized = patient.assigned_urologist.trim().replace(/^Dr\.\s*/i, '');
            const userNameNormalized = doctorNameFromUser.trim().replace(/^Dr\.\s*/i, '');
            if (assignedNormalized.toLowerCase() === userNameNormalized.toLowerCase()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}" (normalized)`);
            }
          }
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






