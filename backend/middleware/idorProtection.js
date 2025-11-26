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
    // Try multiple sources for patientId
    const patientId = req.params.patientId || req.params.id || req.body.patientId || req.query.patientId;
    
    console.log(`[checkPatientAccess] Request: ${req.method} ${req.path}`);
    console.log(`[checkPatientAccess] PatientId from params.patientId: ${req.params.patientId}`);
    console.log(`[checkPatientAccess] PatientId from params.id: ${req.params.id}`);
    console.log(`[checkPatientAccess] PatientId from body: ${req.body.patientId}`);
    console.log(`[checkPatientAccess] PatientId from query: ${req.query.patientId}`);
    console.log(`[checkPatientAccess] Final patientId: ${patientId}`);
    
    if (!patientId) {
      console.log(`[checkPatientAccess] No patientId found, skipping check`);
      return next(); // No patient ID in request, skip check
    }
    
    const user = req.user;
    
    if (!user) {
      console.log(`[checkPatientAccess] No user found in request`);
      await logFailedAccess(req, 'Unauthenticated patient access attempt');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    console.log(`[checkPatientAccess] User: ${user.id} (${user.email}), Role: ${user.role}`);
    
    // Superadmin can access all patients
    if (user.role === 'superadmin') {
      console.log(`[checkPatientAccess] Superadmin access granted`);
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
        // Use comprehensive matching logic that mirrors getAssignedPatientsForDoctor
        if (!hasAccess) {
          // Get normalized names for comparison
          const normalizedDoctorName = doctorName ? doctorName.replace(/^Dr\.\s*/i, '').trim() : null;
          const normalizedDoctorNameFromUser = doctorNameFromUser ? doctorNameFromUser.replace(/^Dr\.\s*/i, '').trim() : null;
          
          if (patient.assigned_urologist) {
            const assignedNormalized = patient.assigned_urologist.trim().replace(/^Dr\.\s*/i, '');
            
            // Check with exact match first
            if (doctorNameFromUser && patient.assigned_urologist.trim() === doctorNameFromUser.trim()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}" (exact match)`);
            }
            
            // Check with doctor name from doctor record
            if (!hasAccess && doctorName && assignedNormalized.toLowerCase() === normalizedDoctorName.toLowerCase()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorName}" (normalized match)`);
            }
            
            // Check with user's name (normalized comparison)
            if (!hasAccess && normalizedDoctorNameFromUser && assignedNormalized.toLowerCase() === normalizedDoctorNameFromUser.toLowerCase()) {
              hasAccess = true;
              console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}" (normalized user name match)`);
            }
            
            // Additional check: Use TRIM and case-insensitive matching (mirrors getAssignedPatientsForDoctor logic)
            if (!hasAccess) {
              const assignedTrimmed = patient.assigned_urologist.trim();
              if (doctorName && assignedTrimmed.toLowerCase() === doctorName.trim().toLowerCase()) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorName}" (trimmed case-insensitive)`);
              } else if (doctorNameFromUser && assignedTrimmed.toLowerCase() === doctorNameFromUser.trim().toLowerCase()) {
                hasAccess = true;
                console.log(`[checkPatientAccess] Granting access: Patient ${patientId} assigned to doctor "${doctorNameFromUser}" (trimmed case-insensitive)`);
              }
            }
          }
        }
        
        // PRIORITY 3: Final comprehensive check - use same logic as getAssignedPatientsForDoctor
        // This ensures consistency: if patient appears in assigned list, they can access it
        if (!hasAccess) {
          try {
            console.log(`[checkPatientAccess] Running comprehensive check...`);
            
            // Get all possible name variations
            const namesToCheck = [];
            if (normalizedDoctorName) namesToCheck.push(normalizedDoctorName);
            if (normalizedDoctorNameFromUser) namesToCheck.push(normalizedDoctorNameFromUser);
            if (doctorName) namesToCheck.push(doctorName.trim());
            if (doctorNameFromUser) namesToCheck.push(doctorNameFromUser.trim());
            
            // Remove duplicates and empty strings
            const uniqueNames = [...new Set(namesToCheck.filter(n => n && n.trim()))];
            
            console.log(`[checkPatientAccess] Comprehensive check - uniqueNames:`, uniqueNames);
            console.log(`[checkPatientAccess] Comprehensive check - doctorId:`, doctorId);
            
            // Build conditions array
            const conditions = [];
            const queryParams = [patientId];
            let paramIndex = 2;
            
            // Add name matching conditions
            if (uniqueNames.length > 0) {
              const nameConditions = uniqueNames.map((name) => {
                const conditions = [];
                queryParams.push(name);
                const currentIdx = paramIndex++;
                
                // Multiple matching strategies
                conditions.push(`TRIM(REGEXP_REPLACE(p.assigned_urologist, '^Dr\\.\\s*', '', 'i')) = $${currentIdx}`);
                conditions.push(`LOWER(TRIM(REGEXP_REPLACE(p.assigned_urologist, '^Dr\\.\\s*', '', 'i'))) = LOWER($${currentIdx})`);
                conditions.push(`TRIM(p.assigned_urologist) = $${currentIdx}`);
                conditions.push(`LOWER(TRIM(p.assigned_urologist)) = LOWER($${currentIdx})`);
                
                return `(${conditions.join(' OR ')})`;
              }).join(' OR ');
              
              conditions.push(`(p.assigned_urologist IS NOT NULL AND (${nameConditions}))`);
            }
            
            // Add appointment condition if doctorId exists
            if (doctorId) {
              queryParams.push(doctorId);
              conditions.push(`EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.patient_id = p.id
                AND a.status != 'cancelled'
                AND a.urologist_id = $${paramIndex}
              )`);
              paramIndex++;
            }
            
            // Only run query if we have conditions
            if (conditions.length > 0) {
              const whereClause = conditions.join(' OR ');
              
              console.log(`[checkPatientAccess] Comprehensive check query:`, {
                whereClause,
                paramCount: queryParams.length
              });
              
              const comprehensiveCheck = await client.query(
                `SELECT COUNT(*) as count
                 FROM patients p
                 WHERE p.id = $1
                 AND (${whereClause})`,
                queryParams
              );
              
              const count = parseInt(comprehensiveCheck.rows[0].count);
              console.log(`[checkPatientAccess] Comprehensive check result: ${count} matches`);
              
              if (count > 0) {
                hasAccess = true;
                console.log(`[checkPatientAccess] ✅ Granting access: Patient ${patientId} matches assigned list criteria (comprehensive check)`);
              }
            } else {
              console.log(`[checkPatientAccess] Comprehensive check skipped - no conditions to check`);
            }
          } catch (comprehensiveError) {
            console.error(`[checkPatientAccess] ❌ Error in comprehensive check:`, comprehensiveError);
            console.error(`[checkPatientAccess] Error stack:`, comprehensiveError.stack);
            // Don't fail on this check, continue with other checks
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
        console.log(`[checkPatientAccess] ========== ACCESS DENIED ==========`);
        console.log(`[checkPatientAccess] Patient ID: ${patientId}`);
        console.log(`[checkPatientAccess] User ID: ${user.id}`);
        console.log(`[checkPatientAccess] User Email: ${user.email}`);
        console.log(`[checkPatientAccess] User Role: ${user.role}`);
        
        if (user.role === 'urologist' || user.role === 'doctor') {
          console.log(`[checkPatientAccess] Doctor ID: ${doctorId}`);
          console.log(`[checkPatientAccess] Doctor Name (from doctors table): ${doctorName}`);
          console.log(`[checkPatientAccess] Doctor Name (from users table): ${doctorNameFromUser}`);
          console.log(`[checkPatientAccess] Patient assigned_urologist: "${patient.assigned_urologist}"`);
          console.log(`[checkPatientAccess] Patient created_by: ${patient.created_by}`);
          
          // Check what appointments exist for this patient
          const debugAppointments = await client.query(
            `SELECT id, urologist_id, urologist_name, status, appointment_date
             FROM appointments 
             WHERE patient_id = $1 
             ORDER BY appointment_date DESC
             LIMIT 10`,
            [patientId]
          );
          console.log(`[checkPatientAccess] Found ${debugAppointments.rows.length} appointments for patient:`);
          debugAppointments.rows.forEach((a, idx) => {
            console.log(`[checkPatientAccess]   Appointment ${idx + 1}: id=${a.id}, urologist_id=${a.urologist_id}, urologist_name="${a.urologist_name}", status=${a.status}`);
          });
          
          // Check if patient would be in assigned list
          if (doctorName || doctorNameFromUser) {
            const assignedCheck = await client.query(
              `SELECT id, assigned_urologist, status 
               FROM patients 
               WHERE id = $1 AND status = 'Active'`,
              [patientId]
            );
            if (assignedCheck.rows.length > 0) {
              const p = assignedCheck.rows[0];
              console.log(`[checkPatientAccess] Patient status: ${p.status}`);
              console.log(`[checkPatientAccess] Patient assigned_urologist: "${p.assigned_urologist}"`);
              console.log(`[checkPatientAccess] Name comparison:`);
              console.log(`[checkPatientAccess]   - doctorName: "${doctorName}"`);
              console.log(`[checkPatientAccess]   - doctorNameFromUser: "${doctorNameFromUser}"`);
              console.log(`[checkPatientAccess]   - assigned_urologist: "${p.assigned_urologist}"`);
              if (doctorName && p.assigned_urologist) {
                const normalized1 = doctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
                const normalized2 = p.assigned_urologist.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
                console.log(`[checkPatientAccess]   - Normalized doctorName: "${normalized1}"`);
                console.log(`[checkPatientAccess]   - Normalized assigned_urologist: "${normalized2}"`);
                console.log(`[checkPatientAccess]   - Match: ${normalized1 === normalized2}`);
              }
            }
          }
        }
        
        console.log(`[checkPatientAccess] ====================================`);
        
        await logFailedAccess(req, `Unauthorized access attempt to patient ${patientId} by user ${user.id}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this patient'
        });
      }
      
      console.log(`[checkPatientAccess] ✅ ACCESS GRANTED for patient ${patientId}`);
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






