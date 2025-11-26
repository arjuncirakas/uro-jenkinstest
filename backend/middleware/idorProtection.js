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
        
        let doctorNameFromUser = null;
        if (userResult.rows.length > 0) {
          doctorNameFromUser = userResult.rows[0].name.trim();
          // Check assignment with exact match
          if (patient.assigned_urologist && patient.assigned_urologist.trim() === doctorNameFromUser) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}"`);
          }
        }
        
        // Also check if there's a doctor record linked to this user
        const doctorResult = await client.query(
          `SELECT d.id, CONCAT(d.first_name, ' ', d.last_name) as name 
           FROM doctors d
           JOIN users u ON d.email = u.email
           WHERE u.id = $1 AND d.is_active = true`,
          [user.id]
        );
        
        let doctor = null;
        let doctorName = null;
        
        if (doctorResult.rows.length > 0) {
          doctor = doctorResult.rows[0];
          doctorName = doctor.name.trim();
          
          // Check assignment with doctor name (normalize both for comparison)
          if (patient.assigned_urologist) {
            const assignedNormalized = patient.assigned_urologist.trim().replace(/^Dr\.\s*/i, '');
            const doctorNameNormalized = doctorName.replace(/^Dr\.\s*/i, '');
            if (assignedNormalized.toLowerCase() === doctorNameNormalized.toLowerCase()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorName}"`);
            }
          }
          
          // Also check if patient has ANY appointment with this doctor (by doctors.id or name)
          // This allows doctors to access patients they have appointments with, even if not assigned
          // Check ALL appointment statuses (not just scheduled/confirmed) to establish relationship
          if (!hasAccess) {
            // Check by doctor ID - check all statuses except cancelled
            if (doctor.id) {
              const appointmentCheckById = await client.query(
                `SELECT COUNT(*) as count 
                 FROM appointments 
                 WHERE patient_id = $1 
                 AND urologist_id = $2 
                 AND status != 'cancelled'
                 LIMIT 1`,
                [patientId, doctor.id]
              );
              
              if (parseInt(appointmentCheckById.rows[0].count) > 0) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor ID ${doctor.id}`);
              }
            }
            
            // Also check by doctor name (in case appointment was created with name instead of ID)
            // Check all statuses except cancelled
            // Use doctorName from doctor record, or fallback to user's name
            const nameToCheck = doctorName || doctorNameFromUser;
            if (!hasAccess && nameToCheck) {
              // Normalize doctor name for comparison (remove "Dr." prefix, trim whitespace)
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
                   OR TRIM(REGEXP_REPLACE($2, '^Dr\\.\\s*', '', 'i')) = TRIM(REGEXP_REPLACE(urologist_name, '^Dr\\.\\s*', '', 'i'))
                 )
                 LIMIT 1`,
                [patientId, nameToCheck, normalizedName]
              );
              
              if (parseInt(appointmentCheckByName.rows[0].count) > 0) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor "${nameToCheck}"`);
              }
            }
          }
        }
        
        // IMPORTANT: Always check appointments by user name, even if doctor record exists
        // This handles cases where appointments were created with user's name but doctor record lookup fails
        // OR cases where urologist_id in appointments doesn't match doctors.id
        if (!hasAccess && doctorNameFromUser) {
          const normalizedName = doctorNameFromUser.trim().replace(/^Dr\.\s*/i, '');
          const appointmentCheckByUserName = await client.query(
            `SELECT COUNT(*) as count 
             FROM appointments 
             WHERE patient_id = $1 
             AND status != 'cancelled'
             AND (
               urologist_name = $2 
               OR urologist_name = TRIM(REGEXP_REPLACE($2, '^Dr\\.\\s*', '', 'i'))
               OR TRIM(REGEXP_REPLACE(urologist_name, '^Dr\\.\\s*', '', 'i')) = $3
               OR TRIM(REGEXP_REPLACE(urologist_name, '^Dr\\.\\s*', '', 'i')) = TRIM(REGEXP_REPLACE($2, '^Dr\\.\\s*', '', 'i'))
             )
             LIMIT 1`,
            [patientId, doctorNameFromUser, normalizedName]
          );
          
          if (parseInt(appointmentCheckByUserName.rows[0].count) > 0) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor "${doctorNameFromUser}" (by user name)`);
          }
        }
        
        // CRITICAL: Check appointments by urologist_id directly
        // This handles cases where appointments have urologist_id (doctors.id) but doctor record lookup failed
        // OR cases where the doctor record exists but wasn't found in the initial lookup
        if (!hasAccess) {
          // Get all urologist_ids from appointments for this patient
          const patientAppointmentsQuery = await client.query(
            `SELECT DISTINCT urologist_id 
             FROM appointments 
             WHERE patient_id = $1 
             AND status != 'cancelled'
             AND urologist_id IS NOT NULL`,
            [patientId]
          );
          
          // For each urologist_id in appointments, check if it belongs to the current user
          for (const apt of patientAppointmentsQuery.rows) {
            if (apt.urologist_id) {
              // Check if this urologist_id (doctors.id) belongs to the current user
              // This is the most reliable check since appointments store doctors.id
              const doctorByIdCheck = await client.query(
                `SELECT d.id, u.id as user_id
                 FROM doctors d
                 JOIN users u ON d.email = u.email
                 WHERE d.id = $1 AND u.id = $2 AND d.is_active = true`,
                [apt.urologist_id, user.id]
              );
              
              if (doctorByIdCheck.rows.length > 0) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with urologist_id ${apt.urologist_id} matching user ${user.id}`);
                break;
              }
            }
          }
        }
        
        // Final check: assignment with user's name (normalized comparison)
        if (!hasAccess && doctorNameFromUser && patient.assigned_urologist) {
          const assignedNormalized = patient.assigned_urologist.trim().replace(/^Dr\.\s*/i, '');
          const userNameNormalized = doctorNameFromUser.trim().replace(/^Dr\.\s*/i, '');
          if (assignedNormalized.toLowerCase() === userNameNormalized.toLowerCase()) {
            hasAccess = true;
            console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}"`);
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






