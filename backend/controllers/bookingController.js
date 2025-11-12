import pool from '../config/database.js';

// Book urologist appointment
export const bookUrologistAppointment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      appointmentDate, 
      appointmentTime, 
      urologistId, 
      urologistName, 
      notes,
      appointmentType,
      surgeryType 
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!appointmentDate || !appointmentTime || !urologistId || !urologistName) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date, time, urologist ID, and urologist name are required'
      });
    }

    // Validate surgery type if appointment is for surgery
    if (appointmentType === 'surgery' && !surgeryType) {
      return res.status(400).json({
        success: false,
        message: 'Surgery type is required for surgery appointments'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if urologist exists - try doctors table first, then users table
    let urologistCheck = await client.query(
      'SELECT id, first_name, last_name, specialization FROM doctors WHERE id = $1 AND is_active = true',
      [urologistId]
    );

    // If not found in doctors table, try users table
    if (urologistCheck.rows.length === 0) {
      urologistCheck = await client.query(
        'SELECT id, first_name, last_name, role FROM users WHERE id = $1 AND role IN ($2, $3)',
        [urologistId, 'urologist', 'doctor']
      );
    }

    if (urologistCheck.rows.length === 0) {
      console.error(`[bookUrologistAppointment] Urologist not found with ID: ${urologistId}`);
      return res.status(404).json({
        success: false,
        message: 'Urologist not found'
      });
    }

    console.log(`[bookUrologistAppointment] Found urologist: ${urologistCheck.rows[0].first_name} ${urologistCheck.rows[0].last_name}`);

    // Check for conflicting appointments
    const conflictCheck = await client.query(
      `SELECT id FROM appointments 
       WHERE urologist_id = $1 AND appointment_date = $2 AND appointment_time = $3 
       AND status IN ('scheduled', 'confirmed')`,
      [urologistId, appointmentDate, appointmentTime]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Urologist already has an appointment at this time'
      });
    }

    // Determine appointment type (default to 'urologist', but allow 'surgery' for surgery pathway)
    const aptType = appointmentType || 'urologist';
    
    // Insert appointment
    const appointmentQuery = await client.query(
      `INSERT INTO appointments (
        patient_id, appointment_type, appointment_date, appointment_time, 
        urologist_id, urologist_name, surgery_type, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        patientId, 
        aptType, 
        appointmentDate, 
        appointmentTime, 
        urologistId, 
        urologistName, 
        surgeryType || null, 
        notes || '', 
        userId
      ]
    );

    const newAppointment = appointmentQuery.rows[0];

    // Update patient's assigned urologist (use consistent name format)
    const urologistFullName = `${urologistCheck.rows[0].first_name} ${urologistCheck.rows[0].last_name}`;
    const updateResult = await client.query(
      'UPDATE patients SET assigned_urologist = $1 WHERE id = $2 RETURNING id, upi, first_name, last_name, assigned_urologist',
      [urologistFullName, patientId]
    );
    
    console.log(`[bookUrologistAppointment] Assigned patient ${updateResult.rows[0].upi} to urologist: ${urologistFullName}`);

    res.json({
      success: true,
      message: 'Urologist appointment booked successfully',
      data: {
        id: newAppointment.id,
        patientId: newAppointment.patient_id,
        appointmentType: newAppointment.appointment_type,
        appointmentDate: newAppointment.appointment_date,
        appointmentTime: newAppointment.appointment_time,
        urologistId: newAppointment.urologist_id,
        urologistName: newAppointment.urologist_name,
        surgeryType: newAppointment.surgery_type,
        status: newAppointment.status,
        notes: newAppointment.notes,
        createdAt: newAppointment.created_at,
        updatedAt: newAppointment.updated_at
      }
    });

  } catch (error) {
    console.error('Book urologist appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Book investigation
export const bookInvestigation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      investigationType, 
      investigationName, 
      scheduledDate, 
      scheduledTime, 
      notes 
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!investigationType || !investigationName || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Investigation type, name, scheduled date, and time are required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check for conflicting investigation bookings at the same date/time
    const conflictCheck = await client.query(
      `SELECT ib.id, ib.investigation_name, p.first_name, p.last_name
       FROM investigation_bookings ib
       JOIN patients p ON ib.patient_id = p.id
       WHERE ib.scheduled_date = $1 
         AND ib.scheduled_time = $2 
         AND ib.status IN ('scheduled', 'confirmed')`,
      [scheduledDate, scheduledTime]
    );

    if (conflictCheck.rows.length > 0) {
      const conflictingPatient = conflictCheck.rows[0];
      return res.status(409).json({
        success: false,
        message: `Time slot already booked for ${conflictingPatient.first_name} ${conflictingPatient.last_name} with ${conflictingPatient.investigation_name}`
      });
    }

    // Insert investigation booking
    const investigationQuery = await client.query(
      `INSERT INTO investigation_bookings (
        patient_id, investigation_type, investigation_name, 
        scheduled_date, scheduled_time, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        patientId, 
        investigationType, 
        investigationName, 
        scheduledDate, 
        scheduledTime, 
        notes || '', 
        userId
      ]
    );

    const newInvestigation = investigationQuery.rows[0];

    // Assign patient to the doctor conducting the investigation
    // This ensures patients appear in the doctor's "New Patients" list
    // Use the investigationName which is the doctor's name
    try {
      if (investigationName && investigationName.trim() !== '') {
        // Only assign if patient doesn't already have an assigned urologist
        const currentAssignment = await client.query(
          'SELECT assigned_urologist FROM patients WHERE id = $1',
          [patientId]
        );
        
        if (currentAssignment.rows.length > 0) {
          const currentUrologist = currentAssignment.rows[0].assigned_urologist;
          
          if (!currentUrologist || currentUrologist.trim() === '') {
            // Patient not assigned yet - assign to the investigation doctor
            await client.query(
              'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
              [investigationName, patientId]
            );
            console.log(`[bookInvestigation] Assigned patient ${patientId} to ${investigationName} for investigation`);
          } else {
            console.log(`[bookInvestigation] Patient already assigned to ${currentUrologist}, skipping reassignment`);
          }
        }
      }
    } catch (assignError) {
      console.error('[bookInvestigation] Failed to assign patient (non-fatal):', assignError.message);
      // Don't fail the investigation booking if assignment fails
    }

    res.json({
      success: true,
      message: 'Investigation booked successfully',
      data: {
        id: newInvestigation.id,
        patientId: newInvestigation.patient_id,
        investigationType: newInvestigation.investigation_type,
        investigationName: newInvestigation.investigation_name,
        scheduledDate: newInvestigation.scheduled_date,
        scheduledTime: newInvestigation.scheduled_time,
        status: newInvestigation.status,
        notes: newInvestigation.notes,
        createdAt: newInvestigation.created_at,
        updatedAt: newInvestigation.updated_at
      }
    });

  } catch (error) {
    console.error('Book investigation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get patient appointments
export const getPatientAppointments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { type } = req.query; // Optional filter by appointment type

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with optional type filter
    let query = `
      SELECT 
        id,
        appointment_type,
        appointment_date,
        appointment_time,
        urologist_id,
        urologist_name,
        surgery_type,
        status,
        notes,
        created_at,
        updated_at
      FROM appointments
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    if (type) {
      query += ' AND appointment_type = $2';
      queryParams.push(type);
    }
    
    query += ' ORDER BY appointment_date DESC, appointment_time DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    const formattedAppointments = result.rows.map(row => ({
      id: row.id,
      appointmentType: row.appointment_type,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      urologistId: row.urologist_id,
      urologistName: row.urologist_name,
      surgeryType: row.surgery_type,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.appointment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }));

    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: {
        appointments: formattedAppointments,
        count: formattedAppointments.length
      }
    });

  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get patient investigation bookings
export const getPatientInvestigationBookings = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { type } = req.query; // Optional filter by investigation type

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with optional type filter
    let query = `
      SELECT 
        id,
        investigation_type,
        investigation_name,
        scheduled_date,
        scheduled_time,
        status,
        notes,
        created_at,
        updated_at
      FROM investigation_bookings
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    if (type) {
      query += ' AND investigation_type = $2';
      queryParams.push(type);
    }
    
    query += ' ORDER BY scheduled_date DESC, scheduled_time DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    const formattedBookings = result.rows.map(row => ({
      id: row.id,
      investigationType: row.investigation_type,
      investigationName: row.investigation_name,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.scheduled_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }));

    res.json({
      success: true,
      message: 'Investigation bookings retrieved successfully',
      data: {
        bookings: formattedBookings,
        count: formattedBookings.length
      }
    });

  } catch (error) {
    console.error('Get patient investigation bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get available urologists
export const getAvailableUrologists = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get urologists from doctors table (Urology department only)
    // Only include active doctors that are verified in users table
    // Only match "Urology" department exactly (not "Neurology" which contains "urology")
    const doctorsTableResult = await client.query(
      `SELECT 
        d.id, 
        d.first_name, 
        d.last_name, 
        d.email, 
        d.phone,
        d.specialization,
        dept.name as department_name
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.id
       INNER JOIN users u ON d.email = u.email
       WHERE d.is_active = true 
       AND (
         -- Check department name: must be exactly "urology" or start with "urology " (with space)
         -- This prevents matching "neurology" which contains "urology" as substring
         (dept.name IS NOT NULL AND (
           LOWER(TRIM(dept.name)) = 'urology' OR 
           LOWER(TRIM(dept.name)) LIKE 'urology %'
         ))
         OR
         -- If no department, check specialization (same logic)
         (dept.name IS NULL AND d.specialization IS NOT NULL AND (
           LOWER(TRIM(d.specialization)) = 'urology' OR 
           LOWER(TRIM(d.specialization)) LIKE 'urology %'
         ))
       )
       AND u.is_active = true 
       AND u.is_verified = true
       ORDER BY d.first_name, d.last_name`
    );

    console.log(`[getAvailableUrologists] Found ${doctorsTableResult.rows.length} urologists from doctors table`);

    // Also get urologists from users table for backwards compatibility
    // Only include active and verified users from Urology department
    // Only include users with role 'urologist' or 'doctor' who are in Urology department
    // Exclude users who already have a record in doctors table (to prevent duplicates)
    const usersTableResult = await client.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role
       FROM users u
       LEFT JOIN doctors d ON u.email = d.email
       LEFT JOIN departments dept ON d.department_id = dept.id
       WHERE u.role IN ('urologist', 'doctor') 
       AND u.is_active = true 
       AND u.is_verified = true
       AND (
         -- User must be in Urology department (exact match, not Neurology)
         -- Check department name: must be exactly "urology" or start with "urology " (with space)
         (dept.name IS NOT NULL AND (
           LOWER(TRIM(dept.name)) = 'urology' OR 
           LOWER(TRIM(dept.name)) LIKE 'urology %'
         ))
         OR
         -- If no department record, only include if role is explicitly 'urologist'
         (dept.name IS NULL AND u.role = 'urologist')
       )
       -- Exclude users who already have an active doctor record in doctors table
       AND NOT EXISTS (
         SELECT 1 FROM doctors d2 
         WHERE d2.email = u.email 
         AND d2.is_active = true
       )
       AND NOT EXISTS (
         SELECT 1 FROM doctors d3 WHERE d3.email = u.email AND d3.is_active = false
       )
       ORDER BY u.first_name, u.last_name`
    );

    console.log(`[getAvailableUrologists] Found ${usersTableResult.rows.length} urologists from users table`);

    // Create urologists array from doctors table
    const urologistsFromTable = doctorsTableResult.rows.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      role: 'urologist',
      specialization: row.specialization || row.department_name || 'Urology',
      department: row.department_name,
      source: 'doctors_table'
    }));

    // Get emails from doctors table to exclude duplicates
    const doctorsTableEmails = new Set(
      doctorsTableResult.rows.map(row => row.email.toLowerCase())
    );

    // Create urologists array from users table, excluding those already in doctors table
    const urologistsFromUsers = usersTableResult.rows
      .filter(row => !doctorsTableEmails.has(row.email.toLowerCase()))
      .map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        phone: row.phone,
        role: row.role,
        specialization: 'Urologist',
        source: 'users_table'
      }));

    // Combine both lists (doctors table takes priority, no duplicates)
    const allUrologists = [...urologistsFromTable, ...urologistsFromUsers];
    
    // Final deduplication by email (case-insensitive) - keep first occurrence (doctors_table takes priority)
    const seenEmails = new Set();
    const urologists = allUrologists.filter(urologist => {
      const emailLower = urologist.email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        return false; // Skip duplicate
      }
      seenEmails.add(emailLower);
      return true; // Keep first occurrence
    });

    console.log(`[getAvailableUrologists] Total urologists available (after deduplication): ${urologists.length}`);

    res.json({
      success: true,
      message: 'Urologists retrieved successfully',
      data: {
        urologists,
        count: urologists.length
      }
    });

  } catch (error) {
    console.error('Get available urologists error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all available doctors (all specializations)
export const getAvailableDoctors = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get all doctors from the doctors table (where actual doctor records are stored)
    // Only include active doctors that are verified in users table
    const doctorsTableResult = await client.query(
      `SELECT 
        d.id, 
        d.first_name, 
        d.last_name, 
        d.email, 
        d.phone, 
        d.specialization,
        dept.name as department_name
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.id
       INNER JOIN users u ON d.email = u.email
       WHERE d.is_active = true 
       AND u.is_active = true 
       AND u.is_verified = true
       ORDER BY d.specialization, d.first_name, d.last_name`
    );

    console.log(`[getAvailableDoctors] Found ${doctorsTableResult.rows.length} doctors from doctors table`);

    // Also get users with doctor roles for backwards compatibility
    // Only include active and verified users, and exclude those with inactive doctor records
    const usersTableResult = await client.query(
      `SELECT id, first_name, last_name, email, phone, role
       FROM users 
       WHERE role IN ('urologist', 'doctor', 'radiologist', 'pathologist', 'oncologist') 
       AND is_active = true
       AND is_verified = true
       AND NOT EXISTS (
         SELECT 1 FROM doctors d WHERE d.email = users.email AND d.is_active = false
       )
       ORDER BY role, first_name, last_name`
    );

    console.log(`[getAvailableDoctors] Found ${usersTableResult.rows.length} doctors from users table`);

    // Create doctors array from doctors table
    const doctorsFromTable = doctorsTableResult.rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      role: 'doctor', // Generic role
      specialization: row.specialization || row.department_name || 'Doctor',
      department: row.department_name,
      available: true,
      source: 'doctors_table' // Track source for debugging
    }));

    // Create doctors array from users table
    const doctorsFromUsers = usersTableResult.rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      role: row.role,
      specialization: getSpecializationFromRole(row.role),
      available: true,
      source: 'users_table' // Track source for debugging
    }));

    // Combine both lists (doctors table takes priority)
    const allDoctors = [...doctorsFromTable, ...doctorsFromUsers];

    console.log(`[getAvailableDoctors] Total doctors available: ${allDoctors.length}`);

    // If no doctors found, return empty array with success message
    if (allDoctors.length === 0) {
      return res.json({
        success: true,
        message: 'No doctors found. Please register some doctors first.',
        data: []
      });
    }

    res.json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: allDoctors
    });

  } catch (error) {
    console.error('Get available doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Get today's appointments
export const getTodaysAppointments = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n📅 [getTodaysAppointments ${requestId}] Starting`);
  console.log(`📅 [getTodaysAppointments ${requestId}] User:`, req.user?.id, req.user?.role);
  
  let client;
  try {
    console.log(`📅 [getTodaysAppointments ${requestId}] Connecting to database...`);
    console.log(`📅 [getTodaysAppointments ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    const connectStart = Date.now();
    client = await pool.connect();
    const connectTime = Date.now() - connectStart;
    console.log(`✅ [getTodaysAppointments ${requestId}] Database connection successful (took ${connectTime}ms)`);
  } catch (dbError) {
    console.error(`❌ [getTodaysAppointments ${requestId}] Database connection failed:`, dbError.message);
    console.error(`❌ [getTodaysAppointments ${requestId}] Error code:`, dbError.code);
    console.error(`❌ [getTodaysAppointments ${requestId}] Error stack:`, dbError.stack);
    console.error(`❌ [getTodaysAppointments ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
  
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    console.log(`📅 [getTodaysAppointments ${requestId}] Processing for userId: ${userId}, role: ${userRole}`);
    const { type } = req.query; // 'investigation' or 'urologist'
    
    console.log(`[getTodaysAppointments] User ID: ${userId}, Role: ${userRole}, Type: ${type}`);
    
    // Use local timezone instead of UTC to get the correct "today"
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0'); // YYYY-MM-DD format in local timezone
    
    console.log(`📅 [getTodaysAppointments ${requestId}] Today's date: ${today}`);
    
    let query = '';
    let queryParams = [today];
    
    if (type === 'investigation') {
      // Get investigation bookings for today
      query = `
        SELECT 
          ib.id,
          ib.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          ib.scheduled_date as appointment_date,
          ib.scheduled_time as appointment_time,
          ib.investigation_name as urologist,
          ib.investigation_type,
          ib.status,
          ib.notes,
          'investigation' as type
        FROM investigation_bookings ib
        JOIN patients p ON ib.patient_id = p.id
        WHERE ib.scheduled_date = $1
        ORDER BY ib.scheduled_time
      `;
    } else if (type === 'urologist') {
      // Get urologist appointments for today
      // For urologists/doctors, optionally filter by their ID if they want only their appointments
      // For now, show all urologist appointments for today
      query = `
        SELECT 
          a.id,
          a.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          a.appointment_date,
          a.appointment_time,
          a.urologist_name as urologist,
          a.status,
          a.notes,
          'urologist' as type
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.appointment_date = $1 
        AND a.appointment_type = 'urologist'
        AND a.status != 'cancelled'
        ORDER BY a.appointment_time
      `;
    } else {
      // Get all appointments for today
      query = `
        SELECT 
          a.id,
          a.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          a.appointment_date,
          a.appointment_time,
          a.urologist_name as urologist,
          a.status,
          a.notes,
          a.appointment_type as type
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.appointment_date = $1
        AND a.status != 'cancelled'
        
        UNION ALL
        
        SELECT 
          ib.id,
          ib.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          ib.scheduled_date as appointment_date,
          ib.scheduled_time as appointment_time,
          ib.investigation_name as urologist,
          ib.status,
          ib.notes,
          'investigation' as type
        FROM investigation_bookings ib
        JOIN patients p ON ib.patient_id = p.id
        WHERE ib.scheduled_date = $1
        AND ib.status != 'cancelled'
        
        ORDER BY appointment_time
      `;
    }
    
    console.log(`📅 [getTodaysAppointments ${requestId}] Executing query with params:`, queryParams);
    console.log(`📅 [getTodaysAppointments ${requestId}] Query type: ${type || 'all'}`);
    
    let result;
    try {
      result = await client.query(query, queryParams);
      console.log(`✅ [getTodaysAppointments ${requestId}] Query executed successfully, returned ${result.rows.length} rows`);
    } catch (queryError) {
      console.error(`❌ [getTodaysAppointments ${requestId}] Query execution failed:`, queryError.message);
      console.error(`❌ [getTodaysAppointments ${requestId}] Query error code:`, queryError.code);
      console.error(`❌ [getTodaysAppointments ${requestId}] Query error stack:`, queryError.stack);
      throw queryError;
    }
    
    // Get test results for all patients in the appointments
    const patientIds = result.rows
      .map(row => row.patient_id)
      .filter(id => id != null && id !== undefined) // Remove null/undefined
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
    
    let testResults = {};
    
    if (patientIds.length > 0) {
      try {
        const testResultsQuery = `
          SELECT 
            patient_id,
            test_type,
            test_name
          FROM investigation_results
          WHERE patient_id = ANY($1::int[])
        `;
        
        console.log(`📅 [getTodaysAppointments ${requestId}] Fetching test results for ${patientIds.length} patients`);
        const testResultsResult = await client.query(testResultsQuery, [patientIds]);
        console.log(`✅ [getTodaysAppointments ${requestId}] Found ${testResultsResult.rows.length} test results`);
      
        // Group test results by patient ID
        testResultsResult.rows.forEach(row => {
          if (!row.patient_id) return; // Skip if patient_id is null
          
          if (!testResults[row.patient_id]) {
            testResults[row.patient_id] = { mri: false, biopsy: false, trus: false };
          }
          
          // Check if test type or name matches our expected values
          const testType = row.test_type ? String(row.test_type).toLowerCase() : '';
          const testName = row.test_name ? String(row.test_name).toLowerCase() : '';
          
          if (testType.includes('mri') || testName.includes('mri')) {
            testResults[row.patient_id].mri = true;
          }
          if (testType.includes('biopsy') || testName.includes('biopsy')) {
            testResults[row.patient_id].biopsy = true;
          }
          if (testType.includes('trus') || testName.includes('trus')) {
            testResults[row.patient_id].trus = true;
          }
        });
      } catch (testError) {
        console.error('[getTodaysAppointments] Error fetching test results:', testError);
        console.error('[getTodaysAppointments] Test error stack:', testError.stack);
        // Continue without test results rather than failing
        testResults = {};
      }
    } else {
      console.log('[getTodaysAppointments] No patient IDs to fetch test results for');
    }
    
    // Format results for frontend
    const formattedAppointments = result.rows.map((row, index) => {
      try {
        // Format date for display (YYYY-MM-DD format for frontend parsing)
        const formatDate = (dateString) => {
          if (!dateString) return '';
          try {
            // Handle PostgreSQL date objects directly
            if (dateString instanceof Date) {
              const year = dateString.getFullYear();
              const month = String(dateString.getMonth() + 1).padStart(2, '0');
              const day = String(dateString.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            
            // Handle string dates
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
              console.error('Invalid date in backend:', dateString);
              return dateString;
            }
            
            // Use local timezone components to avoid UTC conversion issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error('Date formatting error:', error, 'Input:', dateString);
            return dateString;
          }
        };

        // Format time for display (HH:MM format without seconds)
        const formatTime = (timeString) => {
          if (!timeString) return '';
          try {
            // If it's already in HH:MM format, return as is
            if (timeString.match(/^\d{2}:\d{2}$/)) {
              return timeString;
            }
            // If it's a full datetime string, extract time part
            const date = new Date(timeString);
            if (isNaN(date.getTime())) {
              console.error('Invalid time in backend:', timeString);
              return timeString;
            }
            // Return HH:MM format without seconds
            return date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
          } catch (error) {
            console.error('Time formatting error:', error, 'Input:', timeString);
            return timeString;
          }
        };

        return {
          id: row.id,
          patientName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown Patient',
          upi: row.upi || '',
          age: row.age || 0,
          gender: row.gender || 'Unknown',
          psa: row.psa || 0,
          appointmentDate: formatDate(row.appointment_date),
          appointmentTime: formatTime(row.appointment_time),
          urologist: row.urologist || 'Unassigned',
          status: row.status || 'scheduled',
          notes: row.notes || '',
          type: row.type || 'urologist',
          // Add test result status for all appointments
          mri: testResults[row.patient_id]?.mri ? 'completed' : 'pending',
          biopsy: testResults[row.patient_id]?.biopsy ? 'completed' : 'pending',
          trus: testResults[row.patient_id]?.trus ? 'completed' : 'pending'
        };
      } catch (formatError) {
        console.error(`[getTodaysAppointments] Error formatting appointment ${index}:`, formatError);
        console.error(`[getTodaysAppointments] Row data:`, row);
        // Return a safe fallback object
        return {
          id: row.id || 0,
          patientName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown Patient',
          upi: row.upi || '',
          age: row.age || 0,
          gender: row.gender || 'Unknown',
          psa: row.psa || 0,
          appointmentDate: row.appointment_date || today,
          appointmentTime: row.appointment_time || '',
          urologist: row.urologist || 'Unassigned',
          status: row.status || 'scheduled',
          notes: row.notes || '',
          type: row.type || 'urologist',
          mri: 'pending',
          biopsy: 'pending',
          trus: 'pending'
        };
      }
    }).filter(apt => apt != null); // Remove any null entries
    
    console.log(`✅ [getTodaysAppointments ${requestId}] Formatted ${formattedAppointments.length} appointments, sending response`);
    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: {
        appointments: formattedAppointments,
        count: formattedAppointments.length,
        date: today
      }
    });
    console.log(`✅ [getTodaysAppointments ${requestId}] Response sent successfully`);
    
  } catch (error) {
    console.error(`❌ [getTodaysAppointments ${requestId}] Error occurred:`, error.message);
    console.error(`❌ [getTodaysAppointments ${requestId}] Error stack:`, error.stack);
    console.error(`❌ [getTodaysAppointments ${requestId}] User info:`, { id: req.user?.id, role: req.user?.role });
    console.error(`❌ [getTodaysAppointments ${requestId}] Query params:`, req.query);
    console.error(`❌ [getTodaysAppointments ${requestId}] Error code:`, error.code);
    console.error(`❌ [getTodaysAppointments ${requestId}] Error name:`, error.name);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      console.log(`📅 [getTodaysAppointments ${requestId}] Releasing database connection`);
      client.release();
    }
  }
};

// Get no-show patients
export const getNoShowPatients = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { type } = req.query; // 'investigation' or 'urologist'
    
    // Use local timezone instead of UTC to get the correct "today"
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0'); // YYYY-MM-DD format in local timezone
    
    let query = '';
    let queryParams = [today];
    
    if (type === 'investigation') {
      // Get investigation no-shows (past appointments with no-show status)
      query = `
        SELECT 
          ib.id,
          ib.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          ib.scheduled_date as scheduled_date,
          ib.scheduled_time as scheduled_time,
          'investigation' as appointment_type,
          ib.investigation_name
        FROM investigation_bookings ib
        JOIN patients p ON ib.patient_id = p.id
        WHERE ib.status = 'no_show' AND ib.scheduled_date <= $1
        ORDER BY ib.scheduled_date DESC, ib.scheduled_time DESC
      `;
    } else if (type === 'urologist') {
      // Get urologist no-shows
      query = `
        SELECT 
          a.id,
          a.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          a.appointment_date as scheduled_date,
          a.appointment_time as scheduled_time,
          'urologist' as appointment_type,
          a.urologist_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.status = 'no_show' AND a.appointment_date <= $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
    } else {
      // Get all no-shows
      query = `
        SELECT 
          a.id,
          a.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          a.appointment_date as scheduled_date,
          a.appointment_time as scheduled_time,
          'urologist' as appointment_type,
          a.urologist_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.status = 'no_show' AND a.appointment_date <= $1
        
        UNION ALL
        
        SELECT 
          ib.id,
          ib.patient_id,
          p.first_name,
          p.last_name,
          p.upi,
          EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
          p.gender,
          p.initial_psa as psa,
          ib.scheduled_date as scheduled_date,
          ib.scheduled_time as scheduled_time,
          'investigation' as appointment_type,
          ib.investigation_name
        FROM investigation_bookings ib
        JOIN patients p ON ib.patient_id = p.id
        WHERE ib.status = 'no_show' AND ib.scheduled_date <= $1
        
        ORDER BY scheduled_date DESC, scheduled_time DESC
      `;
    }
    
    const result = await client.query(query, queryParams);
    
    // Format results for frontend
    const formattedNoShows = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      upi: row.upi,
      age: row.age,
      gender: row.gender,
      psa: row.psa,
      appointmentType: row.appointment_type,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      doctorName: row.urologist_name || row.investigation_name
    }));
    
    res.json({
      success: true,
      message: 'No-show patients retrieved successfully',
      data: {
        noShowPatients: formattedNoShows,
        count: formattedNoShows.length
      }
    });
    
  } catch (error) {
    console.error('Get no-show patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Mark appointment as no-show
export const markAppointmentAsNoShow = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { appointmentId } = req.params;
    const { reason, notes, type } = req.body;
    const userId = req.user.id; // Get the logged-in user's ID
    
    // Get user details for proper name display
    const userQuery = await client.query(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userQuery.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;
    const userRole = user.role === 'urology_nurse' ? 'Nurse' : 
                    (user.role === 'urologist' || user.role === 'doctor') ? 'Urologist' : 
                    user.role === 'admin' ? 'Admin' : 'User';
    
    let appointmentQuery, updateQuery, appointment, updateResult;
    
    if (type === 'investigation') {
      // Handle investigation booking
      appointmentQuery = `
        SELECT ib.*, p.first_name, p.last_name, p.upi, p.date_of_birth, p.gender, p.initial_psa,
               EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
        FROM investigation_bookings ib
        JOIN patients p ON ib.patient_id = p.id
        WHERE ib.id = $1
      `;
      
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Investigation booking not found'
        });
      }
      
      appointment = appointmentResult.rows[0];
      
      // Update investigation booking status to no-show
      updateQuery = `
        UPDATE investigation_bookings 
        SET status = 'no_show', 
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | No-show: ' || $1 || ' - ' || $2
        WHERE id = $3
        RETURNING *
      `;
      
      updateResult = await client.query(updateQuery, [
        reason || 'No show',
        notes || '',
        appointmentId
      ]);
      
    } else {
      // Handle urologist appointment
      appointmentQuery = `
        SELECT a.*, p.first_name, p.last_name, p.upi, p.date_of_birth, p.gender, p.initial_psa,
               EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.id = $1
      `;
      
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      appointment = appointmentResult.rows[0];
      
      // Update appointment status to no-show
      updateQuery = `
        UPDATE appointments 
        SET status = 'no_show', 
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | No-show: ' || $1 || ' - ' || $2
        WHERE id = $3
        RETURNING *
      `;
      
      updateResult = await client.query(updateQuery, [
        reason || 'No show',
        notes || '',
        appointmentId
      ]);
    }
    
    // Add timeline entry for no-show
    const timelineQuery = `
      INSERT INTO patient_notes (patient_id, note_type, note_content, author_id, author_name, author_role, created_at)
      VALUES ($1, 'no_show', $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;
    
    const timelineContent = `Patient marked as No Show - Reason: ${reason || 'No show'}. Notes: ${notes || 'No additional notes'}`;
    await client.query(timelineQuery, [appointment.patient_id, timelineContent, userId, userName, userRole]);
    
    res.json({
      success: true,
      message: 'Patient successfully marked as no-show',
      data: {
        appointment: updateResult.rows[0],
        patient: {
          id: appointment.patient_id,
          name: `${appointment.first_name} ${appointment.last_name}`,
          upi: appointment.upi,
          age: appointment.age,
          gender: appointment.gender,
          psa: appointment.initial_psa
        }
      }
    });
    
  } catch (error) {
    console.error('Mark appointment as no-show error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Helper function to get specialization from role
const getSpecializationFromRole = (role) => {
  const roleMap = {
    'urologist': 'Urologist',
    'radiologist': 'Radiologist', 
    'pathologist': 'Pathologist',
    'oncologist': 'Oncologist'
  };
  return roleMap[role] || 'Doctor';
};

// Add note to no-show patient
export const addNoShowNote = async (req, res) => {
  const client = await pool.connect();
  try {
    const { appointmentId } = req.params;
    const { noteContent, type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!noteContent || !noteContent.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    // Get patient ID from appointment
    let patientId;
    if (type === 'investigation') {
      const appointmentQuery = `SELECT patient_id FROM investigation_bookings WHERE id = $1`;
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Investigation appointment not found'
        });
      }
      patientId = appointmentResult.rows[0].patient_id;
    } else {
      const appointmentQuery = `SELECT patient_id FROM appointments WHERE id = $1`;
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      patientId = appointmentResult.rows[0].patient_id;
    }

    // Get user details for author info
    const userQuery = `SELECT first_name, last_name, role FROM users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);
    const user = userResult.rows[0];

    // Add note to patient_notes
    const noteQuery = `
      INSERT INTO patient_notes (patient_id, note_content, note_type, author_id, author_name, author_role, created_at)
      VALUES ($1, $2, 'no_show_followup', $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const authorName = `${user.first_name} ${user.last_name}`;
    const authorRole = user.role === 'urology_nurse' ? 'Nurse' : 
                      (user.role === 'urologist' || user.role === 'doctor') ? 'Urologist' : 
                      user.role === 'admin' ? 'Admin' : 'User';
    
    const noteResult = await client.query(noteQuery, [
      patientId,
      noteContent.trim(),
      userId,
      authorName,
      authorRole
    ]);

    res.json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: noteResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Add no-show note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get notes for no-show patient
export const getNoShowNotes = async (req, res) => {
  const client = await pool.connect();
  try {
    const { appointmentId } = req.params;
    const { type } = req.query;

    // Get patient ID from appointment
    let patientId;
    if (type === 'investigation') {
      const appointmentQuery = `SELECT patient_id FROM investigation_bookings WHERE id = $1`;
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Investigation appointment not found'
        });
      }
      patientId = appointmentResult.rows[0].patient_id;
    } else {
      const appointmentQuery = `SELECT patient_id FROM appointments WHERE id = $1`;
      const appointmentResult = await client.query(appointmentQuery, [appointmentId]);
      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      patientId = appointmentResult.rows[0].patient_id;
    }

    // Get notes for the patient
    const notesQuery = `
      SELECT id, note_content, note_type, author_name, author_role, created_at
      FROM patient_notes
      WHERE patient_id = $1 AND note_type = 'no_show_followup'
      ORDER BY created_at DESC
    `;
    
    const notesResult = await client.query(notesQuery, [patientId]);

    res.json({
      success: true,
      data: {
        notes: notesResult.rows
      }
    });

  } catch (error) {
    console.error('Get no-show notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Remove note from no-show patient
export const removeNoShowNote = async (req, res) => {
  const client = await pool.connect();
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    // Check if note exists and user has permission to delete it
    const noteQuery = `
      SELECT pn.*, u.role 
      FROM patient_notes pn
      JOIN users u ON pn.author_id = u.id
      WHERE pn.id = $1
    `;
    
    const noteResult = await client.query(noteQuery, [noteId]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const note = noteResult.rows[0];
    
    // Check if user can delete the note (author or admin/urologist/doctor)
    if (note.author_id !== userId && !['admin', 'urologist', 'doctor'].includes(note.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this note'
      });
    }

    // Delete the note
    const deleteQuery = `DELETE FROM patient_notes WHERE id = $1`;
    await client.query(deleteQuery, [noteId]);

    res.json({
      success: true,
      message: 'Note removed successfully'
    });

  } catch (error) {
    console.error('Remove no-show note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get available time slots for a doctor on a specific date
// Reschedule a no-show appointment
export const rescheduleNoShowAppointment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime, newDoctorId, appointmentType, surgeryType } = req.body;

    if (!newDate || !newTime || !newDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'New date, time, and doctor are required'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM'
      });
    }

    // Check if doctor exists - try doctors table first, then users table
    // IMPORTANT: appointments.urologist_id references users(id), so we need the users table ID
    let doctorResult = await client.query(
      `SELECT d.id, d.first_name, d.last_name, d.specialization, d.email, u.id as user_id
       FROM doctors d
       LEFT JOIN users u ON d.email = u.email
       WHERE d.id = $1 AND d.is_active = true`,
      [newDoctorId]
    );
    
    let doctorUserId = null;
    let doctorSource = 'doctors';
    
    // If not found in doctors table, try users table directly
    if (doctorResult.rows.length === 0) {
      doctorResult = await client.query(
        `SELECT id, first_name, last_name, id as user_id FROM users WHERE id = $1 AND role IN ('urologist', 'doctor') AND is_active = true`,
        [newDoctorId]
      );
      doctorSource = 'users';
    }
    
    if (doctorResult.rows.length === 0) {
      console.error(`[rescheduleNoShowAppointment] Doctor not found with ID: ${newDoctorId}`);
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const doctor = doctorResult.rows[0];
    const doctorName = `${doctor.first_name} ${doctor.last_name}`;
    
    // Get the user_id for the foreign key constraint
    // If doctor is from doctors table, use the linked user_id
    // If doctor is from users table, use the id directly
    doctorUserId = doctor.user_id || (doctorSource === 'users' ? doctor.id : null);
    
    if (!doctorUserId) {
      console.error(`[rescheduleNoShowAppointment] Doctor ${doctorName} (ID: ${newDoctorId}) does not have a corresponding user record`);
      return res.status(400).json({
        success: false,
        message: 'Doctor does not have a corresponding user account. Please ensure the doctor has a user account linked to their email.'
      });
    }
    
    console.log(`[rescheduleNoShowAppointment] Found doctor: ${doctorName} (Doctor ID: ${newDoctorId}, User ID: ${doctorUserId}, Source: ${doctorSource})`);

    // Start transaction
    await client.query('BEGIN');

    // First, determine the original appointment type by checking both tables
    const checkUrologistAppointment = await client.query(
      'SELECT id, status, patient_id FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    const checkInvestigationAppointment = await client.query(
      'SELECT id, status, patient_id FROM investigation_bookings WHERE id = $1',
      [appointmentId]
    );
    
    const originalAppointmentType = checkUrologistAppointment.rows.length > 0 
      ? 'urologist' 
      : (checkInvestigationAppointment.rows.length > 0 ? 'investigation' : null);
    
    if (!originalAppointmentType) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    const patientIdForTimeline = checkUrologistAppointment.rows.length > 0 
      ? checkUrologistAppointment.rows[0].patient_id 
      : checkInvestigationAppointment.rows[0].patient_id;
    
    const currentStatus = checkUrologistAppointment.rows.length > 0
      ? checkUrologistAppointment.rows[0].status
      : checkInvestigationAppointment.rows[0].status;
    
    // Check if appointment type is being changed
    const isTypeChange = originalAppointmentType !== appointmentType;
    
    console.log(`[rescheduleNoShowAppointment] Original type: ${originalAppointmentType}, New type: ${appointmentType}, Type change: ${isTypeChange}`);
    
    // If appointment type is being changed, delete old appointment and create new one
    if (isTypeChange) {
      // Delete the old appointment
      if (originalAppointmentType === 'urologist') {
        await client.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
        console.log(`[rescheduleNoShowAppointment] Deleted old urologist appointment ${appointmentId}`);
      } else {
        await client.query('DELETE FROM investigation_bookings WHERE id = $1', [appointmentId]);
        console.log(`[rescheduleNoShowAppointment] Deleted old investigation appointment ${appointmentId}`);
      }
      
      // Create new appointment in the other table
      const notesText = req.body.notes || '';
      
      if (appointmentType === 'investigation') {
        // Create new investigation booking
        const newInvestigationQuery = `
          INSERT INTO investigation_bookings (
            patient_id, investigation_type, investigation_name, 
            scheduled_date, scheduled_time, notes, created_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, patient_id
        `;
        const newInvestigationResult = await client.query(newInvestigationQuery, [
          patientIdForTimeline,
          'urologist', // investigation_type
          doctorName,
          newDate,
          newTime,
          notesText || `Changed from ${originalAppointmentType} appointment`,
          req.user.id,
          'scheduled'
        ]);
        
        const newAppointmentId = newInvestigationResult.rows[0].id;
        console.log(`[rescheduleNoShowAppointment] Created new investigation appointment ${newAppointmentId}`);
        
        // Update patient's assigned urologist
        await client.query(
          'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
          [doctorName, patientIdForTimeline]
        );
        
        // Add timeline entry
        const timelineNote = `Appointment type changed from ${originalAppointmentType} to investigation and scheduled for ${newDate} at ${newTime} with ${doctorName}`;
        await client.query(
          'INSERT INTO patient_notes (patient_id, note_content, author_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [patientIdForTimeline, timelineNote, req.user.id]
        );
        
        // Commit and return
        await client.query('COMMIT');
        return res.json({
          success: true,
          message: 'Appointment type changed and rescheduled successfully',
          data: {
            appointmentId: newAppointmentId,
            newDate,
            newTime,
            doctorName,
            appointmentType: 'investigation'
          }
        });
      } else {
        // Create new urologist appointment
        const newAppointmentQuery = `
          INSERT INTO appointments (
            patient_id, appointment_type, appointment_date, appointment_time, 
            urologist_id, urologist_name, surgery_type, notes, created_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, patient_id
        `;
        const newAppointmentResult = await client.query(newAppointmentQuery, [
          patientIdForTimeline,
          'urologist',
          newDate,
          newTime,
          doctorUserId, // Use user_id for foreign key constraint, not doctor_id
          doctorName,
          surgeryType || null,
          notesText || `Changed from ${originalAppointmentType} appointment`,
          req.user.id,
          'scheduled'
        ]);
        
        const newAppointmentId = newAppointmentResult.rows[0].id;
        console.log(`[rescheduleNoShowAppointment] Created new urologist appointment ${newAppointmentId}`);
        
        // Update patient's assigned urologist
        await client.query(
          'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
          [doctorName, patientIdForTimeline]
        );
        
        // Add timeline entry
        const timelineNote = `Appointment type changed from ${originalAppointmentType} to urologist consultation and scheduled for ${newDate} at ${newTime} with Dr. ${doctorName}`;
        await client.query(
          'INSERT INTO patient_notes (patient_id, note_content, author_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [patientIdForTimeline, timelineNote, req.user.id]
        );
        
        // Commit and return
        await client.query('COMMIT');
        return res.json({
          success: true,
          message: 'Appointment type changed and rescheduled successfully',
          data: {
            appointmentId: newAppointmentId,
            newDate,
            newTime,
            doctorName,
            appointmentType: 'urologist'
          }
        });
      }
    }
    
    // If appointment type is not changing, proceed with normal update
    if (appointmentType === 'investigation') {
      // Update investigation booking
      // First get the current appointment status
      const getCurrentInvestigation = await client.query(
        'SELECT status, patient_id FROM investigation_bookings WHERE id = $1',
        [appointmentId]
      );
      
      if (getCurrentInvestigation.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Investigation appointment not found'
        });
      }
      
      const currentStatus = getCurrentInvestigation.rows[0].status;
      const patientIdForTimeline = getCurrentInvestigation.rows[0].patient_id;
      
      // Build notes update - append new notes if provided
      const notesText = req.body.notes || '';
      
      let updateQuery;
      let updateParams;
      
      if (notesText) {
        updateQuery = `
          UPDATE investigation_bookings 
          SET scheduled_date = $1, 
              scheduled_time = $2, 
              investigation_name = $3,
              status = 'scheduled',
              notes = COALESCE(notes, '') || '\n' || $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING patient_id
        `;
        updateParams = [newDate, newTime, doctorName, notesText, appointmentId];
      } else {
        updateQuery = `
          UPDATE investigation_bookings 
          SET scheduled_date = $1, 
              scheduled_time = $2, 
              investigation_name = $3,
              status = 'scheduled',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING patient_id
        `;
        updateParams = [newDate, newTime, doctorName, appointmentId];
      }
      
      const updateResult = await client.query(updateQuery, updateParams);
      
      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Investigation appointment not found'
        });
      }

      // Update patient's assigned urologist (already have doctorName from earlier query)
      const updatePatientQuery = `
        UPDATE patients 
        SET assigned_urologist = $1
        WHERE id = $2
      `;
      await client.query(updatePatientQuery, [doctorName, patientIdForTimeline]);
      console.log(`[rescheduleNoShowAppointment] Assigned patient ${patientIdForTimeline} to urologist: ${doctorName}`);
      
      // Add timeline entry for the update
      const timelineQuery = `
        INSERT INTO patient_notes (patient_id, note_content, author_id, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      
      const timelineNote = currentStatus === 'no_show' 
        ? `Investigation appointment rescheduled from no-show to ${newDate} at ${newTime} with ${doctorName}`
        : `Investigation appointment updated to ${newDate} at ${newTime} with ${doctorName}`;
      await client.query(timelineQuery, [patientIdForTimeline, timelineNote, req.user.id]);

    } else {
      // Update urologist appointment (for both no-show and regular appointments)
      // First get the current appointment status
      const getCurrentAppointment = await client.query(
        'SELECT status, patient_id FROM appointments WHERE id = $1',
        [appointmentId]
      );
      
      if (getCurrentAppointment.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      const currentStatus = getCurrentAppointment.rows[0].status;
      const patientIdForTimeline = getCurrentAppointment.rows[0].patient_id;
      
      // Build notes update - append new notes if provided
      const notesText = req.body.notes || '';
      
      let updateQuery;
      let updateParams;
      
      if (notesText) {
        updateQuery = `
          UPDATE appointments 
          SET appointment_date = $1, 
              appointment_time = $2, 
              urologist_id = $3,
              urologist_name = $4,
              surgery_type = $5,
              status = 'scheduled',
              notes = COALESCE(notes, '') || '\n' || $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING patient_id
        `;
        updateParams = [newDate, newTime, doctorUserId, doctorName, surgeryType || null, notesText, appointmentId];
      } else {
        updateQuery = `
          UPDATE appointments 
          SET appointment_date = $1, 
              appointment_time = $2, 
              urologist_id = $3,
              urologist_name = $4,
              surgery_type = $5,
              status = 'scheduled',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
          RETURNING patient_id
        `;
        updateParams = [newDate, newTime, doctorUserId, doctorName, surgeryType || null, appointmentId];
      }
      
      const updateResult = await client.query(updateQuery, updateParams);
      
      // Update patient's assigned urologist if doctor changed
      const updatePatientUrologistQuery = `
        UPDATE patients 
        SET assigned_urologist = $1
        WHERE id = $2
      `;
      await client.query(updatePatientUrologistQuery, [doctorName, patientIdForTimeline]);
      console.log(`[rescheduleNoShowAppointment] Assigned patient ${patientIdForTimeline} to urologist: ${doctorName}`);
      
      // Add timeline entry for the update
      const timelineQuery = `
        INSERT INTO patient_notes (patient_id, note_content, author_id, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      
      const timelineNote = currentStatus === 'no_show' 
        ? `Appointment rescheduled from no-show to ${newDate} at ${newTime} with Dr. ${doctorName}`
        : `Appointment updated to ${newDate} at ${newTime} with Dr. ${doctorName}`;
      await client.query(timelineQuery, [patientIdForTimeline, timelineNote, req.user.id]);
    }

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        appointmentId,
        newDate,
        newTime,
        doctorName
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rescheduling no-show appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const getAvailableTimeSlots = async (req, res) => {
  const client = await pool.connect();
  try {
    const { doctorId } = req.params;
    const { date, type = 'urologist', timezoneOffset } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Check if doctor exists - try doctors table first, then users table
    let doctor = null;
    let doctorSource = null;
    
    // Try doctors table first
    const doctorsTableQuery = `SELECT id, first_name, last_name, specialization FROM doctors WHERE id = $1 AND is_active = true`;
    const doctorsTableResult = await client.query(doctorsTableQuery, [doctorId]);
    
    if (doctorsTableResult.rows.length > 0) {
      doctor = doctorsTableResult.rows[0];
      doctorSource = 'doctors_table';
      console.log(`[getAvailableTimeSlots] Found doctor in doctors table: ${doctor.first_name} ${doctor.last_name} (${doctor.specialization})`);
    } else {
      // Try users table for backwards compatibility
      const usersTableQuery = `SELECT id, first_name, last_name, role FROM users WHERE id = $1 AND role IN ('urologist', 'doctor', 'radiologist', 'pathologist', 'oncologist')`;
      const usersTableResult = await client.query(usersTableQuery, [doctorId]);
      
      if (usersTableResult.rows.length > 0) {
        doctor = usersTableResult.rows[0];
        doctorSource = 'users_table';
        console.log(`[getAvailableTimeSlots] Found doctor in users table: ${doctor.first_name} ${doctor.last_name} (${doctor.role})`);
      }
    }
    
    if (!doctor) {
      console.error(`[getAvailableTimeSlots] Doctor not found with ID: ${doctorId}`);
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    console.log(`[getAvailableTimeSlots] Checking availability for doctor: ${doctor.first_name} ${doctor.last_name} from ${doctorSource}`);

    // Generate all possible time slots (9:00 AM to 5:00 PM, 30-minute intervals)
    const allSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeString);
      }
    }

    // Get existing appointments for this doctor on this date
    // CRITICAL: Check BOTH investigation_bookings AND appointments tables
    // to prevent double-booking the same doctor at the same time
    
    console.log(`[getAvailableTimeSlots] Checking bookings for doctor ${doctorId} on ${date}`);
    
    // Query 1: Check investigation bookings for this doctor
    const investigationQuery = `
      SELECT ib.scheduled_time, ib.status, ib.investigation_name,
             p.first_name || ' ' || p.last_name as patient_name
      FROM investigation_bookings ib
      JOIN patients p ON ib.patient_id = p.id
      WHERE ib.scheduled_date = $1
      AND ib.status NOT IN ('cancelled', 'no_show')
    `;
    
    // Query 2: Check urologist appointments for this doctor
    const appointmentsQuery = `
      SELECT a.appointment_time, a.status,
             p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.urologist_id = $1
      AND a.appointment_date = $2
      AND a.status NOT IN ('cancelled', 'no_show')
    `;
    
    // Execute both queries
    const investigationResult = await client.query(investigationQuery, [date]);
    const appointmentsResult = await client.query(appointmentsQuery, [doctorId, date]);
    
    console.log(`[getAvailableTimeSlots] Found ${investigationResult.rows.length} investigation bookings on ${date}`);
    console.log(`[getAvailableTimeSlots] Found ${appointmentsResult.rows.length} urologist appointments for doctor ${doctorId} on ${date}`);
    
    // Combine booked times from both tables
    const bookedTimesFromInvestigations = investigationResult.rows.map(row => {
      const timeValue = row.scheduled_time;
      const formattedTime = timeValue ? timeValue.substring(0, 5) : null;
      if (formattedTime) {
        console.log(`[getAvailableTimeSlots] Investigation booked: ${formattedTime} - ${row.investigation_name} for ${row.patient_name}`);
      }
      return formattedTime;
    }).filter(time => time !== null);
    
    const bookedTimesFromAppointments = appointmentsResult.rows.map(row => {
      const timeValue = row.appointment_time;
      const formattedTime = timeValue ? timeValue.substring(0, 5) : null;
      if (formattedTime) {
        console.log(`[getAvailableTimeSlots] Urologist appointment booked: ${formattedTime} for ${row.patient_name}`);
      }
      return formattedTime;
    }).filter(time => time !== null);
    
    // Merge both arrays and remove duplicates
    const bookedTimes = [...new Set([...bookedTimesFromInvestigations, ...bookedTimesFromAppointments])];
    
    console.log(`[getAvailableTimeSlots] Total booked times (combined): ${JSON.stringify(bookedTimes)}`);

    // Check if the selected date is today to disable past time slots
    // Use client's timezone offset if provided, otherwise use server time
    const now = new Date();
    
    // Apply timezone offset from client if provided (in minutes, e.g., -330 for IST)
    let currentDateTime = now;
    if (timezoneOffset) {
      const offsetMinutes = parseInt(timezoneOffset);
      // timezoneOffset is negative of getTimezoneOffset(), so we subtract it
      currentDateTime = new Date(now.getTime() - (offsetMinutes * 60 * 1000));
      console.log(`[getAvailableTimeSlots] Using client timezone offset: ${offsetMinutes} minutes`);
    }
    
    const today = currentDateTime.getFullYear() + '-' + 
                  String(currentDateTime.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(currentDateTime.getDate()).padStart(2, '0');
    const isToday = date === today;
    const currentHour = currentDateTime.getHours();
    const currentMinute = currentDateTime.getMinutes();

    console.log(`[getAvailableTimeSlots] Date comparison - Today: ${today}, Selected: ${date}, IsToday: ${isToday}`);
    console.log(`[getAvailableTimeSlots] Current time (adjusted): ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
    console.log(`[getAvailableTimeSlots] Server timezone offset: ${now.getTimezoneOffset() / 60} hours from UTC`);
    console.log(`[getAvailableTimeSlots] Full datetime: ${currentDateTime.toString()}`);

    // Create available slots array
    const availableSlots = allSlots.map(time => {
      const isBooked = bookedTimes.includes(time);
      let isPastTime = false;
      
      if (isToday) {
        // For today, check if the time slot has already passed
        const [slotHour, slotMinute] = time.split(':').map(Number);
        const slotTimeInMinutes = slotHour * 60 + slotMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        isPastTime = slotTimeInMinutes <= currentTimeInMinutes;
        
        if (isPastTime) {
          console.log(`[getAvailableTimeSlots] Marking ${time} as past time (current: ${currentHour}:${String(currentMinute).padStart(2, '0')})`);
        }
      }
      
      return {
        time,
        available: !isBooked && !isPastTime
      };
    });

    const availableCount = availableSlots.filter(s => s.available).length;
    const unavailableCount = availableSlots.filter(s => !s.available).length;
    console.log(`[getAvailableTimeSlots] Available: ${availableCount}, Unavailable: ${unavailableCount} out of ${allSlots.length} total`);

    res.json({
      success: true,
      data: availableSlots
    });

  } catch (error) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get all appointments for calendar view
export const getAllAppointments = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n📅 [getAllAppointments ${requestId}] Starting`);
  console.log(`📅 [getAllAppointments ${requestId}] Query params:`, req.query);
  console.log(`📅 [getAllAppointments ${requestId}] User:`, req.user?.id, req.user?.role);
  
  let client;
  try {
    console.log(`📅 [getAllAppointments ${requestId}] Connecting to database...`);
    console.log(`📅 [getAllAppointments ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    const connectStart = Date.now();
    client = await pool.connect();
    const connectTime = Date.now() - connectStart;
    console.log(`✅ [getAllAppointments ${requestId}] Database connection successful (took ${connectTime}ms)`);
  } catch (dbError) {
    console.error(`❌ [getAllAppointments ${requestId}] Database connection failed:`, dbError.message);
    console.error(`❌ [getAllAppointments ${requestId}] Error code:`, dbError.code);
    console.error(`❌ [getAllAppointments ${requestId}] Error stack:`, dbError.stack);
    console.error(`❌ [getAllAppointments ${requestId}] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
  
  try {
    const { startDate, endDate, urologistId } = req.query;
    console.log(`📅 [getAllAppointments ${requestId}] Processing query with startDate: ${startDate}, endDate: ${endDate}, urologistId: ${urologistId}`);
    
    const queryParams = [];
    
    // Build first part - urologist appointments (includes regular consultations and surgery appointments)
    let urologistWhere = ['a.status != \'cancelled\''];
    
    // Add urologist filter directly in the first query
    if (urologistId) {
      queryParams.push(urologistId);
      urologistWhere.push(`a.urologist_id = $${queryParams.length}`);
    }
    
    // Note: Surgery appointments are stored in the appointments table with appointment_type = 'surgery'
    // They are already included in the first part of the UNION query
    
    // Build query to get both urologist appointments and investigation bookings
    let query = `
      SELECT 
        a.id,
        a.patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        p.phone,
        p.email,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as psa,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.appointment_type as type,
        a.urologist_id,
        u.first_name as urologist_first_name,
        u.last_name as urologist_last_name,
        a.created_at,
        a.updated_at
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.urologist_id = u.id
      WHERE ${urologistWhere.join(' AND ')}
      
      UNION ALL
      
      SELECT 
        ib.id,
        ib.patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        p.phone,
        p.email,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as psa,
        ib.scheduled_date as appointment_date,
        ib.scheduled_time as appointment_time,
        ib.status,
        ib.notes,
        'investigation' as type,
        NULL as urologist_id,
        ib.investigation_name as urologist_first_name,
        '' as urologist_last_name,
        ib.created_at,
        ib.updated_at
      FROM investigation_bookings ib
      JOIN patients p ON ib.patient_id = p.id
      WHERE ib.status != 'cancelled'
    `;
    
    let whereConditions = [];
    
    // Add date range filter
    if (startDate && endDate) {
      const startParamIndex = queryParams.length + 1;
      const endParamIndex = queryParams.length + 2;
      queryParams.push(startDate, endDate);
      whereConditions.push(`appointment_date BETWEEN $${startParamIndex} AND $${endParamIndex}`);
    }
    
    if (whereConditions.length > 0) {
      query = `SELECT * FROM (${query}) AS combined_appointments WHERE ${whereConditions.join(' AND ')}`;
    } else {
      query = `SELECT * FROM (${query}) AS combined_appointments`;
    }
    
    query += ` ORDER BY appointment_date, appointment_time`;
    
    console.log(`📅 [getAllAppointments ${requestId}] Executing query with ${queryParams.length} params:`, queryParams);
    console.log(`📅 [getAllAppointments ${requestId}] Query length: ${query.length} characters`);
    
    let result;
    try {
      result = await client.query(query, queryParams);
      console.log(`✅ [getAllAppointments ${requestId}] Query executed successfully, returned ${result.rows.length} rows`);
    } catch (queryError) {
      console.error(`❌ [getAllAppointments ${requestId}] Query execution failed:`, queryError.message);
      console.error(`❌ [getAllAppointments ${requestId}] Query error code:`, queryError.code);
      console.error(`❌ [getAllAppointments ${requestId}] Query error stack:`, queryError.stack);
      throw queryError;
    }
    
    // Format results for frontend
    const formattedAppointments = result.rows.map(row => {
      // Format date using local timezone to avoid UTC conversion issues
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          // Handle PostgreSQL date objects directly
          if (dateString instanceof Date) {
            const year = dateString.getFullYear();
            const month = String(dateString.getMonth() + 1).padStart(2, '0');
            const day = String(dateString.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          
          // Handle string dates
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            console.error('Invalid date in backend:', dateString);
            return dateString;
          }
          
          // Use local timezone components to avoid UTC conversion issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Date formatting error:', error, 'Input:', dateString);
          return dateString;
        }
      };
      
      const formattedDate = formatDate(row.appointment_date);
      
      // Format time
      const timeStr = row.appointment_time;
      const formattedTime = timeStr ? timeStr.substring(0, 5) : '';
      
      // Determine appointment type and color
      let typeColor = 'teal'; // Default for urologist consultations
      let appointmentType = 'Urologist Consultation';
      
      const aptType = (row.type || '').toLowerCase();
      
      if (aptType === 'investigation') {
        typeColor = 'purple';
        appointmentType = 'Investigation Appointment';
      } else if (aptType === 'surgery' || aptType === 'surgical') {
        typeColor = 'orange'; // Orange for surgery appointments
        appointmentType = 'Surgery Appointment';
      }
      
      // Determine status - treat no_show as missed
      let status = row.status;
      if (status === 'no_show' || status === 'no-show') {
        status = 'missed';
      }
      
      return {
        id: row.id,
        patientId: row.patient_id,
        patientName: `${row.first_name} ${row.last_name}`,
        upi: row.upi,
        phone: row.phone || '',
        email: row.email || '',
        age: row.age,
        gender: row.gender,
        psa: row.psa,
        date: formattedDate,
        time: formattedTime,
        status: status,
        notes: row.notes || '',
        type: appointmentType,
        typeColor: typeColor,
        urologist: row.type === 'investigation' 
          ? row.urologist_first_name || 'Unassigned'
          : (row.urologist_first_name && row.urologist_last_name 
              ? `Dr. ${row.urologist_first_name} ${row.urologist_last_name}`
              : 'Unassigned'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    
    console.log(`✅ [getAllAppointments ${requestId}] Formatted ${formattedAppointments.length} appointments, sending response`);
    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: {
        appointments: formattedAppointments,
        count: formattedAppointments.length
      }
    });
    console.log(`✅ [getAllAppointments ${requestId}] Response sent successfully`);
    
  } catch (error) {
    console.error(`❌ [getAllAppointments ${requestId}] Error occurred:`, error.message);
    console.error(`❌ [getAllAppointments ${requestId}] Error stack:`, error.stack);
    console.error(`❌ [getAllAppointments ${requestId}] Request params:`, { startDate, endDate, urologistId });
    console.error(`❌ [getAllAppointments ${requestId}] User info:`, { id: req.user?.id, role: req.user?.role });
    console.error(`❌ [getAllAppointments ${requestId}] Error code:`, error.code);
    console.error(`❌ [getAllAppointments ${requestId}] Error name:`, error.name);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      console.log(`📅 [getAllAppointments ${requestId}] Releasing database connection`);
      client.release();
    }
  }
};
