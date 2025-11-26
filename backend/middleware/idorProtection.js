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
      
      // Declare variables outside if block for debug logging
      let doctorId = null;
      let doctorName = null;
      let doctorNameFromUser = null;
      let userResult = null;
      
      if (user.role === 'urologist' || user.role === 'doctor') {
        // PRIORITY 1: Check appointments FIRST - if doctor has ANY appointment with patient, grant access
        // This is the most important check per user requirement
        
        // Get user's name first (needed for multiple checks)
        userResult = await client.query(
          `SELECT CONCAT(first_name, ' ', last_name) as name, email
           FROM users 
           WHERE id = $1`,
          [user.id]
        );
        
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
        
        // Final fallback: Check appointments by user email directly (in case doctor record doesn't exist)
        // This handles edge cases where appointments exist but doctor record lookup failed
        if (!hasAccess && userResult && userResult.rows.length > 0) {
          const userEmail = userResult.rows[0].email;
          if (userEmail) {
            // Check if any appointment for this patient has a doctor with matching email
            const appointmentByEmailCheck = await client.query(
              `SELECT COUNT(*) as count 
               FROM appointments a
               INNER JOIN doctors d ON a.urologist_id = d.id
               WHERE a.patient_id = $1 
               AND a.status != 'cancelled'
               AND d.email = $2
               AND d.is_active = true`,
              [patientId, userEmail]
            );
            
            if (parseInt(appointmentByEmailCheck.rows[0].count) > 0) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with doctor email ${userEmail} (email check)`);
            }
          }
        }
        
        // Ultimate fallback: Check ALL appointments for this patient, regardless of status or doctor record
        // This is the most permissive check - if patient has ANY appointment that could match this user
        if (!hasAccess) {
          // Get all appointments for this patient
          const allAppointmentsCheck = await client.query(
            `SELECT DISTINCT a.urologist_id, a.urologist_name
             FROM appointments a
             WHERE a.patient_id = $1 
             AND a.status != 'cancelled'`,
            [patientId]
          );
          
          // For each appointment, check if it matches this user
          for (const apt of allAppointmentsCheck.rows) {
            if (apt.urologist_id) {
              // Check if this urologist_id belongs to any doctor linked to this user
              const doctorMatchCheck = await client.query(
                `SELECT COUNT(*) as count
                 FROM doctors d
                 INNER JOIN users u ON d.email = u.email
                 WHERE d.id = $1 AND u.id = $2 AND d.is_active = true`,
                [apt.urologist_id, user.id]
              );
              
              if (parseInt(doctorMatchCheck.rows[0].count) > 0) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with urologist_id ${apt.urologist_id} matching user ${user.id} (ultimate fallback)`);
                break;
              }
            }
            
            // Also check by name if urologist_id doesn't match
            if (!hasAccess && apt.urologist_name && doctorNameFromUser) {
              const aptNameNormalized = apt.urologist_name.trim().replace(/^Dr\.\s*/i, '');
              const userNameNormalized = doctorNameFromUser.trim().replace(/^Dr\.\s*/i, '');
              if (aptNameNormalized.toLowerCase() === userNameNormalized.toLowerCase()) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} has appointment with name "${apt.urologist_name}" matching user "${doctorNameFromUser}" (name fallback)`);
                break;
              }
            }
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
        // Log detailed debug information
        console.log(`[checkPatientAccess] DENIED: Patient ${patientId}, User ${user.id} (${user.email}), Role: ${user.role}`);
        if (user.role === 'urologist' || user.role === 'doctor') {
          console.log(`[checkPatientAccess] Debug - doctorId: ${doctorId}, doctorName: ${doctorName}, doctorNameFromUser: ${doctorNameFromUser}`);
          console.log(`[checkPatientAccess] Debug - patient assigned_urologist: ${patient.assigned_urologist}`);
          
          // Check what appointments exist for this patient
          const debugAppointments = await client.query(
            `SELECT id, urologist_id, urologist_name, status, appointment_date
             FROM appointments 
             WHERE patient_id = $1 
             ORDER BY appointment_date DESC
             LIMIT 5`,
            [patientId]
          );
          console.log(`[checkPatientAccess] Debug - Found ${debugAppointments.rows.length} appointments for patient ${patientId}:`, 
            debugAppointments.rows.map(a => ({ id: a.id, urologist_id: a.urologist_id, urologist_name: a.urologist_name, status: a.status }))
          );
        }
        
        await logFailedAccess(req, `Unauthorized access attempt to patient ${patientId} by user ${user.id}`);
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






