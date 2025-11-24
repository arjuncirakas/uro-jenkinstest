import pool from '../config/database.js';
import { sendNotificationEmail } from '../services/emailService.js';
import { createPathwayTransferNotification } from '../services/notificationService.js';

// Generate unique UPI (Urology Patient ID)
const generateUPI = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `URP${year}${randomNum}`;
};

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateOnly = (dateString) => {
  if (!dateString) return null;
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle Date objects from PostgreSQL
  if (dateString instanceof Date) {
    const year = dateString.getUTCFullYear();
    const month = String(dateString.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateString.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle ISO string with timezone (from PostgreSQL TIMESTAMP)
  if (typeof dateString === 'string' && dateString.includes('T')) {
    // Use UTC methods to avoid timezone conversion
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Fallback for other formats
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Add new patient
export const addPatient = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      postcode,
      city,
      state,
      referringDepartment,
      referralDate,
      initialPSA,
      initialPSADate,
      medicalHistory,
      currentMedications,
      allergies,
      assignedUrologist,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      priority = 'Normal',
      notes,
      referredByGpId, // Added to accept referring GP from frontend
      triageSymptoms, // Nurse triage symptoms data (JSON string)
      // Exam & Prior Tests
      dreDone,
      dreFindings,
      priorBiopsy,
      priorBiopsyDate,
      gleasonScore,
      comorbidities // Array of comorbidities
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone || !initialPSA) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, date of birth, gender, phone, and initial PSA are required'
      });
    }

    // Validate gender
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender must be Male, Female, or Other'
      });
    }

    // Validate priority
    if (priority && !['Low', 'Normal', 'High', 'Urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be Low, Normal, High, or Urgent'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await client.query(
        'SELECT id FROM patients WHERE email = $1',
        [email]
      );
      
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM patients WHERE phone = $1',
        [phone]
      );
      
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Patient with this phone number already exists'
        });
      }
    }

    // Generate unique UPI
    let upi;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      upi = generateUPI();
      const existingUPI = await client.query(
        'SELECT id FROM patients WHERE upi = $1',
        [upi]
      );
      
      if (existingUPI.rows.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Unable to generate unique patient ID. Please try again.'
      });
    }

    // Determine referred_by_gp_id
    // Priority: 1. From request body (when nurse/urologist selects GP), 2. Current user if GP, 3. null
    let finalReferredByGpId = null;
    if (referredByGpId) {
      // Use the GP selected in the form (for nurses/urologists)
      finalReferredByGpId = parseInt(referredByGpId);
    } else if (req.user.role === 'gp') {
      // If current user is GP, use their ID
      finalReferredByGpId = req.user.id;
    }

    // Auto-assign patient to current user if they are a urologist/doctor and assignedUrologist is not provided
    let finalAssignedUrologist = assignedUrologist;
    if ((req.user.role === 'urologist' || req.user.role === 'doctor') && (!assignedUrologist || assignedUrologist.trim() === '')) {
      // Get current user's full name
      const userQuery = await client.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id]
      );
      if (userQuery.rows.length > 0) {
        const user = userQuery.rows[0];
        finalAssignedUrologist = `${user.first_name} ${user.last_name}`.trim();
        console.log(`[addPatient] Auto-assigning patient to ${finalAssignedUrologist} (current user)`);
      }
    }

    // Format date fields to prevent timezone conversion issues
    const formattedDateOfBirth = formatDateOnly(dateOfBirth);
    const formattedReferralDate = formatDateOnly(referralDate);
    const formattedInitialPSADate = formatDateOnly(initialPSADate);

    // Format prior biopsy date if provided
    const formattedPriorBiopsyDate = priorBiopsyDate ? formatDateOnly(priorBiopsyDate) : null;
    
    // Convert comorbidities array to JSON string if provided
    const comorbiditiesJson = Array.isArray(comorbidities) && comorbidities.length > 0 
      ? JSON.stringify(comorbidities) 
      : null;

    // Insert new patient
    const result = await client.query(
      `INSERT INTO patients (
        upi, first_name, last_name, date_of_birth, gender, phone, email, address, 
        postcode, city, state, referring_department, referral_date, initial_psa, 
        initial_psa_date, medical_history, current_medications, allergies, 
        assigned_urologist, emergency_contact_name, emergency_contact_phone, 
        emergency_contact_relationship, priority, notes, created_by, referred_by_gp_id, triage_symptoms,
        dre_done, dre_findings, prior_biopsy, prior_biopsy_date, gleason_score, comorbidities
      ) VALUES (
        $1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14, $15::date, $16, 
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31::date, $32, $33
      ) RETURNING *`,
      [
        upi, firstName, lastName, formattedDateOfBirth, gender, phone, email, address,
        postcode, city, state, referringDepartment, formattedReferralDate, initialPSA,
        formattedInitialPSADate, medicalHistory, currentMedications, allergies,
        finalAssignedUrologist, emergencyContactName, emergencyContactPhone,
        emergencyContactRelationship, priority, notes, req.user.id, finalReferredByGpId, triageSymptoms || null,
        dreDone || false, dreFindings || null, priorBiopsy || 'no', formattedPriorBiopsyDate, gleasonScore || null, comorbiditiesJson
      ]
    );

    const newPatient = result.rows[0];

    // Automatically create a PSA result entry if initialPSA and initialPSADate are provided
    if (initialPSA && formattedInitialPSADate) {
      try {
        // Get user details for author information
        const userQuery = await client.query(
          'SELECT first_name, last_name FROM users WHERE id = $1',
          [req.user.id]
        );
        
        const authorName = userQuery.rows.length > 0 
          ? `${userQuery.rows[0].first_name} ${userQuery.rows[0].last_name}`
          : 'System';

        // Determine status based on PSA value
        const psaValue = parseFloat(initialPSA);
        let status = 'Normal';
        if (psaValue > 4.0) {
          status = 'High';
        } else if (psaValue > 2.5) {
          status = 'Elevated';
        }

        // Insert initial PSA result into investigation_results table
        await client.query(
          `INSERT INTO investigation_results (
            patient_id, test_type, test_name, test_date, result, reference_range, 
            status, notes, author_id, author_name, author_role
          ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newPatient.id,
            'psa',
            'PSA (Prostate Specific Antigen)',
            formattedInitialPSADate,
            initialPSA.toString(),
            '0.0 - 4.0',
            status,
            'Initial PSA value entered during patient registration',
            req.user.id,
            authorName,
            req.user.role
          ]
        );
        
        console.log(`[addPatient] Created initial PSA result entry for patient ${newPatient.id} with PSA value ${initialPSA}`);
      } catch (psaError) {
        // Log error but don't fail patient creation if PSA result creation fails
        console.error('[addPatient] Error creating initial PSA result:', psaError);
      }
    }

    // Calculate age
    const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();

    // Format prior biopsy date from database result for response
    const responsePriorBiopsyDate = newPatient.prior_biopsy_date 
      ? new Date(newPatient.prior_biopsy_date).toISOString().split('T')[0]
      : null;

    res.status(201).json({
      success: true,
      message: 'Patient added successfully',
      data: {
        patient: {
          id: newPatient.id,
          upi: newPatient.upi,
          firstName: newPatient.first_name,
          lastName: newPatient.last_name,
          fullName: `${newPatient.first_name} ${newPatient.last_name}`,
          dateOfBirth: formattedDateOfBirth, // Use the formatted input date
          age,
          gender: newPatient.gender,
          phone: newPatient.phone,
          email: newPatient.email,
          address: newPatient.address,
          postcode: newPatient.postcode,
          city: newPatient.city,
          state: newPatient.state,
          referringDepartment: newPatient.referring_department,
          referralDate: formattedReferralDate, // Use the formatted input date
          initialPSA: newPatient.initial_psa,
          initialPSADate: formattedInitialPSADate, // Use the formatted input date
          medicalHistory: newPatient.medical_history,
          currentMedications: newPatient.current_medications,
          allergies: newPatient.allergies,
          assignedUrologist: newPatient.assigned_urologist || finalAssignedUrologist,
          emergencyContactName: newPatient.emergency_contact_name,
          emergencyContactPhone: newPatient.emergency_contact_phone,
          emergencyContactRelationship: newPatient.emergency_contact_relationship,
          priority: newPatient.priority,
          notes: newPatient.notes,
          status: newPatient.status,
          createdBy: newPatient.created_by,
          createdAt: newPatient.created_at,
          updatedAt: newPatient.updated_at,
          // Triage and Exam & Prior Tests
          triageSymptoms: newPatient.triage_symptoms ? (() => {
            try {
              return JSON.parse(newPatient.triage_symptoms);
            } catch (e) {
              console.error('Error parsing triage_symptoms:', e);
              return null;
            }
          })() : null,
          dreDone: newPatient.dre_done || false,
          dreFindings: newPatient.dre_findings || null,
          priorBiopsy: newPatient.prior_biopsy || 'no',
          priorBiopsyDate: responsePriorBiopsyDate,
          gleasonScore: newPatient.gleason_score || null,
          comorbidities: newPatient.comorbidities ? (() => {
            try {
              return JSON.parse(newPatient.comorbidities);
            } catch (e) {
              console.error('Error parsing comorbidities:', e);
              return [];
            }
          })() : []
        }
      }
    });

  } catch (error) {
    console.error('Add patient error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'patients_email_key') {
        return res.status(409).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }
      if (error.constraint === 'patients_phone_key') {
        return res.status(409).json({
          success: false,
          message: 'Patient with this phone number already exists'
        });
      }
      if (error.constraint === 'patients_upi_key') {
        return res.status(409).json({
          success: false,
          message: 'Patient with this UPI already exists'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all patients (with filtering and pagination)
export const getPatients = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = 'Active',
      assignedUrologist = '',
      carePathway = '',
      carePathways = '', // Support multiple pathways (comma-separated)
      activeMonitoring = '', // Special flag for active monitoring pathways
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Determine pathways to filter
    let pathwaysToFilter = [];
    if (activeMonitoring === 'true' || activeMonitoring === true) {
      // For active monitoring, include all relevant pathways
      pathwaysToFilter = ['Active Monitoring', 'Active Surveillance', 'Medication', 'Discharge'];
    } else if (carePathways) {
      // Support comma-separated pathways
      pathwaysToFilter = carePathways.split(',').map(p => p.trim()).filter(p => p);
    } else if (carePathway) {
      // Single pathway (backward compatibility)
      pathwaysToFilter = [carePathway];
    }

    // Determine statuses to filter
    // For active monitoring pathways, include both Active and Discharged statuses
    let statusesToFilter = [];
    if (activeMonitoring === 'true' || activeMonitoring === true || (pathwaysToFilter.includes('Discharge'))) {
      statusesToFilter = ['Active', 'Discharged'];
    } else {
      statusesToFilter = [status];
    }
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Add status filter (support multiple statuses)
    if (statusesToFilter.length > 0) {
      paramCount++;
      if (statusesToFilter.length === 1) {
        whereConditions.push(`p.status = $${paramCount}`);
        queryParams.push(statusesToFilter[0]);
      } else {
        whereConditions.push(`p.status = ANY($${paramCount}::text[])`);
        queryParams.push(statusesToFilter);
      }
    }

    // If user is GP, filter by referred_by_gp_id
    // Only show patients explicitly assigned to this GP AND have a valid creator
    if (req.user && req.user.role === 'gp') {
      paramCount++;
      whereConditions.push(`p.referred_by_gp_id = $${paramCount}`);
      queryParams.push(req.user.id);
      // Also exclude patients with NULL created_by (orphaned/invalid assignments)
      whereConditions.push(`p.created_by IS NOT NULL`);
      console.log(`🔍 GP Filter (getPatients): User ID = ${req.user.id}, Role = ${req.user.role}, Email = ${req.user.email}`);
    }

    // Add care pathway filter - CRITICAL for Active Monitoring page
    // Support multiple pathways using IN clause
    if (pathwaysToFilter.length > 0) {
      paramCount++;
      if (pathwaysToFilter.length === 1) {
        whereConditions.push(`p.care_pathway = $${paramCount}`);
        queryParams.push(pathwaysToFilter[0]);
      } else {
        whereConditions.push(`p.care_pathway = ANY($${paramCount}::text[])`);
        queryParams.push(pathwaysToFilter);
      }
      console.log(`🔍 Care Pathway Filter: ${pathwaysToFilter.join(', ')}`);
    }

    // Add search filter - search in first name, last name, full name (concatenated), UPI, phone, and email
    if (search) {
      paramCount++;
      whereConditions.push(`(
        p.first_name ILIKE $${paramCount} OR 
        p.last_name ILIKE $${paramCount} OR 
        CONCAT(p.first_name, ' ', p.last_name) ILIKE $${paramCount} OR
        CONCAT(p.last_name, ' ', p.first_name) ILIKE $${paramCount} OR
        CONCAT(p.first_name, p.last_name) ILIKE $${paramCount} OR
        CONCAT(p.last_name, p.first_name) ILIKE $${paramCount} OR
        p.upi ILIKE $${paramCount} OR 
        p.phone ILIKE $${paramCount} OR 
        p.email ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    // Add urologist filter
    if (assignedUrologist) {
      paramCount++;
      whereConditions.push(`p.assigned_urologist = $${paramCount}`);
      queryParams.push(assignedUrologist);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM patients p 
      WHERE ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get patients with user info and next appointment
    const patientsQuery = `
      SELECT 
        p.id, p.upi, p.first_name, p.last_name, p.gender, p.phone, p.email,
        p.address, p.postcode, p.city, p.state, p.referring_department,
        p.initial_psa, p.medical_history, p.current_medications, p.allergies,
        p.assigned_urologist, p.emergency_contact_name, p.emergency_contact_phone,
        p.emergency_contact_relationship, p.priority, p.notes, p.status,
        p.care_pathway, p.created_by, p.created_at, p.updated_at,
        p.triage_symptoms, p.dre_done, p.dre_findings, p.prior_biopsy,
        p.prior_biopsy_date, p.gleason_score, p.comorbidities,
        TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') as date_of_birth,
        TO_CHAR(p.referral_date, 'YYYY-MM-DD') as referral_date,
        TO_CHAR(p.initial_psa_date, 'YYYY-MM-DD') as initial_psa_date,
        TO_CHAR(p.prior_biopsy_date, 'YYYY-MM-DD') as prior_biopsy_date_formatted,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        gp.first_name as gp_first_name,
        gp.last_name as gp_last_name,
        COALESCE(next_apt.appointment_date, next_inv_apt.appointment_date) as next_appointment_date,
        COALESCE(next_apt.appointment_time, next_inv_apt.appointment_time) as next_appointment_time,
        COALESCE(next_apt.urologist_name, next_inv_apt.urologist_name) as next_appointment_urologist,
        COALESCE(next_apt.id, next_inv_apt.id) as next_appointment_id,
        CASE 
          WHEN next_apt.id IS NOT NULL THEN 'urologist'
          WHEN next_inv_apt.id IS NOT NULL THEN 'investigation'
          ELSE NULL
        END as next_appointment_type
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users gp ON p.referred_by_gp_id = gp.id
      LEFT JOIN LATERAL (
        SELECT id, appointment_date, appointment_time, urologist_name, appointment_type
        FROM appointments
        WHERE patient_id = p.id 
        AND status IN ('scheduled', 'confirmed')
        AND appointment_date >= CURRENT_DATE
        ORDER BY appointment_date ASC, appointment_time ASC
        LIMIT 1
      ) next_apt ON true
      LEFT JOIN LATERAL (
        SELECT id, scheduled_date as appointment_date, scheduled_time as appointment_time, investigation_name as urologist_name
        FROM investigation_bookings
        WHERE patient_id = p.id 
        AND status IN ('scheduled', 'confirmed')
        AND scheduled_date >= CURRENT_DATE
        ORDER BY scheduled_date ASC, scheduled_time ASC
        LIMIT 1
      ) next_inv_apt ON true
      WHERE ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    const patientsResult = await client.query(patientsQuery, queryParams);

    // Get latest PSA for all patients
    const patientIds = patientsResult.rows.map(p => p.id);
    let latestPSAMap = {};
    if (patientIds.length > 0) {
      const psaQuery = await client.query(
        `SELECT DISTINCT ON (patient_id) 
          patient_id, result, test_date
         FROM investigation_results 
         WHERE patient_id = ANY($1) 
           AND (test_type ILIKE 'psa' OR test_name ILIKE '%PSA%')
         ORDER BY patient_id, test_date DESC, created_at DESC`,
        [patientIds]
      );
      psaQuery.rows.forEach(row => {
        latestPSAMap[row.patient_id] = {
          result: row.result,
          testDate: row.test_date
        };
      });
      console.log(`[getPatients] Found latest PSA for ${psaQuery.rows.length} patients out of ${patientIds.length} total`);
    }

    // Format patient data
    const patients = patientsResult.rows.map(patient => {
      const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
      
      // Get latest PSA or fallback to initial PSA
      const latestPSA = latestPSAMap[patient.id];
      const displayPSA = latestPSA ? latestPSA.result : (patient.initial_psa || null);
      
      // Debug logging for PSA values
      if (patient.id <= 10) { // Only log for first few patients to avoid spam
        console.log(`[getPatients] Patient ${patient.id}: initialPSA=${patient.initial_psa}, latestPSA=${latestPSA?.result || 'none'}, displayPSA=${displayPSA}`);
      }
      
      // Format next appointment data
      const nextAppointmentDate = patient.next_appointment_date 
        ? new Date(patient.next_appointment_date).toISOString().split('T')[0]
        : null;
      const nextAppointmentTime = patient.next_appointment_time 
        ? patient.next_appointment_time.substring(0, 5) // Format HH:MM
        : null;
      
      // Check if patient has any appointment (for easier frontend checking)
      const hasAppointment = !!(nextAppointmentDate || nextAppointmentTime);
      
      // Calculate next review date (appointment date formatted for display)
      const nextReview = nextAppointmentDate 
        ? new Date(nextAppointmentDate).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'Not Scheduled';
      
      // Calculate monitoring status based on PSA level and care pathway
      let monitoringStatus = 'Stable';
      if (patient.care_pathway === 'Active Monitoring' || patient.care_pathway === 'Medication') {
        const psaLevel = parseFloat(displayPSA || 0);
        if (psaLevel > 10) {
          monitoringStatus = 'Needs Attention';
        } else if (psaLevel > 4.0) {
          monitoringStatus = 'Review Required';
        } else {
          monitoringStatus = 'Stable';
        }
      }
      
      return {
        id: patient.id,
        upi: patient.upi,
        firstName: patient.first_name,
        lastName: patient.last_name,
        fullName: `${patient.first_name} ${patient.last_name}`,
        dateOfBirth: patient.date_of_birth, // Already formatted by TO_CHAR
        age,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        postcode: patient.postcode,
        city: patient.city,
        state: patient.state,
        referringDepartment: patient.referring_department,
        referralDate: patient.referral_date, // Already formatted by TO_CHAR
        initialPSA: patient.initial_psa,
        initialPSADate: patient.initial_psa_date, // Already formatted by TO_CHAR
        latestPSA: displayPSA, // Latest PSA from investigation_results or initial PSA
        medicalHistory: patient.medical_history,
        currentMedications: patient.current_medications,
        allergies: patient.allergies,
        assignedUrologist: patient.assigned_urologist,
        emergencyContactName: patient.emergency_contact_name,
        emergencyContactPhone: patient.emergency_contact_phone,
        emergencyContactRelationship: patient.emergency_contact_relationship,
        priority: patient.priority,
        notes: patient.notes,
        status: patient.status,
        carePathway: patient.care_pathway,
        createdBy: patient.created_by,
        createdByName: patient.created_by_first_name && patient.created_by_last_name 
          ? `${patient.created_by_first_name} ${patient.created_by_last_name}` 
          : 'Unknown',
        referredByGP: patient.gp_first_name ? `Dr. ${patient.gp_first_name} ${patient.gp_last_name}` : null,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
        // New fields for appointments and monitoring
        nextAppointmentDate,
        nextAppointmentTime,
        nextReview,
        nextAppointmentUrologist: patient.next_appointment_urologist,
        nextAppointmentId: patient.next_appointment_id, // Appointment ID for updating
        nextAppointmentType: patient.next_appointment_type, // 'urologist' or 'investigation'
        hasAppointment, // Boolean flag to easily check if patient has an appointment
        monitoringStatus,
        // Triage and Exam & Prior Tests
        triageSymptoms: patient.triage_symptoms ? (() => {
          try {
            return JSON.parse(patient.triage_symptoms);
          } catch (e) {
            console.error('Error parsing triage_symptoms:', e);
            return null;
          }
        })() : null,
        dreDone: patient.dre_done || false,
        dreFindings: patient.dre_findings || null,
        priorBiopsy: patient.prior_biopsy || 'no',
        priorBiopsyDate: patient.prior_biopsy_date_formatted || null,
        gleasonScore: patient.gleason_score || null,
        comorbidities: patient.comorbidities ? (() => {
          try {
            return JSON.parse(patient.comorbidities);
          } catch (e) {
            console.error('Error parsing comorbidities:', e);
            return [];
          }
        })() : []
      };
    });

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get new patients (recently added, status = 'Active')
export const getNewPatients = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n👥 [getNewPatients ${requestId}] Starting`);
  console.log(`👥 [getNewPatients ${requestId}] User:`, req.user?.id, req.user?.role);
  
  let client;
  try {
    console.log(`👥 [getNewPatients ${requestId}] Connecting to database...`);
    console.log(`👥 [getNewPatients ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    const connectStart = Date.now();
    client = await pool.connect();
    const connectTime = Date.now() - connectStart;
    console.log(`✅ [getNewPatients ${requestId}] Database connection successful (took ${connectTime}ms)`);
  } catch (dbError) {
    console.error(`❌ [getNewPatients ${requestId}] Database connection failed:`, dbError.message);
    console.error(`❌ [getNewPatients ${requestId}] Error code:`, dbError.code);
    console.error(`❌ [getNewPatients ${requestId}] Error stack:`, dbError.stack);
    console.error(`❌ [getNewPatients ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
  
  try {
    const { limit = 20 } = req.query;
    console.log(`👥 [getNewPatients ${requestId}] Processing with limit: ${limit}`);

    // Build WHERE clause for GP filtering
    let whereConditions = ['p.status = $1'];
    let queryParams = ['Active'];
    let paramCount = 1;

    // If user is GP, filter by referred_by_gp_id
    // Only show patients explicitly assigned to this GP AND have a valid creator
    if (req.user && req.user.role === 'gp') {
      paramCount++;
      whereConditions.push(`p.referred_by_gp_id = $${paramCount}`);
      queryParams.push(req.user.id);
      // Also exclude patients with NULL created_by (orphaned/invalid assignments)
      whereConditions.push(`p.created_by IS NOT NULL`);
      console.log(`🔍 GP Filter (getNewPatients): User ID = ${req.user.id}, Role = ${req.user.role}, Email = ${req.user.email}`);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        p.id,
        p.upi,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.phone,
        p.email,
        p.initial_psa,
        p.initial_psa_date,
        p.priority,
        p.status,
        p.care_pathway,
        p.created_at,
        p.updated_at,
        p.referred_by_gp_id,
        p.assigned_urologist,
        u.first_name as created_by_name,
        u.last_name as created_by_last_name,
        u.role as created_by_role,
        gp.first_name as gp_first_name,
        gp.last_name as gp_last_name,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users gp ON p.referred_by_gp_id = gp.id
      WHERE ${whereClause}
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = p.id 
        AND a.status IN ('scheduled', 'confirmed')
      )
      AND NOT EXISTS (
        SELECT 1 FROM investigation_bookings ib
        WHERE ib.patient_id = p.id 
        AND ib.status IN ('scheduled', 'confirmed')
      )
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1}
    `;

    queryParams.push(parseInt(limit));
    const result = await client.query(query, queryParams);

    console.log(`Found ${result.rows.length} new patients`);
    if (req.user && req.user.role === 'gp' && result.rows.length > 0) {
      console.log(`📋 Patient details:`, result.rows.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        referred_by_gp_id: p.referred_by_gp_id,
        created_by: p.created_by_name
      })));
    }
    
    // Transform the data to match frontend expectations
    const transformedPatients = result.rows.map((patient, index) => {
      try {
      // Safely format the date
      let dateOfEntry = '';
      if (patient.created_at) {
        if (typeof patient.created_at === 'string') {
          dateOfEntry = patient.created_at.split('T')[0];
        } else if (patient.created_at instanceof Date) {
          dateOfEntry = patient.created_at.toISOString().split('T')[0];
        } else {
          // Fallback for other date formats
          dateOfEntry = new Date(patient.created_at).toISOString().split('T')[0];
        }
      }

      return {
        id: patient.id,
        upi: patient.upi,
        name: `${patient.first_name} ${patient.last_name}`,
        firstName: patient.first_name,
        lastName: patient.last_name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        psa: parseFloat(patient.initial_psa) || 0,
        psaDate: patient.initial_psa_date,
        priority: patient.priority,
        status: 'newPatient', // For frontend compatibility
        category: 'new',
        dateOfEntry: dateOfEntry,
        createdBy: patient.created_by_name ? `${patient.created_by_name} ${patient.created_by_last_name}` : 'System',
        createdByRole: patient.created_by_role,
        referredByGP: patient.gp_first_name ? `Dr. ${patient.gp_first_name} ${patient.gp_last_name}` : null,
        assignedUrologist: patient.assigned_urologist,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at
      };
      } catch (error) {
        console.error(`Error transforming patient ${index + 1}:`, error);
        console.error('Patient data:', patient);
        // Return a safe fallback object
        return {
          id: patient.id || 0,
          upi: patient.upi || 'Unknown',
          name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown Patient',
          firstName: patient.first_name || '',
          lastName: patient.last_name || '',
          age: patient.age || 0,
          gender: patient.gender || 'Unknown',
          phone: patient.phone || '',
          email: patient.email || '',
          psa: parseFloat(patient.initial_psa) || 0,
          psaDate: patient.initial_psa_date || null,
          priority: patient.priority || 'Normal',
          status: 'newPatient',
          category: 'new',
          dateOfEntry: new Date().toISOString().split('T')[0], // Fallback to today
          createdBy: 'System',
          createdByRole: null,
          referredByGP: null,
          assignedUrologist: null,
          createdAt: patient.created_at || new Date(),
          updatedAt: patient.updated_at || new Date()
        };
      }
    });

    res.json({
      success: true,
      message: 'New patients retrieved successfully',
      data: {
        patients: transformedPatients
      },
      count: transformedPatients.length
    });
  } catch (error) {
    console.error(`❌ [getNewPatients ${requestId}] Error occurred:`, error.message);
    console.error(`❌ [getNewPatients ${requestId}] Error stack:`, error.stack);
    console.error(`❌ [getNewPatients ${requestId}] User info:`, { id: req.user?.id, role: req.user?.role });
    console.error(`❌ [getNewPatients ${requestId}] Error code:`, error.code);
    console.error(`❌ [getNewPatients ${requestId}] Error name:`, error.name);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new patients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      console.log(`👥 [getNewPatients ${requestId}] Releasing database connection`);
      client.release();
    }
  }
};

// Get patient by ID
export const getPatientById = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    const result = await client.query(
      `SELECT 
        p.id, p.upi, p.first_name, p.last_name, p.gender, p.phone, p.email,
        p.address, p.postcode, p.city, p.state, p.referring_department,
        p.initial_psa, p.medical_history, p.current_medications, p.allergies,
        p.assigned_urologist, p.emergency_contact_name, p.emergency_contact_phone,
        p.emergency_contact_relationship, p.priority, p.notes, p.status,
        p.care_pathway, p.created_by, p.created_at, p.updated_at,
        p.triage_symptoms, p.dre_done, p.dre_findings, p.prior_biopsy,
        p.prior_biopsy_date, p.gleason_score, p.comorbidities,
        TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') as date_of_birth,
        TO_CHAR(p.referral_date, 'YYYY-MM-DD') as referral_date,
        TO_CHAR(p.initial_psa_date, 'YYYY-MM-DD') as initial_psa_date,
        TO_CHAR(p.prior_biopsy_date, 'YYYY-MM-DD') as prior_biopsy_date_formatted,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        gp.first_name as gp_first_name,
        gp.last_name as gp_last_name
      FROM patients p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users gp ON p.referred_by_gp_id = gp.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = result.rows[0];
    const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

    // Get latest PSA from investigation_results (if any)
    let latestPSA = null;
    let latestPSADate = null;
    try {
      const psaRes = await client.query(
        `SELECT result, test_date 
         FROM investigation_results 
         WHERE patient_id = $1 AND (test_type ILIKE 'psa' OR test_name ILIKE '%PSA%')
         ORDER BY test_date DESC, created_at DESC
         LIMIT 1`,
        [id]
      );
      if (psaRes.rows.length > 0) {
        latestPSA = psaRes.rows[0].result;
        latestPSADate = psaRes.rows[0].test_date;
      }
    } catch (e) {
      console.error('Latest PSA lookup failed:', e.message);
    }

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          upi: patient.upi,
          firstName: patient.first_name,
          lastName: patient.last_name,
          fullName: `${patient.first_name} ${patient.last_name}`,
          dateOfBirth: patient.date_of_birth, // Already formatted by TO_CHAR
          age,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          postcode: patient.postcode,
          city: patient.city,
          state: patient.state,
          referringDepartment: patient.referring_department,
          referralDate: patient.referral_date, // Already formatted by TO_CHAR
          initialPSA: patient.initial_psa,
          initialPSADate: patient.initial_psa_date, // Already formatted by TO_CHAR
          medicalHistory: patient.medical_history,
          currentMedications: patient.current_medications,
          allergies: patient.allergies,
          assignedUrologist: patient.assigned_urologist,
          emergencyContactName: patient.emergency_contact_name,
          emergencyContactPhone: patient.emergency_contact_phone,
          emergencyContactRelationship: patient.emergency_contact_relationship,
          priority: patient.priority,
          notes: patient.notes,
          status: patient.status,
          createdBy: patient.created_by,
          createdByName: patient.created_by_first_name && patient.created_by_last_name 
            ? `${patient.created_by_first_name} ${patient.created_by_last_name}` 
            : 'Unknown',
          referredByGP: patient.gp_first_name ? `Dr. ${patient.gp_first_name} ${patient.gp_last_name}` : null,
          createdAt: patient.created_at,
          updatedAt: patient.updated_at,
          latest_psa: latestPSA,
          latest_psa_date: latestPSADate,
          // Triage and Exam & Prior Tests
          triageSymptoms: patient.triage_symptoms ? (() => {
            try {
              return JSON.parse(patient.triage_symptoms);
            } catch (e) {
              console.error('Error parsing triage_symptoms:', e);
              return null;
            }
          })() : null,
          dreDone: patient.dre_done || false,
          dreFindings: patient.dre_findings || null,
          priorBiopsy: patient.prior_biopsy || 'no',
          priorBiopsyDate: patient.prior_biopsy_date_formatted || null,
          gleasonScore: patient.gleason_score || null,
          comorbidities: patient.comorbidities ? (() => {
            try {
              return JSON.parse(patient.comorbidities);
            } catch (e) {
              console.error('Error parsing comorbidities:', e);
              return [];
            }
          })() : []
        }
      }
    });

  } catch (error) {
    console.error('Get patient by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Update patient
export const updatePatient = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if patient exists
    const existingPatient = await client.query(
      'SELECT id FROM patients WHERE id = $1',
      [id]
    );

    if (existingPatient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build dynamic update query
    const allowedFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'address', 'postcode', 'city', 'state', 'referring_department', 'referral_date',
      'initial_psa', 'initial_psa_date', 'medical_history', 'current_medications',
      'allergies', 'assigned_urologist', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relationship', 'priority', 'notes', 'status',
      // Triage and Exam & Prior Tests
      'triage_symptoms', 'dre_done', 'dre_findings', 'prior_biopsy',
      'prior_biopsy_date', 'gleason_score', 'comorbidities'
    ];

    const dateFields = ['date_of_birth', 'referral_date', 'initial_psa_date', 'prior_biopsy_date'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        paramCount++;
        // Format dates and cast them as DATE type in PostgreSQL
        if (dateFields.includes(dbField)) {
          updateFields.push(`${dbField} = $${paramCount}::date`);
          updateValues.push(value ? formatDateOnly(value) : null);
        } else if (dbField === 'triage_symptoms' || dbField === 'comorbidities') {
          // Handle JSON fields
          updateFields.push(`${dbField} = $${paramCount}`);
          updateValues.push(value ? (typeof value === 'string' ? value : JSON.stringify(value)) : null);
        } else if (dbField === 'dre_done') {
          // Handle boolean field
          updateFields.push(`${dbField} = $${paramCount}`);
          updateValues.push(value || false);
        } else {
          updateFields.push(`${dbField} = $${paramCount}`);
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Add updated_at timestamp
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());

    // Add patient ID for WHERE clause
    paramCount++;
    updateValues.push(id);

    const updateQuery = `
      UPDATE patients 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, upi, first_name, last_name, gender, phone, email,
                address, postcode, city, state, referring_department,
                initial_psa, medical_history, current_medications, allergies,
                assigned_urologist, emergency_contact_name, emergency_contact_phone,
                emergency_contact_relationship, priority, notes, status,
                triage_symptoms, dre_done, dre_findings, prior_biopsy,
                prior_biopsy_date, gleason_score, comorbidities,
                created_by, created_at, updated_at,
                TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
                TO_CHAR(referral_date, 'YYYY-MM-DD') as referral_date,
                TO_CHAR(initial_psa_date, 'YYYY-MM-DD') as initial_psa_date,
                TO_CHAR(prior_biopsy_date, 'YYYY-MM-DD') as prior_biopsy_date_formatted
    `;

    const result = await client.query(updateQuery, updateValues);
    const updatedPatient = result.rows[0];

    const age = new Date().getFullYear() - new Date(updatedPatient.date_of_birth).getFullYear();

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: {
        patient: {
          id: updatedPatient.id,
          upi: updatedPatient.upi,
          firstName: updatedPatient.first_name,
          lastName: updatedPatient.last_name,
          fullName: `${updatedPatient.first_name} ${updatedPatient.last_name}`,
          dateOfBirth: updatedPatient.date_of_birth, // Already formatted by TO_CHAR
          age,
          gender: updatedPatient.gender,
          phone: updatedPatient.phone,
          email: updatedPatient.email,
          address: updatedPatient.address,
          postcode: updatedPatient.postcode,
          city: updatedPatient.city,
          state: updatedPatient.state,
          referringDepartment: updatedPatient.referring_department,
          referralDate: updatedPatient.referral_date, // Already formatted by TO_CHAR
          initialPSA: updatedPatient.initial_psa,
          initialPSADate: updatedPatient.initial_psa_date, // Already formatted by TO_CHAR
          medicalHistory: updatedPatient.medical_history,
          currentMedications: updatedPatient.current_medications,
          allergies: updatedPatient.allergies,
          assignedUrologist: updatedPatient.assigned_urologist,
          emergencyContactName: updatedPatient.emergency_contact_name,
          emergencyContactPhone: updatedPatient.emergency_contact_phone,
          emergencyContactRelationship: updatedPatient.emergency_contact_relationship,
          priority: updatedPatient.priority,
          notes: updatedPatient.notes,
          status: updatedPatient.status,
          createdBy: updatedPatient.created_by,
          createdAt: updatedPatient.created_at,
          updatedAt: updatedPatient.updated_at,
          // Triage and Exam & Prior Tests
          triageSymptoms: updatedPatient.triage_symptoms ? (() => {
            try {
              return JSON.parse(updatedPatient.triage_symptoms);
            } catch (e) {
              console.error('Error parsing triage_symptoms:', e);
              return null;
            }
          })() : null,
          dreDone: updatedPatient.dre_done || false,
          dreFindings: updatedPatient.dre_findings || null,
          priorBiopsy: updatedPatient.prior_biopsy || 'no',
          priorBiopsyDate: updatedPatient.prior_biopsy_date_formatted || null,
          gleasonScore: updatedPatient.gleason_score || null,
          comorbidities: updatedPatient.comorbidities ? (() => {
            try {
              return JSON.parse(updatedPatient.comorbidities);
            } catch (e) {
              console.error('Error parsing comorbidities:', e);
              return [];
            }
          })() : []
        }
      }
    });

  } catch (error) {
    console.error('Update patient error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'patients_email_key') {
        return res.status(409).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }
      if (error.constraint === 'patients_phone_key') {
        return res.status(409).json({
          success: false,
          message: 'Patient with this phone number already exists'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete patient (hard delete - removes patient and all related records from database)
export const deletePatient = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, upi, first_name, last_name FROM patients WHERE id = $1',
      [id]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Begin transaction to ensure all deletions succeed or none do
    await client.query('BEGIN');

    try {
      // Delete all related records in order (respecting foreign key constraints)
      
      // 1. Delete patient notes
      await client.query('DELETE FROM patient_notes WHERE patient_id = $1', [id]);
      console.log(`Deleted patient notes for patient ${id}`);

      // 2. Delete investigation results
      await client.query('DELETE FROM investigation_results WHERE patient_id = $1', [id]);
      console.log(`Deleted investigation results for patient ${id}`);

      // 3. Delete appointments (urologist appointments)
      await client.query('DELETE FROM appointments WHERE patient_id = $1', [id]);
      console.log(`Deleted appointments for patient ${id}`);

      // 4. Delete investigation bookings
      await client.query('DELETE FROM investigation_bookings WHERE patient_id = $1', [id]);
      console.log(`Deleted investigation bookings for patient ${id}`);

      // 5. Delete discharge summaries (if table exists) - use SAVEPOINT to handle gracefully
      await client.query('SAVEPOINT before_discharge_summaries');
      try {
        await client.query('DELETE FROM discharge_summaries WHERE patient_id = $1', [id]);
        console.log(`Deleted discharge summaries for patient ${id}`);
      } catch (err) {
        // Rollback to savepoint if error (table might not exist)
        await client.query('ROLLBACK TO SAVEPOINT before_discharge_summaries');
        console.log('Discharge summaries table may not exist or error occurred, skipping...');
      }

      // 6. Delete MDT meeting references (if any) - use SAVEPOINT to handle gracefully
      await client.query('SAVEPOINT before_mdt_patients');
      try {
        await client.query('DELETE FROM mdt_patients WHERE patient_id = $1', [id]);
        console.log(`Deleted MDT patient references for patient ${id}`);
      } catch (err) {
        // Rollback to savepoint if error (table might not exist)
        await client.query('ROLLBACK TO SAVEPOINT before_mdt_patients');
        console.log('MDT patients table may not exist or error occurred, skipping...');
      }

      // 7. Delete MDT meetings if they reference this patient - use SAVEPOINT
      await client.query('SAVEPOINT before_mdt_meetings');
      try {
        await client.query('DELETE FROM mdt_meetings WHERE patient_id = $1', [id]);
        console.log(`Deleted MDT meetings for patient ${id}`);
      } catch (err) {
        // Rollback to savepoint if error
        await client.query('ROLLBACK TO SAVEPOINT before_mdt_meetings');
        console.log('MDT meetings deletion skipped (table may not exist or no records)...');
      }

      // 8. Finally, delete the patient record itself
      const deleteResult = await client.query(
        'DELETE FROM patients WHERE id = $1 RETURNING *',
        [id]
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Commit transaction
      await client.query('COMMIT');

      console.log(`✅ Patient ${id} (${patientCheck.rows[0].upi}) deleted completely from database`);

      res.json({
        success: true,
        message: 'Patient and all related records deleted successfully from the database'
      });

    } catch (error) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get patients assigned to current doctor with category filtering
export const getAssignedPatientsForDoctor = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { category = 'all', limit = 100 } = req.query;

    console.log(`[getAssignedPatientsForDoctor] User ID: ${userId}, Role: ${userRole}, Category: ${category}`);

    // Resolve doctor's full name to match patients.assigned_urologist string field
    // First try to get from doctors table (since appointments use doctors.id)
    // If not found, fall back to users table
    let doctorName = null;
    
    // Get user info first
    const userQ = await client.query('SELECT first_name, last_name, role, email FROM users WHERE id = $1', [userId]);
    if (userQ.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userQ.rows[0];
    
    // Try to get from doctors table first (preferred, since appointments use doctors.id)
    if (user.email) {
      const doctorQ = await client.query(
        'SELECT first_name, last_name FROM doctors WHERE email = $1 AND is_active = true LIMIT 1',
        [user.email]
      );
      
      if (doctorQ.rows.length > 0) {
        doctorName = `${doctorQ.rows[0].first_name} ${doctorQ.rows[0].last_name}`.trim();
        console.log(`[getAssignedPatientsForDoctor] Doctor Name from doctors table: "${doctorName}"`);
      }
    }
    
    // Fall back to users table if not found in doctors table
    if (!doctorName) {
      doctorName = `${user.first_name} ${user.last_name}`.trim();
      console.log(`[getAssignedPatientsForDoctor] Doctor Name from users table: "${doctorName}"`);
    }
    
    // Ensure doctorName is not null or undefined
    if (!doctorName || doctorName.trim() === '') {
      console.error(`[getAssignedPatientsForDoctor] Doctor name is empty or null`);
      return res.status(400).json({ 
        success: false, 
        message: 'Unable to determine doctor name. Please contact support.' 
      });
    }
    
    // Normalize doctor name - remove "Dr." prefix if present for consistent matching
    const normalizedDoctorName = doctorName.replace(/^Dr\.\s*/i, '').trim();
    console.log(`[getAssignedPatientsForDoctor] Final Doctor Name: "${doctorName}"`);
    console.log(`[getAssignedPatientsForDoctor] Normalized Doctor Name: "${normalizedDoctorName}"`);
    
    // Debug: Check all patients with assignments
    const debugQ = await client.query(
      `SELECT id, upi, first_name, last_name, assigned_urologist, care_pathway, status 
       FROM patients 
       WHERE status = 'Active' AND assigned_urologist IS NOT NULL 
       ORDER BY created_at DESC LIMIT 5`
    );
    console.log(`[getAssignedPatientsForDoctor] Recent assigned patients in DB:`, 
      debugQ.rows.map(r => ({ 
        upi: r.upi, 
        name: `${r.first_name} ${r.last_name}`,
        assigned_to: `"${r.assigned_urologist}"`,
        care_pathway: r.care_pathway || 'null'
      }))
    );

    // Base WHERE for assignment - use TRIM and case-insensitive matching for robust name matching
    // This ensures patients rescheduled to different doctors appear in their lists
    // Also normalize by removing "Dr." prefix from both sides for consistent matching
    // Simplify to avoid SQL syntax issues - use COALESCE to handle NULL values
    // Validate query parameters first
    const queryLimit = parseInt(limit) || 100;
    const queryName = normalizedDoctorName || doctorName;
    
    // For my-patients category, we need a different WHERE clause that doesn't require assigned_urologist
    let whereBase = '';
    let additionalWhere = '';
    let queryParams = [];
    let limitParamIndex = 2; // Default limit parameter index
    
    if (category === 'my-patients') {
      // My Patients = patients created by the current urologist (regardless of assigned_urologist)
      whereBase = `p.status = 'Active' AND p.created_by = $1`;
      queryParams = [userId, queryLimit]; // userId, limit
      limitParamIndex = 2; // limit is $2
    } else {
      // For other categories, use the standard assigned_urologist matching
      whereBase = `p.status = 'Active' AND p.assigned_urologist IS NOT NULL AND TRIM(LOWER(REGEXP_REPLACE(p.assigned_urologist, '^Dr\\.\\s*', '', 'i'))) = TRIM(LOWER($1))`;
      queryParams = [queryName, queryLimit]; // name, limit
      
      // Category filters
      if (category === 'new') {
        // New = assigned patients with no completed urologist appointments and no care pathway set
        // This includes patients who just had appointments booked
        additionalWhere = `AND NOT EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
              AND a.appointment_type ILIKE 'urologist' 
              AND a.status = 'completed'
          )
          AND (COALESCE(p.care_pathway,'') = '' OR COALESCE(p.care_pathway,'') IS NULL)`;
      } else if (category === 'surgery-pathway') {
        // Only return patients whose current pathway is Surgery Pathway
        // Don't include patients who have been transferred to other pathways
        additionalWhere = `AND COALESCE(p.care_pathway,'') = 'Surgery Pathway'`;
      } else if (category === 'post-op-followup') {
        // Only return patients whose current pathway is Post-op Transfer or Post-op Followup
        additionalWhere = `AND ( 
          COALESCE(p.care_pathway,'') = 'Post-op Transfer' 
          OR COALESCE(p.care_pathway,'') = 'Post-op Followup'
        )`;
      }
    }
    
    if (!queryName || queryName.trim() === '') {
      console.error(`[getAssignedPatientsForDoctor] Invalid doctor name for query`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid doctor name. Please contact support.' 
      });
    }
    
    // Build the complete query string
    const query = `
      SELECT 
        p.id,
        p.upi,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.priority,
        p.status,
        p.care_pathway,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
      FROM patients p
      WHERE ${whereBase} ${additionalWhere}
      ORDER BY p.created_at DESC
      LIMIT $${limitParamIndex}
    `.trim();
    
    console.log(`[getAssignedPatientsForDoctor] Executing query with name: "${queryName}", limit: ${queryLimit}, category: ${category}`);
    console.log(`[getAssignedPatientsForDoctor] Query:`, query.replace(/\s+/g, ' ').trim());
    console.log(`[getAssignedPatientsForDoctor] Query params:`, queryParams);
    
    // Use normalized name for query, but also try original name
    let finalResult = { rows: [] }; // Initialize with empty result
    
    try {
      const result = await client.query(query, queryParams);
      console.log(`[getAssignedPatientsForDoctor] Query returned ${result.rows.length} results`);
      finalResult = result;
      
      // If no results with normalized name, try with original name (only for non-my-patients categories)
      if (finalResult.rows.length === 0 && normalizedDoctorName !== doctorName && doctorName && category !== 'my-patients') {
        console.log(`[getAssignedPatientsForDoctor] No results with normalized name, trying original name...`);
        try {
          const originalParams = category === 'my-patients' ? [doctorName, userId, queryLimit] : [doctorName, queryLimit];
          const originalResult = await client.query(query, originalParams);
          if (originalResult.rows.length > 0) {
            finalResult = originalResult;
            console.log(`[getAssignedPatientsForDoctor] Found ${originalResult.rows.length} results with original name`);
          }
        } catch (queryError2) {
          console.error(`[getAssignedPatientsForDoctor] Error with original name query (fallback):`, queryError2);
          // Keep the current result even if empty
        }
      }
    } catch (queryError) {
      console.error(`[getAssignedPatientsForDoctor] Error executing query:`, queryError);
      console.error(`[getAssignedPatientsForDoctor] Error message:`, queryError.message);
      console.error(`[getAssignedPatientsForDoctor] Error stack:`, queryError.stack);
      // Return empty result instead of throwing - this allows the function to continue
      finalResult = { rows: [] };
    }

    console.log(`[getAssignedPatientsForDoctor] Found ${finalResult.rows.length} patients for category "${category}" via direct assignment`);
    
    // ALWAYS also check appointments table to find patients with appointments
    // This ensures patients with appointments show up even if assigned_urologist wasn't set correctly
    // This is CRITICAL for patients added by nurses who then book appointments
    console.log(`[getAssignedPatientsForDoctor] Checking appointments table for additional patients...`);
    
    // Get doctor ID from doctors table
    let doctorId = null;
    if (user.email) {
      try {
        const doctorIdQuery = await client.query(
          'SELECT id FROM doctors WHERE email = $1 AND is_active = true LIMIT 1',
          [user.email]
        );
        if (doctorIdQuery.rows.length > 0) {
          doctorId = doctorIdQuery.rows[0].id;
          console.log(`[getAssignedPatientsForDoctor] Found doctor ID: ${doctorId}`);
        }
      } catch (doctorIdError) {
        console.error(`[getAssignedPatientsForDoctor] Error getting doctor ID:`, doctorIdError);
      }
    }
    
    // Query patients who have appointments with this doctor
    // Try by doctor ID first, then fall back to name matching if ID not found
    // ALWAYS run this query to find patients even if assigned_urologist is null
    let appointmentWhere = '';
    let appointmentParams = [];
    let paramIndex = 1;
    
    if (doctorId) {
      // Use doctor ID for matching (most reliable)
      appointmentWhere = `a.urologist_id = $${paramIndex} AND a.status IN ('scheduled', 'confirmed')`;
      appointmentParams.push(doctorId);
      paramIndex++;
      console.log(`[getAssignedPatientsForDoctor] Using doctor ID ${doctorId} for appointments query`);
    } else {
      // Fall back to name matching if doctor ID not found
      // Match by urologist_name in appointments table (normalized, case-insensitive)
      appointmentWhere = `TRIM(LOWER(REGEXP_REPLACE(a.urologist_name, '^Dr\\.\\s*', '', 'i'))) = TRIM(LOWER($${paramIndex})) AND a.status IN ('scheduled', 'confirmed')`;
      appointmentParams.push(normalizedDoctorName || doctorName);
      paramIndex++;
      console.log(`[getAssignedPatientsForDoctor] Using doctor name "${normalizedDoctorName || doctorName}" for appointments query (ID not found)`);
    }
    
    // For my-patients category, skip appointments table check since we only want patients created by the urologist
    if (category === 'my-patients') {
      console.log(`[getAssignedPatientsForDoctor] Skipping appointments table check for my-patients category`);
    } else {
      // Add category filters for appointments query
      if (category === 'new') {
        appointmentWhere += ` AND NOT EXISTS (
        SELECT 1 FROM appointments a2 
        WHERE a2.patient_id = p.id 
        AND a2.appointment_type ILIKE 'urologist' 
        AND a2.status = 'completed'
      ) AND (COALESCE(p.care_pathway,'') = '' OR COALESCE(p.care_pathway,'') IS NULL)`;
    } else if (category === 'surgery-pathway') {
      appointmentWhere += ` AND COALESCE(p.care_pathway,'') = 'Surgery Pathway'`;
    } else if (category === 'post-op-followup') {
      appointmentWhere += ` AND (COALESCE(p.care_pathway,'') = 'Post-op Transfer' OR COALESCE(p.care_pathway,'') = 'Post-op Followup')`;
    }
    
    // Use a higher limit for appointments query to ensure we get all patients with appointments
    // We'll apply the final limit after combining results
    const appointmentQueryLimit = queryLimit * 2; // Get more to ensure we don't miss any
    
    const appointmentQuery = `
      SELECT DISTINCT
        p.id,
        p.upi,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.priority,
        p.status,
        p.care_pathway,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
      FROM patients p
      INNER JOIN appointments a ON a.patient_id = p.id
      WHERE p.status = 'Active' AND ${appointmentWhere}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex}
    `;
    appointmentParams.push(appointmentQueryLimit);
    
    try {
      const appointmentResult = await client.query(appointmentQuery, appointmentParams);
      console.log(`[getAssignedPatientsForDoctor] Found ${appointmentResult.rows.length} patients via appointments table`);
      
      // Combine results from both queries, removing duplicates by patient ID
      const existingIds = new Set(finalResult.rows.map(r => r.id));
      const newPatients = appointmentResult.rows.filter(r => !existingIds.has(r.id));
      
      if (newPatients.length > 0) {
        console.log(`[getAssignedPatientsForDoctor] Adding ${newPatients.length} additional patients from appointments`);
        finalResult.rows = [...finalResult.rows, ...newPatients];
      }
      
      // Apply final limit after combining (in case we exceeded it)
      if (finalResult.rows.length > queryLimit) {
        finalResult.rows = finalResult.rows.slice(0, queryLimit);
        console.log(`[getAssignedPatientsForDoctor] Limited combined results to ${queryLimit} patients`);
      }
      
      // Re-sort by created_at DESC (we need to get created_at for proper sorting)
      // For now, keep the order as is since both queries order by created_at DESC
      } catch (appointmentQueryError) {
        console.error(`[getAssignedPatientsForDoctor] Error querying appointments table:`, appointmentQueryError);
        console.error(`[getAssignedPatientsForDoctor] Appointment query error:`, appointmentQueryError.message);
        console.error(`[getAssignedPatientsForDoctor] Appointment query stack:`, appointmentQueryError.stack);
        // Continue with existing result - don't fail the entire request
      }
    }
    
    // Ensure finalResult is always initialized
    if (!finalResult || !finalResult.rows) {
      console.warn(`[getAssignedPatientsForDoctor] finalResult not properly initialized, using empty result`);
      finalResult = { rows: [] };
    }
    
    if (finalResult.rows.length > 0) {
      console.log(`[getAssignedPatientsForDoctor] Sample patient:`, {
        id: finalResult.rows[0].id,
        name: `${finalResult.rows[0].first_name} ${finalResult.rows[0].last_name}`,
        upi: finalResult.rows[0].upi
      });
    }

    const patients = finalResult.rows.map(r => ({
      id: r.id,
      upi: r.upi,
      name: `${r.first_name} ${r.last_name}`,
      firstName: r.first_name,
      lastName: r.last_name,
      age: r.age,
      gender: r.gender,
      priority: r.priority,
      status: r.status,
      carePathway: r.care_pathway, // Include actual care pathway
      category: category // Requested category filter
    }));

    res.json({ success: true, message: 'Assigned patients retrieved', data: { patients, count: patients.length } });
  } catch (error) {
    console.error('Get assigned patients error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Update patient care pathway
export const updatePatientPathway = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { pathway, reason, notes } = req.body;
    const userId = req.user.id;

    const allowed = ['Active Monitoring','Surgery Pathway','Medication','Radiotherapy','Post-op Transfer','Post-op Followup','Discharge'];
    if (!pathway || !allowed.includes(pathway)) {
      return res.status(400).json({ success: false, message: 'Invalid pathway' });
    }

    // Ensure patient exists and get patient details including assigned urologist and referring GP
    const existing = await client.query(
      `SELECT p.id, p.upi, p.first_name, p.last_name, p.assigned_urologist, p.referred_by_gp_id,
              gp.email as gp_email, gp.first_name as gp_first_name, gp.last_name as gp_last_name
       FROM patients p
       LEFT JOIN users gp ON p.referred_by_gp_id = gp.id
       WHERE p.id = $1`, 
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientData = existing.rows[0];

    // Update pathway and optionally status
    const newStatus = pathway === 'Discharge' ? 'Discharged' : 'Active';
    const update = await client.query(
      `UPDATE patients 
       SET care_pathway = $1,
           status = $2,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP,
           care_pathway_updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, upi, care_pathway, status, updated_at, care_pathway_updated_at`,
      [pathway, newStatus, notes || null, id]
    );

    // Store user info for notes (get once, use twice)
    let userInfo = null;
    let userName = null;
    let userRole = null;
    
    try {
      const userQuery = await client.query(
        'SELECT first_name, last_name, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userQuery.rows.length > 0) {
        userInfo = userQuery.rows[0];
        userName = `${userInfo.first_name} ${userInfo.last_name}`;
        userRole = (userInfo.role === 'urologist' || userInfo.role === 'doctor') ? 'Urologist' : 
                   userInfo.role === 'urology_nurse' ? 'Nurse' : 
                   userInfo.role === 'gp' ? 'GP' : 
                   userInfo.role === 'admin' ? 'Admin' : 'User';
      }
    } catch (e) {
      console.error('[updatePatientPathway] Failed to get user info:', e.message);
    }

    // AUTO-BOOK FOLLOW-UP APPOINTMENT FOR ACTIVE MONITORING
    let autoBookedAppointment = null;
    if (pathway === 'Active Monitoring') {
      try {
        console.log(`[updatePatientPathway] Patient transferred to Active Monitoring - Auto-booking follow-up...`);
        
        // Get the urologist who is transferring the patient (logged-in user)
        // IMPORTANT: Use doctors.id for appointments, not users.id
        const userInfo = await client.query(
          'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = $2',
          [userId, 'urologist']
        );

        if (userInfo.rows.length > 0) {
          const user = userInfo.rows[0];
          const urologistName = `${user.first_name} ${user.last_name}`;
          
          // Get the corresponding doctors.id
          let urologistDoctorId = null;
          const doctorCheck = await client.query(
            'SELECT id, first_name, last_name FROM doctors WHERE email = $1 AND is_active = true',
            [user.email]
          );
          
          if (doctorCheck.rows.length > 0) {
            urologistDoctorId = doctorCheck.rows[0].id;
          } else {
            console.log(`[updatePatientPathway] ⚠️ Could not auto-book: Urologist ${urologistName} does not have a doctors table record`);
            throw new Error('Urologist does not have a doctors table record');
          }
          
          // Calculate follow-up date (3 months from today for Active Monitoring)
          const followUpDate = new Date();
          followUpDate.setMonth(followUpDate.getMonth() + 3);
          const appointmentDate = followUpDate.toISOString().split('T')[0];
          
          // Default time: 10:00 AM
          const appointmentTime = '10:00';
          
          // Check if time slot is available (using doctors.id)
          const conflictCheck = await client.query(
            `SELECT id FROM appointments 
             WHERE urologist_id = $1 AND appointment_date = $2 AND appointment_time = $3 
             AND status IN ('scheduled', 'confirmed')`,
            [urologistDoctorId, appointmentDate, appointmentTime]
          );

          // If slot is taken, find next available slot
          let finalTime = appointmentTime;
          if (conflictCheck.rows.length > 0) {
            // Try next 30-minute slot
            const timeSlots = ['10:30', '11:00', '11:30', '14:00', '14:30', '15:00'];
            for (const slot of timeSlots) {
              const slotCheck = await client.query(
                `SELECT id FROM appointments 
                 WHERE urologist_id = $1 AND appointment_date = $2 AND appointment_time = $3 
                 AND status IN ('scheduled', 'confirmed')`,
                [urologistDoctorId, appointmentDate, slot]
              );
              if (slotCheck.rows.length === 0) {
                finalTime = slot;
                break;
              }
            }
          }

          // Book the appointment (using doctors.id)
          const appointment = await client.query(
            `INSERT INTO appointments (
              patient_id, appointment_type, appointment_date, appointment_time, 
              urologist_id, urologist_name, notes, created_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
              id, 
              'urologist', 
              appointmentDate, 
              finalTime, 
              urologistDoctorId, // Use doctors.id, not users.id
              urologistName, 
              `Auto-booked for Active Monitoring follow-up. ${reason || ''}`.trim(), 
              userId,
              'scheduled'
            ]
          );

          autoBookedAppointment = {
            id: appointment.rows[0].id,
            date: appointmentDate,
            time: finalTime,
            urologistName: urologistName
          };

          console.log(`[updatePatientPathway] ✅ Auto-booked appointment for ${patientData.upi} on ${appointmentDate} at ${finalTime} with ${urologistName}`);
        } else {
          console.log(`[updatePatientPathway] ⚠️ Could not auto-book: Current user is not a urologist`);
        }
      } catch (autoBookError) {
        console.error('[updatePatientPathway] Auto-booking failed (non-fatal):', autoBookError.message);
        // Don't fail the pathway update if auto-booking fails
      }
    }

    // AUTO-BOOK FOLLOW-UP APPOINTMENTS FOR POST-OP TRANSFER & POST-OP FOLLOWUP (EVERY 6 MONTHS)
    if (pathway === 'Post-op Transfer' || pathway === 'Post-op Followup') {
      try {
        console.log(`[updatePatientPathway] Patient transferred to ${pathway} - Auto-booking 6-month follow-up appointments...`);
        
        // Get the urologist (either from patient assignment or current user)
        // IMPORTANT: Use doctors.id for appointments, not users.id
        let urologistDoctorId = null;
        let urologistName = null;
        
        // First, try to use the assigned urologist from patient record
        if (patientData.assigned_urologist) {
          const assignedUrologistQuery = await client.query(
            `SELECT id, first_name, last_name, email FROM users 
             WHERE role IN ('urologist', 'doctor') 
             AND CONCAT(first_name, ' ', last_name) = $1 
             LIMIT 1`,
            [patientData.assigned_urologist]
          );
          
          if (assignedUrologistQuery.rows.length > 0) {
            const urologist = assignedUrologistQuery.rows[0];
            // Get the corresponding doctors.id
            const doctorCheck = await client.query(
              'SELECT id, first_name, last_name FROM doctors WHERE email = $1 AND is_active = true',
              [urologist.email]
            );
            
            if (doctorCheck.rows.length > 0) {
              urologistDoctorId = doctorCheck.rows[0].id;
              urologistName = `${urologist.first_name} ${urologist.last_name}`;
            }
          }
        }
        
        // If no assigned urologist found, use the current user if they're a urologist
        if (!urologistDoctorId) {
          const currentUrologistQuery = await client.query(
            'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = $2',
            [userId, 'urologist']
          );
          
          if (currentUrologistQuery.rows.length > 0) {
            const urologist = currentUrologistQuery.rows[0];
            // Get the corresponding doctors.id
            const doctorCheck = await client.query(
              'SELECT id, first_name, last_name FROM doctors WHERE email = $1 AND is_active = true',
              [urologist.email]
            );
            
            if (doctorCheck.rows.length > 0) {
              urologistDoctorId = doctorCheck.rows[0].id;
              urologistName = `${urologist.first_name} ${urologist.last_name}`;
            }
          }
        }

        if (urologistDoctorId && urologistName) {
          // Create multiple follow-up appointments at 6-month intervals for 1 year (6 months, 12 months)
          const appointmentIntervals = [6, 12]; // months - 6-month intervals for 1 year
          const bookedAppointments = [];
          
          for (const monthsAhead of appointmentIntervals) {
            const followUpDate = new Date();
            followUpDate.setMonth(followUpDate.getMonth() + monthsAhead);
            const appointmentDate = followUpDate.toISOString().split('T')[0];
            
            // Default time: 10:00 AM
            let appointmentTime = '10:00';
            
            // Check if time slot is available (using doctors.id)
            const conflictCheck = await client.query(
              `SELECT id FROM appointments 
               WHERE urologist_id = $1 AND appointment_date = $2 AND appointment_time = $3 
               AND status IN ('scheduled', 'confirmed')`,
              [urologistDoctorId, appointmentDate, appointmentTime]
            );

            // If slot is taken, find next available slot
            if (conflictCheck.rows.length > 0) {
              const timeSlots = ['10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
              for (const slot of timeSlots) {
                const slotCheck = await client.query(
                  `SELECT id FROM appointments 
                   WHERE urologist_id = $1 AND appointment_date = $2 AND appointment_time = $3 
                   AND status IN ('scheduled', 'confirmed')`,
                  [urologistDoctorId, appointmentDate, slot]
                );
                if (slotCheck.rows.length === 0) {
                  appointmentTime = slot;
                  break;
                }
              }
            }

            // Book the appointment (using doctors.id)
            const appointment = await client.query(
              `INSERT INTO appointments (
                patient_id, appointment_type, appointment_date, appointment_time, 
                urologist_id, urologist_name, notes, created_by, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING *`,
              [
                id, 
                'urologist', 
                appointmentDate, 
                appointmentTime, 
                urologistDoctorId, // Use doctors.id, not users.id
                urologistName, 
                `Auto-booked ${monthsAhead}-month post-operative follow-up. ${reason || ''}`.trim(), 
                userId,
                'scheduled'
              ]
            );

            bookedAppointments.push({
              id: appointment.rows[0].id,
              date: appointmentDate,
              time: appointmentTime,
              monthsAhead: monthsAhead
            });

            console.log(`[updatePatientPathway] ✅ Auto-booked ${monthsAhead}-month follow-up for ${patientData.upi} on ${appointmentDate} at ${appointmentTime} with ${urologistName}`);
          }

          // Store first appointment for clinical note
          if (bookedAppointments.length > 0) {
            autoBookedAppointment = {
              id: bookedAppointments[0].id,
              date: bookedAppointments[0].date,
              time: bookedAppointments[0].time,
              urologistName: urologistName,
              allAppointments: bookedAppointments // Store all booked appointments for note
            };
          }
        } else {
          console.log(`[updatePatientPathway] ⚠️ Could not auto-book post-op appointments: No urologist found`);
        }
      } catch (autoBookError) {
        console.error('[updatePatientPathway] Post-op auto-booking failed (non-fatal):', autoBookError.message);
        // Don't fail the pathway update if auto-booking fails
      }
    }

    // NOTE: Discharge summary is now created via separate API endpoint when urologist fills the discharge form
    // This allows for comprehensive data entry with proper fields and document uploads

    // CREATE CLINICAL NOTE FOR PATHWAY TRANSFER (after auto-booking so we can include appointment details)
    if (userName && userRole) {
      try {
        console.log(`[updatePatientPathway] Creating clinical note for pathway transfer...`);
        
        // Create detailed clinical note content
        let noteContent = `🔄 PATHWAY TRANSFER\n\n` +
                         `Patient transferred to: ${pathway}\n` +
                         `Previous pathway: ${patientData.care_pathway || 'None'}\n` +
                         `Reason: ${reason || 'Not specified'}\n` +
                         `Clinical Notes: ${notes || 'None'}`;
        
        // Add auto-booking info if appointment was created
        if (autoBookedAppointment) {
          // Check if multiple appointments were booked (post-op pathway)
          if (autoBookedAppointment.allAppointments && autoBookedAppointment.allAppointments.length > 1) {
            noteContent += `\n\n📅 POST-OP FOLLOW-UP APPOINTMENTS AUTO-BOOKED:\n`;
            autoBookedAppointment.allAppointments.forEach((apt, index) => {
              const aptDate = new Date(apt.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              noteContent += `\n${index + 1}. ${apt.monthsAhead}-Month Follow-up:\n` +
                            `   Date: ${aptDate}\n` +
                            `   Time: ${apt.time}\n` +
                            `   Urologist: ${autoBookedAppointment.urologistName}`;
            });
          } else {
            // Single appointment (Active Monitoring)
            const aptDate = new Date(autoBookedAppointment.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            noteContent += `\n\n📅 FOLLOW-UP APPOINTMENT AUTO-BOOKED:\n` +
                          `Date: ${aptDate}\n` +
                          `Time: ${autoBookedAppointment.time}\n` +
                          `Urologist: ${autoBookedAppointment.urologistName}`;
          }
        }
        
        noteContent += `\n\nTransferred by: ${userName} (${userRole})`;
        
        // Insert into patient_notes table
        await client.query(
          `INSERT INTO patient_notes (
            patient_id, note_type, note_content, author_id, author_name, author_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [id, 'pathway_transfer', noteContent, userId, userName, userRole]
        );
        
        console.log(`[updatePatientPathway] ✅ Created clinical note for ${patientData.upi} - Transfer to ${pathway}`);
      } catch (noteError) {
        console.error('[updatePatientPathway] Failed to create clinical note (non-fatal):', noteError.message);
        // Don't fail the pathway update if note creation fails
      }
    }

    // SEND NOTIFICATION TO REFERRING GP FOR ACTIVE MONITORING OR MEDICATION PATHWAYS
    if ((pathway === 'Active Monitoring' || pathway === 'Medication') && patientData.referred_by_gp_id && patientData.gp_email) {
      try {
        console.log(`[updatePatientPathway] Sending notification to referring GP...`);
        
        const patientName = `${patientData.first_name} ${patientData.last_name}`;
        const gpName = `Dr. ${patientData.gp_first_name} ${patientData.gp_last_name}`;
        
        const emailSubject = `Patient Update: ${patientName} - Transferred to ${pathway}`;
        
        let emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0d9488; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Urology Patient Management System</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Patient Care Pathway Update</h2>
              
              <p style="color: #374151; font-size: 16px;">Dear ${gpName},</p>
              
              <p style="color: #374151; font-size: 16px;">
                We are writing to inform you that your referred patient has been transferred to a new care pathway.
              </p>
              
              <div style="background-color: white; border-left: 4px solid #0d9488; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0d9488; margin-top: 0;">Patient Information</h3>
                <p style="margin: 5px 0;"><strong>Patient Name:</strong> ${patientName}</p>
                <p style="margin: 5px 0;"><strong>UPI:</strong> ${patientData.upi}</p>
                <p style="margin: 5px 0;"><strong>New Care Pathway:</strong> <span style="color: #0d9488; font-weight: bold;">${pathway}</span></p>
                ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>`;
        
        if (pathway === 'Active Monitoring' && autoBookedAppointment) {
          const aptDate = new Date(autoBookedAppointment.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          emailContent += `
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <h3 style="color: #10b981; margin-top: 0;">Follow-up Appointment Scheduled</h3>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${aptDate}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${autoBookedAppointment.time}</p>
                <p style="margin: 5px 0;"><strong>Urologist:</strong> ${autoBookedAppointment.urologistName}</p>
              </div>`;
        }
        
        emailContent += `
              <p style="color: #374151; font-size: 16px; margin-top: 20px;">
                You can view the patient's full details and progress in your GP portal.
              </p>
              
              <p style="color: #374151; font-size: 16px;">
                ${notes ? `<strong>Additional Notes:</strong><br>${notes}` : ''}
              </p>
              
              <p style="color: #374151; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                <strong>Urology Department</strong>
              </p>
            </div>
            <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0;">This is an automated notification from the Urology Patient Management System.</p>
              <p style="margin: 5px 0;">Please do not reply to this email.</p>
            </div>
          </div>
        `;
        
        const emailResult = await sendNotificationEmail(patientData.gp_email, emailSubject, emailContent, true);
        
        if (emailResult.success) {
          console.log(`[updatePatientPathway] ✅ Notification email sent to GP: ${patientData.gp_email}`);
        } else {
          console.error(`[updatePatientPathway] ⚠️ Failed to send notification to GP: ${emailResult.error}`);
        }
        
        // CREATE IN-APP NOTIFICATION FOR GP
        try {
          console.log(`[updatePatientPathway] Creating in-app notification for GP...`);
          
          const notificationResult = await createPathwayTransferNotification({
            gpUserId: patientData.referred_by_gp_id,
            patientName,
            patientId: id,
            pathway,
            urologistName: userName || 'Urologist',
            reason: reason || ''
          });
          
          if (notificationResult.success) {
            console.log(`[updatePatientPathway] ✅ In-app notification created for GP`);
          } else {
            console.error(`[updatePatientPathway] ⚠️ Failed to create in-app notification: ${notificationResult.error}`);
          }
        } catch (notifError) {
          console.error('[updatePatientPathway] In-app notification failed (non-fatal):', notifError.message);
        }
      } catch (emailError) {
        console.error('[updatePatientPathway] Email notification failed (non-fatal):', emailError.message);
        // Don't fail the pathway update if email fails
      }
    }

    res.json({
      success: true,
      message: 'Patient pathway updated',
      data: {
        ...update.rows[0],
        autoBookedAppointment
      }
    });
  } catch (error) {
    console.error('Update patient pathway error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Search patients with autocomplete
export const searchPatients = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        message: 'Query too short',
        data: []
      });
    }
    
    const searchTerm = `%${query.trim()}%`;
    
    // Search patients by name, UPI, or phone
    // Search in first name, last name, full name (both orders), UPI, and phone
    const result = await client.query(
      `SELECT 
        id,
        upi,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        care_pathway,
        status,
        assigned_urologist,
        initial_psa,
        priority
       FROM patients
       WHERE (
         LOWER(first_name) LIKE LOWER($1)
         OR LOWER(last_name) LIKE LOWER($1)
         OR LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
         OR LOWER(last_name || ' ' || first_name) LIKE LOWER($1)
         OR LOWER(first_name || last_name) LIKE LOWER($1)
         OR LOWER(last_name || first_name) LIKE LOWER($1)
         OR LOWER(upi) LIKE LOWER($1)
         OR LOWER(phone) LIKE LOWER($1)
       )
       AND status != 'Discharged'
       ORDER BY 
         CASE 
           WHEN LOWER(first_name || ' ' || last_name) LIKE LOWER($2) THEN 1
           WHEN LOWER(last_name || ' ' || first_name) LIKE LOWER($2) THEN 1
           WHEN LOWER(first_name) LIKE LOWER($2) THEN 2
           WHEN LOWER(last_name) LIKE LOWER($2) THEN 2
           WHEN LOWER(upi) LIKE LOWER($2) THEN 3
           ELSE 4
         END,
         first_name, last_name
       LIMIT $3`,
      [searchTerm, `${query.trim()}%`, limit]
    );
    
    // Calculate age for each patient
    const today = new Date();
    const patients = result.rows.map(row => {
      const birthDate = new Date(row.date_of_birth);
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      
      return {
        id: row.id,
        upi: row.upi,
        name: `${row.first_name} ${row.last_name}`,
        firstName: row.first_name,
        lastName: row.last_name,
        age: age,
        gender: row.gender,
        phone: row.phone,
        email: row.email,
        carePathway: row.care_pathway,
        status: row.status,
        assignedUrologist: row.assigned_urologist,
        initialPSA: row.initial_psa,
        priority: row.priority
      };
    });
    
    console.log(`[searchPatients] Found ${patients.length} patients for query: "${query}"`);
    
    res.json({
      success: true,
      message: 'Patients found',
      data: patients
    });
  } catch (error) {
    console.error('[searchPatients] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patients',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get patients due for review (7-14 days window)
export const getPatientsDueForReview = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n👥 [getPatientsDueForReview ${requestId}] Starting`);
  console.log(`👥 [getPatientsDueForReview ${requestId}] User:`, req.user?.id, req.user?.role);
  
  let client;
  try {
    console.log(`👥 [getPatientsDueForReview ${requestId}] Connecting to database...`);
    console.log(`👥 [getPatientsDueForReview ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    const connectStart = Date.now();
    client = await pool.connect();
    const connectTime = Date.now() - connectStart;
    console.log(`✅ [getPatientsDueForReview ${requestId}] Database connection successful (took ${connectTime}ms)`);
  } catch (dbError) {
    console.error(`❌ [getPatientsDueForReview ${requestId}] Database connection failed:`, dbError.message);
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error code:`, dbError.code);
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error stack:`, dbError.stack);
    console.error(`❌ [getPatientsDueForReview ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
  
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userEmail = req.user.email;
    console.log(`👥 [getPatientsDueForReview ${requestId}] Processing for userId: ${userId}, role: ${userRole}, email: ${userEmail}`);
    
    // For urologists/doctors, get their doctors.id (appointments use doctors.id, not users.id)
    // Appointments have urologist_id pointing to doctors.id
    let doctorId = null;
    if (userRole === 'urologist' || userRole === 'doctor') {
      // Find doctor record by email (since doctors and users are linked by email)
      const doctorCheck = await client.query(
        'SELECT id FROM doctors WHERE email = $1 AND is_active = true',
        [userEmail]
      );
      if (doctorCheck.rows.length > 0) {
        doctorId = doctorCheck.rows[0].id;
        console.log(`👥 [getPatientsDueForReview ${requestId}] Found doctor record with id: ${doctorId} for user ${userId}`);
      } else {
        console.log(`👥 [getPatientsDueForReview ${requestId}] No doctor record found for user ${userId} - returning empty results`);
        // Return empty results if no doctor record exists
        client.release();
        return res.json({
          success: true,
          data: {
            patients: [],
            summary: {
              total: 0,
              postOpFollowup: 0,
              investigation: 0,
              surgical: 0
            }
          }
        });
      }
    }
    
    // Calculate date range for 7-14 days from now
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`[getPatientsDueForReview] Fetching appointments from ${startDateStr} to ${endDateStr} for doctor ${doctorId}`);
    
    // For urologists/doctors, get appointments assigned to them using doctors.id only
    // For nurses, get all appointments in the department
    const appointmentsQuery = (userRole === 'urologist' || userRole === 'doctor') 
      ? `SELECT 
          a.id,
          a.patient_id,
          a.appointment_date,
          a.appointment_time,
          a.appointment_type,
          a.urologist_id,
          a.urologist_name,
          a.notes,
          a.status,
          p.first_name,
          p.last_name,
          p.upi,
          p.date_of_birth,
          p.gender,
          p.care_pathway
         FROM appointments a
         INNER JOIN patients p ON a.patient_id = p.id
         WHERE a.appointment_date BETWEEN $1 AND $2
         AND a.urologist_id = $3
         AND a.status IN ('scheduled', 'confirmed')
         ORDER BY a.appointment_date, a.appointment_time`
      : `SELECT 
          a.id,
          a.patient_id,
          a.appointment_date,
          a.appointment_time,
          a.appointment_type,
          a.urologist_id,
          a.urologist_name,
          a.notes,
          a.status,
          p.first_name,
          p.last_name,
          p.upi,
          p.date_of_birth,
          p.gender,
          p.care_pathway
         FROM appointments a
         INNER JOIN patients p ON a.patient_id = p.id
         WHERE a.appointment_date BETWEEN $1 AND $2
         AND a.status IN ('scheduled', 'confirmed')
         ORDER BY a.appointment_date, a.appointment_time`;
    
    // Use doctors.id only (appointments use doctors.id)
    const queryParams = (userRole === 'urologist' || userRole === 'doctor')
      ? [startDateStr, endDateStr, doctorId]
      : [startDateStr, endDateStr];
    
    const result = await client.query(appointmentsQuery, queryParams);
    
    // Transform appointments into patients due for review
    const patientsMap = new Map();
    
    for (const row of result.rows) {
      const patientId = row.patient_id;
      
      // Calculate age
      const birthDate = new Date(row.date_of_birth);
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Determine type based on appointment type or care pathway
      let type = 'Follow-up';
      if (row.appointment_type === 'surgery') {
        type = 'Surgery';
      } else if (row.care_pathway === 'Post-op Transfer' || row.care_pathway === 'Post-op Followup') {
        type = 'Post-Op Follow-up';
      } else if (row.care_pathway === 'Investigation Pathway') {
        type = 'Investigation';
      } else if (row.appointment_type === 'investigation') {
        type = 'Investigation';
      }
      
      // Determine priority based on date proximity and type
      const daysUntil = Math.floor((new Date(row.appointment_date) - today) / (24 * 60 * 60 * 1000));
      let priority = 'Medium';
      if (daysUntil <= 7 || type === 'Post-Op Follow-up') {
        priority = 'High';
      } else if (daysUntil > 10) {
        priority = 'Low';
      }
      
      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          id: patientId,
          name: `${row.first_name} ${row.last_name}`,
          upi: row.upi,
          age: age,
          type: type,
          date: row.appointment_date,
          time: row.appointment_time,
          priority: priority,
          appointmentId: row.id,
          status: row.status
        });
      }
    }
    
    const patients = Array.from(patientsMap.values());
    
    // Calculate summary statistics
    const summary = {
      total: patients.length,
      postOpFollowup: patients.filter(p => p.type === 'Post-Op Follow-up').length,
      investigation: patients.filter(p => p.type === 'Investigation').length,
      surgical: patients.filter(p => p.type === 'Surgery').length,
      followup: patients.filter(p => p.type === 'Follow-up').length
    };
    
    console.log(`[getPatientsDueForReview] Found ${patients.length} patients due for review`);
    console.log(`[getPatientsDueForReview] Summary:`, summary);
    
    res.json({
      success: true,
      message: 'Patients due for review fetched successfully',
      data: {
        patients: patients,
        summary: summary,
        dateRange: {
          start: startDateStr,
          end: endDateStr
        }
      }
    });
  } catch (error) {
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error occurred:`, error.message);
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error stack:`, error.stack);
    console.error(`❌ [getPatientsDueForReview ${requestId}] User info:`, { id: userId, role: userRole, email: req.user.email });
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error code:`, error.code);
    console.error(`❌ [getPatientsDueForReview ${requestId}] Error name:`, error.name);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch patients due for review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      console.log(`👥 [getPatientsDueForReview ${requestId}] Releasing database connection`);
      client.release();
    }
  }
};
